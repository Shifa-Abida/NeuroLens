"use client"

import { useEffect, useState } from "react"
import { Loader2, MapPin, MessageSquare, User } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { getAllMemories, getPeople, getSightings, type Memory, type Person, type Sighting } from "@/lib/api"

type TimelineEntry =
  | { kind: "memory"; id: string; personId: string; timestamp?: string; title: string; description?: string; emotion?: string }
  | { kind: "sighting"; id: string; personId: string; timestamp?: string; location?: string }

export default function EventTimelinePage() {
  const [people, setPeople] = useState<Person[]>([])
  const [memories, setMemories] = useState<Memory[]>([])
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let active = true

    const loadSightings = async () => {
      try {
        const [registeredPeople, registeredMemories] = await Promise.all([
          getPeople(),
          getAllMemories(),
        ])
        const results = await Promise.all(
          registeredPeople.map((person) => getSightings(person.id)),
        )
        if (!active) return
        setPeople(registeredPeople)
        setMemories(registeredMemories)
        setSightings(results.flat().sort((left, right) =>
          Date.parse(right.timestamp || "") - Date.parse(left.timestamp || ""),
        ))
      } catch {
        if (active) setLoadError(true)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadSightings()
    return () => { active = false }
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
      <PageHeader
        title="Event Timeline"
        subtitle="Conversation memories and recognized-person sightings"
      />

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
              const Icon = isMemory ? MessageSquare : event.location ? MapPin : User
              return (
                <li key={`${event.kind}-${event.id}`} className="relative flex gap-5">
                  <div className="relative flex flex-col items-center">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    {index < sightings.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 rounded-2xl bg-secondary/40 p-5 ring-1 ring-border/50">
                    <p className="text-sm font-medium text-muted-foreground">
                      {formatDateTime(event.timestamp)}
                    </p>
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
