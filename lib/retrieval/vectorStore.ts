import { ChromaClient, Collection } from "chromadb";
import { Chunk } from "./chunker";
import { embedTexts, embedQuery } from "./embedder";

const COLLECTION_NAME = "deskpilot-kb";

// ChromaDB v3 JS client connects to a local Chroma server.
// Start one with: npx chroma run --path ./chromadb-data
// The server persists data at the given path between restarts.

let client: ChromaClient;
let collection: Collection;

async function getCollection(): Promise<Collection> {
  if (collection) return collection;
  // Default connects to http://localhost:8000
  client = new ChromaClient();
  // Configure cosine distance via the hnsw configuration (v3 API)
  collection = await client.getOrCreateCollection({
    name: COLLECTION_NAME,
    configuration: {
      hnsw: { space: "cosine" },
    },
  });
  return collection;
}

export interface SearchResult {
  id: string;
  text: string;
  source: string;
  section: string;
  score: number;
}

export async function addChunks(chunks: Chunk[]): Promise<void> {
  const col = await getCollection();
  const embeddings = await embedTexts(chunks.map((c) => c.text));

  const batchSize = 100;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchEmbeddings = embeddings.slice(i, i + batchSize);
    await col.add({
      ids: batch.map((c) => c.id),
      documents: batch.map((c) => c.text),
      embeddings: batchEmbeddings,
      metadatas: batch.map((c) => ({
        source: c.metadata.source,
        section: c.metadata.section,
        chunkIndex: c.metadata.chunkIndex,
      })),
    });
  }
}

export async function removeBySource(source: string): Promise<void> {
  const col = await getCollection();
  // In v3, get() returns a GetResult with .ids as string[]
  const existing = await col.get({
    where: { source } as Record<string, string>,
  });
  if (existing.ids.length > 0) {
    await col.delete({ ids: existing.ids });
  }
}

export async function search(
  query: string,
  topK: number = 10
): Promise<SearchResult[]> {
  const col = await getCollection();
  const queryEmbedding = await embedQuery(query);

  // In v3, query() returns QueryResult with .ids as string[][], .distances as (number | null)[][]
  const results = await col.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
  });

  if (!results.ids[0]) return [];

  return results.ids[0].map((id, i) => ({
    id,
    text: results.documents[0]?.[i] ?? "",
    source:
      (results.metadatas[0]?.[i] as Record<string, string> | null)?.source ??
      "",
    section:
      (results.metadatas[0]?.[i] as Record<string, string> | null)?.section ??
      "",
    // distances are cosine distances [0,2]; convert to similarity score [0,1]
    score: 1 - (results.distances?.[0]?.[i] ?? 1),
  }));
}

export async function getCollectionCount(): Promise<number> {
  const col = await getCollection();
  return await col.count();
}
