import { NextResponse } from "next/server";
import { runEvalSuite } from "@/lib/eval/runner";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const report = await runEvalSuite();

    return NextResponse.json({ report });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Eval run failed.";
    console.error("[eval POST] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const evalRuns = await prisma.evalRun.findMany({
      orderBy: { startedAt: "desc" },
      include: {
        results: true,
      },
    });

    // Parse JSON fields
    const runs = evalRuns.map((run) => ({
      ...run,
      overallScores: run.overallScores ? JSON.parse(run.overallScores) : null,
      results: run.results.map((r) => ({
        ...r,
        retrievedSources: r.retrievedSources
          ? JSON.parse(r.retrievedSources)
          : [],
      })),
    }));

    return NextResponse.json({ evalRuns: runs });
  } catch (error) {
    console.error("[eval GET] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve eval runs." },
      { status: 500 }
    );
  }
}
