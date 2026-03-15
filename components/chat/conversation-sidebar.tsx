"use client"

import { useEffect, useState } from "react"
import { PlusCircle, Trash2, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

interface ConversationSidebarProps {
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function ConversationSidebar({ activeId, onSelect, onNew }: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations")
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations ?? [])
      }
    } catch {
      // silently fail — conversations are optional
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [activeId]) // re-fetch when active conversation changes (new one might've been created)

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" })
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeId === id) onNew()
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col w-52 shrink-0 border-r border-slate-800 bg-slate-900/50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-800">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">History</span>
        <button
          onClick={onNew}
          title="New conversation"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <PlusCircle size={14} />
          New
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg bg-slate-800/60" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center px-3">
            <MessageSquare size={24} className="text-slate-600" />
            <p className="text-xs text-slate-500">No conversations yet</p>
          </div>
        ) : (
          <ul className="space-y-0.5 px-1.5 py-1">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => onSelect(conv.id)}
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    "group w-full flex items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                    activeId === conv.id
                      ? "bg-blue-600/15 border border-blue-600/25"
                      : "hover:bg-slate-800/70"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "truncate text-xs font-medium leading-snug",
                        activeId === conv.id ? "text-blue-300" : "text-slate-300"
                      )}
                    >
                      {conv.title || "Untitled chat"}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {relativeTime(conv.updatedAt || conv.createdAt)}
                    </p>
                  </div>

                  {/* Delete button */}
                  {(hoveredId === conv.id || activeId === conv.id) && (
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      disabled={deletingId === conv.id}
                      className="shrink-0 text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40"
                      title="Delete conversation"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
