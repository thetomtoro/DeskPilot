import { NextRequest, NextResponse } from "next/server";
import { writeFileSync } from "fs";
import path from "path";
import { ingestDocument } from "@/lib/retrieval/ingest";
import { prisma } from "@/lib/db";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    // 1. Validate file present
    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Upload a file with field name 'file'." },
        { status: 400 }
      );
    }

    // 2. Validate extension
    const ext = path.extname(file.name).toLowerCase();
    if (ext !== ".md" && ext !== ".txt") {
      return NextResponse.json(
        { error: "Only .md and .txt files are supported." },
        { status: 400 }
      );
    }

    // 3. Sanitize filename
    const sanitized = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/\.\.+/g, ".");

    // 4. Write file to knowledge/ directory
    const filePath = path.join(KNOWLEDGE_DIR, sanitized);
    const buffer = await file.arrayBuffer();
    writeFileSync(filePath, Buffer.from(buffer));

    // 5. Ingest document
    const { filename, chunkCount } = await ingestDocument(filePath);

    // 6. Return result
    return NextResponse.json({
      message: `Document '${filename}' ingested successfully.`,
      filename,
      chunkCount,
    });
  } catch (error) {
    console.error("[ingest] error:", error);
    return NextResponse.json(
      { error: "Failed to ingest document. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      orderBy: { ingestedAt: "desc" },
    });
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("[ingest GET] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve documents." },
      { status: 500 }
    );
  }
}
