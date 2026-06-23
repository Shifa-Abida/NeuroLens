import { AlertTriangle, MapPin, Sparkles, User, Utensils } from "lucide-react"
import { PageHeader } from "@/components/page-header"

const events = [
  {
    time: "09:15 AM",
    title: "Met Sarah Johnson",
    icon: User,
    iconClass: "bg-sky-100 text-sky-600",
  },
  {
    time: "10:30 AM",
    title: "Visited Park",
    icon: MapPin,
    iconClass: "bg-emerald-100 text-emerald-600",
  },
  {
    time: "12:15 PM",
    title: "Family Lunch",
    icon: Utensils,
    iconClass: "bg-sky-100 text-sky-600",
  },
  {
    time: "03:40 PM",
    title: "Unknown Person Detected",
    icon: AlertTriangle,
    iconClass: "bg-red-100 text-red-600",
  },
  {
    time: "05:10 PM",
    title: "Memory Recall Triggered",
    icon: Sparkles,
    iconClass: "bg-amber-100 text-amber-600",
  },
]

export default function EventTimelinePage() {
  return (
    <div>
      <PageHeader
        title="Event Timeline"
        subtitle="Chronological view of today's events"
      />

      <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60 sm:p-8">
        <ol className="relative space-y-4">
          {events.map((e, i) => {
            const Icon = e.icon
            const isLast = i === events.length - 1
            return (
              <li key={e.title} className="relative flex gap-5">
                <div className="relative flex flex-col items-center">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${e.iconClass}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  {!isLast && (
                    <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1 rounded-2xl bg-secondary/40 p-5 ring-1 ring-border/50">
                  <p className="text-sm font-medium text-muted-foreground">
                    {e.time}
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {e.title}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
