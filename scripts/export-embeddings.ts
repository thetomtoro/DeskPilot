import { config } from "dotenv";
config({ path: ".env.local" });

import { ChromaClient } from "chromadb";
import { writeFileSync } from "fs";
import path from "path";

async function main() {
  const client = new ChromaClient();
  const collection = await client.getCollection({ name: "deskpilot-kb" });
  const count = await collection.count();
  console.log(`Collection has ${count} chunks`);

  const all = await collection.get({
    include: ["documents", "embeddings", "metadatas"],
  });

  const chunks = all.ids.map((id: string, i: number) => ({
    id,
    text: all.documents[i],
    embedding: all.embeddings![i],
    metadata: all.metadatas[i],
  }));

  const outPath = path.join(process.cwd(), "lib/retrieval/embeddings.json");
  writeFileSync(outPath, JSON.stringify(chunks, null, 2));
  console.log(`Exported ${chunks.length} chunks with embeddings to ${outPath}`);
}

main().catch(console.error);
