import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }

    // Parse sources JSON for each assistant message
    const messages = conversation.messages.map((msg) => ({
      ...msg,
      sources: msg.sources ? JSON.parse(msg.sources) : [],
    }));

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages,
      },
    });
  } catch (error) {
    console.error("[conversations/[id] GET] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve conversation." },
      { status: 500 }
    );
  }
}
