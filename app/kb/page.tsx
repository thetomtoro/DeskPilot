"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { BookOpen, Upload, FileText, Search, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface Document {
  id: string
  filename: string
  title: string
  chunkCount: number
  ingestedAt: string
  updatedAt: string
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function DocCardSkeleton() {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0 bg-slate-800" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48 bg-slate-800" />
              <Skeleton className="h-3 w-32 bg-slate-800" />
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Skeleton className="h-5 w-20 bg-slate-800" />
            <Skeleton className="h-5 w-24 bg-slate-800" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/ingest")
      if (!res.ok) throw new Error("Failed to fetch documents")
      const data = await res.json()
      setDocuments(data.documents ?? [])
    } catch {
      toast.error("Failed to load documents")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const uploadFile = useCallback(
    async (file: File) => {
      const ext = file.name.toLowerCase().split(".").pop()
      if (ext !== "md" && ext !== "txt") {
        toast.error("Only .md and .txt files are supported")
        return
      }

      setUploading(true)
      try {
        const formData = new FormData()
        formData.append("file", file)

        const res = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        })

        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error ?? "Upload failed")
        } else {
          toast.success(`"${data.filename}" ingested (${data.chunkCount} chunks)`)
          await fetchDocuments()
        }
      } catch {
        toast.error("Upload failed. Please try again.")
      } finally {
        setUploading(false)
      }
    },
    [fetchDocuments]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) await uploadFile(file)
    },
    [uploadFile]
  )

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) await uploadFile(file)
      e.target.value = ""
    },
    [uploadFile]
  )

  const filtered = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.filename.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-600/30">
          <BookOpen size={18} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Knowledge Base</h1>
          <p className="text-sm text-slate-500">
            {loading ? "Loading…" : `${documents.length} document${documents.length !== 1 ? "s" : ""} ingested`}
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed
          cursor-pointer transition-all select-none
          ${dragOver
            ? "border-blue-500 bg-blue-600/10"
            : "border-slate-700 hover:border-slate-600 bg-slate-900/50 hover:bg-slate-900"
          }
          ${uploading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt"
          className="hidden"
          onChange={handleFileInput}
        />
        {uploading ? (
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        ) : (
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 border border-slate-700">
            <Upload size={20} className="text-slate-400" />
          </div>
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-slate-300">
            {uploading ? "Ingesting document…" : "Drop a file here, or click to upload"}
          </p>
          <p className="text-xs text-slate-500 mt-1">Supports .md and .txt files</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents…"
          className="pl-9 bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-600/50"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Document List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <>
            <DocCardSkeleton />
            <DocCardSkeleton />
            <DocCardSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 border border-slate-800">
              <FileText size={24} className="text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm text-center">
              {search
                ? `No documents match "${search}"`
                : "No documents ingested yet. Upload .md or .txt files to get started."}
            </p>
          </div>
        ) : (
          filtered.map((doc) => (
            <Card key={doc.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 shrink-0">
                      <FileText size={15} className="text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{doc.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{doc.filename}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-300 border-slate-700">
                      {doc.chunkCount} chunk{doc.chunkCount !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-400 border-slate-700">
                      {formatDate(doc.ingestedAt)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Footer count */}
      {!loading && filtered.length > 0 && search && (
        <p className="text-xs text-slate-600 text-center">
          Showing {filtered.length} of {documents.length} documents
        </p>
      )}
    </div>
  )
}
