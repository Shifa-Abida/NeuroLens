"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Bell, CircleAlert, ShieldAlert, X } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { getAlertWebSocketUrl, getSafetyAlerts, ignoreSafetyAlert, type SafetyAlert } from "@/lib/api"

const categoryLabels: Record<string, string> = {
  PHYSICAL_THREAT: "Potential Physical Threat",
  INTIMIDATION: "Potential Intimidation",
  AGGRESSIVE_LANGUAGE: "Aggressive Language",
  PROFANITY: "Profanity",
}

function formatAlertTime(timestamp?: string) {
  if (!timestamp) return "Just now"
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

export default function AlertsCenterPage() {
  const [alerts, setAlerts] = useState<SafetyAlert[]>([])
  const [connectionStatus, setConnectionStatus] = useState("Connecting")
  const [error, setError] = useState<string | null>(null)
  const notifiedAlertIdsRef = useRef<Set<string>>(new Set())

  const activeAlerts = useMemo(
    () => alerts.filter((alert) => alert.status === "ACTIVE"),
    [alerts],
  )

  useEffect(() => {
    let cancelled = false

    getSafetyAlerts("ACTIVE")
      .then((items) => {
        if (!cancelled) setAlerts(items)
      })
      .catch((loadError) => {
        console.error("Could not load safety alerts:", loadError)
        if (!cancelled) setError("Safety alerts could not be loaded from the backend.")
      })

    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission()
    }

    const socket = new WebSocket(getAlertWebSocketUrl())
    socket.onopen = () => setConnectionStatus("Live")
    socket.onclose = () => setConnectionStatus("Disconnected")
    socket.onerror = () => {
      setConnectionStatus("Disconnected")
      setError("Live alert connection is unavailable.")
    }
    socket.onmessage = (event) => {
      const alert = JSON.parse(event.data) as SafetyAlert
      setAlerts((current) => {
        const withoutExisting = current.filter((item) => item.alertId !== alert.alertId)
        return alert.status === "ACTIVE"
          ? [alert, ...withoutExisting]
          : withoutExisting
      })

      if (alert.status === "ACTIVE" && !notifiedAlertIdsRef.current.has(alert.alertId)) {
        notifiedAlertIdsRef.current.add(alert.alertId)
        if ("Notification" in window && Notification.permission === "granted") {
          const notification = new Notification("NeuroLens - Potential Safety Concern", {
            body: `Potentially concerning language detected:\n"${alert.triggerText}"`,
          })
          notification.onclick = () => {
            window.focus()
            window.location.hash = alert.alertId
          }
        }
      }
    }

    return () => {
      cancelled = true
      socket.close()
    }
  }, [])

  const handleIgnore = async (alertId: string) => {
    try {
      const ignored = await ignoreSafetyAlert(alertId)
      setAlerts((current) => current.filter((alert) => alert.alertId !== ignored.alertId))
    } catch (ignoreError) {
      console.error("Could not ignore safety alert:", ignoreError)
      setError("Alert could not be ignored. Please check the backend connection.")
    }
  }

  return (
    <div>
      <PageHeader
        title="Alerts Center"
        subtitle="Potentially concerning speech detected during live encounters"
      />

      <div className="mb-5 flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Bell className="size-5 text-destructive" />
          <div>
            <p className="text-sm font-semibold text-foreground">Live alert listener</p>
            <p className="text-xs text-muted-foreground">Desktop notifications use the exact detected speech.</p>
          </div>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          {connectionStatus}
        </span>
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800">
          <CircleAlert className="size-4" />
          {error}
        </div>
      )}

      {activeAlerts.length === 0 ? (
        <div className="rounded-3xl bg-card p-10 text-center shadow-sm ring-1 ring-border/60">
          <Bell className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">No active safety alerts</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Normal conversation is ignored. Potential safety concerns will appear here immediately.
          </p>
          <CircleAlert className="mx-auto mt-5 size-4 text-muted-foreground/60" />
        </div>
      ) : (
        <div className="space-y-4">
          {activeAlerts.map((alert) => (
            <article
              key={alert.alertId}
              id={alert.alertId}
              className="rounded-2xl border border-destructive/30 bg-card p-5 shadow-sm ring-1 ring-destructive/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-1 size-5 text-destructive" />
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Potential Safety Concern</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Person: <span className="font-semibold text-foreground">{alert.personName}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleIgnore(alert.alertId)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
                >
                  <X className="size-3.5" />
                  Ignore Alert
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Detected speech</p>
                  <p className="mt-1 rounded-xl bg-muted p-4 text-sm font-medium text-foreground">
                    "{alert.triggerText}"
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Category</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {categoryLabels[alert.category] || alert.category}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Severity</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{alert.severity}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Time</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{formatAlertTime(alert.timestamp)}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
