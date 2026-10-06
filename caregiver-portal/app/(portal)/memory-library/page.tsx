"use client"

import { useEffect, useState } from "react"
import { Calendar, Clock, MapPin, Play, Trash2, Users, Video, Loader2, Sparkles, AlertCircle } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { getAllMemories, getPeople, deleteMemory, resolveMediaUrl, type Memory, type Person } from "@/lib/api"

export default function MemoryLibraryPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [peopleMap, setPeopleMap] = useState<Record<string, Person>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeMemory, setActiveMemory] = useState<Memory | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [peopleList, mems] = await Promise.all([
        getPeople().catch(() => [] as Person[]),
        getAllMemories().catch(() => [] as Memory[])
      ])

      const pMap: Record<string, Person> = {}
      peopleList.forEach((p) => {
        pMap[p.id] = p
      })
      setPeopleMap(pMap)
      setMemories(mems)
    } catch (err) {
      console.error("Failed to load memories from backend:", err)
      setMemories([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = async (memoryId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the memory: "${title}"?\nThis will permanently delete the recording and database record.`)) {
      return
    }

    setDeletingId(memoryId)
    try {
      await deleteMemory(memoryId)
      // Remove from state and reload
      setMemories((prev) => prev.filter((m) => m.id !== memoryId && m.memoryId !== memoryId))
      if (activeMemory?.id === memoryId) {
        setActiveMemory(null)
      }
      await loadData()
    } catch (err) {
      console.error("Failed to delete memory:", err)
      alert("Failed to delete memory. Please check backend connection.")
    } finally {
      setDeletingId(null)
    }
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "Recorded interaction"
    try {
      const date = new Date(timestamp)
      return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    } catch {
      return timestamp
    }
  }

  return (
    <div>
      <PageHeader
        title="Memory Library"
        subtitle="Conversation summaries and interaction recordings captured by NeuroLens"
      />

      {isLoading ? (
        <div className="rounded-3xl bg-card p-12 text-center shadow-sm ring-1 ring-border/60 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading memories from backend...</p>
        </div>
      ) : memories.length === 0 ? (
        <div className="rounded-3xl bg-card p-12 text-center shadow-sm ring-1 border border-dashed border-border/80 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Video className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Zero Memories Recorded Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Conversation summaries are created when NeuroLens hears you speaking with a recognized person. The first recognized interaction can also include a video recording.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {memories.map((m) => {
            const person = peopleMap[m.personId]
            const personName = m.personName || person?.name || "Registered Person"
            const relationship = m.relationship || person?.relationship || "Trusted Contact"
            const videoSrc = resolveMediaUrl(m.videoUrl)
            const isDeleting = deletingId === m.id

            return (
              <div
                key={m.id || m.memoryId}
                className="overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border/60 flex flex-col justify-between"
              >
                <div>
                  {/* Recording or conversation summary */}
                  <div className="relative aspect-video bg-black rounded-t-3xl overflow-hidden flex items-center justify-center">
                    {videoSrc ? (
                      <video
                        src={videoSrc}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Sparkles className="h-10 w-10 opacity-40 mb-2" />
                        <span className="text-xs">Conversation summary</span>
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-black/60 backdrop-blur px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      {m.type === "CONVERSATION" ? "Conversation" : m.duration ? `${m.duration}s recording` : "Interaction"}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-foreground leading-snug">
                        {m.title || `Interaction with ${personName}`}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id, m.title || "Interaction Video")}
                        disabled={isDeleting}
                        title="Delete memory permanently"
                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                        <Users className="h-3.5 w-3.5" />
                        {personName} ({relationship})
                      </span>
                    </div>

                    {m.description && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                        {m.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground border-t border-border/50 pt-3">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatTimestamp(m.createdAt || m.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 inline-block">
                    ✓ Persisted to backend
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
