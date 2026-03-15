import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("[tickets GET] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve tickets." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, aiAnswer, confidence, category, priority } = body as {
      question: string;
      aiAnswer?: string;
      confidence: number;
      category?: string;
      priority?: string;
    };

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "question is required." },
        { status: 400 }
      );
    }

    if (typeof confidence !== "number") {
      return NextResponse.json(
        { error: "confidence (number) is required." },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.create({
      data: {
        question,
        aiAnswer,
        confidence,
        category,
        priority: priority ?? "medium",
        status: "open",
      },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("[tickets POST] error:", error);
    return NextResponse.json(
      { error: "Failed to create ticket." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, resolution } = body as {
      id: string;
      status?: string;
      resolution?: string;
    };

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "id is required." },
        { status: 400 }
      );
    }

    const updateData: {
      status?: string;
      resolution?: string;
      resolvedAt?: Date;
    } = {};

    if (status !== undefined) {
      updateData.status = status;
      if (status === "resolved") {
        updateData.resolvedAt = new Date();
      }
    }

    if (resolution !== undefined) {
      updateData.resolution = resolution;
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("[tickets PATCH] error:", error);
    return NextResponse.json(
      { error: "Failed to update ticket." },
      { status: 500 }
    );
  }
}
