import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    // Return conversations with their first message as a preview
    const result = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      firstMessage: conv.messages[0] ?? null,
    }));

    return NextResponse.json({ conversations: result });
  } catch (error) {
    console.error("[conversations GET] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve conversations." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body as { id: string };

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "id is required." },
        { status: 400 }
      );
    }

    await prisma.conversation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[conversations DELETE] error:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation." },
      { status: 500 }
    );
  }
}
