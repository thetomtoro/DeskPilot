import { callClaude } from "./client";

export type Intent = "question" | "action_request" | "unclear";

export async function classifyIntent(userMessage: string): Promise<Intent> {
  const system = `You are an intent classifier for an internal helpdesk. Classify the user's message into exactly one category.

Respond with ONLY one of these words, nothing else:
- "question" — the user is asking a question that can be answered from documentation
- "action_request" — the user wants something done (submit a ticket, request access, etc.)
- "unclear" — the message is too vague or ambiguous to classify`;

  const result = await callClaude(system, userMessage, { maxTokens: 20 });
  const cleaned = result.trim().toLowerCase().replace(/[^a-z_]/g, "");

  if (cleaned === "question" || cleaned === "action_request" || cleaned === "unclear") {
    return cleaned;
  }
  return "question"; // default to question for RAG pipeline
}
