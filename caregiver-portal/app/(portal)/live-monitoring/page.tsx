"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Clock, Loader2, MapPin, User } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { getPeople, getSightings, type Person, type Sighting } from "@/lib/api"

export default function LiveMonitoringPage() {
  const [people, setPeople] = useState<Person[]>([])
  const [latestSighting, setLatestSighting] = useState<Sighting | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let active = true

    const loadLatestSighting = async () => {
      try {
        const registeredPeople = await getPeople()
        const sightings = (await Promise.all(
          registeredPeople.map((person) => getSightings(person.id)),
        )).flat().sort((left, right) =>
          Date.parse(right.timestamp || "") - Date.parse(left.timestamp || ""),
        )
        if (!active) return
        setPeople(registeredPeople)
        setLatestSighting(sightings[0] || null)
      } catch {
        if (active) setLoadError(true)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadLatestSighting()
    return () => { active = false }
  }, [])

  const person = people.find((entry) => entry.id === latestSighting?.personId)

  return (
    <div>
      <PageHeader
        title="Live Monitoring"
        subtitle="Latest saved encounter for John Smith"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Latest saved encounter */}
        <section className="rounded-3xl bg-card p-6 shadow-sm sm:p-8">
          <h3 className="text-xl font-semibold text-foreground">Latest Saved Encounter</h3>
          {loadError ? (
            <p role="alert" className="mt-5 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" /> Encounter data could not be loaded.
            </p>
          ) : isLoading ? (
            <div className="mt-5 flex items-center gap-3 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" /> Loading encounter data…
            </div>
          ) : latestSighting ? (
            <div className="mt-6 space-y-5">
              <Detail icon={User} label="Person" value={person?.name || "Unregistered person"} />
              <Detail icon={MapPin} label="Location" value={latestSighting.location || "Not recorded"} />
              <Detail icon={Clock} label="Time" value={formatDateTime(latestSighting.timestamp)} />
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">No saved encounters are available.</p>
          )}
        </section>

        {/* Streaming availability */}
        <section className="rounded-3xl bg-card p-6 shadow-sm sm:p-8">
          <h3 className="text-xl font-semibold text-foreground">Live Camera Feed</h3>
          <p className="mt-3 rounded-2xl bg-secondary/50 p-5 text-sm text-muted-foreground">
            The backend does not provide a live camera stream. Saved encounter records are shown here when available.
          </p>
        </section>
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

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}
