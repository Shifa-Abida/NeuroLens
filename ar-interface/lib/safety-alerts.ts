export type SafetyAlertCategory =
  | "PHYSICAL_THREAT"
  | "INTIMIDATION"
  | "AGGRESSIVE_LANGUAGE"
  | "PROFANITY"

export type SafetyAlertSeverity = "LOW" | "MEDIUM" | "HIGH"

export type SafetyAlertDetection = {
  category: SafetyAlertCategory
  severity: SafetyAlertSeverity
  matchedPhrase: string
  triggerText: string
}

type TriggerConfig = {
  category: SafetyAlertCategory
  severity: SafetyAlertSeverity
  phrases: string[]
}

const TRIGGER_CONFIG: TriggerConfig[] = [
  {
    category: "PHYSICAL_THREAT",
    severity: "HIGH",
    phrases: [
      "i will hurt you",
      "i'm going to hurt you",
      "i am going to hurt you",
      "i'll hurt you",
      "i will beat you",
      "i'm going to beat you",
      "i am going to beat you",
      "i'll beat you",
      "i will beat you so hard",
      "i'm gonna beat you so hard",
      "i am gonna beat you so hard",
      "i will hit you",
      "i'm going to hit you",
      "i am going to hit you",
      "i'll hit you",
      "i will slap you",
      "i'm going to slap you",
      "i will punch you",
      "i'm going to punch you",
      "i will kick you",
      "i'm going to kick you",
      "i will kill you",
      "i'm going to kill you",
      "i am going to kill you",
      "i'll kill you",
    ],
  },
  {
    category: "INTIMIDATION",
    severity: "MEDIUM",
    phrases: [
      "you don't understand",
      "you don't understand me",
      "i will teach you a lesson",
      "i'm going to teach you a lesson",
      "i am going to teach you a lesson",
      "you need to learn a lesson",
      "you are going to learn a lesson",
      "you'll learn your lesson",
      "you better watch out",
      "you better be careful",
      "you better behave",
      "you better listen to me",
      "you better listen",
      "you will regret this",
      "you're going to regret this",
      "you are going to regret this",
      "you are done",
      "you're done",
      "this is the end for you",
      "you won't get away with this",
      "don't make me angry",
      "don't make me do this",
      "don't test me",
      "you don't want to see what happens",
      "you have no idea what i'll do",
    ],
  },
  {
    category: "AGGRESSIVE_LANGUAGE",
    severity: "MEDIUM",
    phrases: [
      "i am so done with you",
      "i'm so done with you",
      "i can't take you anymore",
      "i can't stand you anymore",
      "i've had enough of you",
      "i have had enough of you",
      "get out of my sight",
      "get out of here",
      "shut up",
      "shut your mouth",
      "stop talking",
      "nobody cares about you",
      "you're useless",
      "you are useless",
      "you're worthless",
      "you are worthless",
    ],
  },
]

const PROFANITY_PHRASES = [
  "damn",
  "hell",
  "stupid",
  "idiot",
  "moron",
  "bastard",
]

const COOLDOWN_MS = 30_000

const lastAlertByPhrase = new Map<string, number>()

export function normalizeAlertText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function detectSafetyAlert(transcript: string, now = Date.now()): SafetyAlertDetection | null {
  const normalizedTranscript = normalizeAlertText(transcript)
  if (!normalizedTranscript) return null

  for (const config of TRIGGER_CONFIG) {
    for (const phrase of config.phrases) {
      const normalizedPhrase = normalizeAlertText(phrase)
      if (normalizedTranscript.includes(normalizedPhrase)) {
        const dedupeKey = `${config.category}:${normalizedPhrase}`
        const lastAlertAt = lastAlertByPhrase.get(dedupeKey) || 0
        if (now - lastAlertAt < COOLDOWN_MS) return null
        lastAlertByPhrase.set(dedupeKey, now)
        return {
          category: config.category,
          severity: config.severity,
          matchedPhrase: phrase,
          triggerText: transcript,
        }
      }
    }
  }

  for (const phrase of PROFANITY_PHRASES) {
    const normalizedPhrase = normalizeAlertText(phrase)
    if (normalizedTranscript.includes(normalizedPhrase)) {
      const dedupeKey = `PROFANITY:${normalizedPhrase}`
      const lastAlertAt = lastAlertByPhrase.get(dedupeKey) || 0
      if (now - lastAlertAt < COOLDOWN_MS) return null
      lastAlertByPhrase.set(dedupeKey, now)
      return {
        category: "PROFANITY",
        severity: "LOW",
        matchedPhrase: phrase,
        triggerText: transcript,
      }
    }
  }

  return null
}
