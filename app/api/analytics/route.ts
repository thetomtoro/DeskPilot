import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Run all queries in parallel for performance
    const [
      totalQuestions,
      totalTickets,
      resolvedTickets,
      assistantMessages,
      recentUserMessages,
    ] = await Promise.all([
      // Count user messages
      prisma.message.count({
        where: { role: "user" },
      }),
      // Count all tickets
      prisma.ticket.count(),
      // Count resolved tickets
      prisma.ticket.count({
        where: { status: "resolved" },
      }),
      // Get assistant messages with confidence/latency
      prisma.message.findMany({
        where: {
          role: "assistant",
          confidence: { not: null },
        },
        select: {
          confidence: true,
          latencyMs: true,
          createdAt: true,
        },
      }),
      // Last 100 user messages
      prisma.message.findMany({
        where: { role: "user" },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          content: true,
          createdAt: true,
          conversationId: true,
        },
      }),
    ]);

    // Compute average confidence
    const confidenceValues = assistantMessages
      .map((m) => m.confidence)
      .filter((c): c is number => c !== null);
    const avgConfidence =
      confidenceValues.length > 0
        ? confidenceValues.reduce((sum, c) => sum + c, 0) /
          confidenceValues.length
        : 0;

    // Compute average latency
    const latencyValues = assistantMessages
      .map((m) => m.latencyMs)
      .filter((l): l is number => l !== null);
    const avgLatencyMs =
      latencyValues.length > 0
        ? latencyValues.reduce((sum, l) => sum + l, 0) / latencyValues.length
        : 0;

    // AI resolution rate: % of questions NOT escalated to tickets
    const aiResolutionRate =
      totalQuestions > 0
        ? Math.max(0, (totalQuestions - totalTickets) / totalQuestions)
        : 0;

    // Confidence distribution for charting
    const confidenceDistribution = assistantMessages.map((m) => ({
      confidence: m.confidence,
      latencyMs: m.latencyMs,
      date: m.createdAt,
    }));

    return NextResponse.json({
      totalQuestions,
      totalTickets,
      resolvedTickets,
      avgConfidence,
      avgLatencyMs,
      aiResolutionRate,
      recentMessages: recentUserMessages,
      confidenceDistribution,
    });
  } catch (error) {
    console.error("[analytics GET] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve analytics." },
      { status: 500 }
    );
  }
}
