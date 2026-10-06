import { Bell, CircleAlert } from "lucide-react"
import { PageHeader } from "@/components/page-header"

export default function AlertsCenterPage() {
  return (
    <div>
      <PageHeader
        title="Alerts Center"
        subtitle="Caregiver alerts for John Smith"
      />

      <div className="rounded-3xl bg-card p-10 text-center shadow-sm ring-1 ring-border/60">
        <Bell className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">No alert records available</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The backend does not currently provide caregiver alert data.
        </p>
        <CircleAlert className="mx-auto mt-5 size-4 text-muted-foreground/60" />
      </div>
    </div>
  )
}
