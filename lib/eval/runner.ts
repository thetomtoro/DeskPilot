import { readFileSync } from "fs";
import path from "path";
import { retrieve } from "@/lib/retrieval/pipeline";
import { generateAnswer } from "@/lib/ai/generator";
import { assessConfidence } from "@/lib/ai/confidence";
import { computeMetrics, EvalCaseResult, EvalMetrics } from "./metrics";
import { prisma } from "@/lib/db";

interface TestCase {
  id: string;
  question: string;
  expected_answer_contains: string[];
  expected_source: string;
  category: string;
  difficulty: string;
}

export interface EvalReport {
  runId: string;
  metrics: EvalMetrics;
  results: EvalCaseResult[];
}

export async function runEvalSuite(): Promise<EvalReport> {
  const datasetPath = path.join(process.cwd(), "lib/eval/golden-dataset.json");
  const dataset: TestCase[] = JSON.parse(readFileSync(datasetPath, "utf-8"));

  const evalRun = await prisma.evalRun.create({
    data: { totalCases: dataset.length },
  });

  const results: EvalCaseResult[] = [];

  for (const testCase of dataset) {
    const startTime = Date.now();

    const retrieval = await retrieve(testCase.question);
    const { answer, sources } = await generateAnswer(testCase.question, retrieval);
    const confidence = await assessConfidence(testCase.question, answer, retrieval);

    const latencyMs = Date.now() - startTime;

    const result: EvalCaseResult = {
      id: testCase.id,
      question: testCase.question,
      category: testCase.category,
      difficulty: testCase.difficulty,
      retrievedSources: sources,
      expectedSource: testCase.expected_source,
      retrievalHit: sources.includes(testCase.expected_source),
      answerContainsExpected: testCase.expected_answer_contains.every(
        (phrase) => answer.toLowerCase().includes(phrase.toLowerCase())
      ),
      confidence,
      shouldEscalate: confidence < 0.6,
      latencyMs,
      answer,
    };

    results.push(result);

    await prisma.evalResult.create({
      data: {
        evalRunId: evalRun.id,
        testCaseId: testCase.id,
        question: testCase.question,
        retrievedSources: JSON.stringify(sources),
        expectedSource: testCase.expected_source,
        retrievalHit: result.retrievalHit,
        answerCorrect: result.answerContainsExpected,
        confidence,
        latencyMs,
      },
    });
  }

  const metrics = computeMetrics(results);

  await prisma.evalRun.update({
    where: { id: evalRun.id },
    data: {
      completedAt: new Date(),
      overallScores: JSON.stringify(metrics),
    },
  });

  return { runId: evalRun.id, metrics, results };
}
