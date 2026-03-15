import { callClaude } from "./client";
import { RetrievalResult } from "@/lib/retrieval/pipeline";

export interface GeneratedAnswer {
  answer: string;
  sources: string[];
}

export async function generateAnswer(
  query: string,
  context: RetrievalResult
): Promise<GeneratedAnswer> {
  if (context.chunks.length === 0) {
    return {
      answer: "I don't have enough information in the knowledge base to answer this question. A support ticket has been created for you.",
      sources: [],
    };
  }

  const system = `You are a helpful internal support assistant. Answer the employee's question using ONLY the provided context.

Rules:
- Cite your sources using [Source: document_name] at the end of relevant sentences
- Be concise and direct
- If the context doesn't contain enough information, say "I don't have enough information to answer this"
- Never make up information not in the context
- Use bullet points or numbered lists when listing steps`;

  const contextText = context.chunks
    .map(c => `[${c.source}]\n${c.text}`)
    .join("\n\n");

  const userMessage = `Context:\n${contextText}\n\nQuestion: ${query}`;

  const answer = await callClaude(system, userMessage, { maxTokens: 1024 });

  const sources = Array.from(new Set(context.chunks.map(c => c.source)));

  return { answer, sources };
}
