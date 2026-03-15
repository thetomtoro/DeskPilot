import { callClaude } from "./client";
import { RetrievalResult } from "@/lib/retrieval/pipeline";

export async function assessConfidence(
  query: string,
  answer: string,
  context: RetrievalResult
): Promise<number> {
  if (context.chunks.length === 0) return 0;

  const system = `You are a groundedness assessment system. Evaluate whether the given answer is well-grounded in the provided context.

Score from 0.0 to 1.0:
- 0.9-1.0: Every claim is directly supported by the context
- 0.7-0.8: Most claims are supported, minor gaps
- 0.5-0.6: Partially supported, some claims lack evidence
- 0.3-0.4: Weakly supported, significant gaps
- 0.0-0.2: Not grounded in the context at all

Respond with ONLY a JSON object: {"score": 0.X, "reason": "brief explanation"}`;

  const contextText = context.chunks
    .map(c => `[${c.source}] ${c.text}`)
    .join("\n\n");

  const userMessage = `Question: ${query}\n\nAnswer: ${answer}\n\nContext:\n${contextText}`;

  const result = await callClaude(system, userMessage, { maxTokens: 200 });

  try {
    const parsed = JSON.parse(result);
    return Math.max(0, Math.min(1, parsed.score));
  } catch {
    return context.retrievalScore >= 7 ? 0.7 : 0.4;
  }
}
