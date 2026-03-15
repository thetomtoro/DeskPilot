export interface EvalCaseResult {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  retrievedSources: string[];
  expectedSource: string;
  retrievalHit: boolean;
  answerContainsExpected: boolean;
  confidence: number;
  shouldEscalate: boolean;
  latencyMs: number;
  answer: string;
}

export interface EvalMetrics {
  retrievalPrecisionAt3: number;
  retrievalRecall: number;
  answerCorrectness: number;
  avgConfidence: number;
  confidenceCalibration: number;
  hallucinationRate: number;
  ticketEscalationAccuracy: number;
  avgLatencyMs: number;
  byCategory: Record<string, CategoryMetrics>;
  byDifficulty: Record<string, { correctness: number; count: number }>;
}

interface CategoryMetrics {
  correctness: number;
  retrievalRecall: number;
  count: number;
}

export function computeMetrics(results: EvalCaseResult[]): EvalMetrics {
  if (results.length === 0) {
    return {
      retrievalPrecisionAt3: 0,
      retrievalRecall: 0,
      answerCorrectness: 0,
      avgConfidence: 0,
      confidenceCalibration: 0,
      hallucinationRate: 0,
      ticketEscalationAccuracy: 0,
      avgLatencyMs: 0,
      byCategory: {},
      byDifficulty: {},
    };
  }

  // retrievalPrecisionAt3: fraction of results where the expected source appears
  // in the top-3 retrieved sources
  const retrievalPrecisionAt3 =
    results.filter((r) => {
      const top3 = r.retrievedSources.slice(0, 3);
      return top3.includes(r.expectedSource);
    }).length / results.length;

  // retrievalRecall: fraction where expected source appears anywhere in retrieved sources
  const retrievalRecall =
    results.filter((r) => r.retrievalHit).length / results.length;

  // answerCorrectness: fraction where the answer contains all expected phrases
  const answerCorrectness =
    results.filter((r) => r.answerContainsExpected).length / results.length;

  // avgConfidence: mean confidence score across all results
  const avgConfidence =
    results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  // confidenceCalibration: among high-confidence results (>=0.6), fraction that are correct
  const highConfidenceResults = results.filter((r) => r.confidence >= 0.6);
  const confidenceCalibration =
    highConfidenceResults.length > 0
      ? highConfidenceResults.filter((r) => r.answerContainsExpected).length /
        highConfidenceResults.length
      : 0;

  // hallucinationRate: fraction with high confidence but wrong answer
  const hallucinationRate =
    highConfidenceResults.length > 0
      ? highConfidenceResults.filter((r) => !r.answerContainsExpected).length /
        highConfidenceResults.length
      : 0;

  // ticketEscalationAccuracy: fraction where escalation decision matched correctness
  // shouldEscalate=true (low confidence) should correspond to wrong answers,
  // shouldEscalate=false (high confidence) should correspond to correct answers.
  // Agreement = (shouldEscalate && !correct) || (!shouldEscalate && correct)
  const ticketEscalationAccuracy =
    results.filter(
      (r) =>
        (r.shouldEscalate && !r.answerContainsExpected) ||
        (!r.shouldEscalate && r.answerContainsExpected)
    ).length / results.length;

  // avgLatencyMs: mean latency in milliseconds
  const avgLatencyMs =
    results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length;

  // byCategory: per-category correctness and retrieval recall
  const categoryGroups = results.reduce<Record<string, EvalCaseResult[]>>(
    (acc, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    },
    {}
  );

  const byCategory: Record<string, CategoryMetrics> = {};
  for (const [category, cases] of Object.entries(categoryGroups)) {
    const correct = cases.filter((r) => r.answerContainsExpected).length;
    const retrieved = cases.filter((r) => r.retrievalHit).length;
    byCategory[category] = {
      correctness: correct / cases.length,
      retrievalRecall: retrieved / cases.length,
      count: cases.length,
    };
  }

  // byDifficulty: per-difficulty correctness
  const difficultyGroups = results.reduce<Record<string, EvalCaseResult[]>>(
    (acc, r) => {
      if (!acc[r.difficulty]) acc[r.difficulty] = [];
      acc[r.difficulty].push(r);
      return acc;
    },
    {}
  );

  const byDifficulty: Record<string, { correctness: number; count: number }> =
    {};
  for (const [difficulty, cases] of Object.entries(difficultyGroups)) {
    const correct = cases.filter((r) => r.answerContainsExpected).length;
    byDifficulty[difficulty] = {
      correctness: correct / cases.length,
      count: cases.length,
    };
  }

  return {
    retrievalPrecisionAt3,
    retrievalRecall,
    answerCorrectness,
    avgConfidence,
    confidenceCalibration,
    hallucinationRate,
    ticketEscalationAccuracy,
    avgLatencyMs,
    byCategory,
    byDifficulty,
  };
}
