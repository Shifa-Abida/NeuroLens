"use client"

import { useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
} from "recharts"
import { PageHeader } from "@/components/page-header"
import { getEmotionLogs, getPeople } from "@/lib/api"

const fallbackEmotions = [
  {
    label: "Happy",
    emoji: "😊",
    value: 58,
    badgeClass: "bg-emerald-100 text-emerald-700",
    barClass: "bg-emerald-500",
  },
  {
    label: "Neutral",
    emoji: "😐",
    value: 24,
    badgeClass: "bg-sky-100 text-sky-700",
    barClass: "bg-sky-500",
  },
  {
    label: "Confused",
    emoji: "😖",
    value: 12,
    badgeClass: "bg-amber-100 text-amber-700",
    barClass: "bg-amber-500",
  },
  {
    label: "Sad",
    emoji: "😢",
    value: 6,
    badgeClass: "bg-red-100 text-red-700",
    barClass: "bg-red-500",
  },
]

const fallbackDailyData = [
  { x: "1", v: 62 },
  { x: "2", v: 66 },
  { x: "3", v: 70 },
  { x: "4", v: 58 },
  { x: "5", v: 60 },
  { x: "6", v: 74 },
  { x: "7", v: 68 },
  { x: "8", v: 78 },
  { x: "9", v: 72 },
  { x: "10", v: 66 },
  { x: "11", v: 76 },
  { x: "12", v: 84 },
]

const ranges = ["Daily", "Weekly", "Monthly"] as const

export default function EmotionAnalyticsPage() {
  const [range, setRange] = useState<(typeof ranges)[number]>("Daily")
  const [emotions, setEmotions] = useState(fallbackEmotions)
  const [dailyData, setDailyData] = useState(fallbackDailyData)

  useEffect(() => {
    getPeople()
      .then(async (people) => {
        const firstPerson = people[0]

        if (!firstPerson) {
          return
        }

        const logs = await getEmotionLogs(firstPerson.id)

        if (logs.length === 0) {
          return
        }

        const counts = logs.reduce<Record<string, number>>((acc, log) => {
          const key = log.emotion || "Neutral"
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {})
        const total = logs.length

        setEmotions(
          fallbackEmotions.map((emotion) => ({
            ...emotion,
            value: Math.round(((counts[emotion.label] || 0) / total) * 100),
          })),
        )

        setDailyData(
          logs.slice(0, 12).reverse().map((log, index) => ({
            x: String(index + 1),
            v: Math.round((log.confidence || 0) * 100),
          })),
        )
      })
      .catch(() => undefined)
  }, [])

  return (
    <div>
      <PageHeader
        title="Emotion Analytics"
        subtitle="Understand John's mood across the day, week and month"
      />

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

        <div className="mt-8 h-80 w-full">
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
        </div>
      </div>
    </div>
  )
}
