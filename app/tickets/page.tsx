"use client"

import { useCallback, useEffect, useState } from "react"
import { Ticket, ChevronDown, ChevronUp, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

interface TicketRecord {
  id: string
  question: string
  aiAnswer?: string | null
  confidence: number
  status: string
  category?: string | null
  priority?: string | null
  createdAt: string
  resolvedAt?: string | null
  resolution?: string | null
}

type FilterTab = "all" | "open" | "resolved"

function confidenceBadge(confidence: number) {
  if (confidence >= 0.8) return { label: `${Math.round(confidence * 100)}% confidence`, className: "bg-emerald-900/50 text-emerald-400 border-emerald-700/50" }
  if (confidence >= 0.6) return { label: `${Math.round(confidence * 100)}% confidence`, className: "bg-amber-900/50 text-amber-400 border-amber-700/50" }
  return { label: `${Math.round(confidence * 100)}% confidence`, className: "bg-red-900/50 text-red-400 border-red-700/50" }
}

function priorityBadge(priority?: string | null) {
  switch (priority) {
    case "high": return { label: "High", className: "bg-red-900/50 text-red-400 border-red-700/50" }
    case "low": return { label: "Low", className: "bg-emerald-900/50 text-emerald-400 border-emerald-700/50" }
    default: return { label: "Medium", className: "bg-amber-900/50 text-amber-400 border-amber-700/50" }
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "resolved": return { label: "Resolved", className: "bg-emerald-900/50 text-emerald-400 border-emerald-700/50" }
    case "assigned": return { label: "Assigned", className: "bg-purple-900/50 text-purple-400 border-purple-700/50" }
    default: return { label: "Open", className: "bg-blue-900/50 text-blue-400 border-blue-700/50" }
  }
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-4">
        <p className={`text-2xl font-bold ${accent ?? "text-slate-100"}`}>{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  )
}

function TicketCardSkeleton() {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-4 w-3/4 bg-slate-800" />
        <Skeleton className="h-3 w-full bg-slate-800" />
        <Skeleton className="h-3 w-2/3 bg-slate-800" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 bg-slate-800" />
          <Skeleton className="h-5 w-16 bg-slate-800" />
          <Skeleton className="h-5 w-14 bg-slate-800" />
        </div>
      </CardContent>
    </Card>
  )
}

function TicketCard({
  ticket,
  onResolved,
}: {
  ticket: TicketRecord
  onResolved: (id: string, resolution: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [resolution, setResolution] = useState(ticket.resolution ?? "")
  const [resolving, setResolving] = useState(false)

  const conf = confidenceBadge(ticket.confidence)
  const prio = priorityBadge(ticket.priority)
  const stat = statusBadge(ticket.status)

  const handleResolve = async () => {
    setResolving(true)
    try {
      await onResolved(ticket.id, resolution)
    } finally {
      setResolving(false)
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
      <CardContent className="p-0">
        {/* Summary row — always visible */}
        <button
          className="w-full text-left p-5 flex items-start gap-4"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-sm font-medium text-slate-100 line-clamp-2">{ticket.question}</p>
            {ticket.aiAnswer && (
              <p className="text-xs text-slate-500 line-clamp-2">{ticket.aiAnswer}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={`text-xs ${conf.className}`}>{conf.label}</Badge>
              {ticket.category && (
                <Badge variant="outline" className="text-xs bg-slate-800 text-slate-400 border-slate-700">
                  {ticket.category}
                </Badge>
              )}
              <Badge variant="outline" className={`text-xs ${prio.className}`}>{prio.label}</Badge>
              <Badge variant="outline" className={`text-xs ${stat.className}`}>{stat.label}</Badge>
              <span className="text-xs text-slate-600 ml-auto">
                {timeAgo(ticket.createdAt)}
              </span>
            </div>
          </div>
          <div className="shrink-0 text-slate-600 mt-0.5">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="px-5 pb-5 pt-0 border-t border-slate-800 space-y-4">
            <div className="space-y-2 pt-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Question</p>
              <p className="text-sm text-slate-200">{ticket.question}</p>
            </div>

            {ticket.aiAnswer && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">AI Answer</p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{ticket.aiAnswer}</p>
              </div>
            )}

            {ticket.resolution && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Resolution</p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{ticket.resolution}</p>
              </div>
            )}

            {ticket.status !== "resolved" && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Resolve Ticket</p>
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Enter resolution notes…"
                  className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 resize-none text-sm"
                  rows={3}
                />
                <Button
                  onClick={handleResolve}
                  disabled={resolving || !resolution.trim()}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {resolving ? (
                    <><Loader2 size={14} className="animate-spin mr-2" />Resolving…</>
                  ) : (
                    <><CheckCircle2 size={14} className="mr-2" />Resolve Ticket</>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<FilterTab>("all")

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/tickets")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTickets(data.tickets ?? [])
    } catch {
      toast.error("Failed to load tickets")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const handleResolve = useCallback(
    async (id: string, resolution: string) => {
      try {
        const res = await fetch("/api/tickets", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "resolved", resolution }),
        })
        if (!res.ok) throw new Error()
        toast.success("Ticket resolved")
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: "resolved", resolution, resolvedAt: new Date().toISOString() } : t
          )
        )
      } catch {
        toast.error("Failed to resolve ticket")
      }
    },
    []
  )

  const openCount = tickets.filter((t) => t.status === "open").length
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length

  const filtered = tickets.filter((t) => {
    if (tab === "open") return t.status === "open"
    if (tab === "resolved") return t.status === "resolved"
    return true
  })

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-600/30">
          <Ticket size={18} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Tickets</h1>
          <p className="text-sm text-slate-500">
            {loading ? "Loading…" : `${tickets.length} total ticket${tickets.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total" value={tickets.length} />
        <StatCard label="Open" value={openCount} accent="text-blue-400" />
        <StatCard label="Resolved" value={resolvedCount} accent="text-emerald-400" />
      </div>

      {/* Filter Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="all" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">
            All ({tickets.length})
          </TabsTrigger>
          <TabsTrigger value="open" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">
            Open ({openCount})
          </TabsTrigger>
          <TabsTrigger value="resolved" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">
            Resolved ({resolvedCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Ticket List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <>
            <TicketCardSkeleton />
            <TicketCardSkeleton />
            <TicketCardSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 border border-slate-800">
              <Ticket size={24} className="text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm">
              {tab === "open" ? "No open tickets." : tab === "resolved" ? "No resolved tickets." : "No tickets yet."}
            </p>
          </div>
        ) : (
          filtered.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} onResolved={handleResolve} />
          ))
        )}
      </div>
    </div>
  )
}
