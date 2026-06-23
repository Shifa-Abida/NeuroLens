"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Calendar, ImageIcon, MapPin, Mic, Play, Users, Video } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { getAllMemories, getPeople } from "@/lib/api"

const tabs = [
  { label: "Videos", icon: Video },
  { label: "Photos", icon: ImageIcon },
  { label: "Audio Memories", icon: Mic },
] as const

const fallbackMemories = [
  {
    title: "Birthday Celebration",
    image: "/birthday-balloons.png",
    date: "2 Weeks Ago",
    location: "Grandma's House",
    people: "Sarah Johnson",
  },
  {
    title: "Wedding Anniversary",
    image: "/wedding-table.png",
    date: "2 Months Ago",
    location: "Garden",
    people: "Sarah Johnson, Michael Johnson",
  },
]

export default function MemoryLibraryPage() {
  const [active, setActive] = useState<string>("Videos")
  const [memories, setMemories] = useState(fallbackMemories)

  useEffect(() => {
    getPeople()
      .then(async (people) => {
        const allMemories = await getAllMemories(people)

        if (allMemories.length === 0) {
          return
        }

        const peopleById = new Map(
          people.map((person) => [person.id, person.name]),
        )

        setMemories(
          allMemories.map((memory) => ({
            title: memory.title,
            image: "/placeholder.jpg",
            date: memory.timestamp
              ? new Date(memory.timestamp).toLocaleDateString()
              : "Saved memory",
            location: memory.emotion || "NeuroLens",
            people: peopleById.get(memory.personId) || memory.personId,
          })),
        )
      })
      .catch(() => undefined)
  }, [])

  return (
    <div>
      <PageHeader
        title="Memory Library"
        subtitle="A growing collection of John's cherished moments"
      />

      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-full bg-card p-1.5 shadow-sm ring-1 ring-border/60">
        {tabs.map((t) => {
          const Icon = t.icon
          const isActive = active === t.label
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => setActive(t.label)}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {active === "Videos" ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {memories.map((m) => (
            <div
              key={m.title}
              className="overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border/60"
            >
              <div className="relative aspect-video">
                <Image
                  src={m.image || "/placeholder.svg"}
                  alt={m.title}
                  fill
                  className="object-cover"
                />
                <span className="absolute left-4 top-4 rounded-full bg-card/80 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
                  Videos
                </span>
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-card/90 text-primary shadow-lg">
                    <Play className="h-6 w-6 fill-current" />
                  </span>
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-foreground">{m.title}</h3>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {m.date}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {m.location}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {m.people}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-card p-12 text-center shadow-sm ring-1 ring-border/60">
          <p className="text-muted-foreground">
            No {active.toLowerCase()} to display yet.
          </p>
        </div>
      )}
    </div>
  )
}
