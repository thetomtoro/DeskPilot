"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot, MessageSquare, BookOpen, Ticket, FlaskConical, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Chat", icon: MessageSquare },
  { href: "/kb", label: "Knowledge Base", icon: BookOpen },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/eval", label: "Eval", icon: FlaskConical },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-slate-900 border-r border-slate-800 shrink-0">
      {/* Logo / Title */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
          <Bot className="w-4.5 h-4.5 text-white" size={18} />
        </div>
        <span className="text-white font-semibold text-base tracking-tight">DeskPilot</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-2 py-3 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              )}
            >
              <Icon
                size={16}
                className={cn(
                  "shrink-0",
                  isActive ? "text-blue-400" : "text-slate-500"
                )}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800">
        <p className="text-xs text-slate-600">v0.1.0 · Portfolio Demo</p>
      </div>
    </aside>
  )
}
