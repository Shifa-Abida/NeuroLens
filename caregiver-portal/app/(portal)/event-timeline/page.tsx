"use client"

import { useEffect, useState } from "react"
import { Loader2, MapPin, MessageSquare, User, Video, Play, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { getAllMemories, getPeople, getSightings, resolveMediaUrl, type Memory, type Person, type Sighting } from "@/lib/api"

type TimelineEntry =
  | {
      kind: "memory"
      id: string
      personId: string
      timestamp?: string
      title: string
      description?: string
      emotion?: string
      videoUrl?: string
      duration?: number
      type?: string
    }
  | { kind: "sighting"; id: string; personId: string; timestamp?: string; location?: string }

export default function EventTimelinePage() {
  const [people, setPeople] = useState<Person[]>([])
  const [memories, setMemories] = useState<Memory[]>([])
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true)
    else setIsRefreshing(true)
    try {
      const [registeredPeople, registeredMemories] = await Promise.all([
        getPeople().catch(() => [] as Person[]),
        getAllMemories().catch(() => [] as Memory[]),
      ])
      const results = await Promise.all(
        registeredPeople.map((person) => getSightings(person.id).catch(() => [] as Sighting[])),
      )
      setPeople(registeredPeople)
      setMemories(registeredMemories)
      setSightings(results.flat().sort((left, right) =>
        Date.parse(right.timestamp || "") - Date.parse(left.timestamp || ""),
      ))
      setLoadError(false)
    } catch {
      if (!isBackground) setLoadError(true)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    let active = true

    void loadData(false)

    // Poll every 5 seconds so newly persisted 7-second AR recordings appear live
    const interval = setInterval(() => {
      if (active) {
        void loadData(true)
      }
    }, 5000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const timeline: TimelineEntry[] = [
    ...memories.map((memory) => ({
      kind: "memory" as const,
      id: memory.id,
      personId: memory.personId,
      timestamp: memory.timestamp || memory.createdAt,
      title: memory.title,
      description: memory.description,
      emotion: memory.emotion,
      videoUrl: memory.videoUrl,
      duration: memory.duration,
      type: memory.type,
    })),
    ...sightings.map((sighting) => ({
      kind: "sighting" as const,
      id: sighting.id,
      personId: sighting.personId,
      timestamp: sighting.timestamp,
      location: sighting.location,
    })),
  ].sort((left, right) =>
    Date.parse(right.timestamp || "") - Date.parse(left.timestamp || ""),
  )

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <PageHeader
          title="Event Timeline"
          subtitle="Conversation memories, 7-second interaction recordings, and recognized-person sightings"
        />
        <button
          type="button"
          onClick={() => void loadData(false)}
          disabled={isLoading || isRefreshing}
          className="inline-flex items-center gap-2 self-start rounded-full border border-border/80 bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-secondary/60 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60 sm:p-8">
        {loadError ? (
          <p role="alert" className="text-sm text-destructive">Encounter events could not be loaded from the backend.</p>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span>Loading events…</span>
          </div>
        ) : timeline.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No encounters have been recorded.</p>
        ) : (
          <ol className="relative space-y-4">
            {timeline.map((event, index) => {
              const person = people.find((entry) => entry.id === event.personId)
              const isMemory = event.kind === "memory"
              const hasVideo = isMemory && Boolean(event.videoUrl)
              const videoSrc = hasVideo ? resolveMediaUrl(event.videoUrl) : ""
              const Icon = hasVideo ? Video : isMemory ? MessageSquare : event.location ? MapPin : User

              return (
                <li key={`${event.kind}-${event.id}`} className="relative flex gap-5">
                  <div className="relative flex flex-col items-center">
                    <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${hasVideo ? "bg-red-500/15 text-red-500" : "bg-primary/10 text-primary"}`}>
                      <Icon className="size-5" />
                    </span>
                    {index < timeline.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 rounded-2xl bg-secondary/40 p-5 ring-1 ring-border/50">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium text-muted-foreground">
                        {formatDateTime(event.timestamp)}
                      </p>
                      {hasVideo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-500 border border-red-500/20">
                          <Video className="size-3" />
                          {event.duration ? `${event.duration}s recording` : "7s recording"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {isMemory ? event.title : person?.name || "Unregistered person"}
                    </p>
                    {isMemory ? (
                      <>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {person?.name || "Registered person"}{event.emotion ? ` · ${event.emotion}` : ""}
                        </p>
                        {event.description && (
                          <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
                        )}
                        {hasVideo && videoSrc && (
                          <div className="mt-4 max-w-md rounded-2xl overflow-hidden bg-black border border-border shadow-md">
                            <video
                              src={videoSrc}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full aspect-video object-cover"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {event.location || "Location not recorded"}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}

function formatDateTime(value?: string) {
  if (!value) return "Time not recorded"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Time not recorded"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}
