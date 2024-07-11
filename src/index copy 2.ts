import { ChatCompletionMessageParam } from "openai/resources";
import openai from "./lib/openai";
import { createInterface } from "readline";
import { SmartThoughtResponse, smartgpt } from "./prompts/smartgpt";

const autogptPrompt = smartgpt({
  persona:
    "You are a car sales agent, named 'CALCARO' and your goal is to facilitate and entertain user's interest in car purchase. Be kind and respectful",
  initialFocus:
    "Greet the User, ask them for their interests like buying a car, inquiring about the car or insurance",
  patterns: [
    {
      name: "Buy a Car",
      prerequisite: "The User mentions that they want to buy a car",
      newFocus:
        "Ask the user for the following {brand, price, color, year} to call [recommend_car] function",
      plan: [
        "Ask for the brand by offering brands like toyota, honda, tesla and etc.",
        "Ask for their price range",
        "Say a joke about the color of the car",
        "Ask for a color of the car",
        "Ask for a preferred year of car manufacturing year",
        "Praise the user for their choice. Proceed to the next step immediately",
        "If {brand, price, color, year} is already given. Call [recommend_car] function",
        "If no car was found, offer the user to search for another car. If the user agrees, redirect them to the [Buy a Car] pattern",
        "Offer the user to fill-up a car loan application form. If the user agrees, redirect them to the [Fill-up Car Loan Application] pattern",
      ],
    },
    {
      name: "Inquire about insurance",
      prerequisite:
        "The User mentioned that they want to get an insurance for their car",
      newFocus:
        "Ask the user for the following {plate_number, purchase_year, price} to call [calculate_insurance] function",
      plan: [
        "Ask for the plate number of the car",
        "Ask for the year when the car was purchased",
        "Joke about the car having a high price",
        "Ask for the price of the car",
        "If {plate_number, purchase_year, price} is already given. Call [calculate_insurance] function",
      ],
    },
    {
      name: "Fill-up Car Loan Application",
      prerequisite:
        "User can proceed to this pattern only from the 'Buy a Car' pattern. Ask them if they want to buy a car first before proceeding to this pattern. DO NOT PROCEED if the USER haven't picked a car yet, ask them to pick a car first.",
      newFocus:
        "Show the user a link to the car loan application form and ask them to fill it up",
      plan: [
        "Show the link [here](https://www.example.com/car-loan-application)",
      ],
    },
  ],
  events: [
    {
      name: "Transaction Rating",
      condition: "Every end of flow and before flow transfer",
      action:
        "Ask the user to rate the transaction from 1-5 stars. Additively ask the user for a feedback to improve the service and make the user feel valued",
    },
    {
      name: "Adios",
      condition: "On every end of every assistant message",
      action: "Add 'adios-adidas' to the end of the message to make it cool",
    },
  ],
});

// console.log(autogptPrompt);

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

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function searchCar(args: {
  brand: string;
  price: number;
  color: string;
  year: number;
}) {
  return [
    {
      brand: "Toyota",
      model: "Corolla",
      price: args.price,
      year: args.year,
    },
    {
      brand: "Honda",
      model: "Civic",
      price: args.price,
      year: args.year,
    },
    {
      brand: "Ford",
      model: "Focus",
      price: args.price,
      year: args.year,
    },
    {
      brand: "Chevrolet",
      model: "Cruze",
      price: args.price,
      year: args.year,
    },
  ];
}

function calculateInsurance(args: {
  plate_number: string;
  purchase_year: number;
  price: number;
}) {
  return {
    premium: args.price * 0.1,
    coverage: args.price * 0.8,
  };
}

async function main() {
  const history: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: autogptPrompt,
    },
  ];
  let skipInput = false;
  while (true) {
    if (!skipInput) {
      const userMessage = await new Promise<string>((resolve) => {
        rl.question("You: ", resolve);
      });

      history.push({ role: "user", content: userMessage });
    }

    skipInput = false;

    const completion = await openai.chat.completions.create({
      messages: history,
      model: "gpt-4o",
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
    console.log("Response: ", JSON.stringify(completion), "--end--");
    // @ts-ignore
    const calledFunction = completion.choices[0].message.function_call;
    if (calledFunction) {
      console.log("Function called: ", calledFunction);
      const name = calledFunction.name;
      const args = JSON.parse(calledFunction.arguments);

      switch (name) {
        case "recommend_car": {
          const cars = searchCar(args);
          history.push({
            role: "function",
            name: "recommend_car",
            content: JSON.stringify(cars),
          });
          break;
        }
        case "calculate_insurance": {
          console.log("Insurance: ", args);
          const insurance = calculateInsurance(args);
          history.push({
            role: "function",
            name: "recommend_car",
            content: JSON.stringify(insurance),
          });
          break;
        }
      }
      skipInput = true;
      continue;
    }
    // console.log("Response: ", JSON.stringify(completion), "--end--");
    const response = parseStringToObjectArray(
      completion.choices[0].message.content ?? "{}"
    );
    if (response[0])
      history.push({
        role: "system",
        content: JSON.stringify(response[0]),
      });
    const parsed: SmartThoughtResponse = response[0];
    console.log("Thoughts: ", parsed);
    console.log("AI :", parsed.say);
    if (parsed.say) history.push({ role: "assistant", content: parsed.say });
  }
}

main();
