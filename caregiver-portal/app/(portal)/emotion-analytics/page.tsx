"use client"

import { useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
} from "recharts"
import { Loader2 } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { getEmotionLogs, getPeople, type EmotionLog } from "@/lib/api"

const ranges = ["Daily", "Weekly", "Monthly"] as const
const emotionStyles: Record<string, { emoji: string; badgeClass: string; barClass: string }> = {
  Happy: { emoji: "😊", badgeClass: "bg-emerald-100 text-emerald-700", barClass: "bg-emerald-500" },
  Neutral: { emoji: "😐", badgeClass: "bg-sky-100 text-sky-700", barClass: "bg-sky-500" },
  Confused: { emoji: "😖", badgeClass: "bg-amber-100 text-amber-700", barClass: "bg-amber-500" },
  Sad: { emoji: "😢", badgeClass: "bg-red-100 text-red-700", barClass: "bg-red-500" },
}

export default function EmotionAnalyticsPage() {
  const [range, setRange] = useState<(typeof ranges)[number]>("Daily")
  const [logs, setLogs] = useState<EmotionLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let active = true

    const loadEmotionLogs = async () => {
      try {
        const people = await getPeople()
        const results = await Promise.all(people.map((person) => getEmotionLogs(person.id)))
        if (active) setLogs(results.flat())
      } catch {
        if (active) setLoadError(true)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadEmotionLogs()
    return () => { active = false }
  }, [])

  const rangeStart = new Date()
  rangeStart.setHours(0, 0, 0, 0)
  if (range === "Weekly") rangeStart.setDate(rangeStart.getDate() - 6)
  if (range === "Monthly") rangeStart.setDate(rangeStart.getDate() - 29)

  const filteredLogs = logs.filter((log) => {
    if (!log.timestamp) return false
    const timestamp = new Date(log.timestamp)
    return !Number.isNaN(timestamp.getTime()) && timestamp >= rangeStart
  })
  const emotionCounts = filteredLogs.reduce<Record<string, number>>((counts, log) => {
    const emotion = log.emotion || "Unspecified"
    counts[emotion] = (counts[emotion] || 0) + 1
    return counts
  }, {})
  const emotions = Object.entries(emotionCounts).map(([label, count]) => ({
    label,
    value: Math.round((count / filteredLogs.length) * 100),
    ...emotionStyles[label] || { emoji: "•", badgeClass: "bg-muted text-muted-foreground", barClass: "bg-muted-foreground" },
  }))
  const dailyData = filteredLogs
    .filter((log) => log.timestamp)
    .sort((left, right) => Date.parse(left.timestamp || "") - Date.parse(right.timestamp || ""))
    .map((log, index) => ({
      x: new Date(log.timestamp!).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) || String(index + 1),
      v: Math.round((log.confidence || 0) * 100),
    }))

  return (
    <div>
      <PageHeader
        title="Emotion Analytics"
        subtitle="Recorded emotion logs for John Smith"
      />

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 rounded-3xl bg-card p-12 text-sm text-muted-foreground shadow-sm ring-1 ring-border/60">
          <Loader2 className="size-5 animate-spin" /> Loading emotion records…
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-800">
          Emotion records could not be loaded from the backend.
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-3xl bg-card p-12 text-center shadow-sm ring-1 ring-border/60">
          <h2 className="text-lg font-semibold text-foreground">No emotion records available</h2>
          <p className="mt-2 text-sm text-muted-foreground">Analytics will appear when emotion logs are saved.</p>
        </div>
      ) : (
      <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {emotions.map((e) => (
          <div
            key={e.label}
            className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60"
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl" aria-hidden="true">
                {e.emoji}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${e.badgeClass}`}
              >
                {e.label}
              </span>
            </div>
            <p className="mt-4 text-4xl font-bold tracking-tight text-foreground">
              {e.value}%
            </p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${e.barClass}`}
                style={{ width: `${e.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Mood overview</h2>
            <p className="text-sm text-muted-foreground">
              Average happiness score
            </p>
          </div>
          <div className="inline-flex rounded-full bg-muted p-1">
            {ranges.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  range === r
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <p className="mt-8 rounded-2xl bg-secondary/40 p-8 text-center text-sm text-muted-foreground">
            No emotion records for this date range.
          </p>
        ) : <div className="mt-8 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dailyData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="oklch(0.62 0.17 248)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor="oklch(0.62 0.17 248)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="oklch(0.9 0.02 235)"
                vertical={false}
              />
              <XAxis
                dataKey="x"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "oklch(0.55 0.03 248)", fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke="oklch(0.62 0.17 248)"
                strokeWidth={2.5}
                fill="url(#moodFill)"
                dot={{
                  r: 4,
                  fill: "#fff",
                  stroke: "oklch(0.62 0.17 248)",
                  strokeWidth: 2,
                }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>}
      </div>
      </>
      )}
    </div>
  )
}
