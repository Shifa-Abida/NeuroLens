"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  MessageSquare,
  Users,
  Video,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { getAllMemories, getPeople, type Memory, type Person } from "@/lib/api"

export default function DashboardPage() {
  const [people, setPeople] = useState<Person[]>([])
  const [memories, setMemories] = useState<Memory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      try {
        const [registeredPeople, registeredMemories] = await Promise.all([
          getPeople(),
          getAllMemories(),
        ])

        if (!active) return
        setPeople(registeredPeople)
        setMemories(registeredMemories.sort((left, right) =>
          Date.parse(right.timestamp || right.createdAt || "") - Date.parse(left.timestamp || left.createdAt || ""),
        ))
        setLoadError(false)
      } catch {
        if (active) setLoadError(true)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadDashboard()
    const refreshInterval = window.setInterval(() => {
      void loadDashboard()
    }, 10000)
    return () => {
      active = false
      window.clearInterval(refreshInterval)
    }
  }, [])

  const today = new Date().toDateString()
  const todayEncounters = memories.filter((memory) => {
    const timestamp = memory.timestamp || memory.createdAt
    return timestamp !== undefined && new Date(timestamp).toDateString() === today
  })
  const latestEncounter = memories[0]
  const latestPerson = people.find((person) => person.id === latestEncounter?.personId)
  const stats = [
    { label: "Today's Encounters", value: String(todayEncounters.length), icon: MessageSquare },
    { label: "Registered People", value: String(people.length), icon: Users },
    { label: "Recorded Memories", value: String(memories.length), icon: Video },
  ]

  return (
    <div>
      <PageHeader title="Caregiver Dashboard" subtitle="Patient: John Smith" />

      {loadError && (
        <div role="alert" className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800">
          <AlertCircle className="size-5 shrink-0" />
          <p>Live dashboard data could not be loaded from the backend.</p>
        </div>
      )}

      {/* Patient card */}
      <section className="rounded-3xl bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex size-24 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-3xl font-bold text-primary" aria-label="John Smith initials">JS</div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-bold text-foreground">John Smith</h2>
              <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-muted-foreground">
                Patient
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">Patient profile</p>
          </div>
        </div>

        <div className="mt-7 grid gap-6 border-t border-border pt-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Latest Encounter
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {latestEncounter?.personName || latestPerson?.name || "No encounters recorded"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Memory Summary
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {latestEncounter?.title || "Not recorded"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Encounter Time
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {formatDateTime(latestEncounter?.timestamp || latestEncounter?.createdAt)}
            </p>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-3xl bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="size-5" />
                </span>
              </div>
              <p className="mt-3 text-4xl font-bold text-foreground" aria-live="polite">
                {isLoading ? <Loader2 className="size-8 animate-spin" /> : stat.value}
              </p>
            </div>
          )
        })}
      </section>

      {/* Bottom row */}
      <section className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Latest encounter */}
        <div className="rounded-3xl bg-card p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground">
              Latest Encounter
            </h3>
            <Link
              href="/live-monitoring"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Live view <ArrowRight className="size-4" />
            </Link>
          </div>

          {latestEncounter ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoTile icon={Users} label="Person" value={latestEncounter.personName || latestPerson?.name || "Registered person"} />
              <InfoTile icon={Sparkles} label="Memory summary" value={latestEncounter.title || "Conversation recorded"} />
              <InfoTile icon={MessageSquare} label="Emotion" value={latestEncounter.emotion || "Not recorded"} />
              <InfoTile icon={Clock} label="Time" value={formatDateTime(latestEncounter.timestamp || latestEncounter.createdAt)} />
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-secondary/50 p-5 text-sm text-muted-foreground">
              {isLoading ? "Loading encounters…" : "No encounter data is available yet."}
            </p>
          )}
        </div>

        {/* Recent encounters */}
        <div className="rounded-3xl bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground">Recent Encounters</h3>
            <Link
              href="/event-timeline"
              className="text-sm font-medium text-primary hover:underline"
            >
              All events
            </Link>
          </div>
          {memories.length > 0 ? (
            <ul className="mt-5 space-y-5">
              {memories.slice(0, 4).map((memory) => {
                const person = people.find((entry) => entry.id === memory.personId)
                return <li key={memory.id} className="flex gap-3">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{formatDateTime(memory.timestamp || memory.createdAt)}</p>
                  <p className="font-semibold text-foreground">{memory.personName || person?.name || "Registered person"}</p>
                  <p className="text-sm text-muted-foreground">{memory.title}</p>
                </div>
              </li>
              })}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              {isLoading ? "Loading encounters…" : "No conversation encounters have been recorded."}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function formatDateTime(value?: string) {
  if (!value) return "Not recorded"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-4">
      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="break-words font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}
