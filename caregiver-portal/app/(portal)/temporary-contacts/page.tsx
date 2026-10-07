"use client"

import { useEffect, useState } from "react"
import { UserRoundSearch, Clock, Calendar, Eye, ShieldCheck, Edit3, Trash2, CheckCircle2, AlertCircle, RefreshCw, Sparkles, UserPlus, X, Loader2, Video } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { getTemporaryVisitors, updatePerson, promoteTemporaryVisitor, deletePerson, purgeExpiredVisitors, resolveMediaUrl, getMemories, type Person } from "@/lib/api"

export default function TemporaryContactsPage() {
  const [visitors, setVisitors] = useState<Person[]>([])
  const [memoriesCountMap, setMemoriesCountMap] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Edit / Promote modal state
  const [selectedVisitor, setSelectedVisitor] = useState<Person | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editRelationship, setEditRelationship] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const loadVisitors = async (showLoading = false) => {
    if (showLoading) setIsLoading(true)
    setLoadError(null)
    try {
      const data = await getTemporaryVisitors()
      setVisitors(data)

      // Fetch memory counts for visitors
      const counts: Record<string, number> = {}
      await Promise.all(
        data.map(async (v) => {
          try {
            const mems = await getMemories(v.id)
            counts[v.id] = mems.length
          } catch {
            counts[v.id] = 0
          }
        })
      )
      setMemoriesCountMap(counts)
    } catch (err) {
      console.warn("Failed to load temporary visitors:", err)
      setLoadError("Could not connect to backend server. Make sure the backend is active.")
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVisitors(true)
    // Auto-refresh every 3.5 seconds to capture new unknown visitors detected in AR camera
    const interval = setInterval(() => {
      loadVisitors(false)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  const handleOpenEditModal = (visitor: Person) => {
    setSelectedVisitor(visitor)
    setEditName(visitor.name || "")
    setEditRelationship(visitor.relationship || "Visitor")
    setEditNotes(visitor.notes || "")
    setModalError(null)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVisitor) return
    setIsSubmitting(true)
    setModalError(null)

    try {
      await updatePerson(selectedVisitor.id, {
        name: editName.trim() || selectedVisitor.name,
        relationship: editRelationship.trim() || selectedVisitor.relationship,
        notes: editNotes.trim(),
      })
      setActionSuccess(`Updated details for ${editName.trim() || selectedVisitor.name}`)
      setIsEditModalOpen(false)
      setTimeout(() => setActionSuccess(null), 4000)
      await loadVisitors(false)
    } catch (err) {
      console.error("Failed to update visitor:", err)
      setModalError("Failed to update visitor details. Check server connection.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePromote = async (visitor: Person) => {
    const defaultName = visitor.name.startsWith("Unknown Visitor") ? "" : visitor.name
    const promptName = window.prompt("Enter the person's full name to register:", defaultName || "Rahul")
    if (!promptName || !promptName.trim()) return

    const promptRel = window.prompt("Enter relationship to patient (e.g., Friend, Neighbor, Doctor):", "Friend")
    if (!promptRel || !promptRel.trim()) return

    try {
      await promoteTemporaryVisitor(visitor.id, {
        name: promptName.trim(),
        relationship: promptRel.trim(),
        notes: visitor.notes || `Promoted to trusted contact from temporary visitor on ${new Date().toLocaleDateString()}`,
      })
      setActionSuccess(`Promoted ${promptName.trim()} to Registered People!`)
      setTimeout(() => setActionSuccess(null), 5000)
      await loadVisitors(false)
    } catch (err) {
      console.error("Failed to promote visitor:", err)
      alert("Failed to promote temporary visitor to registered contact.")
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return
    try {
      await deletePerson(id)
      setActionSuccess(`Removed ${name}`)
      setTimeout(() => setActionSuccess(null), 3000)
      await loadVisitors(false)
    } catch (err) {
      console.error("Failed to delete visitor:", err)
      alert("Failed to delete temporary visitor.")
    }
  }

  const handlePurgeExpired = async () => {
    try {
      const res = await purgeExpiredVisitors()
      setActionSuccess(`4-Day retention cleanup completed. Purged ${res.purgedCount} expired temporary visitors.`)
      setTimeout(() => setActionSuccess(null), 5000)
      await loadVisitors(false)
    } catch (err) {
      console.error("Failed to purge expired visitors:", err)
      alert("Failed to run expiration cleanup.")
    }
  }

  const formatDateTime = (ts?: string) => {
    if (!ts) return "Just now"
    try {
      const d = new Date(ts)
      if (isNaN(d.getTime())) return ts
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return ts
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4">
        <PageHeader
          title="Temporary Contacts"
          subtitle="Unverified visitors and encounters captured by NeuroLens vision system"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadVisitors(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </button>
          <button
            onClick={handlePurgeExpired}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 transition-colors"
          >
            <Clock className="size-3.5" />
            Clean Expired (&gt;4 Days)
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {loadError && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800">
          <AlertCircle className="size-5 text-amber-600 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      <div className="mb-6 rounded-2xl bg-blue-500/5 border border-blue-500/15 p-4 text-xs text-blue-900/80 flex items-start gap-3">
        <Sparkles className="size-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-blue-900">4-Day Unknown Visitor Retention Policy: </span>
          Unregistered visitors automatically receive a temporary identity and real photo when seen by the AR headset. If they return within 4 days, their encounter count increases and a 15-second interaction memory is recorded. Unverified visitors who do not return for 4 days are automatically expired. Registered family members never expire.
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="mt-4 text-sm font-medium">Scanning temporary contacts...</p>
        </div>
      ) : visitors.length === 0 ? (
        <div className="rounded-3xl bg-card p-12 text-center shadow-sm ring-1 ring-border/60">
          <UserRoundSearch className="mx-auto size-10 text-muted-foreground/60" />
          <h2 className="mt-4 text-lg font-bold text-foreground">No Unknown Visitors Detected</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            When an unregistered person appears in front of the NeuroLens AR camera, their real photo and visit record will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visitors.map((visitor) => {
            const photoSrc = resolveMediaUrl(visitor.photoUrl || visitor.profilePhotoUrl)
            const memCount = memoriesCountMap[visitor.id] || 0

            return (
              <div
                key={visitor.id}
                className="group rounded-3xl bg-card border border-border/70 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="relative size-16 shrink-0 rounded-2xl overflow-hidden bg-muted border border-border">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={visitor.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center text-muted-foreground font-bold">
                            ?
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 size-3 rounded-full bg-amber-500 ring-2 ring-background" title="Temporary Contact" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">
                          {visitor.name}
                        </h3>
                        <p className="text-xs font-medium text-muted-foreground">
                          {visitor.relationship || "Visitor"}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-500/20">
                            Unknown Visitor
                          </span>
                          {memCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600 border border-red-500/20">
                              <Video className="size-2.5" />
                              {memCount} {memCount === 1 ? "memory" : "memories"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2 rounded-2xl bg-secondary/30 p-3.5 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Eye className="size-3.5 text-primary" />
                        Total Encounters:
                      </span>
                      <span className="font-bold text-foreground">
                        {visitor.timesSeen || 1} {visitor.timesSeen === 1 ? "visit" : "visits"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        First Seen:
                      </span>
                      <span className="font-medium text-foreground">{formatDateTime(visitor.firstSeen)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-muted-foreground" />
                        Last Encounter:
                      </span>
                      <span className="font-medium text-foreground">{formatDateTime(visitor.lastSeen)}</span>
                    </div>
                  </div>

                  {visitor.notes && (
                    <p className="mt-3 text-xs text-muted-foreground italic line-clamp-2 px-1">
                      "{visitor.notes}"
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(visitor)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                      title="Edit visitor details"
                    >
                      <Edit3 className="size-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(visitor.id, visitor.name)}
                      className="inline-flex items-center justify-center rounded-xl p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-colors"
                      title="Delete visitor"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => handlePromote(visitor)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
                  >
                    <UserPlus className="size-3.5" />
                    Register Person
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Visitor Modal */}
      {isEditModalOpen && selectedVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-5 right-5 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="size-12 rounded-2xl overflow-hidden bg-muted border border-border shrink-0">
                <img
                  src={resolveMediaUrl(selectedVisitor.photoUrl || selectedVisitor.profilePhotoUrl) || "/placeholder-user.jpg"}
                  alt={selectedVisitor.name}
                  className="size-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Edit Unknown Visitor</h3>
                <p className="text-xs text-muted-foreground">Update notes or identify this visitor</p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Visitor Name / Label
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. John Doe, Delivery Person, Hackathon Judge"
                  className="w-full rounded-xl bg-secondary/40 border border-border px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Relationship / Role
                </label>
                <input
                  type="text"
                  value={editRelationship}
                  onChange={(e) => setEditRelationship(e.target.value)}
                  placeholder="e.g. Visitor, Friend, Neighbor, Postman"
                  className="w-full rounded-xl bg-secondary/40 border border-border px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Notes & Observations
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Context about this visitor..."
                  rows={3}
                  className="w-full rounded-xl bg-secondary/40 border border-border px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
                >
                  {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
