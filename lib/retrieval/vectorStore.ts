import { Chunk } from "./chunker";
import { embedTexts, embedQuery } from "./embedder";
import embeddingsData from "./embeddings.json";

export interface SearchResult {
  id: string;
  text: string;
  source: string;
  section: string;
  score: number;
}

interface StoredChunk {
  id: string;
  text: string;
  embedding: number[];
  metadata: { source: string; section: string; chunkIndex: number };
}

// In-memory vector store — pre-baked embeddings loaded from JSON.
// For 69 chunks (~2MB) this is fast and works on serverless (Vercel).
let chunks: StoredChunk[] = embeddingsData as StoredChunk[];

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function addChunks(newChunks: Chunk[]): Promise<void> {
  const embeddings = await embedTexts(newChunks.map(c => c.text));
  for (let i = 0; i < newChunks.length; i++) {
    chunks.push({
      id: newChunks[i].id,
      text: newChunks[i].text,
      embedding: embeddings[i],
      metadata: {
        source: newChunks[i].metadata.source,
        section: newChunks[i].metadata.section,
        chunkIndex: newChunks[i].metadata.chunkIndex,
      },
    });
  }
}

export async function removeBySource(source: string): Promise<void> {
  chunks = chunks.filter(c => c.metadata.source !== source);
}

export async function search(query: string, topK: number = 10): Promise<SearchResult[]> {
  const queryEmbedding = await embedQuery(query);

  const scored = chunks.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map(c => ({
    id: c.id,
    text: c.text,
    source: c.metadata.source,
    section: c.metadata.section,
    score: c.score,
  }));
}

export async function getCollectionCount(): Promise<number> {
  return chunks.length;
}
