import type { ReactNode } from "react"
import { PortalSidebar } from "@/components/portal-sidebar"

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="portal-bg flex min-h-screen">
      <PortalSidebar />
      <main className="flex-1 px-5 py-8 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
