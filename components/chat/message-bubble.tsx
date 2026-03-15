"use client"

import { useState } from "react"
import { AlertCircle, ThumbsDown, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Source {
  title: string
  document: string
  relevance?: number
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: Source[]
  confidence?: number
  ticketCreated?: boolean
}

interface MessageBubbleProps {
  message: Message
  onTicketCreate?: (messageId: string) => void
}

function ConfidenceBadge({ score }: { score: number }) {
  const label = score >= 0.7 ? "High confidence" : score >= 0.5 ? "Med confidence" : "Low confidence"
  const colorClass =
    score >= 0.7
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : score >= 0.5
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-red-500/15 text-red-400 border-red-500/30"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        colorClass
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          score >= 0.7 ? "bg-emerald-400" : score >= 0.5 ? "bg-amber-400" : "bg-red-400"
        )}
      />
      {label} ({Math.round(score * 100)}%)
    </span>
  )
}

function FormattedContent({ content }: { content: string }) {
  // Basic markdown-like formatting: bold, code, lists
  const lines = content.split("\n")

  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        // Code block fence — skip (handled below)
        if (line.startsWith("```")) return null

        // Bullet list
        if (line.match(/^[-*]\s/)) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-slate-500 shrink-0 mt-0.5">•</span>
              <span>{formatInline(line.slice(2))}</span>
            </div>
          )
        }

        // Numbered list
        if (line.match(/^\d+\.\s/)) {
          const num = line.match(/^(\d+)\./)?.[1]
          return (
            <div key={i} className="flex gap-2">
              <span className="text-slate-400 shrink-0 text-xs mt-0.5 font-mono">{num}.</span>
              <span>{formatInline(line.replace(/^\d+\.\s/, ""))}</span>
            </div>
          )
        }

        // Heading
        if (line.startsWith("## ")) {
          return (
            <p key={i} className="font-semibold text-slate-100 mt-2 first:mt-0">
              {line.slice(3)}
            </p>
          )
        }
        if (line.startsWith("# ")) {
          return (
            <p key={i} className="font-bold text-slate-100 mt-2 first:mt-0">
              {line.slice(2)}
            </p>
          )
        }

        // Empty line
        if (line.trim() === "") return <div key={i} className="h-1" />

        // Normal paragraph
        return <p key={i}>{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string): React.ReactNode {
  // Handle bold (**text**) and inline code (`code`)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-slate-700 px-1 py-0.5 font-mono text-xs text-slate-200">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

export function MessageBubble({ message, onTicketCreate }: MessageBubbleProps) {
  const [ticketRequested, setTicketRequested] = useState(false)
  const isUser = message.role === "user"

  const handleDidntHelp = () => {
    setTicketRequested(true)
    onTicketCreate?.(message.id)
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-2xl rounded-br-sm bg-blue-600 px-4 py-2.5 text-sm text-white shadow-sm">
          <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] space-y-2">
        {/* Message card */}
        <div className="rounded-2xl rounded-bl-sm bg-slate-800 border border-slate-700/60 px-4 py-3 shadow-sm">
          <FormattedContent content={message.content} />
        </div>

        {/* Meta row: confidence + sources + didn't-help */}
        <div className="flex flex-wrap items-center gap-2 px-1">
          {message.confidence !== undefined && (
            <ConfidenceBadge score={message.confidence} />
          )}

          {message.sources && message.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {message.sources.map((src, i) => (
                <span
                  key={i}
                  title={src.document}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-700/60 border border-slate-600/40 px-2 py-0.5 text-xs text-slate-400"
                >
                  <BookOpen size={10} />
                  {src.title}
                </span>
              ))}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {ticketRequested ? (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <AlertCircle size={12} />
              Ticket created
            </span>
          ) : (
            <button
              onClick={handleDidntHelp}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ThumbsDown size={12} />
              This didn&apos;t help
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
