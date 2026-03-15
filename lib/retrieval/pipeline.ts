import { search } from "./vectorStore";
import { rerank } from "@/lib/ai/reranker";

export interface RetrievalResult {
  chunks: RankedChunk[];
  retrievalScore: number;
  totalCandidates: number;
  filteredCount: number;
}

export interface RankedChunk {
  text: string;
  source: string;
  section: string;
  relevanceScore: number;
}

export async function retrieve(query: string): Promise<RetrievalResult> {
  // 1. Vector search — top 10 candidates
  const candidates = await search(query, 10);

  if (candidates.length === 0) {
    return { chunks: [], retrievalScore: 0, totalCandidates: 0, filteredCount: 0 };
  }

  // 2. Rerank with Claude — batch score all candidates
  const reranked = await rerank(query, candidates);

  // 3. Filter below threshold
  const relevant = reranked.filter(c => c.relevanceScore >= 6);

  // 4. Return top 3
  return {
    chunks: relevant.slice(0, 3),
    retrievalScore: relevant.length > 0 ? relevant[0].relevanceScore : 0,
    totalCandidates: candidates.length,
    filteredCount: relevant.length,
  };
}
