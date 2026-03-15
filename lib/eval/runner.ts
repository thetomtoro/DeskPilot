export interface EvalReport {
  runId: string;
  metrics: Record<string, unknown>;
  results: unknown[];
}

export async function runEvalSuite(): Promise<EvalReport> {
  throw new Error("Eval runner not yet implemented");
}
