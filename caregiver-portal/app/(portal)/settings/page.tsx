import Image from "next/image"
import {
  Camera,
  ChevronRight,
  ImageIcon,
  Mail,
  Mic,
  Phone,
  UserCog,
  Video,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"

const managementLinks = [
  {
    title: "Edit Patient Information",
    subtitle: "John Smith, 72 years",
    icon: null,
  },
  {
    title: "Manage Family Members",
    subtitle: "4 people linked",
    icon: null,
  },
  {
    title: "Upload Photos",
    subtitle: "Add memories",
    icon: ImageIcon,
  },
  {
    title: "Upload Videos",
    subtitle: "Share moments",
    icon: Video,
  },
  {
    title: "Upload Audio Memories",
    subtitle: "Voice notes & songs",
    icon: Mic,
  },
  {
    title: "Emergency Contacts",
    subtitle: "2 contacts on file",
    icon: null,
  },
]

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Profile & Settings"
        subtitle="Manage caregiver and patient information"
      />

      <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60 sm:p-8">
        <h2 className="text-xl font-bold text-foreground">Caregiver Profile</h2>

        <div className="mt-6 flex items-center gap-5">
          <div className="relative">
            <Image
              src="/linda-smith.png"
              alt="Linda Smith"
              width={88}
              height={88}
              className="h-22 w-22 rounded-2xl object-cover"
            />
            <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-card">
              <Camera className="h-4 w-4" />
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">Linda Smith</p>
            <p className="text-muted-foreground">Primary caregiver</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserCog className="h-4 w-4" /> Name
            </p>
            <p className="mt-1 font-semibold text-foreground">Linda Smith</p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" /> Email
            </p>
            <p className="mt-1 font-semibold text-foreground">
              linda.smith@neurolens.care
            </p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" /> Phone
            </p>
            <p className="mt-1 font-semibold text-foreground">
              +1 (415) 555-0142
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60 sm:p-8">
        <h2 className="text-xl font-bold text-foreground">Patient Management</h2>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {managementLinks.map((link) => {
            const Icon = link.icon
            return (
              <button
                key={link.title}
                type="button"
                className="flex items-center justify-between gap-4 rounded-2xl bg-secondary/40 p-5 text-left ring-1 ring-border/50 transition-shadow hover:shadow-md"
              >
                <span className="flex items-center gap-4">
                  {Icon && (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                      <Icon className="h-5 w-5" />
                    </span>
                  )}
                  <span>
                    <span className="block font-bold text-foreground">
                      {link.title}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {link.subtitle}
                    </span>
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
