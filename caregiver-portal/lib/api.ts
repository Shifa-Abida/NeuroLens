const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8080"

export type Person = {
  id: string
  personId?: string
  clientId?: string
  name: string
  relationship: string
  photoUrl?: string
  profilePhotoUrl?: string
  faceId?: string
  notes?: string
  faceEmbeddings?: number[][]
  faceSnapshots?: string[]
  trusted?: boolean
  firstSeen?: string
  lastSeen?: string
  timesSeen?: number
  createdAt?: string
}

export type Memory = {
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

export type EmotionLog = {
  id: string
  personId: string
  emotion: string
  confidence: number
  timestamp?: string
}

export type Sighting = {
  id: string
  personId: string
  sceneSnapshot?: string
  timestamp?: string
  location?: string
}

export type SafetyAlert = {
  alertId: string
  clientId: string
  personId: string
  personName: string
  category: string
  severity: string
  matchedPhrase: string
  triggerText: string
  timestamp: string
  status: "ACTIVE" | "IGNORED"
  ignoredBy?: string
  ignoredAt?: string
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

async function postJson<T>(path: string, body: any): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function getPeople(): Promise<Person[]> {
  return fetchJson<Person[]>("/api/persons")
}

export async function getPerson(id: string): Promise<Person> {
  return fetchJson<Person>(`/api/persons/${id}`)
}

export async function createPerson(person: Partial<Person>): Promise<Person> {
  return postJson<Person>("/api/persons", person)
}

export async function updatePerson(id: string, person: Partial<Person>): Promise<Person> {
  const response = await fetch(`${API_BASE_URL}/api/persons/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(person),
  })

  if (!response.ok) {
    throw new Error(`Update person failed: ${response.status}`)
  }

  return response.json() as Promise<Person>
}

export async function getTemporaryVisitors(): Promise<Person[]> {
  return fetchJson<Person[]>("/api/persons/temporary")
}

export async function promoteTemporaryVisitor(id: string, data: Partial<Person>): Promise<Person> {
  const response = await fetch(`${API_BASE_URL}/api/persons/${id}/promote`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Promote temporary visitor failed: ${response.status}`)
  }

  return response.json() as Promise<Person>
}

export async function purgeExpiredVisitors(): Promise<{ message: string; purgedCount: number }> {
  const response = await fetch(`${API_BASE_URL}/api/persons/expired-visitors`, {
    method: "DELETE",
  })
  if (!response.ok) {
    throw new Error(`Purge expired visitors failed: ${response.status}`)
  }
  return response.json()
}

export async function deletePerson(id: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/persons/${id}`, {
    method: "DELETE",
  })
  if (!response.ok) {
    throw new Error(`Delete person failed: ${response.status}`)
  }
  return response.json()
}

export async function uploadPhoto(file: File): Promise<{ photoUrl: string }> {
  const formData = new FormData()
  formData.append("photo", file)

  const response = await fetch(`${API_BASE_URL}/api/persons/upload-photo`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Photo upload failed: ${response.status}`)
  }

  return response.json()
}

export async function getMemories(personId: string): Promise<Memory[]> {
  return fetchJson<Memory[]>(`/api/memories/person/${personId}`)
}

export async function getAllMemories(): Promise<Memory[]> {
  return fetchJson<Memory[]>("/api/memories")
}

export async function deleteMemory(id: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/memories/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error(`Delete memory failed: ${response.status}`)
  }

  return response.json()
}

export async function getEmotionLogs(personId: string): Promise<EmotionLog[]> {
  return fetchJson<EmotionLog[]>(`/api/emotion-log/${personId}`)
}

export async function getSightings(personId: string): Promise<Sighting[]> {
  return fetchJson<Sighting[]>(`/api/sightings/person/${personId}`)
}

export async function getSafetyAlerts(status = "ACTIVE"): Promise<SafetyAlert[]> {
  return fetchJson<SafetyAlert[]>(`/api/alerts?status=${encodeURIComponent(status)}`)
}

export async function ignoreSafetyAlert(alertId: string): Promise<SafetyAlert> {
  const response = await fetch(`${API_BASE_URL}/api/alerts/${alertId}/ignore`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ignoredBy: "caregiver" }),
  })

  if (!response.ok) {
    throw new Error(`Ignore alert failed: ${response.status}`)
  }

  return response.json() as Promise<SafetyAlert>
}

export function getAlertWebSocketUrl(): string {
  const wsBase = API_BASE_URL.replace(/^http:/, "ws:").replace(/^https:/, "wss:")
  return `${wsBase}/ws/alerts`
}

export function resolveMediaUrl(url?: string): string {
  if (!url) return ""
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url
  }
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`
}
