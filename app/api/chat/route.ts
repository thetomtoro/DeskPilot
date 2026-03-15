import { NextRequest, NextResponse } from "next/server";
import { classifyIntent } from "@/lib/ai/classifier";
import { retrieve } from "@/lib/retrieval/pipeline";
import { generateAnswer } from "@/lib/ai/generator";
import { assessConfidence } from "@/lib/ai/confidence";
import { prisma } from "@/lib/db";
import { getCollectionCount } from "@/lib/retrieval/vectorStore";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { message, conversationId } = body as {
      message: string;
      conversationId?: string;
    };

    // 1. Validate message
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // 2. Check KB has documents
    const docCount = await getCollectionCount();
    if (docCount === 0) {
      return NextResponse.json(
        {
          answer:
            "The knowledge base is empty. Please upload some documents before asking questions.",
          confidence: 0,
          sources: [],
          intent: "question",
          conversationId: null,
          ticketCreated: false,
          latencyMs: Date.now() - startTime,
        },
        { status: 200 }
      );
    }

    // 3. Classify intent
    const intent = await classifyIntent(message);

    // 4. If "unclear" → return clarification prompt
    if (intent === "unclear") {
      return NextResponse.json({
        answer:
          "I'm not sure what you're asking. Could you please clarify your question? For example, are you looking for information about a specific topic, or would you like to submit a support request?",
        confidence: 0,
        sources: [],
        intent,
        conversationId: conversationId ?? null,
        ticketCreated: false,
        latencyMs: Date.now() - startTime,
      });
    }

    let answer: string;
    let confidence: number;
    let sources: string[];
    let ticketCreated = false;

    // 5. If "action_request" → skip RAG, create ticket directly
    if (intent === "action_request") {
      const ticket = await prisma.ticket.create({
        data: {
          question: message,
          confidence: 1.0,
          status: "open",
          priority: "medium",
        },
      });

      answer = `Your request has been received and a support ticket has been created (ID: ${ticket.id}). A team member will follow up with you shortly.`;
      confidence = 1.0;
      sources = [];
      ticketCreated = true;
    } else {
      // 6. "question" → run RAG pipeline
      const context = await retrieve(message);
      const generated = await generateAnswer(message, context);
      confidence = await assessConfidence(message, generated.answer, context);
      answer = generated.answer;
      sources = generated.sources;

      // 8. Auto-create ticket if confidence < 0.6
      if (confidence < 0.6) {
        await prisma.ticket.create({
          data: {
            question: message,
            aiAnswer: answer,
            confidence,
            status: "open",
            priority: confidence < 0.3 ? "high" : "medium",
          },
        });
        ticketCreated = true;
      }
    }

    const latencyMs = Date.now() - startTime;

    // 7. Create/update conversation, save user + assistant messages
    let convId: string;

    if (conversationId) {
      // Update existing conversation timestamp
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      convId = conversationId;
    } else {
      // Create new conversation with title from first message
      const title =
        message.length > 60 ? message.slice(0, 60) + "…" : message;
      const conversation = await prisma.conversation.create({
        data: { title },
      });
      convId = conversation.id;
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: convId,
        role: "user",
        content: message,
      },
    });

    // Save assistant message
    await prisma.message.create({
      data: {
        conversationId: convId,
        role: "assistant",
        content: answer,
        sources: JSON.stringify(sources),
        confidence,
        latencyMs,
      },
    });

    // 9. Return response
    return NextResponse.json({
      answer,
      confidence,
      sources,
      intent,
      conversationId: convId,
      ticketCreated,
      latencyMs,
    });
  } catch (error) {
    console.error("[chat] error:", error);
    return NextResponse.json(
      {
        answer:
          "Something went wrong while processing your request. Please try again later.",
        confidence: 0,
        sources: [],
        intent: "question",
        conversationId: null,
        ticketCreated: false,
        latencyMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
