import type { Memory, Person } from "@/components/neurolens/types"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

export type ApiPerson = {
  id: string
  personId?: string
  clientId?: string
  name: string
  relationship: string
  photoUrl?: string
  profilePhotoUrl?: string
  faceId?: string
  notes?: string
  trusted?: boolean
  firstSeen?: string
  lastSeen?: string
  timesSeen?: number
  createdAt?: string
}

export type ApiMemory = {
  id: string
  memoryId?: string
  clientId?: string
  personId: string
  personName?: string
  relationship?: string
  title: string
  description?: string
  emotion?: string
  videoUrl?: string
  duration?: number
  type?: string
  status?: string
  timestamp?: string
  createdAt?: string
}

export type ConversationSummary = {
  summary: string
  emotion: string
}

export function resolveMediaUrl(url?: string): string {
  if (!url) return ""
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url
  }
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function getRecognizedPerson(personId?: string): Promise<Person> {
  const resolvedPersonId = personId || (await getFirstPersonId())

  if (!resolvedPersonId) {
    throw new Error("No person id available")
  }

  // 1. Fetch real Person record from Spring Boot
  const apiPerson = await fetchJson<ApiPerson>(`/api/persons/${resolvedPersonId}`)

  // 2. Fetch real Memories from Spring Boot
  let memories: ApiMemory[] = []
  try {
    memories = await fetchJson<ApiMemory[]>(`/api/memories/person/${resolvedPersonId}`)
  } catch (err) {
    try {
      memories = await fetchJson<ApiMemory[]>(`/api/memory/${resolvedPersonId}`)
    } catch {
      memories = []
    }
  }

  // 3. Construct real Person object — DO NOT INVENT FAKE MEMORIES
  const mappedPerson: Person = {
    id: apiPerson.id || apiPerson.personId || resolvedPersonId,
    name: apiPerson.name,
    relationship: apiPerson.relationship,
    profileImage: resolveMediaUrl(apiPerson.photoUrl || apiPerson.profilePhotoUrl) || "/placeholder-user.jpg",
    lastMet: apiPerson.lastSeen ? formatRealDate(apiPerson.lastSeen) : "First encounter",
    lastLocation: "Living Room",
    tags: apiPerson.timesSeen ? [`${apiPerson.timesSeen} encounters`] : [],
    notes: apiPerson.notes,
    memories: memories.map((m, idx) => mapMemoryResponse(m, idx))
  }

  return mappedPerson
}

export async function getPersonMemories(personId: string): Promise<ApiMemory[]> {
  try {
    return await fetchJson<ApiMemory[]>(`/api/memories/person/${personId}`)
  } catch {
    return []
  }
}

async function getFirstPersonId(): Promise<string | undefined> {
  const people = await fetchJson<ApiPerson[]>("/api/persons")
  return people[0]?.id
}

function formatRealDate(timestamp?: string): string {
  if (!timestamp) return "Recorded interaction"
  try {
    const d = new Date(timestamp)
    if (isNaN(d.getTime())) return timestamp
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  } catch {
    return timestamp
  }
}

function mapMemoryResponse(mem: ApiMemory, index: number): Memory {
  const realDate = formatRealDate(mem.createdAt || mem.timestamp)
  const videoSrc = resolveMediaUrl(mem.videoUrl)

  return {
    id: mem.id || mem.memoryId || `${mem.personId}-memory-${index}`,
    personId: mem.personId,
    title: mem.title || "Interaction Recording",
    date: realDate,
    timestamp: realDate,
    location: "Living Room",
    description: mem.description || mem.title || "Video interaction recorded by NeuroLens",
    image: "/placeholder.jpg",
    emoji: "🎥",
    emotionalImportance: Math.max(1, 10 - index),
    video: videoSrc || undefined,
    thumbnail: videoSrc || undefined,
  }
}

export type RecognizeResponse = {
  matched: boolean
  confidence: number
  person?: Person
}

export async function recognizeFace(embedding: number[]): Promise<RecognizeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/persons/recognize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ embedding }),
  })

  if (!response.ok) {
    throw new Error(`Recognition failed: ${response.status}`)
  }

  const result = await response.json()
  if (result.matched && result.person) {
    const fullPerson = await getRecognizedPerson(result.person.id)
    return {
      matched: true,
      confidence: result.confidence,
      person: fullPerson
    }
  }

  return {
    matched: false,
    confidence: result.confidence
  }
}

export async function uploadRecordedMemory(formData: FormData): Promise<ApiMemory> {
  const response = await fetch(`${API_BASE_URL}/api/memories/upload`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => "")
    throw new Error(`Upload failed (${response.status}): ${errText}`)
  }

  return response.json()
}

export async function registerPerson(data: {
  name: string
  relationship: string
  faceEmbeddings: number[][]
  faceSnapshots: string[]
  notes?: string
}): Promise<Person> {
  const response = await fetch(`${API_BASE_URL}/api/persons`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...data,
      photoUrl: data.faceSnapshots[0] || "",
      profilePhotoUrl: data.faceSnapshots[0] || "",
      trusted: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`Registration failed: ${response.status}`)
  }

  const apiPerson = await response.json()
  return {
    id: apiPerson.id,
    name: apiPerson.name,
    relationship: apiPerson.relationship,
    profileImage: resolveMediaUrl(apiPerson.photoUrl || apiPerson.profilePhotoUrl) || "/placeholder-user.jpg",
    lastMet: "Just registered",
    lastLocation: "Living Room",
    tags: [],
    memories: [],
    notes: apiPerson.notes
  }
}

export async function updatePersonProfile(data: {
  personId: string
  name: string
  relationship: string
  notes: string
}): Promise<ApiPerson> {
  const response = await fetch(`${API_BASE_URL}/api/persons/${data.personId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name,
      relationship: data.relationship,
      notes: data.notes,
    }),
  })

  if (!response.ok) {
    throw new Error(`Profile update failed: ${response.status}`)
  }

  return response.json() as Promise<ApiPerson>
}

export async function logSighting(data: {
  personId: string
  sceneSnapshot: string
  location: string
}): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/sightings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Logging sighting failed: ${response.status}`)
  }

  return response.json()
}

export async function saveMemory(data: {
  personId: string
  title: string
  description?: string
  emotion?: string
  type?: string
  duration?: number
}): Promise<ApiMemory> {
  const response = await fetch(`${API_BASE_URL}/api/memories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Saving memory failed: ${response.status}`)
  }

  return response.json() as Promise<ApiMemory>
}

export async function summarizeConversation(transcript: string): Promise<ConversationSummary> {
  const response = await fetch("/api/summarize-conversation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  })

  const result = await response.json() as ConversationSummary | { error?: string }
  if (!response.ok) {
    throw new Error("error" in result && result.error
      ? result.error
      : `Conversation summarization failed: ${response.status}`)
  }
  if (!("summary" in result) || !result.summary.trim() || !result.emotion.trim()) {
    throw new Error("Gemini returned an incomplete conversation summary.")
  }

  return result
}

export async function saveConversation(data: {
  personId: string
  transcript: string
}): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/conversation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Saving conversation failed: ${response.status}`)
  }

  return response.json()
}

export async function parseIntroPhrase(text: string): Promise<{ name: string; relationship: string }> {
  try {
    const response = await fetch('/api/parse-intro', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      throw new Error(`NLP API failed with status ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    const clean = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim()
    let name = ""
    let relationship = ""

    const nameMatch = clean.match(/(?:this is|i am|my name is)\s+([a-zA-Z]+)/i)
    if (nameMatch) {
      name = nameMatch[1]
    }

    const relMatch = clean.match(/(?:i am your|im your|he is my|she is my|your|my|a|an)\s+([a-zA-Z]+)/i)
    if (relMatch) {
      const pRel = relMatch[1].toLowerCase()
      if (pRel !== name.toLowerCase()) {
        relationship = relMatch[1]
      }
    }

    name = name ? name.charAt(0).toUpperCase() + name.slice(1) : ""
    relationship = relationship ? relationship.charAt(0).toUpperCase() + relationship.slice(1) : ""

    return { name, relationship }
  }
}

export async function parseMemoryPhrase(text: string): Promise<{ hasMemory: boolean; title: string; emotion: string }> {
  try {
    const response = await fetch('/api/parse-memory', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      throw new Error(`NLP Memory API failed with status ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    return { hasMemory: false, title: "", emotion: "" }
  }
}
