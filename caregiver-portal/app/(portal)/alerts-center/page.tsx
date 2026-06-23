"use client"

import { useState } from "react"
import { AlertCircle, AlertTriangle, Info } from "lucide-react"
import { PageHeader } from "@/components/page-header"

const filters = ["All", "Critical", "Warning", "Information"] as const

const alerts = [
  {
    severity: "Critical",
    time: "2 minutes ago",
    title: "Patient failed to recognize daughter",
    description:
      "John did not recognize Sarah during their interaction in the living room.",
    icon: AlertCircle,
    accent: "bg-red-500",
    iconClass: "bg-red-100 text-red-600",
    badgeClass: "bg-red-100 text-red-700",
  },
  {
    severity: "Warning",
    time: "1 hour ago",
    title: "High confusion detected",
    description: "Elevated confusion levels during conversation with unknown person.",
    icon: AlertTriangle,
    accent: "bg-amber-500",
    iconClass: "bg-amber-100 text-amber-600",
    badgeClass: "bg-amber-100 text-amber-700",
  },
  {
    severity: "Warning",
    time: "3 hours ago",
    title: "Repeated interaction with unknown person",
    description: "Unknown Person #12 encountered 4 times today.",
    icon: AlertTriangle,
    accent: "bg-amber-500",
    iconClass: "bg-amber-100 text-amber-600",
    badgeClass: "bg-amber-100 text-amber-700",
  },
  {
    severity: "Information",
    time: "5 hours ago",
    title: "Memory recall triggered",
    description: "Birthday Celebration memory was recalled successfully.",
    icon: Info,
    accent: "bg-sky-500",
    iconClass: "bg-sky-100 text-sky-600",
    badgeClass: "bg-sky-100 text-sky-700",
  },
  {
    severity: "Information",
    time: "Today, 8:00 AM",
    title: "Daily emotion report ready",
    description: "John had a mostly happy day yesterday.",
    icon: Info,
    accent: "bg-sky-500",
    iconClass: "bg-sky-100 text-sky-600",
    badgeClass: "bg-sky-100 text-sky-700",
  },
]

export default function AlertsCenterPage() {
  const [filter, setFilter] = useState<string>("All")

  const visible =
    filter === "All" ? alerts : alerts.filter((a) => a.severity === filter)

  return (
    <div>
      <PageHeader
        title="Alerts Center"
        subtitle="Recent caregiver alerts and notifications"
      />

      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-full bg-card p-1.5 shadow-sm ring-1 ring-border/60">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {visible.map((a) => {
          const Icon = a.icon
          return (
            <div
              key={a.title}
              className="relative flex items-start gap-4 overflow-hidden rounded-3xl bg-card p-5 pl-6 shadow-sm ring-1 ring-border/60"
            >
              <span
                className={`absolute left-0 top-0 h-full w-1.5 ${a.accent}`}
                aria-hidden="true"
              />
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${a.iconClass}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.badgeClass}`}
                  >
                    {a.severity}
                  </span>
                  <span className="text-sm text-muted-foreground">{a.time}</span>
                </div>
                <p className="mt-1.5 text-lg font-bold text-foreground">
                  {a.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.description}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-muted"
              >
                Dismiss
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
