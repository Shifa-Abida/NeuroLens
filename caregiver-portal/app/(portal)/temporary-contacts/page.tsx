import { UserRoundSearch } from "lucide-react"
import { PageHeader } from "@/components/page-header"

export default function TemporaryContactsPage() {
  return (
    <div>
      <PageHeader
        title="Temporary Contacts"
        subtitle="Unverified encounters for John Smith"
      />

      <div className="rounded-3xl bg-card p-10 text-center shadow-sm ring-1 ring-border/60">
        <UserRoundSearch className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">Temporary contacts aren’t available</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The backend does not currently store unverified contact records.
        </p>
      </div>
    </div>
  )
}
