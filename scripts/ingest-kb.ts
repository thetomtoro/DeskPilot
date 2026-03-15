import { ingestKnowledgeDirectory } from "../lib/retrieval/ingest";
import path from "path";

async function main() {
  const kbDir = path.join(process.cwd(), "knowledge");
  console.log(`Ingesting knowledge base from ${kbDir}...`);

  const results = await ingestKnowledgeDirectory(kbDir);

  for (const r of results) {
    console.log(`  ${r.filename}: ${r.chunkCount} chunks`);
  }

  console.log(`\nDone. Ingested ${results.length} documents.`);
}

main().catch(console.error);
