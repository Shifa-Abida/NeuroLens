import type { Memory, Person } from "@/components/neurolens/types"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"

type ApiPerson = {
  id: string
  name: string
  relationship: string
  photoUrl?: string
  faceId?: string
  notes?: string
}

type ApiMemory = {
  id: string
  personId: string
  title: string
  description: string
  emotion: string
  timestamp: string
}

type ApiContext = {
  person: ApiPerson
  memories: string[]
  lastConversation: string
  emotionStatus: string
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)

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

  // Fetch both the context and the full memory list in parallel
  const [context, memories] = await Promise.all([
    fetchJson<ApiContext>(`/api/context/${resolvedPersonId}`),
    fetchJson<ApiMemory[]>(`/api/memory/${resolvedPersonId}`).catch((err) => {
      console.warn("Failed to fetch memories from api/memory:", err)
      return [] as ApiMemory[]
    })
  ])

  const person = mapContextToPerson(context)

  if (memories && memories.length > 0) {
    // Sort memories by timestamp descending
    const sortedMemories = [...memories].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return timeB - timeA
    })
    person.memories = sortedMemories.map((mem, idx) => mapMemoryResponse(mem, idx))
  }

  return person
}

async function getFirstPersonId(): Promise<string | undefined> {
  const people = await fetchJson<ApiPerson[]>("/api/persons")
  return people[0]?.id
}

function mapContextToPerson(context: ApiContext): Person {
  return {
    id: context.person.id,
    name: context.person.name,
    relationship: context.person.relationship,
    profileImage: context.person.photoUrl || "/placeholder-user.jpg",
    lastMet: context.lastConversation || "No recent conversation",
    lastLocation: context.emotionStatus || "Unknown emotion",
    tags: context.person.faceId ? [context.person.faceId] : [],
    memories: context.memories.map((title, index) =>
      mapMemoryTitle(context.person.id, title, index),
    ),
  }
}

function mapMemoryTitle(
  personId: string,
  title: string,
  index: number,
): Memory {
  return {
    id: `${personId}-memory-${index}`,
    personId,
    title,
    date: "Saved memory",
    timestamp: index === 0 ? "Latest" : "Earlier",
    location: "NeuroLens",
    description: title,
    image: "/placeholder.jpg",
    emoji: "",
    emotionalImportance: Math.max(1, 10 - index),
    thumbnail: "/placeholder.jpg",
  }
}

function mapMemoryResponse(
  mem: ApiMemory,
  index: number,
): Memory {
  let displayDate = "Saved memory"
  let displayTime = "Earlier"
  if (mem.timestamp) {
    try {
      const d = new Date(mem.timestamp)
      const day = d.getDate()
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const month = months[d.getMonth()]
      const year = d.getFullYear()
      
      let hours = d.getHours()
      const minutes = d.getMinutes().toString().padStart(2, '0')
      const ampm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12
      hours = hours ? hours : 12
      const timeStr = `${hours}:${minutes} ${ampm}`
      
      const now = new Date()
      const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const diffDays = Math.round((nowDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        displayDate = `Today, ${timeStr}`
        displayTime = "Today"
      } else if (diffDays === 1) {
        displayDate = `Yesterday, ${timeStr}`
        displayTime = "Yesterday"
      } else if (diffDays < 7) {
        displayDate = `${diffDays} Days Ago, ${timeStr}`
        displayTime = `${diffDays} days ago`
      } else {
        displayDate = `${day} ${month} ${year}, ${timeStr}`
        displayTime = `${day} ${month}`
      }
    } catch (err) {
      console.warn("Failed to parse memory timestamp:", err)
    }
  }

  return {
    id: mem.id || `${mem.personId}-memory-${index}`,
    personId: mem.personId,
    title: mem.title,
    date: displayDate,
    timestamp: displayTime,
    location: "Living Room",
    description: mem.description || mem.title,
    image: "/placeholder.jpg",
    emoji: "",
    emotionalImportance: Math.max(1, 10 - index),
    thumbnail: index === 0 ? "/birthday-balloons.png" : index === 1 ? "/wedding-table.png" : "/placeholder.jpg",
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
      photoUrl: data.faceSnapshots[0] || ""
    }),
  })

  if (!response.ok) {
    throw new Error(`Registration failed: ${response.status}`)
  }

  const apiPerson = await response.json()
  return mapContextToPerson({
    person: apiPerson,
    memories: [],
    lastConversation: "Just registered",
    emotionStatus: "Happy"
  })
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
}): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/memory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Saving memory failed: ${response.status}`)
  }

  return response.json()
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
    console.warn("Gemini API call failed, falling back to local Regex parser:", error)
    
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
    console.warn("Gemini API call for memory parsing failed:", error)
    return { hasMemory: false, title: "", emotion: "" }
  }
}

export async function summarizeConversation(transcript: string): Promise<{ summary: string; emotion: string }> {
  try {
    const response = await fetch('/api/summarize-conversation', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transcript }),
    })

    if (!response.ok) {
      throw new Error(`Summarize API failed with status ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Gemini API call for conversation summarization failed:", error)
    throw error;
  }
}
