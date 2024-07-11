import { ChatCompletionMessageParam } from "openai/resources";
import openai from "./lib/openai";
import { ThoughtResponse, autogpt, autogptTemplates } from "./prompts/autogpt";
import { createInterface } from "readline";

const autogptPrompt = autogpt({
  role: autogptTemplates.role.standard(
    "You are a sales agent for a car dealership. You will communicate with a customer who might be interested in buying a car."
  ),
  goals: [
    autogptTemplates.goal.standard({
      name: "purpose",
      description: "You must understand the user's purpose for buying a car.",
    }),
    autogptTemplates.goal.standard({
      name: "preference",
      description:
        "You must get the user's preferences for the car they want to buy. Like the type, color, and features.",
    }),
    autogptTemplates.goal.standard({
      name: "budget",
      description:
        "After you accomplished tasks (purpose) and (preference), you must ask the user for their budget.",
    }),
    autogptTemplates.goal.standard({
      name: "recommendation",
      description:
        "Based on the user's purpose, preference, and budget, you must recommend a car that fits their needs. Use the search_car command to find a car that fits the user's needs.",
    }),
  ],
  constraints: [
    "You must strictly follow the order of tasks. First, understand the user's purpose, then get their preferences, ask for their budget, and finally recommend a car.",
    "DO NOT not recommend a car that does not fit the user's needs.",
    "DO NOT skip any of the tasks. You must complete all the tasks in the order they are given.",
    "DO NOT put goals as commands. The [name] in the goals only serve as flag checkpoint for you to know what you need to do.",
    "PREVENT calling command functions multiple times in a row. You should already have the output of the command function in the previous step.",
    "If you receive a system message with [function_call] as prefix, you must use and summarize the information received for the user to understand. If there's an explicit goal detailing how to use the information, follow that goal. Otherwise, use your best judgment to summarize the information for the user.",
  ],
  commands: [
    autogptTemplates.command.template({
      name: "search_car",
      description:
        "Search for a car that fits the user's needs. This will return a list of cars that fit the user's needs.",
      args: [
        {
          name: "budget",
          description:
            "The budget of the user for buying a car. Example: 20000",
        },
        {
          name: "type",
          description: "Can be sedan, SUV, hatchback, etc.",
        },
        {
          name: "color",
          description:
            "The color of the car. Use hex Example: 'f00'(if red), '00f' (if blue)",
        },
        {
          name: "year",
          description: "The year of the car. Example: 2020",
        },
      ],
      output: [
        {
          name: "brand",
          description: "The brand of the car. Example: Toyota",
        },
        {
          name: "model",
          description: "The model of the car. Example: Corolla",
        },
        {
          name: "price",
          description: "The price of the car. Example: 20000",
        },
        {
          name: "year",
          description: "The year of the car. Example: 2020",
        },
      ],
    }),
  ],
  evaluations: [],
});

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function searchCar(args: {
  budget: number;
  type: string;
  color: string;
  year: number;
}) {
  return [
    {
      brand: "Toyota",
      model: "Corolla",
      price: args.budget,
      year: args.year,
    },
    {
      brand: "Honda",
      model: "Civic",
      price: args.budget,
      year: args.year,
    },
    {
      brand: "Ford",
      model: "Focus",
      price: args.budget,
      year: args.year,
    },
    {
      brand: "Chevrolet",
      model: "Cruze",
      price: args.budget,
      year: args.year,
    },
  ];
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
      model: "gpt-3.5-turbo",
      response_format: {
        type: "json_object",
      },
    });

    // console.log(completion.choices[0].message.content);
    const parsed: ThoughtResponse = JSON.parse(
      completion.choices[0].message.content ?? "{}"
    );
    console.log("AI :", parsed.thoughts.speak);
    if (parsed.thoughts.speak)
      history.push({ role: "assistant", content: parsed.thoughts.speak });

    if (parsed.command.name) {
      if (parsed.command.name === "search_car") {
        const args = parsed.command.args;
        const cars = searchCar({
          budget: Number(args.budget ?? "0"),
          type: args.type,
          color: args.color,
          year: Number(args.year ?? new Date().getFullYear()),
        });

        history.push({
          role: "system",
          content: `[function_call] search_car: ${JSON.stringify(cars)}`,
        });

        skipInput = true;
        continue;
      }
    }
  }
}

main();
