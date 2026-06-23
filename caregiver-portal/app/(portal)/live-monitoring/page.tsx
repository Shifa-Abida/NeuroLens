import Image from "next/image"
import {
  ShieldCheck,
  Clock,
  MapPin,
  Smile,
  Radio,
  Sparkles,
  Cake,
  Home,
  Utensils,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"

const memoryTags = [
  { label: "Birthday Party", icon: Cake },
  { label: "Home Visit", icon: Home },
  { label: "Family Dinner", icon: Utensils },
]

export default function LiveMonitoringPage() {
  return (
    <div>
      <PageHeader
        title="Live Monitoring"
        subtitle="Real-time view of John's current interaction"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Current interaction */}
        <section className="rounded-3xl bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-2">
            <span className="size-2.5 animate-pulse rounded-full bg-destructive" />
            <span className="text-sm font-semibold tracking-wide text-destructive">
              LIVE
            </span>
          </div>

          <h3 className="mt-5 text-xl font-semibold text-foreground">
            Current Interaction
          </h3>

          <div className="mt-5 flex items-center gap-4">
            <Image
              src="/sarah-johnson.png"
              alt="Sarah Johnson"
              width={72}
              height={72}
              className="size-18 rounded-full object-cover"
            />
            <div>
              <p className="text-xl font-bold text-foreground">Sarah Johnson</p>
              <p className="text-muted-foreground">Daughter</p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <ShieldCheck className="size-3.5" />
                Recognized
              </span>
            </div>
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <Detail
              icon={Clock}
              label="Interaction Duration"
              value="12 Minutes"
            />
            <Detail icon={MapPin} label="Location" value="Living Room" />
            <Detail icon={Smile} label="Emotion" value="Happy" />
            <Detail icon={Radio} label="Signal" value="Excellent" />
          </div>
        </section>

        {/* AR view preview */}
        <section className="rounded-3xl bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                AR View Preview
              </p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">
                What John sees
              </h3>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Streaming
            </span>
          </div>

          <div className="mt-5 rounded-3xl bg-slate-900 p-6 text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <span className="size-2 rounded-full bg-emerald-400" />
              Recognized
            </span>

            <div className="mt-5 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
              <p className="text-2xl font-bold">Sarah Johnson</p>
              <p className="text-slate-300">Daughter</p>

              <p className="mt-4 font-medium">You met Sarah yesterday.</p>
              <p className="text-slate-300">
                Last conversation was about family dinner.
              </p>

              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Memory Tags
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {memoryTags.map((tag) => {
                  const Icon = tag.icon
                  return (
                    <span
                      key={tag.label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm"
                    >
                      <Icon className="size-4" />
                      {tag.label}
                    </span>
                  )
                })}
              </div>

              <button
                type="button"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 font-semibold text-slate-900 transition-colors hover:bg-slate-100"
              >
                <Sparkles className="size-5" />
                Recall Memory
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
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
