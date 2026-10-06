"use client"

import { useEffect, useState, useRef } from "react"
import { UserPlus, X, Loader2, Sparkles, Trash2, CheckCircle2, AlertCircle, Camera, User } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { getPeople, createPerson, deletePerson, uploadPhoto, getMemories, resolveMediaUrl, type Person } from "@/lib/api"

export default function PeopleDatabasePage() {
  const [people, setPeople] = useState<Person[]>([])
  const [memoriesCountMap, setMemoriesCountMap] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Registration Form States
  const [name, setName] = useState("")
  const [relationship, setRelationship] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [extractedEmbedding, setExtractedEmbedding] = useState<number[] | null>(null)
  const [faceDetectionStatus, setFaceDetectionStatus] = useState<string>("")
  const [isDetectingFace, setIsDetectingFace] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load face-api models for client-side face embedding extraction from reference photos
  useEffect(() => {
    if (typeof window === "undefined") return

    const loadFaceApi = async () => {
      try {
        if (!(window as any).faceapi) {
          const script = document.createElement("script")
          script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.0.1/dist/face-api.js"
          script.async = true
          document.body.appendChild(script)
          await new Promise((res, rej) => {
            script.onload = res
            script.onerror = rej
          })
        }

        const faceapi = (window as any).faceapi
        const modelUrl = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.0.1/model/"
        if (!faceapi.nets.ssdMobilenetv1.isLoaded) {
          await faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl)
        }
        if (!faceapi.nets.faceLandmark68Net.isLoaded) {
          await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl)
        }
        if (!faceapi.nets.faceRecognitionNet.isLoaded) {
          await faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
        }
        console.log("Caregiver Portal face-api models loaded.")
      } catch (err) {
        console.warn("Face-api models could not be loaded in caregiver portal:", err)
      }
    }

    loadFaceApi()
  }, [])

  const loadPeople = async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const apiPeople = await getPeople()
      setPeople(apiPeople)

      // Fetch memory counts for each person
      const counts: Record<string, number> = {}
      await Promise.all(
        apiPeople.map(async (p) => {
          try {
            const mems = await getMemories(p.id)
            counts[p.id] = mems.length
          } catch {
            counts[p.id] = 0
          }
        })
      )
      setMemoriesCountMap(counts)
    } catch (err) {
      console.warn("Failed to load people from API:", err)
      setLoadError("Could not load people. Confirm the backend is running and MongoDB is reachable.")
      setPeople([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPeople()
  }, [])

  // Process reference photo to extract face embedding
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    setExtractedEmbedding(null)
    setFaceDetectionStatus("Analyzing reference photo for face...")
    setIsDetectingFace(true)

    try {
      const faceapi = (window as any).faceapi
      if (!faceapi) {
        setFaceDetectionStatus("Photo ready. Vision models initializing...")
        setIsDetectingFace(false)
        return
      }

      const img = document.createElement("img")
      img.src = localUrl
      await new Promise((res) => {
        img.onload = res
      })

      const detection = await faceapi
        .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (detection && detection.descriptor) {
        const embedding = Array.from(detection.descriptor) as number[]
        setExtractedEmbedding(embedding)
        setFaceDetectionStatus("Face detected! 128-dimensional embedding created.")
      } else {
        setFaceDetectionStatus("Warning: No clear face detected in photo. Please ensure face is clearly visible.")
      }
    } catch (err) {
      console.error("Face detection on photo failed:", err)
      setFaceDetectionStatus("Photo selected (vision processing skipped).")
    } finally {
      setIsDetectingFace(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !relationship.trim()) {
      setError("Name and Relationship are required.")
      return
    }

    if (!selectedFile) {
      setError("Please upload a reference photo for face identification.")
      return
    }

    setIsSubmitting(true)
    let photoUploaded = false
    try {
      // 1. Upload reference photo to Spring Boot
      const uploadRes = await uploadPhoto(selectedFile)
      const photoUrl = uploadRes.photoUrl
      photoUploaded = true

      // 2. Create person record with face embedding in Spring Boot & MongoDB
      await createPerson({
        name: name.trim(),
        relationship: relationship.trim(),
        photoUrl: photoUrl,
        profilePhotoUrl: photoUrl,
        notes: notes.trim() || undefined,
        faceEmbeddings: extractedEmbedding ? [extractedEmbedding] : [],
        faceSnapshots: [photoUrl],
        trusted: true,
      })

      // Reset form
      setName("")
      setRelationship("")
      setNotes("")
      setSelectedFile(null)
      setPreviewUrl(null)
      setExtractedEmbedding(null)
      setFaceDetectionStatus("")
      setIsModalOpen(false)

      // Reload real people
      await loadPeople()
    } catch (err) {
      console.error(err)
      setError(photoUploaded
        ? "Photo uploaded, but the person profile could not be saved. Check the backend and MongoDB connection."
        : "Photo upload failed. Ensure the backend server is running.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, personName: string) => {
    if (!confirm(`Are you sure you want to delete ${personName}?`)) return
    try {
      await deletePerson(id)
      await loadPeople()
    } catch (err) {
      console.error("Failed to delete person:", err)
      alert("Failed to delete person.")
    }
  }

  return (
    <div className="relative">
      <PageHeader
        title="People Database"
        subtitle="Registered family members and trusted contacts"
      />

      {loadError && (
        <div role="alert" className="mb-5 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="flex-1">{loadError}</p>
          <button
            type="button"
            onClick={loadPeople}
            disabled={isLoading}
            className="rounded-lg border border-amber-600/30 px-3 py-1.5 font-semibold hover:bg-amber-500/10 disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      )}

      <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Registered People</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Caregiver-registered contacts used by NeuroLens for client face recognition
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null)
              setIsModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Add Family / Trusted Person
          </button>
        </div>

        {isLoading ? (
          <div className="mt-12 flex flex-col items-center justify-center space-y-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading registered people from backend...</p>
          </div>
        ) : people.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <User className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">No Registered People Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Teach NeuroLens who the important people are. Click "Add Family / Trusted Person" above to upload a reference photo, name, and relationship.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {people.map((p) => {
              const photo = resolveMediaUrl(p.photoUrl || p.profilePhotoUrl)
              const memCount = memoriesCountMap[p.id] || 0
              return (
                <div
                  key={p.id}
                  className="rounded-2xl bg-secondary/40 p-5 ring-1 ring-border/50 transition-shadow hover:shadow-md relative group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-primary/20 bg-muted flex-shrink-0">
                        {photo ? (
                          <img
                            src={photo}
                            alt={p.name}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <User className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-bold text-foreground truncate">{p.name}</p>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            title="Delete person"
                            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-primary">{p.relationship}</p>
                        {p.faceEmbeddings && p.faceEmbeddings.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-0.5">
                            <CheckCircle2 className="h-3 w-3" /> Face Registered
                          </span>
                        )}
                      </div>
                    </div>

                    {p.notes && (
                      <p className="mt-3 text-xs text-muted-foreground line-clamp-2 bg-background/50 p-2 rounded-lg">
                        {p.notes}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                    <span className="text-xs text-muted-foreground">
                      {memCount === 0 ? "0 memories (First encounter pending)" : `${memCount} memories`}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${memCount === 0 ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                      {memCount === 0 ? "First encounter" : `${memCount} interactions`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Person Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-card p-6 shadow-2xl ring-1 ring-border animate-in zoom-in-95 duration-200 text-foreground my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-xl font-bold text-foreground">Add Family / Trusted Person</h3>
                  <p className="text-xs text-muted-foreground">Identity Reference Registration</p>
                </div>
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
                <div className="rounded-xl bg-destructive/10 p-3.5 text-sm font-medium text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Upload Reference Photo */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Reference Photo <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  NeuroLens will detect the face and save its embedding with this person's profile.
                </p>

                <div className="flex items-center gap-4">
                  {previewUrl ? (
                    <div className="relative h-24 w-24 rounded-2xl overflow-hidden border-2 border-primary shadow-sm flex-shrink-0">
                      <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground bg-secondary/30 flex-shrink-0">
                      <Camera className="h-7 w-7 text-muted-foreground" />
                      <span className="text-[10px] mt-1 font-semibold">Upload Photo</span>
                    </div>
                  )}

                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="photo-upload-input"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl bg-secondary hover:bg-secondary/80 border border-border px-4 py-2 text-xs font-bold text-foreground transition-colors cursor-pointer inline-flex items-center gap-2"
                    >
                      <Camera className="h-4 w-4 text-primary" />
                      {selectedFile ? "Change Photo" : "Choose Reference Photo"}
                    </button>
                    {selectedFile && (
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                </div>

                {/* Face Detection Status Banner */}
                {isDetectingFace && (
                  <div className="mt-2 p-2 rounded-xl bg-primary/10 text-primary text-xs font-medium flex items-center gap-2 animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Analyzing facial features and generating 128-d embedding...</span>
                  </div>
                )}
                {!isDetectingFace && faceDetectionStatus && (
                  <div className={`mt-2 p-2 rounded-xl text-xs font-semibold flex items-center gap-2 ${extractedEmbedding ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                    {extractedEmbedding ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <span>{faceDetectionStatus}</span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="name-input" className="block text-sm font-semibold text-foreground">
                  Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="name-input"
                  type="text"
                  required
                  placeholder="Enter full name"
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
                  placeholder="Enter relationship"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl bg-secondary/50 border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <div>
                <label htmlFor="notes-input" className="block text-sm font-semibold text-foreground">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes-input"
                  placeholder="Optional details to remember"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1.5 w-full rounded-2xl bg-secondary/50 border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
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
                  disabled={isSubmitting || !selectedFile}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer font-bold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving Person...
                    </>
                  ) : (
                    "SAVE PERSON"
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
