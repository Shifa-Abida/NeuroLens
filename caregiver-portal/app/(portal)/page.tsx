import Image from "next/image"
import Link from "next/link"
import {
  ShieldCheck,
  MessageSquare,
  Users,
  UserPlus,
  BrainCircuit,
  Clock,
  MapPin,
  Smile,
  ArrowRight,
} from "lucide-react"

const stats = [
  { label: "Today's Interactions", value: "14", icon: MessageSquare },
  { label: "Known People", value: "23", icon: Users },
  { label: "Temporary Contacts", value: "4", icon: UserPlus },
  { label: "Memory Recalls Today", value: "7", icon: BrainCircuit },
]

const timeline = [
  { time: "09:15 AM", title: "Met Sarah Johnson" },
  { time: "10:30 AM", title: "Visited Park" },
  { time: "12:15 PM", title: "Family Lunch" },
  { time: "03:40 PM", title: "Unknown Person Detected" },
]

export default function DashboardPage() {
  return (
    <div>
      <header className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Good afternoon, Linda
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s how John is doing today
        </p>
      </header>

      {/* Patient card */}
      <section className="rounded-3xl bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Image
            src="/john-avatar.png"
            alt="John Smith"
            width={104}
            height={104}
            className="size-24 rounded-3xl object-cover sm:size-26"
          />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-bold text-foreground">John Smith</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                <ShieldCheck className="size-4" />
                Safe
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">
              72 years old · Patient ID NL-2391-5582
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-6 border-t border-border pt-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Current Status
            </p>
            <p className="mt-1 text-lg font-semibold text-emerald-600">Safe</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Last Activity
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              Talking with Sarah Johnson
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Last Updated
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              2 minutes ago
            </p>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
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
              <p className="mt-3 text-4xl font-bold text-foreground">
                {stat.value}
              </p>
            </div>
          )
        })}
      </section>

      {/* Bottom row */}
      <section className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Current interaction */}
        <div className="rounded-3xl bg-card p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground">
              Current Interaction
            </h3>
            <Link
              href="/live-monitoring"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Live view <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <Image
              src="/sarah-johnson.png"
              alt="Sarah Johnson"
              width={56}
              height={56}
              className="size-14 rounded-full object-cover"
            />
            <div>
              <p className="text-lg font-semibold text-foreground">
                Sarah Johnson
              </p>
              <p className="text-muted-foreground">Daughter</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <InfoTile icon={Clock} label="Duration" value="12 Minutes" />
            <InfoTile icon={MapPin} label="Location" value="Living Room" />
            <InfoTile icon={Smile} label="Emotion" value="Happy" />
          </div>
        </div>

        {/* Today timeline */}
        <div className="rounded-3xl bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground">Today</h3>
            <Link
              href="/event-timeline"
              className="text-sm font-medium text-primary hover:underline"
            >
              All events
            </Link>
          </div>
          <ul className="mt-5 space-y-5">
            {timeline.map((event) => (
              <li key={event.time} className="flex gap-3">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{event.time}</p>
                  <p className="font-semibold text-foreground">{event.title}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
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
        <p className="font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}
