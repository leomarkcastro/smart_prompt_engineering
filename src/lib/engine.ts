import { ChatCompletionMessageParam, ChatModel } from "openai/resources";
import { ask } from "./createInput";
import openai from "./openai";
import { SmartThoughtResponse } from "../prompts/smartgpt";

// create a function that might receive '{}{}...', parse it into [{}, {}]
const parseStringToObjectArray = (str: string) => {
  // console.log("str: ", str);
  const objects: any[] = [];
  let objStr = "";
  let openBrackets = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "{") {
      openBrackets++;
    } else if (str[i] === "}") {
      openBrackets--;
    }
    objStr += str[i];
    if (openBrackets === 0 && objStr.length > 0) {
      objStr = objStr.replace(/(\r\n|\n|\r)/gm, "");
      try {
        objects.push(JSON.parse(objStr));
      } catch (e) {
        // console.log("error: ", e);
      }
      objStr = "";
    }
  }
  return objects;
};

export type FunctionDefinition = {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: {
      [key: string]: {
        type: string;
      };
    };
  };
  function: (args: any) => any;
};

export const consoleInput = async () => {
  const userMessage = await ask({ prompt: "You: " });
  return userMessage;
};

export const engine = async (fargs: {
  history: ChatCompletionMessageParam[];
  model: ChatModel;
  functions: FunctionDefinition[];
  input: () => Promise<string>;
  output: (message: string) => void;
  log: boolean;
}) => {
  let skipInput = false;
  while (true) {
    if (!skipInput) {
      const userMessage = await fargs.input();
      fargs.history.push({ role: "user", content: userMessage });
    }

    skipInput = false;

    const completion = await openai.chat.completions.create({
      messages: fargs.history,
      model: fargs.model,
      response_format: {
        type: "json_object",
      },
      functions: [
        {
          name: "recommend_car",
          description: "Get list of cars based on the user's preferences",
          parameters: {
            type: "object",
            properties: {
              brand: {
                type: "string",
              },
              price: {
                type: "number",
              },
              color: {
                type: "string",
              },
              year: {
                type: "number",
              },
            },
          },
        },
        {
          name: "calculate_insurance",
          description: "Calculate the insurance of the car",
          parameters: {
            type: "object",
            properties: {
              plate_number: {
                type: "string",
              },
              purchase_year: {
                type: "number",
              },
              price: {
                type: "number",
              },
            },
          },
        },
      ],
    });

    // check if function is called
    if (fargs.log)
      console.log("Response: ", JSON.stringify(completion), "--end--");
    // @ts-ignore
    const calledFunction = completion.choices[0].message.function_call;
    if (calledFunction) {
      if (fargs.log) console.log("Function called: ", calledFunction);
      const name = calledFunction.name;
      const args = JSON.parse(calledFunction.arguments);

      const functionToUse = fargs.functions.find((func) => func.name === name);

      if (!functionToUse) {
        console.error("Function not found: ", name);
        continue;
      }

      const result = await functionToUse.function(args);

      fargs.history.push({
        role: "function",
        name: name,
        content: JSON.stringify(result),
      });

      skipInput = true;
      continue;
    }
    // console.log("Response: ", JSON.stringify(completion), "--end--");
    const response = parseStringToObjectArray(
      completion.choices[0].message.content ?? "{}"
    );
    if (response[0])
      fargs.history.push({
        role: "system",
        content: JSON.stringify(response[0]),
      });
    const parsed: SmartThoughtResponse = response[0];
    if (fargs.log) console.log("Thoughts: ", parsed);
    if (fargs.log) console.log("AI :", parsed.say);
    if (parsed.say) fargs.output(parsed.say);
    if (parsed.say)
      fargs.history.push({ role: "assistant", content: parsed.say });
  }
};
