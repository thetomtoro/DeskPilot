"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Send, Bot, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageBubble, type Message } from "./message-bubble"
import { ConversationSidebar } from "./conversation-sidebar"

function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-sm bg-slate-800 border border-slate-700/60 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" />
          <span>Thinking…</span>
          <div className="flex gap-1 ml-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-slate-600 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onSuggestion }: { onSuggestion: (q: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-6">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-600/20">
        <Bot size={28} className="text-blue-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-200">DeskPilot AI</h2>
        <p className="mt-1.5 text-sm text-slate-500 max-w-sm">
          Ask me anything about our products, billing, or account settings. I'll
          search the knowledge base and give you a sourced answer.
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 justify-center">
        {[
          "How do I reset my password?",
          "What's your refund policy?",
          "How do I upgrade my plan?",
        ].map((q) => (
          <button
            key={q}
            onClick={() => onSuggestion(q)}
            className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const handleNewConversation = useCallback(() => {
    setConversationId(null)
    setMessages([])
    setInput("")
    textareaRef.current?.focus()
  }, [])

  const handleSelectConversation = useCallback(async (id: string) => {
    if (id === conversationId) return
    setLoadingConversation(true)
    setConversationId(id)
    setMessages([])
    try {
      const res = await fetch(`/api/conversations/${id}`)
      if (res.ok) {
        const data = await res.json()
        const msgs: Message[] = (data.conversation?.messages ?? []).map((m: Record<string, unknown>) => ({
          id: m.id as string,
          role: m.role as "user" | "assistant",
          content: m.content as string,
          sources: m.sources as Message["sources"] | undefined,
          confidence: m.confidence as number | undefined,
        }))
        setMessages(msgs)
      } else {
        toast.error("Failed to load conversation")
      }
    } catch {
      toast.error("Failed to load conversation")
    } finally {
      setLoadingConversation(false)
    }
  }, [conversationId])

  const handleSubmit = useCallback(async () => {
    const content = input.trim()
    if (!content || loading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, conversationId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Request failed")
      }

      const data = await res.json()

      // Update conversationId if new one was created
      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId)
      }

      const assistantMessage: Message = {
        id: data.messageId ?? crypto.randomUUID(),
        role: "assistant",
        content: data.answer ?? data.message ?? "I couldn't generate a response.",
        sources: data.sources,
        confidence: data.confidence,
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (data.ticketCreated) {
        toast.info("A support ticket has been created for your query.", {
          description: "Our team will follow up via email.",
        })
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.", {
        description: err instanceof Error ? err.message : undefined,
      })
      // Remove the user message if we failed
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
      setInput(content) // restore input
    } finally {
      setLoading(false)
    }
  }, [input, loading, conversationId])

  const handleSuggestion = useCallback((q: string) => {
    setInput(q)
    textareaRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleTicketCreate = useCallback(async (messageId: string) => {
    try {
      const msg = messages.find((m) => m.id === messageId)
      // Find the preceding user message
      const msgIndex = messages.findIndex((m) => m.id === messageId)
      const userMsg = messages.slice(0, msgIndex).reverse().find((m) => m.role === "user")

      await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMsg?.content ?? "User indicated the response didn't help.",
          aiAnswer: msg?.content,
          confidence: msg?.confidence ?? 0,
        }),
      })
      toast.success("Support ticket created", {
        description: "We'll review this and improve our knowledge base.",
      })
    } catch {
      toast.error("Failed to create ticket")
    }
  }, [messages, conversationId])

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Conversation history sidebar */}
      <ConversationSidebar
        activeId={conversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
      />

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversation ? (
            <div className="p-6 space-y-4 max-w-3xl mx-auto w-full">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                  <Skeleton
                    className={cn(
                      "h-16 rounded-2xl bg-slate-800/60",
                      i % 2 === 0 ? "w-56" : "w-72"
                    )}
                  />
                </div>
              ))}
            </div>
          ) : messages.length === 0 && !loading ? (
            <EmptyState onSuggestion={handleSuggestion} />
          ) : (
            <div className="p-6 space-y-4 max-w-3xl mx-auto w-full">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onTicketCreate={handleTicketCreate}
                />
              ))}
              {loading && <ThinkingIndicator />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-slate-800 bg-slate-900/60 px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
                disabled={loading}
                rows={1}
                className="flex-1 resize-none border-0 bg-transparent p-0 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-0 focus-visible:border-0 min-h-0 field-sizing-content max-h-40 overflow-y-auto"
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || loading}
                className={cn(
                  "shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                  input.trim() && !loading
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "bg-slate-700 text-slate-500 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-600">
              DeskPilot uses RAG to retrieve answers from the knowledge base. Responses may not always be accurate.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
