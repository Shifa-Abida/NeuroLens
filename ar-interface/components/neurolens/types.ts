export interface Person {
  id: string
  name: string
  relationship: string
  profileImage: string
  lastMet: string
  lastLocation: string
  tags: string[]
  memories: Memory[]
}

export interface Memory {
  id: string
  personId: string
  title: string
  date: string
  timestamp: string // e.g., "Yesterday", "Last Week", "Two Weeks Ago"
  location: string
  description: string
  image: string
  emoji: string // e.g., "🎂", "✈️", "🍽️"
  emotionalImportance: number // 1-10, higher = more important
  video?: string
  audio?: string
  thumbnail?: string
}
