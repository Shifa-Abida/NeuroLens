"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { UserPlus, X, Loader2, Sparkles, ShieldCheck } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { getPeople, createPerson, getMemories, type Person } from "@/lib/api"

const fallbackPeople = [
  {
    id: "fallback-1",
    name: "Sarah Johnson",
    relation: "Daughter",
    photo: "/sarah-johnson.png",
    lastSeen: "Last seen · Today, 2:14 PM",
    memories: 38,
  },
  {
    id: "fallback-2",
    name: "Michael Johnson",
    relation: "Son",
    photo: "/michael-johnson.png",
    lastSeen: "Last seen · Yesterday",
    memories: 27,
  },
  {
    id: "fallback-3",
    name: "Emma Johnson",
    relation: "Granddaughter",
    photo: "/emma-johnson.png",
    lastSeen: "Last seen · 3 days ago",
    memories: 19,
  },
  {
    id: "fallback-4",
    name: "Dr. David Lee",
    relation: "Physician",
    photo: "/david-lee.png",
    lastSeen: "Last seen · 1 week ago",
    memories: 8,
  },
]

type UIPerson = {
  id: string
  name: string
  relation: string
  photo: string
  lastSeen: string
  memories: number
}

export default function PeopleDatabasePage() {
  const [people, setPeople] = useState<UIPerson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form Fields
  const [name, setName] = useState("")
  const [relationship, setRelationship] = useState("")
  const [photoUrl, setPhotoUrl] = useState("")
  const [faceId, setFaceId] = useState("")
  const [notes, setNotes] = useState("")

  const loadPeople = async () => {
    setIsLoading(true)
    try {
      const apiPeople = await getPeople()
      if (apiPeople.length > 0) {
        const parsed = await Promise.all(
          apiPeople.map(async (p) => {
            let memoriesCount = 0
            try {
              const mems = await getMemories(p.id)
              memoriesCount = mems.length
            } catch {
              // fallback if memory retrieval fails for a single person
              memoriesCount = 0
            }
            return {
              id: p.id,
              name: p.name,
              relation: p.relationship,
              photo: p.photoUrl || "/placeholder-user.jpg",
              lastSeen: p.faceId ? `Face ID: ${p.faceId}` : "Known person",
              memories: memoriesCount,
            }
          })
        )
        setPeople(parsed)
      } else {
        setPeople(fallbackPeople)
      }
    } catch (err) {
      console.error("Failed to load people from API, showing fallbacks", err)
      setPeople(fallbackPeople)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPeople()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !relationship.trim()) {
      setError("Name and Relationship are required.")
      return
    }

    setIsSubmitting(true)
    try {
      await createPerson({
        name: name.trim(),
        relationship: relationship.trim(),
        photoUrl: photoUrl.trim() || undefined,
        faceId: faceId.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      // Reset form fields
      setName("")
      setRelationship("")
      setPhotoUrl("")
      setFaceId("")
      setNotes("")
      setIsModalOpen(false)

      // Reload lists
      await loadPeople()
    } catch (err) {
      console.error(err)
      setError("Failed to save person to database. Ensure backend server is running.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative">
      <PageHeader
        title="People Database"
        subtitle="Family members and trusted contacts"
      />

      <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60 sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Family Members</h2>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Add person
          </button>
        </div>

        {isLoading ? (
          <div className="mt-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading people database...</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {people.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl bg-secondary/40 p-5 ring-1 ring-border/50 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded-full border border-border">
                    <Image
                      src={p.photo}
                      alt={p.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.relation}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {p.lastSeen}
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {p.memories} memories
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Person Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl ring-1 ring-border animate-in zoom-in-95 duration-200 text-foreground">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-bold text-foreground">Add New Contact</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {error && (
                <div className="rounded-xl bg-destructive/10 p-3.5 text-sm font-medium text-destructive">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="name-input" className="block text-sm font-semibold text-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="name-input"
                  type="text"
                  required
                  placeholder="e.g. Sarah Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl bg-secondary/50 border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <div>
                <label htmlFor="relation-input" className="block text-sm font-semibold text-foreground">
                  Relationship <span className="text-destructive">*</span>
                </label>
                <input
                  id="relation-input"
                  type="text"
                  required
                  placeholder="e.g. Daughter, Caregiver, Son"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl bg-secondary/50 border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <div>
                <label htmlFor="photo-input" className="block text-sm font-semibold text-foreground">
                  Photo URL
                </label>
                <input
                  id="photo-input"
                  type="url"
                  placeholder="e.g. https://example.com/photo.jpg"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl bg-secondary/50 border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <div>
                <label htmlFor="faceid-input" className="block text-sm font-semibold text-foreground">
                  Face ID Reference
                </label>
                <input
                  id="faceid-input"
                  type="text"
                  placeholder="e.g. face_sarah_01"
                  value={faceId}
                  onChange={(e) => setFaceId(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl bg-secondary/50 border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <div>
                <label htmlFor="notes-input" className="block text-sm font-semibold text-foreground">
                  Caregiver Notes
                </label>
                <textarea
                  id="notes-input"
                  placeholder="e.g. Lives in Bangalore. Loves gardening."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-2xl bg-secondary/50 border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-full bg-secondary py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Contact"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
