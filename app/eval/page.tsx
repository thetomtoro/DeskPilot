"use client"

import { useCallback, useEffect, useState } from "react"
import { FlaskConical, Play, Loader2, ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvalMetrics {
  retrievalPrecisionAt3: number
  retrievalRecall: number
  answerCorrectness: number
  avgConfidence: number
  hallucinationRate: number
  ticketEscalationAccuracy: number
  avgLatencyMs: number
  byCategory: Record<string, { correctness: number; retrievalRecall: number; count: number }>
  byDifficulty: Record<string, { correctness: number; count: number }>
}

interface EvalResultRecord {
  id: string
  testCaseId: string
  question: string
  retrievedSources: string[]
  expectedSource: string
  retrievalHit: boolean
  answerCorrect: boolean
  confidence: number
  latencyMs: number
}

interface EvalRunRecord {
  id: string
  startedAt: string
  completedAt?: string | null
  totalCases: number
  overallScores: EvalMetrics | null
  results: EvalResultRecord[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(val: number) {
  return `${(val * 100).toFixed(1)}%`
}

function metricColor(val: number) {
  if (val >= 0.8) return "text-emerald-400"
  if (val >= 0.6) return "text-amber-400"
  return "text-red-400"
}

function metricBg(val: number) {
  if (val >= 0.8) return "bg-emerald-900/40 border-emerald-700/40"
  if (val >= 0.6) return "bg-amber-900/40 border-amber-700/40"
  return "bg-red-900/40 border-red-700/40"
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({ label, value, unit = "%" }: { label: string; value: number; unit?: string }) {
  const displayVal = unit === "%" ? pct(value) : `${Math.round(value)}ms`
  const color = unit === "%" ? metricColor(value) : "text-slate-100"
  const bg = unit === "%" ? metricBg(value) : "bg-slate-900 border-slate-800"

  return (
    <Card className={`border ${bg}`}>
      <CardContent className="p-4">
        <p className={`text-2xl font-bold font-mono ${color}`}>{displayVal}</p>
        <p className="text-xs text-slate-500 mt-1 leading-tight">{label}</p>
      </CardContent>
    </Card>
  )
}

function SkeletonMetricCard() {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-7 w-20 bg-slate-800" />
        <Skeleton className="h-3 w-32 bg-slate-800" />
      </CardContent>
    </Card>
  )
}

function TestCaseRow({ result }: { result: EvalResultRecord }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-900/50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="mt-0.5 shrink-0">
          {result.answerCorrect ? (
            <CheckCircle2 size={15} className="text-emerald-400" />
          ) : (
            <XCircle size={15} className="text-red-400" />
          )}
        </div>
        <p className="text-sm text-slate-300 flex-1 line-clamp-2">{result.question}</p>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-mono ${metricColor(result.confidence)}`}>
            {pct(result.confidence)}
          </span>
          {open ? <ChevronDown size={14} className="text-slate-600" /> : <ChevronRight size={14} className="text-slate-600" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-800 space-y-3 bg-slate-950/40">
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Expected source</p>
            <p className="text-xs text-slate-400 font-mono">{result.expectedSource}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Retrieved sources</p>
            <div className="flex flex-wrap gap-1">
              {result.retrievedSources.length > 0 ? result.retrievedSources.map((src, i) => (
                <span
                  key={i}
                  className={`text-xs font-mono px-2 py-0.5 rounded ${
                    src === result.expectedSource
                      ? "bg-emerald-900/50 text-emerald-400"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {src}
                </span>
              )) : <span className="text-xs text-slate-600">—</span>}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>
              Retrieval hit:{" "}
              <span className={result.retrievalHit ? "text-emerald-400" : "text-red-400"}>
                {result.retrievalHit ? "Yes" : "No"}
              </span>
            </span>
            <span>Latency: <span className="text-slate-300">{result.latencyMs}ms</span></span>
            <span>Confidence: <span className={metricColor(result.confidence)}>{pct(result.confidence)}</span></span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EvalPage() {
  const [evalRuns, setEvalRuns] = useState<EvalRunRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/eval")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEvalRuns(data.evalRuns ?? [])
    } catch {
      toast.error("Failed to load evaluation results")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  const handleRunEval = async () => {
    setRunning(true)
    try {
      const res = await fetch("/api/eval", { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Evaluation failed")
      }
      toast.success("Evaluation complete!")
      await fetchRuns()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Evaluation failed")
    } finally {
      setRunning(false)
    }
  }

  const latestRun = evalRuns[0] ?? null
  const metrics = latestRun?.overallScores ?? null

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-600/30">
            <FlaskConical size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Evaluation Dashboard</h1>
            <p className="text-sm text-slate-500">
              {loading ? "Loading…" : evalRuns.length === 0
                ? "No evaluation runs yet"
                : `${evalRuns.length} run${evalRuns.length !== 1 ? "s" : ""} · Last: ${fmtDate(evalRuns[0].startedAt)}`}
            </p>
          </div>
        </div>

        <Button
          onClick={handleRunEval}
          disabled={running || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
        >
          {running ? (
            <><Loader2 size={15} className="animate-spin mr-2" />Running…</>
          ) : (
            <><Play size={15} className="mr-2" />Run Evaluation</>
          )}
        </Button>
      </div>

      {/* Running state message */}
      {running && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-900/20 border border-blue-700/30">
          <Loader2 size={16} className="animate-spin text-blue-400 shrink-0" />
          <p className="text-sm text-blue-300">
            Running evaluation suite… This may take a few minutes
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && evalRuns.length === 0 && !running && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 border border-slate-800">
            <FlaskConical size={28} className="text-slate-600" />
          </div>
          <div className="text-center">
            <p className="text-slate-300 font-medium">No evaluation runs yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Click &quot;Run Evaluation&quot; to benchmark the RAG pipeline against the golden dataset.
            </p>
          </div>
        </div>
      )}

      {/* Latest results */}
      {(loading || latestRun) && (
        <>
          {/* Overall metrics grid */}
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Overall Metrics {latestRun && `— Run ${fmtDate(latestRun.startedAt)}`}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonMetricCard key={i} />)
              ) : metrics ? (
                <>
                  <MetricCard label="Retrieval Precision@3" value={metrics.retrievalPrecisionAt3} />
                  <MetricCard label="Answer Correctness" value={metrics.answerCorrectness} />
                  <MetricCard label="Avg Confidence" value={metrics.avgConfidence} />
                  <MetricCard label="Hallucination Rate" value={metrics.hallucinationRate} />
                  <MetricCard label="Escalation Accuracy" value={metrics.ticketEscalationAccuracy} />
                  <MetricCard label="Avg Latency" value={metrics.avgLatencyMs} unit="ms" />
                </>
              ) : null}
            </div>
          </div>

          {/* Per-category breakdown */}
          {!loading && metrics && Object.keys(metrics.byCategory).length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                By Category
              </h2>
              <div className="rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800">
                      <th className="text-left p-3 text-xs text-slate-500 font-medium">Category</th>
                      <th className="text-right p-3 text-xs text-slate-500 font-medium">Cases</th>
                      <th className="text-right p-3 text-xs text-slate-500 font-medium">Correctness</th>
                      <th className="text-right p-3 text-xs text-slate-500 font-medium">Retrieval Recall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(metrics.byCategory).map(([cat, data], i) => (
                      <tr key={cat} className={i % 2 === 0 ? "bg-slate-950/30" : "bg-slate-900/30"}>
                        <td className="p-3 font-medium text-slate-200 capitalize">{cat}</td>
                        <td className="p-3 text-right text-slate-400">{data.count}</td>
                        <td className={`p-3 text-right font-mono font-medium ${metricColor(data.correctness)}`}>
                          {pct(data.correctness)}
                        </td>
                        <td className={`p-3 text-right font-mono font-medium ${metricColor(data.retrievalRecall)}`}>
                          {pct(data.retrievalRecall)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Per-difficulty breakdown */}
          {!loading && metrics && Object.keys(metrics.byDifficulty).length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                By Difficulty
              </h2>
              <div className="rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800">
                      <th className="text-left p-3 text-xs text-slate-500 font-medium">Difficulty</th>
                      <th className="text-right p-3 text-xs text-slate-500 font-medium">Cases</th>
                      <th className="text-right p-3 text-xs text-slate-500 font-medium">Correctness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["easy", "medium", "hard"].map((diff, i) => {
                      const data = metrics.byDifficulty[diff]
                      if (!data) return null
                      return (
                        <tr key={diff} className={i % 2 === 0 ? "bg-slate-950/30" : "bg-slate-900/30"}>
                          <td className="p-3 font-medium text-slate-200 capitalize">{diff}</td>
                          <td className="p-3 text-right text-slate-400">{data.count}</td>
                          <td className={`p-3 text-right font-mono font-medium ${metricColor(data.correctness)}`}>
                            {pct(data.correctness)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Individual test cases */}
          {!loading && latestRun && latestRun.results.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Test Cases ({latestRun.results.length})
              </h2>
              <div className="flex flex-col gap-2">
                {latestRun.results.map((result) => (
                  <TestCaseRow key={result.id} result={result} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Historical runs */}
      {!loading && evalRuns.length > 1 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Historical Runs
          </h2>
          <div className="flex flex-col gap-2">
            {evalRuns.slice(1).map((run) => {
              const score = run.overallScores?.answerCorrectness ?? null
              return (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="text-slate-600 shrink-0" />
                    <div>
                      <p className="text-sm text-slate-300">
                        {fmtDate(run.startedAt)}
                      </p>
                      <p className="text-xs text-slate-600">{run.totalCases} cases</p>
                    </div>
                  </div>
                  {score !== null && (
                    <span className={`text-sm font-mono font-semibold ${metricColor(score)}`}>
                      {pct(score)} correctness
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
