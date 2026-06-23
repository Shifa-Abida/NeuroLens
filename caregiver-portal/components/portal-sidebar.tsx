"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Activity,
  HeartPulse,
  Users,
  UserPlus,
  Library,
  Clock,
  Bell,
  Settings,
  LogOut,
  Brain,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Live Monitoring", href: "/live-monitoring", icon: Activity },
  { label: "Emotion Analytics", href: "/emotion-analytics", icon: HeartPulse },
  { label: "People Database", href: "/people-database", icon: Users },
  { label: "Temporary Contacts", href: "/temporary-contacts", icon: UserPlus },
  { label: "Memory Library", href: "/memory-library", icon: Library },
  { label: "Event Timeline", href: "/event-timeline", icon: Clock },
  { label: "Alerts Center", href: "/alerts-center", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
]

export function PortalSidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-4 m-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-3xl bg-sidebar p-4 shadow-sm lg:flex">
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Brain className="size-6" />
        </div>
        <div className="leading-tight">
          <p className="font-semibold text-sidebar-foreground">NeuroLens</p>
          <p className="text-sm text-muted-foreground">Caregiver Portal</p>
        </div>
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="size-5 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <button
        type="button"
        className="mt-2 flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent"
      >
        <LogOut className="size-5" />
        Logout
      </button>
    </aside>
  )
}
