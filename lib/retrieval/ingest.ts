import { readFileSync, readdirSync } from "fs";
import path from "path";
import { chunkDocument } from "./chunker";
import { addChunks, removeBySource } from "./vectorStore";
import { prisma } from "@/lib/db";

export async function ingestDocument(filePath: string): Promise<{ filename: string; chunkCount: number }> {
  const filename = path.basename(filePath);
  const content = readFileSync(filePath, "utf-8");
  const title = extractTitle(content) || filename.replace(/\.(md|txt)$/, "");

  // Remove existing chunks for this file (re-upload replaces)
  await removeBySource(filename);

  const chunks = chunkDocument(content, filename);
  await addChunks(chunks);

  // Upsert document record
  await prisma.document.upsert({
    where: { filename },
    create: { filename, title, chunkCount: chunks.length },
    update: { title, chunkCount: chunks.length, updatedAt: new Date() },
  });

  return { filename, chunkCount: chunks.length };
}

export async function ingestKnowledgeDirectory(dirPath: string): Promise<{ filename: string; chunkCount: number }[]> {
  const files = readdirSync(dirPath).filter(f => f.endsWith(".md") || f.endsWith(".txt"));
  const results = [];

  for (const file of files) {
    const result = await ingestDocument(path.join(dirPath, file));
    results.push(result);
  }

  return results;
}

function extractTitle(markdown: string): string | null {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}
