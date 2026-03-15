"use client"

import { useCallback, useEffect, useState } from "react"
import { BarChart3, MessageSquare, Ticket, CheckCircle2, Loader2, Zap, Clock } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentMessage {
  id: string
  content: string
  createdAt: string
  conversationId: string
}

interface ConfidencePoint {
  confidence: number | null
  latencyMs: number | null
  date: string
}

interface AnalyticsData {
  totalQuestions: number
  totalTickets: number
  resolvedTickets: number
  avgConfidence: number
  avgLatencyMs: number
  aiResolutionRate: number
  recentMessages: RecentMessage[]
  confidenceDistribution: ConfidencePoint[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(val: number) {
  return `${(val * 100).toFixed(1)}%`
}

function confidenceColor(val: number) {
  if (val >= 0.8) return "bg-emerald-500"
  if (val >= 0.6) return "bg-amber-500"
  return "bg-red-500"
}

function confidenceTextColor(val: number) {
  if (val >= 0.8) return "text-emerald-400"
  if (val >= 0.6) return "text-amber-400"
  return "text-red-400"
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  accent?: string
  sub?: string
}

function StatCard({ label, value, icon: Icon, accent = "text-slate-100", sub }: StatCardProps) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-2xl font-bold font-mono ${accent}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
          </div>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 shrink-0">
            <Icon size={16} className="text-slate-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-5 space-y-2">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-24 bg-slate-800" />
            <Skeleton className="h-3 w-32 bg-slate-800" />
          </div>
          <Skeleton className="h-8 w-8 rounded-lg bg-slate-800" />
        </div>
      </CardContent>
    </Card>
  )
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const widthPct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-20 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <span className="text-xs text-slate-300 w-8 text-right font-mono">{value}</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics")
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json)
    } catch {
      toast.error("Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const isEmpty = !loading && data && data.totalQuestions === 0 && data.totalTickets === 0

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-600/30">
          <BarChart3 size={18} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Analytics</h1>
          <p className="text-sm text-slate-500">System performance overview</p>
        </div>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 border border-slate-800">
            <BarChart3 size={28} className="text-slate-600" />
          </div>
          <div className="text-center">
            <p className="text-slate-300 font-medium">No data yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Start a conversation in Chat to populate analytics.
            </p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : data ? (
          <>
            <StatCard
              label="Total Questions"
              value={data.totalQuestions}
              icon={MessageSquare}
              accent="text-blue-400"
            />
            <StatCard
              label="AI Resolution Rate"
              value={pct(data.aiResolutionRate)}
              icon={CheckCircle2}
              accent={data.aiResolutionRate >= 0.8 ? "text-emerald-400" : data.aiResolutionRate >= 0.6 ? "text-amber-400" : "text-red-400"}
              sub="questions resolved without ticket"
            />
            <StatCard
              label="Avg Confidence"
              value={pct(data.avgConfidence)}
              icon={Zap}
              accent={confidenceTextColor(data.avgConfidence)}
            />
            <StatCard
              label="Avg Latency"
              value={`${Math.round(data.avgLatencyMs)}ms`}
              icon={Clock}
              accent="text-slate-100"
            />
            <StatCard
              label="Total Tickets"
              value={data.totalTickets}
              icon={Ticket}
              accent="text-slate-100"
            />
            <StatCard
              label="Resolved Tickets"
              value={data.resolvedTickets}
              icon={CheckCircle2}
              accent="text-emerald-400"
              sub={data.totalTickets > 0 ? `${pct(data.resolvedTickets / data.totalTickets)} resolved` : undefined}
            />
          </>
        ) : null}
      </div>

      {/* Ticket breakdown */}
      {!loading && data && data.totalTickets > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Ticket Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <BarRow
              label="Open"
              value={data.totalTickets - data.resolvedTickets}
              max={data.totalTickets}
              color="bg-blue-500"
            />
            <BarRow
              label="Resolved"
              value={data.resolvedTickets}
              max={data.totalTickets}
              color="bg-emerald-500"
            />
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${data.totalTickets > 0 ? (data.resolvedTickets / data.totalTickets) * 100 : 0}%`,
                    }}
                  />
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{
                      width: `${data.totalTickets > 0 ? ((data.totalTickets - data.resolvedTickets) / data.totalTickets) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-slate-500 font-mono shrink-0">{data.totalTickets} total</span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Resolved
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Open
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confidence distribution mini-chart */}
      {!loading && data && data.confidenceDistribution.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Confidence Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-0.5 h-16">
              {data.confidenceDistribution.slice(-60).map((point, i) => {
                const conf = point.confidence ?? 0
                const heightPct = Math.max(10, Math.round(conf * 100))
                return (
                  <div
                    key={i}
                    title={`${Math.round(conf * 100)}%`}
                    className={`flex-1 rounded-t-sm ${confidenceColor(conf)} opacity-70 hover:opacity-100 transition-opacity`}
                    style={{ height: `${heightPct}%` }}
                  />
                )
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-600">Oldest</span>
              <span className="text-xs text-slate-600">Most recent</span>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> ≥80%
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> 60–79%
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> &lt;60%
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent questions */}
      {!loading && data && data.recentMessages.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Recent Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {data.recentMessages.slice(0, 20).map((msg, i) => (
              <div
                key={msg.id}
                className={`py-3 flex items-start gap-3 ${
                  i < data.recentMessages.slice(0, 20).length - 1 ? "border-b border-slate-800" : ""
                }`}
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 shrink-0 mt-0.5">
                  <MessageSquare size={11} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 line-clamp-2">{msg.content}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {timeAgo(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
