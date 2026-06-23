const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"

export type Person = {
  id: string
  name: string
  relationship: string
  photoUrl?: string
  faceId?: string
  notes?: string
}

export type Memory = {
  id: string
  personId: string
  title: string
  description?: string
  emotion?: string
  timestamp?: string
}

export type EmotionLog = {
  id: string
  personId: string
  emotion: string
  confidence: number
  timestamp?: string
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)

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

export async function createPerson(person: Omit<Person, "id">): Promise<Person> {
  return postJson<Person>("/api/persons", person)
}

export async function getMemories(personId: string): Promise<Memory[]> {
  return fetchJson<Memory[]>(`/api/memory/${personId}`)
}

export async function getEmotionLogs(personId: string): Promise<EmotionLog[]> {
  return fetchJson<EmotionLog[]>(`/api/emotion-log/${personId}`)
}

export async function getAllMemories(people: Person[]): Promise<Memory[]> {
  const results = await Promise.allSettled(
    people.map((person) => getMemories(person.id)),
  )

  return results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  )
}
