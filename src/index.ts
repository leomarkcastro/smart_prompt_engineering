import { ChatCompletionMessageParam } from "openai/resources";
import { FunctionDefinition, consoleInput, engine } from "./lib/engine";
import { smartgpt } from "./prompts/smartgpt";

const carDealerPrompt = smartgpt({
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

const functions: FunctionDefinition[] = [
  {
    name: "recommend_car",
    description: "Get list of cars based on the user's preferences",
    function(args) {
      return {
        brand: args.brand,
        price: args.price,
        color: args.color,
        year: args.year,
      };
    },
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
    function(args) {
      return {
        plate_number: args.plate_number,
        purchase_year: args.purchase_year,
        premium: args.price * 0.1,
        coverage: args.price * 0.9,
      };
    },
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
];

async function main() {
  const history: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: carDealerPrompt,
    },
  ];

  while (true) {
    await engine({
      history,
      log: true,
      functions: functions,
      model: "gpt-4-turbo",
      input: consoleInput,
      output(message) {
        // console.log("AI :", message);
      },
    });
  }
}

main();
