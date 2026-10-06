"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Loader2, Users } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { getPeople } from "@/lib/api"

export default function SettingsPage() {
  const [peopleCount, setPeopleCount] = useState<number | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    getPeople()
      .then((people) => setPeopleCount(people.length))
      .catch(() => setLoadError(true))
  }, [])

  return (
    <div>
      <PageHeader
        title="Profile & Settings"
        subtitle="Manage caregiver and patient information"
      />

      <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60 sm:p-8">
        <h2 className="text-xl font-bold text-foreground">Caregiver Profile</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Caregiver profile details are not configured in the backend.
        </p>
      </div>

      <div className="mt-6 rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60 sm:p-8">
        <h2 className="text-xl font-bold text-foreground">Patient Management</h2>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-secondary/40 p-5 ring-1 ring-border/50">
          <div>
            <p className="text-lg font-bold text-foreground">John Smith</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4" />
              {loadError ? "Registered people unavailable" : peopleCount === null ? <Loader2 className="size-4 animate-spin" /> : `${peopleCount} registered people`}
              {loadError && <AlertCircle className="size-4 text-destructive" />}
            </p>
          </div>
          <Link href="/people-database" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Manage people
          </Link>
        </div>
      </div>
    </div>
  )
}
