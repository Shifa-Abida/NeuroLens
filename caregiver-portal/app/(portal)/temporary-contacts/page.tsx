import { Info, Trash2, UserPlus } from "lucide-react"
import { PageHeader } from "@/components/page-header"

const contacts = [
  {
    name: "Unknown Person #12",
    firstSeen: "June 20",
    lastSeen: "June 22",
    encounters: 4,
    daysRemaining: "5 days",
    progress: 5,
  },
  {
    name: "Unknown Person #13",
    firstSeen: "June 18",
    lastSeen: "June 21",
    encounters: 2,
    daysRemaining: "4 days",
    progress: 4,
  },
  {
    name: "Unknown Person #14",
    firstSeen: "June 17",
    lastSeen: "June 19",
    encounters: 1,
    daysRemaining: "2 days",
    progress: 2,
  },
  {
    name: "Unknown Person #15",
    firstSeen: "June 15",
    lastSeen: "June 20",
    encounters: 3,
    daysRemaining: "6 days",
    progress: 6,
  },
]

export default function TemporaryContactsPage() {
  return (
    <div>
      <PageHeader
        title="Temporary Contacts"
        subtitle="People recently detected but not yet verified"
      />

      <div className="mb-6 flex items-center gap-4 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border/60">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
          <Info className="h-5 w-5" />
        </span>
        <p className="text-sm text-muted-foreground">
          People not encountered again within{" "}
          <span className="font-semibold text-foreground">7 days</span> are
          automatically removed from temporary contacts.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {contacts.map((c) => (
          <div
            key={c.name}
            className="flex flex-col rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-foreground">{c.name}</h3>
              <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                Pending Verification
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-y-5">
              <div>
                <p className="text-sm text-muted-foreground">First Seen</p>
                <p className="font-semibold text-foreground">{c.firstSeen}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Seen</p>
                <p className="font-semibold text-foreground">{c.lastSeen}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Encounters</p>
                <p className="font-semibold text-foreground">{c.encounters}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Days Remaining</p>
                <p className="font-semibold text-foreground">
                  {c.daysRemaining}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Auto-remove countdown</span>
                <span>{c.progress}/7</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(c.progress / 7) * 100}%` }}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <UserPlus className="h-4 w-4" />
                Promote
              </button>
              <button
                type="button"
                aria-label={`Remove ${c.name}`}
                className="flex h-11 w-11 items-center justify-center rounded-full text-destructive ring-1 ring-border transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
