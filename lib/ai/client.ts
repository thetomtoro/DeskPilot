import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function callClaude(
  system: string,
  userMessage: string,
  options?: { maxTokens?: number }
): Promise<string> {
  const maxRetries = 1;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: options?.maxTokens ?? 1024,
        system,
        messages: [{ role: "user", content: userMessage }],
      });
      const block = response.content[0];
      if (block.type === "text") return block.text;
      return "";
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const status = (err as { status?: number }).status;
      if (status && [429, 500, 503].includes(status) && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError;
}
