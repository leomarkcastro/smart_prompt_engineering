import { createInterface } from "readline";

export const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

export async function ask(args: { prompt: string }) {
  return await new Promise<string>((resolve) => {
    rl.question(args.prompt, resolve);
  });
}
