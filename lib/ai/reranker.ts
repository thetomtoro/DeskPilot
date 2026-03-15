import { callClaude } from "./client";
import { SearchResult } from "@/lib/retrieval/vectorStore";
import { RankedChunk } from "@/lib/retrieval/pipeline";

export async function rerank(query: string, candidates: SearchResult[]): Promise<RankedChunk[]> {
  const system = `You are a relevance scoring system. Given a user query and a list of text chunks, score each chunk's relevance to the query from 0 to 10.

Respond with ONLY a JSON array of numbers, one score per chunk, in the same order. Example: [8, 3, 7, 1, 9, 2, 6, 4, 5, 0]

Scoring guide:
- 9-10: Directly answers the query
- 7-8: Highly relevant, contains key information
- 5-6: Somewhat relevant, tangentially related
- 3-4: Minimally relevant
- 0-2: Not relevant`;

  const chunksText = candidates
    .map((c, i) => `[Chunk ${i}] (source: ${c.source}, section: ${c.section})\n${c.text}`)
    .join("\n\n---\n\n");

  const userMessage = `Query: "${query}"\n\nChunks to score:\n\n${chunksText}`;

  const result = await callClaude(system, userMessage, { maxTokens: 200 });

  let scores: number[];
  try {
    scores = JSON.parse(result);
  } catch {
    scores = candidates.map((_, i) => 10 - i);
  }

  const ranked: RankedChunk[] = candidates.map((c, i) => ({
    text: c.text,
    source: c.source,
    section: c.section,
    relevanceScore: scores[i] ?? 0,
  }));

  return ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);
}
