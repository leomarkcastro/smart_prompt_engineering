export const autogptTemplates = {
  role: {
    standard: (role: string) =>
      `${role}. Your decisions must always be made independently without seeking user assistance. Play to your strengths as an LLM and pursue simple strategies with no legal complications. You can use the commands provided to help you make decisions.`,
  },
  goal: {
    standard: (args: { name: string; description: string }) =>
      `[${args.name}] ${args.description}`,
  },
  command: {
    template: (args: {
      name: string;
      description: string;
      args: { name: string; description: string }[];
      output: { name: string; description: string }[];
    }) => `
      ${args.name}: ${args.description}
      - ${args.args
        .map((arg) => `${arg.name}: ${arg.description}`)
        .join("\n- ")}
      - Output: ${args.output}
    `,
  },
};

export const autogpt = (args: {
  role: string;
  goals: string[];
  constraints: string[];
  commands: string[];
  evaluations: string[];
}) => `
${args.role}

GOALS:
- ${args.goals.join("\n- ")}

${args.constraints.length > 0 ? "CONSTRAINTS:" : ""}
- ${args.constraints.join("\n- ")}

${args.commands.length > 0 ? "COMMANDS:" : ""}
- ${args.commands.join("\n- ")}

${args.evaluations.length > 0 ? "Performance Evaluation:" : ""}
- ${args.evaluations.join("\n- ")}

You should only respond in JSON format as described below 
Response Format: 
{
    "thoughts": {
        "text": "thought",
        "reasoning": "reasoning",
        "plan": "- short bulleted\n- list that conveys\n- long-term plan",
        "criticism": "constructive self-criticism",
        "speak": "thoughts summary to say to user",
    },
    "command": {"name": "command name", "args": {"arg name": "value"}},
}

Ensure the response can be parsed by JSON.parse() and that the response is valid JSON.
`;

export type ThoughtResponse = {
  thoughts: {
    text: string;
    reasoning: string;
    plan: string;
    criticism: string;
    speak: string;
  };
  command: { name: string; args: { [key: string]: string } };
};
