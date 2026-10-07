'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { MemoryReplayEngine } from './MemoryReplayEngine'
import { getRecognizedPerson, recognizeFace, registerPerson, saveMemory, summarizeConversation, updatePersonProfile, uploadRecordedMemory, resolveMediaUrl } from '@/lib/api'
import type { Person, Memory } from './types'
import { Camera, UserPlus, Sparkles, AlertCircle, Scan, Volume2, Heart, MessageSquare, Calendar, Clock, Eye, Wifi, Battery, Shield, User, Video, CheckCircle2, Loader2, Play } from 'lucide-react'
import { GestureManager } from './gesture/GestureManager'
import { ARVirtualCursor } from './gesture/ARVirtualCursor'
import type { GestureType } from './gesture/gestureTypes'

type RecordingState =
  | "IDLE"
  | "PERSON_DETECTED"
  | "PERSON_RECOGNIZED"
  | "PROFILE_LOADED"
  | "CHECK_EXISTING_MEMORY"
  | "RECORDING"
  | "STOPPING"
  | "BLOB_CREATED"
  | "VALIDATING_BLOB"
  | "UPLOADING"
  | "BACKEND_CONFIRMED"
  | "SAVED"
  | "COOLDOWN"

type BrowserSpeechRecognitionResult = {
  isFinal: boolean
  0: { transcript: string }
}

type BrowserSpeechRecognitionEvent = {
  resultIndex: number
  results: ArrayLike<BrowserSpeechRecognitionResult>
}

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition
}

type PendingConversation = {
  personId: string
  personName: string
  transcript: string
}

function parseSpokenIntroduction(transcript: string) {
  const introduction = transcript.match(/\b(?:I am|I'm)\s+(.+?)\s*[.!?]*$/i)
  if (!introduction) return null

  const phrase = introduction[1].trim().replace(/[.!?]+$/, "")
  const relationshipMatch = phrase.match(/\b(?:and\s+)?(?:(?:I am|I'm)\s+)?your\s+(friend|daughter|son|sister|brother|mother|father|wife|husband|partner|caregiver|colleague|neighbor)\s*$/i)
  if (!relationshipMatch) return null

  const name = phrase.slice(0, relationshipMatch.index).trim().replace(/[,;.!?]+$/, "")
  if (!/^[\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){0,2}$/u.test(name)) return null

  return {
    name: name[0].toLocaleUpperCase() + name.slice(1),
    relationship: relationshipMatch?.[1] || "Friend",
  }
}

export function ARView() {
  const [isFaceApiLoaded, setIsFaceApiLoaded] = useState(false)
  const [systemStatus, setSystemStatus] = useState("Loading System...")
  const [matchedPerson, setMatchedPerson] = useState<Person | null>(null)
  const [isUnknown, setIsUnknown] = useState(false)
  const [confidence, setConfidence] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [captionEnabled, setCaptionEnabled] = useState(false)
  const [captionText, setCaptionText] = useState("")
  const [captionStatus, setCaptionStatus] = useState("")

  // Recording State Machine
  const [recordingState, setRecordingState] = useState<RecordingState>("IDLE")
  const [recordingCountdown, setRecordingCountdown] = useState<number>(15)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [savedMemoryId, setSavedMemoryId] = useState<string | null>(null)

  // Registration Mode States (for unknown faces detected in frame)
  const [regName, setRegName] = useState("")
  const [regRelationship, setRegRelationship] = useState("")
  const [regNotes, setRegNotes] = useState("")
  const [capturedSnapshots, setCapturedSnapshots] = useState<string[]>([])
  const [capturedEmbeddings, setCapturedEmbeddings] = useState<number[][]>([])
  const [isRegistering, setIsRegistering] = useState(false)
  const [regStatus, setRegStatus] = useState("")

  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const captionListeningRef = useRef(false)
  const voiceEnrollmentInProgressRef = useRef(false)
  const spokenIntroductionBufferRef = useRef({ transcript: "", updatedAt: 0 })
  const saveSpokenIntroductionRef = useRef<(transcript: string) => Promise<void>>(async () => {})
  const matchedPersonRef = useRef<Person | null>(null)
  const pendingConversationRef = useRef<PendingConversation | null>(null)
  const conversationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRecordingPersonIdRef = useRef<string | null>(null)
  const saveConversationSummaryRef = useRef<(conversation: PendingConversation) => Promise<void>>(async () => {})
  const flushPendingConversationRef = useRef<(force?: boolean) => void>(() => {})

  // Lock refs to prevent race conditions and duplicate recordings
  const recordingStateRef = useRef<RecordingState>("IDLE")
  const recordedPersonIdsRef = useRef<Set<string>>(new Set())
  const recognitionInProgressRef = useRef<boolean>(false)
  const lastRecognizedRef = useRef<number>(0)
  const lastSeenTimeRef = useRef<number>(0)
  const lastGreetedPersonIdRef = useRef<string | null>(null)
  const currentDescriptorRef = useRef<number[] | null>(null)

  // Update recording state sync ref
  const setControlledRecordingState = (state: RecordingState) => {
    recordingStateRef.current = state
    setRecordingState(state)
  }

  // GESTURE NAVIGATION INTEGRATION STATE & REFS
  const gestureManagerRef = useRef<GestureManager | null>(null)
  const isVideoPlayingRef = useRef<boolean>(false)
  const [isHandTrackingReady, setIsHandTrackingReady] = useState<boolean>(false)
  const [volumeLevel, setVolumeLevel] = useState<number>(1.0)
  const [volumeNoticeVisible, setVolumeNoticeVisible] = useState<boolean>(false)
  const volumeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [gestureState, setGestureState] = useState<{
    gesture: GestureType
    cursorFrozen: boolean
    scrollModeEnabled: boolean
    activeHands: number
  }>({
    gesture: "IDLE",
    cursorFrozen: false,
    scrollModeEnabled: false,
    activeHands: 0,
  })

  // Listen to volume updates & video playing state from MemoryReplayEngine
  useEffect(() => {
    const handleVideoPlaying = (e: CustomEvent<{ isPlaying: boolean }>) => {
      isVideoPlayingRef.current = e.detail.isPlaying
    }
    const handleVolumeUpdated = (e: CustomEvent<{ volume: number }>) => {
      setVolumeLevel(e.detail.volume)
      setVolumeNoticeVisible(true)
      if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current)
      volumeTimerRef.current = setTimeout(() => {
        setVolumeNoticeVisible(false)
      }, 2000)
    }

    window.addEventListener('neurolens-video-playing' as any, handleVideoPlaying)
    window.addEventListener('neurolens-volume-updated' as any, handleVolumeUpdated)

    return () => {
      window.removeEventListener('neurolens-video-playing' as any, handleVideoPlaying)
      window.removeEventListener('neurolens-volume-updated' as any, handleVolumeUpdated)
    }
  }, [])

  // Initialize GestureManager using existing camera stream & video element
  useEffect(() => {
    const manager = new GestureManager({
      onCursorMove: (x, y, hovering) => {
        window.dispatchEvent(new CustomEvent('neurolens-cursor-move', {
          detail: { x, y, hovering }
        }))
      },
      onClick: () => {
        window.dispatchEvent(new CustomEvent('neurolens-cursor-click'))
      },
      onScrollModeChange: (enabled) => {
        window.dispatchEvent(new CustomEvent('neurolens-scroll-mode', {
          detail: { enabled }
        }))
        setGestureState((prev) => ({ ...prev, scrollModeEnabled: enabled }))
      },
      onVolumeChange: (delta) => {
        window.dispatchEvent(new CustomEvent('neurolens-volume-change', {
          detail: { delta }
        }))
      },
      onGestureStateChange: (state) => {
        setGestureState(state)
      },
      isVideoPlaying: () => isVideoPlayingRef.current,
    })

    manager.init().then((success) => {
      if (success) {
        gestureManagerRef.current = manager
        setIsHandTrackingReady(true)
      }
    })

    return () => {
      gestureManagerRef.current = null
    }
  }, [])

  // Dedicated real-time Hand Tracking frame processing loop (runs concurrently with face detection)
  useEffect(() => {
    let active = true
    let lastProcessed = 0

    const handLoop = (timestamp: number) => {
      if (!active) return

      const video = cameraVideoRef.current
      if (video && video.readyState >= 2 && gestureManagerRef.current) {
        // Run hand tracking at up to ~45-60 fps without blocking face detection
        if (timestamp - lastProcessed >= 22) {
          lastProcessed = timestamp
          gestureManagerRef.current.processFrame(video, timestamp)
        }
      }

      requestAnimationFrame(handLoop)
    }

    const animId = requestAnimationFrame(handLoop)
    return () => {
      active = false
      cancelAnimationFrame(animId)
    }
  }, [])

  const saveConversationSummary = useCallback(async (conversation: PendingConversation) => {
    setCaptionStatus(`Summarizing your conversation with ${conversation.personName}...`)
    try {
      const summary = await summarizeConversation(conversation.transcript)
      await saveMemory({
        personId: conversation.personId,
        title: summary.summary,
        emotion: summary.emotion,
        type: "CONVERSATION",
        duration: 0,
      })
      setCaptionStatus(`Memory saved: ${summary.summary}`)

      if (matchedPersonRef.current?.id === conversation.personId) {
        try {
          const updatedPerson = await getRecognizedPerson(conversation.personId)
          matchedPersonRef.current = updatedPerson
          setMatchedPerson(updatedPerson)
        } catch (refreshError) {
          console.warn("Conversation memory was saved, but the person profile could not be refreshed:", refreshError)
        }
      }
    } catch (saveError) {
      console.error("Could not summarize and save conversation memory:", saveError)
      const pending = pendingConversationRef.current
      if (!pending) {
        pendingConversationRef.current = conversation
      } else if (
        pending.personId === conversation.personId
        && !pending.transcript.startsWith(conversation.transcript)
      ) {
        pending.transcript = `${conversation.transcript} ${pending.transcript}`.trim()
      }
      setCaptionStatus("Conversation summary could not be saved. Check the Gemini key and backend, then speak again to retry.")
    }
  }, [])

  const flushPendingConversation = useCallback((force = false) => {
    if (conversationTimerRef.current) {
      clearTimeout(conversationTimerRef.current)
      conversationTimerRef.current = null
    }

    const conversation = pendingConversationRef.current
    if (!conversation) return
    if (!force && activeRecordingPersonIdRef.current === conversation.personId) {
      setCaptionStatus("Conversation captured. Saving its summary after the video recording.")
      return
    }

    pendingConversationRef.current = null
    void saveConversationSummaryRef.current(conversation)
  }, [])

  useEffect(() => {
    saveConversationSummaryRef.current = saveConversationSummary
  }, [saveConversationSummary])

  useEffect(() => {
    flushPendingConversationRef.current = flushPendingConversation
  }, [flushPendingConversation])

  useEffect(() => {
    matchedPersonRef.current = matchedPerson
  }, [matchedPerson])

  const saveSpokenIntroduction = useCallback(async (transcript: string) => {
    const introduction = parseSpokenIntroduction(transcript)
    if (!introduction || voiceEnrollmentInProgressRef.current) return

    if (matchedPerson) {
      if (matchedPerson.name.trim().toLocaleLowerCase() !== introduction.name.toLocaleLowerCase()) {
        setCaptionStatus(`${matchedPerson.name} is already identified. This introduction was not saved.`)
        return
      }

      voiceEnrollmentInProgressRef.current = true
      setCaptionStatus(`Saving details for ${matchedPerson.name}...`)
      try {
        const updatedPerson = await updatePersonProfile({
          personId: matchedPerson.id,
          name: matchedPerson.name,
          relationship: introduction.relationship,
          notes: transcript.trim(),
        })
        setMatchedPerson((currentPerson) => currentPerson
          ? { ...currentPerson, relationship: updatedPerson.relationship, notes: updatedPerson.notes }
          : currentPerson)
        matchedPersonRef.current = {
          ...matchedPerson,
          relationship: updatedPerson.relationship,
          notes: updatedPerson.notes,
        }
        setCaptionStatus(`${matchedPerson.name} saved as your ${introduction.relationship}.`)
      } catch (saveError) {
        console.error("Could not update spoken introduction", saveError)
        setCaptionStatus("Profile could not be updated. Check the server connection.")
      } finally {
        voiceEnrollmentInProgressRef.current = false
      }
      return
    }

    if (!isUnknown) return

    const video = cameraVideoRef.current
    const descriptor = currentDescriptorRef.current
    if (!video || !descriptor || Date.now() - lastSeenTimeRef.current > 3000) {
      setCaptionStatus("Keep an unregistered face in view while speaking.")
      return
    }

    const snapshotCanvas = document.createElement("canvas")
    snapshotCanvas.width = 160
    snapshotCanvas.height = 160
    const snapshotContext = snapshotCanvas.getContext("2d")
    if (!snapshotContext) return

    snapshotContext.translate(snapshotCanvas.width, 0)
    snapshotContext.scale(-1, 1)
    snapshotContext.drawImage(video, 0, 0, snapshotCanvas.width, snapshotCanvas.height)

    voiceEnrollmentInProgressRef.current = true
    setCaptionStatus(`Saving ${introduction.name}...`)

    try {
      const newPerson = await registerPerson({
        name: introduction.name,
        relationship: introduction.relationship,
        faceEmbeddings: [descriptor],
        faceSnapshots: [snapshotCanvas.toDataURL("image/jpeg")],
        notes: transcript.trim(),
      })

      setMatchedPerson(newPerson)
      matchedPersonRef.current = newPerson
      setIsUnknown(false)
      setConfidence(98.5)
      lastGreetedPersonIdRef.current = newPerson.id
      setCaptionStatus(`${newPerson.name} saved as your ${newPerson.relationship}.`)
    } catch (saveError) {
      console.error("Could not save spoken introduction", saveError)
      setCaptionStatus("Profile could not be saved. Check the server connection.")
    } finally {
      voiceEnrollmentInProgressRef.current = false
    }
  }, [isUnknown, matchedPerson])

  useEffect(() => {
    saveSpokenIntroductionRef.current = saveSpokenIntroduction
  }, [saveSpokenIntroduction])

  useEffect(() => {
    const speechWindow = window as SpeechRecognitionWindow
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!Recognition) {
      setCaptionStatus("Live captions are not supported by this browser.")
      return
    }

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language || "en-US"
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const transcript = result[0]?.transcript.trim()
        if (!transcript) continue
        setCaptionText(transcript)
        if (result.isFinal) {
          const recognizedPerson = matchedPersonRef.current
          if (recognizedPerson) {
            const previousConversation = pendingConversationRef.current
            if (previousConversation && previousConversation.personId !== recognizedPerson.id) {
              flushPendingConversationRef.current(true)
            }

            const pending = pendingConversationRef.current
            pendingConversationRef.current = pending?.personId === recognizedPerson.id
              ? { ...pending, transcript: `${pending.transcript} ${transcript}`.trim() }
              : {
                  personId: recognizedPerson.id,
                  personName: recognizedPerson.name,
                  transcript,
                }

            if (conversationTimerRef.current) clearTimeout(conversationTimerRef.current)
            conversationTimerRef.current = setTimeout(() => {
              flushPendingConversationRef.current()
            }, 5000)
          }

          const previous = spokenIntroductionBufferRef.current
          const prefix = Date.now() - previous.updatedAt < 8000 ? previous.transcript : ""
          const combinedTranscript = [prefix, transcript].filter(Boolean).join(" ")
          spokenIntroductionBufferRef.current = { transcript: combinedTranscript, updatedAt: Date.now() }

          if (parseSpokenIntroduction(combinedTranscript)) {
            spokenIntroductionBufferRef.current = { transcript: "", updatedAt: 0 }
            void saveSpokenIntroductionRef.current(combinedTranscript)
          }
        }
      }
    }
    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        captionListeningRef.current = false
        setCaptionEnabled(false)
        setCaptionStatus("Microphone permission is needed for captions.")
      } else if (event.error !== "no-speech") {
        setCaptionStatus("Voice captions stopped unexpectedly.")
      }
    }
    recognition.onend = () => {
      if (!captionListeningRef.current) return
      window.setTimeout(() => {
        if (captionListeningRef.current) {
          try {
            recognition.start()
          } catch {
            setCaptionStatus("Listening for captions...")
          }
        }
      }, 250)
    }
    speechRecognitionRef.current = recognition

    return () => {
      captionListeningRef.current = false
      recognition.stop()
      speechRecognitionRef.current = null
      flushPendingConversationRef.current()
    }
  }, [])

  const toggleCaptions = () => {
    const recognition = speechRecognitionRef.current
    if (!recognition) return

    if (captionListeningRef.current) {
      captionListeningRef.current = false
      setCaptionEnabled(false)
      setCaptionStatus("Captions paused.")
      recognition.stop()
      flushPendingConversationRef.current()
      return
    }

    captionListeningRef.current = true
    setCaptionEnabled(true)
    setCaptionStatus("Listening for captions...")
    try {
      recognition.start()
    } catch {
      captionListeningRef.current = false
      setCaptionEnabled(false)
      setCaptionStatus("Could not start voice captions.")
    }
  }

  // Dynamic clock for Top Bar
  const [timeStr, setTimeStr] = useState("10:42 AM")
  const [dateStr, setDateStr] = useState("22 Jun 2026")
  useEffect(() => {
    const updateTime = () => {
      const d = new Date()
      const day = d.getDate()
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const month = months[d.getMonth()]
      const year = d.getFullYear()
      setDateStr(`${day} ${month} ${year}`)

      let hours = d.getHours()
      const minutes = d.getMinutes().toString().padStart(2, '0')
      const ampm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12
      hours = hours ? hours : 12
      setTimeStr(`${hours}:${minutes} ${ampm}`)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Dynamic CDNs & Script Loader for face-api
  useEffect(() => {
    let isMounted = true

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = src
        script.async = true
        const timeout = window.setTimeout(() => {
          script.remove()
          reject(new Error(`Timed out loading ${src}`))
        }, 30000)
        script.onload = () => {
          window.clearTimeout(timeout)
          resolve()
        }
        script.onerror = () => {
          window.clearTimeout(timeout)
          reject(new Error(`Failed to load ${src}`))
        }
        document.body.appendChild(script)
      })
    }

    const waitForModel = (promise: Promise<unknown>, name: string): Promise<void> =>
      new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error(`Timed out downloading ${name}`)), 60000)
        promise.then(
          () => {
            window.clearTimeout(timeout)
            resolve()
          },
          (err) => {
            window.clearTimeout(timeout)
            reject(err)
          }
        )
      })

    const loadLibraries = async () => {
      try {
        setSystemStatus("Loading Neural Networks...")

        if (!(window as any).faceapi) {
          await loadScript('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.0.1/dist/face-api.js')
        }

        if (isMounted) {
          await initializeModels()
        }
      } catch (err) {
        console.error("Failed to load libraries", err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load required vision resources.")
          setSystemStatus("CDN Load Error")
        }
      }
    }

    const initializeModels = async () => {
      try {
        const faceapi = (window as any).faceapi

        setSystemStatus("Initializing vision models...")
        const modelUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.0.1/model/'

        setSystemStatus("Downloading face detection model...")
        await waitForModel(faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl), "face detection model")
        setSystemStatus("Downloading facial landmark model...")
        await waitForModel(faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl), "facial landmark model")
        setSystemStatus("Downloading face recognition model...")
        await waitForModel(faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl), "face recognition model")

        if (isMounted) {
          setSystemStatus("System Active")
          setIsFaceApiLoaded(true)
        }
      } catch (err) {
        console.error("Failed to initialize models", err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to initialize vision models.")
          setSystemStatus("Model Init Error")
        }
      }
    }

    loadLibraries()

    return () => {
      isMounted = false
    }
  }, [])

  // Hook up camera feed with REAL WEBCAM VIDEO + REAL MICROPHONE AUDIO
  useEffect(() => {
    if (!isFaceApiLoaded) return

    let activeStream: MediaStream | null = null

    console.log("[NEUROLENS] REQUESTING WEBCAM CAMERA + MICROPHONE PERMISSIONS...")

    navigator.mediaDevices
      .getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true, // REAL microphone audio track required
      })
      .then((stream) => {
        activeStream = stream
        mediaStreamRef.current = stream

        const videoTracks = stream.getVideoTracks()
        const audioTracks = stream.getAudioTracks()

        console.log("[NEUROLENS] CAMERA STREAM READY")
        if (videoTracks.length > 0) {
          console.log("[NEUROLENS] VIDEO TRACK READY", videoTracks[0].label)
        } else {
          console.error("[NEUROLENS] ERROR: NO VIDEO TRACK DETECTED")
          setError("No video track available from camera.")
        }

        if (audioTracks.length > 0) {
          console.log("[NEUROLENS] AUDIO TRACK READY", audioTracks[0].label)
          const recognition = speechRecognitionRef.current
          if (recognition && !captionListeningRef.current) {
            captionListeningRef.current = true
            setCaptionEnabled(true)
            setCaptionStatus("Captions listening automatically...")
            try {
              recognition.start()
            } catch {
              captionListeningRef.current = false
              setCaptionEnabled(false)
              setCaptionStatus("Automatic captions could not start. Press Captions to retry.")
            }
          }
        } else {
          console.error("[NEUROLENS] ERROR: NO AUDIO TRACK DETECTED")
          setError("No audio track available from microphone.")
          setCaptionStatus("Microphone access is required for captions.")
        }

        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream
        }
      })
      .catch((err) => {
        console.error("[NEUROLENS] CAMERA / MICROPHONE ACCESS FAILED", err)
        setError("Camera and microphone access required for NeuroLens vision & interaction recording.")
        setCaptionStatus("Allow camera and microphone access to start captions automatically.")
      })

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isFaceApiLoaded])

  // Custom HUD Bounding Box drawing helper
  const drawCustomBoundingBox = (
    ctx: CanvasRenderingContext2D,
    box: { x: number; y: number; width: number; height: number },
    label: string,
    color: string
  ) => {
    const { x, y, width, height } = box

    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.shadowColor = color
    ctx.shadowBlur = 8

    const cornerLen = Math.min(width, height) * 0.15

    // Top-Left Corner
    ctx.beginPath()
    ctx.moveTo(x, y + cornerLen)
    ctx.lineTo(x, y)
    ctx.lineTo(x + cornerLen, y)
    ctx.stroke()

    // Top-Right Corner
    ctx.beginPath()
    ctx.moveTo(x + width - cornerLen, y)
    ctx.lineTo(x + width, y)
    ctx.lineTo(x + width, y + cornerLen)
    ctx.stroke()

    // Bottom-Left Corner
    ctx.beginPath()
    ctx.moveTo(x, y + height - cornerLen)
    ctx.lineTo(x, y + height)
    ctx.lineTo(x + cornerLen, y + height)
    ctx.stroke()

    // Bottom-Right Corner
    ctx.beginPath()
    ctx.moveTo(x + width - cornerLen, y + height)
    ctx.lineTo(x + width, y + height)
    ctx.lineTo(x + width, y + height - cornerLen)
    ctx.stroke()

    // Dashed connecting borders
    ctx.strokeStyle = `${color}33`
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.strokeRect(x, y, width, height)
    ctx.setLineDash([])

    // Label tag block
    ctx.fillStyle = `${color}d0`
    ctx.fillRect(x, y - 30, Math.max(180, width), 30)

    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 13px system-ui, sans-serif"
    ctx.shadowBlur = 0
    ctx.fillText(label, x + 10, y - 10)
  }

  // AUTOMATIC RECORDING IMPLEMENTATION (STATE MACHINE)
  const startFirstEncounterRecording = useCallback((person: Person) => {
    // 1. Guard check state
    if (recordingStateRef.current !== "IDLE") {
      console.log(`[NEUROLENS] Recording skipped: current state is ${recordingStateRef.current}`)
      return
    }

    if (recordedPersonIdsRef.current.has(person.id)) {
      console.log(`[NEUROLENS] Recording skipped: encounter already recorded for ${person.name} (${person.id})`)
      return
    }

    const stream = mediaStreamRef.current
    if (!stream) {
      console.error("[NEUROLENS] RECORDING FAILED: MediaStream is null")
      setRecordingError("Camera/Microphone stream not active.")
      return
    }

    // 2. Stream validation
    const videoTracks = stream.getVideoTracks()
    const audioTracks = stream.getAudioTracks()

    if (videoTracks.length === 0) {
      console.error("[NEUROLENS] RECORDING FAILED: stream.getVideoTracks().length === 0")
      setRecordingError("RECORDING FAILED: No video track available.")
      return
    }

    if (audioTracks.length === 0) {
      console.error("[NEUROLENS] RECORDING FAILED: stream.getAudioTracks().length === 0")
      setRecordingError("RECORDING FAILED: No audio track available.")
      return
    }

    if (!stream.active) {
      console.error("[NEUROLENS] RECORDING FAILED: stream.active === false")
      setRecordingError("RECORDING FAILED: MediaStream is inactive.")
      return
    }

    // 3. Supported MIME type detection
    let mimeType = 'video/webm;codecs=vp8,opus'
    if (typeof MediaRecorder !== 'undefined') {
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm'
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '' // let browser select default
      }
    } else {
      console.error("[NEUROLENS] MediaRecorder API unsupported in this browser.")
      setRecordingError("MediaRecorder API unsupported in this browser.")
      return
    }

    // 4. Create MediaRecorder
    try {
      recordedChunksRef.current = []
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = recorder
      console.log("[NEUROLENS] MEDIA RECORDER CREATED")

      // 5. Handle data chunks
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
          console.log("[NEUROLENS] RECORDING CHUNK RECEIVED, chunk size:", event.data.size)
        }
      }

      // 6. Handle stop & upload
      recorder.onstop = async () => {
        setControlledRecordingState("BLOB_CREATED")
        console.log("[NEUROLENS] RECORDING STOPPING")

        const finalMime = recorder.mimeType || mimeType || 'video/webm'
        const recordedBlob = new Blob(recordedChunksRef.current, { type: finalMime })

        console.log("[NEUROLENS] FINAL BLOB CREATED")
        console.log("[NEUROLENS] BLOB SIZE:", recordedBlob.size)
        console.log("[NEUROLENS] BLOB MIME TYPE:", recordedBlob.type)

        // Validate Blob
        setControlledRecordingState("VALIDATING_BLOB")
        if (recordedBlob.size === 0) {
          console.error("RECORDING FAILED: EMPTY VIDEO BLOB")
          setRecordingError("RECORDING FAILED: EMPTY VIDEO BLOB")
          setControlledRecordingState("IDLE")
          activeRecordingPersonIdRef.current = null
          flushPendingConversationRef.current(true)
          return
        }

        // Upload to Spring Boot
        setControlledRecordingState("UPLOADING")
        console.log("[NEUROLENS] UPLOADING VIDEO")

        const formData = new FormData()
        formData.append("video", recordedBlob, `recording_${person.id}_${Date.now()}.webm`)
        formData.append("clientId", "client_001")
        formData.append("personId", person.id)
        formData.append("duration", "15")
        formData.append("personName", person.name)
        formData.append("relationship", person.relationship)
        formData.append("title", `First interaction with ${person.name}`)
        formData.append("description", `First interaction recording captured on ${new Date().toLocaleString()}`)

        try {
          const res = await uploadRecordedMemory(formData)
          console.log("[NEUROLENS] UPLOAD SUCCESS")
          console.log("[NEUROLENS] BACKEND VIDEO URL:", res.videoUrl)
          console.log("[NEUROLENS] MEMORY SAVED SUCCESSFULLY")

          setSavedMemoryId(res.id || res.memoryId || "memory_001")
          setControlledRecordingState("BACKEND_CONFIRMED")
          setControlledRecordingState("SAVED")

          // Mark person encounter as recorded
          recordedPersonIdsRef.current.add(person.id)

          // Refresh person profile from backend to fetch the newly created real memory
          setTimeout(async () => {
            try {
              const updatedPerson = await getRecognizedPerson(person.id)
              setMatchedPerson(updatedPerson)
            } catch (err) {
              console.warn("Could not reload updated person memories:", err)
            }
          }, 500)

          // Enter cooldown before returning to IDLE
          setTimeout(() => {
            setControlledRecordingState("COOLDOWN")
            setTimeout(() => {
              setControlledRecordingState("IDLE")
            }, 6000)
          }, 3000)

        } catch (uploadErr) {
          console.error("[NEUROLENS] Memory upload failed:", uploadErr)
          setRecordingError("Memory upload to backend failed.")
          setControlledRecordingState("IDLE")
        } finally {
          activeRecordingPersonIdRef.current = null
          flushPendingConversationRef.current(true)
        }
      }

      // 7. Start recording
      activeRecordingPersonIdRef.current = person.id
      setControlledRecordingState("RECORDING")
      recorder.start(1000) // collect slice every 1000ms
      console.log(
        `[NEUROLENS] RECORDING STARTED at ${new Date().toISOString()} | VideoTracks: ${videoTracks.length} | AudioTracks: ${audioTracks.length} | MIME: ${recorder.mimeType}`
      )

      // 8. 15-second countdown timer
      setRecordingCountdown(15)
      let secondsLeft = 15

      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = setInterval(() => {
        secondsLeft -= 1
        setRecordingCountdown(secondsLeft)
        if (secondsLeft <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
        }
      }, 1000)

      // 9. Stop after approximately 15 seconds
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current)
      recordingTimerRef.current = setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop()
        }
      }, 15000)

    } catch (err) {
      console.error("[NEUROLENS] Failed to start MediaRecorder:", err)
      setRecordingError("Failed to start MediaRecorder.")
      setControlledRecordingState("IDLE")
      activeRecordingPersonIdRef.current = null
      flushPendingConversationRef.current(true)
    }
  }, [])

  // Main real-time Vision frame loop
  useEffect(() => {
    if (!isFaceApiLoaded || !cameraVideoRef.current || !canvasRef.current) return

    let active = true
    const video = cameraVideoRef.current
    const canvas = canvasRef.current
    const faceapi = (window as any).faceapi

    const frameLoop = async () => {
      if (!active) return

      if (video.readyState !== 4) {
        requestAnimationFrame(frameLoop)
        return
      }

      // Sync canvas dimensions
      const displaySize = { width: video.clientWidth, height: video.clientHeight }
      if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
        canvas.width = displaySize.width
        canvas.height = displaySize.height
        faceapi.matchDimensions(canvas, displaySize)
      }

      // Run face detection network
      let detections: any[] = []
      try {
        detections = await faceapi
          .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptors()
      } catch (err) {
        // detection cycle fail safe
      }

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const resizedDetections = faceapi.resizeResults(detections, displaySize)

        if (resizedDetections.length === 0) {
          // Clear active face target if not seen for 4 seconds
          if (Date.now() - lastSeenTimeRef.current > 4000) {
            lastGreetedPersonIdRef.current = null
            if (recordingStateRef.current === "IDLE") {
              matchedPersonRef.current = null
              setMatchedPerson(null)
              setIsUnknown(false)
            }
          }
          setSystemStatus("System Active - Scanning...")
        } else {
          lastSeenTimeRef.current = Date.now()
          setSystemStatus("Face Detected")

          const primary = resizedDetections[0]
          const descriptor = Array.from(primary.descriptor) as number[]
          currentDescriptorRef.current = descriptor

          // Determine bounding box labels
          let label = "Analyzing facial signature..."
          let color = "#3b82f6" // blue

          if (matchedPerson) {
            label = `${matchedPerson.name} (${matchedPerson.relationship}) - Recognized`
            color = "#10b981" // green
          } else if (isUnknown) {
            label = "Unknown Person"
            color = "#ef4444" // red
          }

          const mirroredBox = {
            x: canvas.width - primary.detection.box.x - primary.detection.box.width,
            y: primary.detection.box.y,
            width: primary.detection.box.width,
            height: primary.detection.box.height,
          }
          drawCustomBoundingBox(ctx, mirroredBox, label, color)

          // Perform Server Recognition Lookups
          const now = Date.now()
          if (!recognitionInProgressRef.current && now - lastRecognizedRef.current > 1500) {
            recognitionInProgressRef.current = true
            lastRecognizedRef.current = now

            if (recordingStateRef.current === "IDLE") {
              setControlledRecordingState("PERSON_DETECTED")
            }

            recognizeFace(descriptor)
              .then((res) => {
                if (res.matched && res.person) {
                  matchedPersonRef.current = res.person
                  setMatchedPerson(res.person)
                  setIsUnknown(false)
                  setConfidence(res.confidence)

                  if (lastGreetedPersonIdRef.current !== res.person.id) {
                    lastGreetedPersonIdRef.current = res.person.id
                    if ("speechSynthesis" in window) {
                      const relationship = res.person.relationship.trim()
                      const greeting = relationship
                        ? `Identified: ${res.person.name}, your ${relationship}.`
                        : `Identified: ${res.person.name}.`
                      window.speechSynthesis.cancel()
                      window.speechSynthesis.speak(new SpeechSynthesisUtterance(greeting))
                    }
                  }

                  console.log("[NEUROLENS] PERSON RECOGNIZED:", res.person.name)
                  const memCount = res.person.memories ? res.person.memories.length : 0
                  console.log("[NEUROLENS] EXISTING MEMORY COUNT:", memCount)

                  if (recordingStateRef.current === "IDLE" || recordingStateRef.current === "PERSON_DETECTED") {
                    setControlledRecordingState("PERSON_RECOGNIZED")
                    setControlledRecordingState("PROFILE_LOADED")
                    setControlledRecordingState("CHECK_EXISTING_MEMORY")

                    // FIRST ENCOUNTER CHECK: ZERO MEMORIES
                    if (memCount === 0 && !recordedPersonIdsRef.current.has(res.person.id)) {
                      console.log("[NEUROLENS] FIRST ENCOUNTER DETECTED — INITIATING AUTOMATIC RECORDING")
                      startFirstEncounterRecording(res.person)
                    }
                  }
                } else {
                  if (recordingStateRef.current === "IDLE" || recordingStateRef.current === "PERSON_DETECTED") {
                    matchedPersonRef.current = null
                    setMatchedPerson(null)
                    setIsUnknown(true)
                    setConfidence(res.confidence || 10.0)
                    setControlledRecordingState("IDLE")
                  }
                }
              })
              .catch((err) => {
                console.warn("Face recognition endpoint unavailable:", err)
              })
              .finally(() => {
                recognitionInProgressRef.current = false
              })
          }
        }
      }

      requestAnimationFrame(frameLoop)
    }

    requestAnimationFrame(frameLoop)

    return () => {
      active = false
    }
  }, [isFaceApiLoaded, matchedPerson, isUnknown, startFirstEncounterRecording])

  // Snapshot handler for manual enrollment
  const handleCaptureSnapshot = () => {
    const video = cameraVideoRef.current
    if (!video || !currentDescriptorRef.current) {
      alert("No face detected in camera viewport.")
      return
    }

    const hiddenCanvas = document.createElement('canvas')
    hiddenCanvas.width = 160
    hiddenCanvas.height = 160
    const hiddenCtx = hiddenCanvas.getContext('2d')
    if (hiddenCtx) {
      hiddenCtx.translate(hiddenCanvas.width, 0)
      hiddenCtx.scale(-1, 1)
      hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height)
      const base64Crop = hiddenCanvas.toDataURL('image/jpeg')

      setCapturedSnapshots((prev) => [...prev, base64Crop])
      setCapturedEmbeddings((prev) => [...prev, currentDescriptorRef.current!])
    }
  }

  // Enrollment handler for client interface
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regName || !regRelationship) {
      setRegStatus("Please fill out name and relationship fields.")
      return
    }
    if (capturedSnapshots.length < 1) {
      setRegStatus("Please capture at least 1 photo.")
      return
    }

    setIsRegistering(true)
    setRegStatus("Registering person...")

    try {
      const newPerson = await registerPerson({
        name: regName,
        relationship: regRelationship,
        faceEmbeddings: capturedEmbeddings,
        faceSnapshots: capturedSnapshots,
        notes: regNotes.trim(),
      })

      setRegStatus("Successfully enrolled!")
      setRegName("")
      setRegRelationship("")
      setRegNotes("")
      setCapturedSnapshots([])
      setCapturedEmbeddings([])

      setMatchedPerson(newPerson)
      matchedPersonRef.current = newPerson
      setIsUnknown(false)
      setConfidence(98.5)

      // Start automatic first encounter recording immediately for newly enrolled person
      if (recordingStateRef.current === "IDLE") {
        startFirstEncounterRecording(newPerson)
      }
    } catch (err) {
      console.error(err)
      setRegStatus("Error registering person.")
    } finally {
      setIsRegistering(false)
    }
  }

  const existingMemoryCount = matchedPerson?.memories ? matchedPerson.memories.length : 0
  const isFirstEncounter = matchedPerson !== null && existingMemoryCount === 0

  return (
    <div
      className="ar-screen fixed inset-0 flex flex-col bg-[#02040a] text-white font-sans overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(ellipse at 10% 34%, rgba(34, 211, 238, 0.38) 0%, transparent 43%), radial-gradient(ellipse at 77% 24%, rgba(139, 92, 246, 0.34) 0%, transparent 40%), radial-gradient(ellipse at 94% 76%, rgba(59, 130, 246, 0.28) 0%, transparent 38%), radial-gradient(ellipse at 48% 96%, rgba(45, 212, 191, 0.16) 0%, transparent 42%), #02040a',
      }}
    >
      {/* 1. TOP NAVBAR / HEADER */}
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl relative z-20">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white border border-violet-400/30 shadow-lg">
            <Sparkles className="size-4.5" />
          </div>
          <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            NeuroLens AR
          </span>
        </div>

        {/* State Machine Status Badge */}
        <div className="flex items-center gap-2 bg-slate-900/70 border border-white/10 rounded-full px-4 py-1.5 shadow-inner">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              recordingState === "RECORDING"
                ? "bg-red-500 animate-ping"
                : recordingState === "SAVED"
                ? "bg-emerald-400"
                : recordingState === "UPLOADING"
                ? "bg-amber-400 animate-pulse"
                : "bg-blue-400"
            }`}
          />
          <span className="text-xs font-bold tracking-wider text-slate-300">
            STATE: <span className="text-white">{recordingState}</span>
          </span>
          {recordingState === "RECORDING" && (
            <span className="ml-1 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
              REC {recordingCountdown}s
            </span>
          )}
        </div>

        {/* Gesture Recognition Status Badge */}
        <div className="flex items-center gap-2 bg-slate-900/70 border border-white/10 rounded-full px-3.5 py-1.5 shadow-inner">
          <span
            className={`w-2 h-2 rounded-full ${
              !isHandTrackingReady
                ? "bg-slate-500 animate-pulse"
                : gestureState.gesture !== "IDLE"
                ? "bg-cyan-400 animate-ping"
                : "bg-cyan-500/70"
            }`}
          />
          <span className="text-xs font-bold tracking-wider text-slate-300">
            GESTURE:{" "}
            <span className="text-cyan-300 font-mono">
              {gestureState.gesture === "ONE_INDEX"
                ? "☝️ CURSOR"
                : gestureState.gesture === "ONE_OPEN_PALM"
                ? "🤚 PAUSED"
                : gestureState.gesture === "TWO_OPEN_PALMS"
                ? "🤚🤚 SCROLL ON"
                : gestureState.gesture === "TWO_PEACE"
                ? "✌️✌️ SCROLL OFF"
                : gestureState.gesture === "PINCH"
                ? "👌 CLICK"
                : gestureState.gesture === "THUMBS_UP"
                ? "👍 VOL+"
                : gestureState.gesture === "THUMBS_DOWN"
                ? "👎 VOL-"
                : "READY"}
            </span>
          </span>
          {gestureState.scrollModeEnabled && (
            <span className="ml-1 bg-emerald-600/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
              SCROLL ON
            </span>
          )}
        </div>

        {/* Right Status Indicators */}
        <div className="flex items-center gap-6 text-sm text-slate-300 font-medium">
          <span>{dateStr}</span>
          <span className="text-white font-bold">{timeStr}</span>
          <div className="flex items-center gap-3.5 border-l border-white/10 pl-5">
            <Wifi className="size-4.5 text-slate-400" />
            <div className="flex items-center gap-1.5">
              <Battery className="size-5 text-emerald-400 fill-emerald-500/20" />
              <span className="text-xs font-bold text-slate-300">80%</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN 4-COLUMN CONTENT AREA */}
      <div className="flex-grow flex p-6 gap-6 overflow-hidden min-h-0 relative z-10">
        {!isFaceApiLoaded ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-12">
            {error ? (
              <div className="max-w-lg space-y-4 text-center" role="alert">
                <AlertCircle className="mx-auto size-10 text-rose-400" />
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Vision startup failed</h3>
                  <p className="text-sm text-slate-400">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 cursor-pointer"
                >
                  Retry vision startup
                </button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-400 rounded-full animate-spin" />
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold">Starting NeuroLens Vision</h3>
                  <p className="text-sm text-slate-400">{systemStatus}</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* COLUMN 1: LEFT SIDEBAR (Person Details + Status) */}
            <div className="w-[260px] flex flex-col gap-6 flex-shrink-0 h-full overflow-y-auto scrollbar-none">
              {/* Person Recognized Card */}
              <div className="rounded-3xl bg-slate-900/40 border border-white/10 p-5 shadow-2xl backdrop-blur-xl space-y-5">
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {matchedPerson ? "Person Recognized" : "System Scanning"}
                </div>

                {matchedPerson ? (
                  <>
                    <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                      {/* CAREGIVER-UPLOADED REFERENCE PHOTO */}
                      <div className="relative size-16 rounded-full overflow-hidden border-2 border-emerald-400/40 bg-slate-950 flex-shrink-0">
                        <img
                          src={matchedPerson.profileImage}
                          alt={matchedPerson.name}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = "/placeholder-user.jpg"
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-xl font-black text-white leading-tight truncate">
                          {matchedPerson.name}
                        </h2>
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <User className="size-3" />
                          {matchedPerson.relationship}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">
                          Confidence: {confidence}%
                        </p>
                      </div>
                    </div>

                    {/* Encounter Information */}
                    <div className="space-y-3 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-400">
                          <User className="size-3.5 text-slate-500" />
                          Status
                        </span>
                        <span className="font-semibold text-emerald-400">Trusted Reference</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-400">
                          <Clock className="size-3.5 text-slate-500" />
                          Memories
                        </span>
                        <span className="font-semibold text-white">
                          {existingMemoryCount === 0 ? "0 (First Encounter)" : `${existingMemoryCount} on record`}
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Status Callout */}
                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-slate-300">
                      <CheckCircle2 className="size-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-emerald-300 mb-0.5">{matchedPerson.name} Recognized</p>
                        <p>
                          {isFirstEncounter
                            ? `First real encounter. Recording webcam & microphone interaction to create Memory 001.`
                            : `Registered ${matchedPerson.relationship.toLowerCase()}. Displaying saved memory interaction.`}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center space-y-3">
                    <div className="p-3 w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 mx-auto flex items-center justify-center animate-pulse">
                      <Scan className="size-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-300">Scanning Area</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
                        Continuous observation for registered family and trusted people...
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recording Status Widget */}
              <div className="rounded-3xl bg-slate-900/40 border border-white/10 p-5 shadow-2xl backdrop-blur-xl space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Recording Pipeline
                </span>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Webcam Video:</span>
                    <span className="text-emerald-400 font-bold">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Microphone Audio:</span>
                    <span className="text-emerald-400 font-bold">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Auto Recording:</span>
                    <span className="text-white font-bold">
                      {recordingState === "RECORDING"
                        ? `Recording (${recordingCountdown}s)`
                        : recordingState === "SAVED"
                        ? "Saved to memory library"
                        : recordingState === "UPLOADING"
                        ? "Uploading Blob"
                        : "Ready"}
                    </span>
                  </div>
                </div>

                {recordingError && (
                  <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px]">
                    {recordingError}
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: CENTER CAMERA PANEL */}
            <div className="flex-grow flex flex-col h-full min-w-0 bg-slate-900/20 border border-white/5 rounded-[32px] overflow-hidden relative shadow-2xl">
              <video
                ref={cameraVideoRef}
                className="w-full h-full object-cover scale-x-[-1]"
                autoPlay
                playsInline
                muted // Muted in client speakers to prevent microphone echo, but MediaStream has audio for MediaRecorder!
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none z-10 animate-fade-in"
              />

              <div
                aria-live="polite"
                className="absolute bottom-24 left-1/2 z-30 w-[90%] max-w-xl -translate-x-1/2 rounded-xl border border-white/20 bg-slate-950/95 px-4 py-3 text-center shadow-xl backdrop-blur-md"
              >
                <p className="mb-1 text-[9px] font-bold uppercase text-emerald-300">
                  {captionEnabled ? "Live captions" : "Captions"}
                </p>
                <p className="break-words text-sm font-semibold text-white">
                  {captionText || captionStatus || "Turn on Captions to see speech here."}
                </p>
                {captionText && captionStatus && (
                  <p className="mt-1 text-[11px] text-emerald-300">{captionStatus}</p>
                )}
              </div>

              {/* AR RECORDING HUD BANNER */}
              {recordingState === "RECORDING" && (
                <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between bg-red-950/80 border border-red-500/50 backdrop-blur-md rounded-2xl px-5 py-3 shadow-2xl animate-pulse">
                  <div className="flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-red-300 block">
                        AUTOMATIC RECORDING IN PROGRESS
                      </span>
                      <span className="text-sm font-extrabold text-white">
                        Capturing webcam video + real microphone audio for Memory 001
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">{recordingCountdown}s</span>
                    <span className="text-[10px] block text-red-300 font-bold uppercase">Time remaining</span>
                  </div>
                </div>
              )}

              {/* AR SAVING BANNER */}
              {recordingState === "UPLOADING" && (
                <div className="absolute top-6 left-6 right-6 z-20 flex items-center gap-3 bg-blue-950/80 border border-blue-500/50 backdrop-blur-md rounded-2xl px-5 py-3 shadow-2xl">
                  <Loader2 className="size-5 text-blue-400 animate-spin" />
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-blue-300 block">
                      PERSISTING REAL RECORDING
                    </span>
                    <span className="text-sm font-extrabold text-white">
                      Uploading video Blob to Spring Boot & MongoDB...
                    </span>
                  </div>
                </div>
              )}

              {/* AR CONFIRMED BANNER */}
              {recordingState === "SAVED" && (
                <div className="absolute top-6 left-6 right-6 z-20 flex items-center gap-3 bg-emerald-950/80 border border-emerald-500/50 backdrop-blur-md rounded-2xl px-5 py-3 shadow-2xl animate-in fade-in duration-300">
                  <CheckCircle2 className="size-5 text-emerald-400" />
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-300 block">
                      MEMORY 001 CREATED & PERSISTED
                    </span>
                    <span className="text-sm font-extrabold text-white">
                      Interaction successfully stored in Spring Boot and MongoDB!
                    </span>
                  </div>
                </div>
              )}

              {/* Floating Camera Control bar */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-950/85 backdrop-blur-xl border border-white/15 rounded-full px-6 py-2 flex items-center gap-8 shadow-2xl z-20">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Camera className="size-4 text-emerald-400" />
                  <span>Real Camera Stream</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 border-l border-white/10 pl-6">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Mic Connected</span>
                </div>
                <button
                  type="button"
                  onClick={toggleCaptions}
                  aria-pressed={captionEnabled}
                  title={captionEnabled ? "Pause voice captions" : "Start voice captions"}
                  className={`flex items-center gap-2 border-l border-white/10 pl-6 text-xs font-bold transition ${
                    captionEnabled ? "text-emerald-300" : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Volume2 className="size-4" />
                  <span>{captionEnabled ? "Captions On" : "Captions"}</span>
                </button>
              </div>
            </div>

            {/* COLUMN 3: FLASHCARDS (ACCURATE DATA — NO FAKE MEMORIES) */}
            <div className="w-[270px] flex flex-col flex-shrink-0 h-full bg-slate-900/30 border border-white/10 rounded-[32px] p-5 shadow-2xl overflow-y-auto scrollbar-none justify-between backdrop-blur-xl">
              {isUnknown ? (
                /* Enrollment Form for Unknown Face */
                <div className="space-y-4 flex flex-col h-full justify-between animate-in slide-in-from-right duration-300">
                  <div className="space-y-4">
                    <div className="bg-destructive/10 border-l-4 border-destructive text-destructive-foreground p-3 rounded-r-xl text-xs space-y-1">
                      <span className="font-extrabold uppercase block tracking-wider">Unregistered Face</span>
                      <p className="opacity-90">No registered identity matches this person signature.</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">Face snapshot</span>
                        <span className="text-slate-500 font-bold">{capturedSnapshots.length} captured</span>
                      </div>
                      <div className="aspect-square rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center relative overflow-hidden">
                        {capturedSnapshots[0] ? (
                          <img
                            src={capturedSnapshots[0]}
                            alt="Snapshot"
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <Camera className="size-8 text-slate-700" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleCaptureSnapshot}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold py-2.5 text-xs transition border border-white/5 cursor-pointer"
                      >
                        <Camera className="size-3.5" />
                        Capture Face Snapshot
                      </button>
                    </div>

                    <form onSubmit={handleRegisterSubmit} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Name</label>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="e.g. Sarah"
                          className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Relationship</label>
                        <input
                          type="text"
                          required
                          value={regRelationship}
                          onChange={(e) => setRegRelationship(e.target.value)}
                          placeholder="e.g. Friend"
                          className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Details to remember</label>
                        <textarea
                          value={regNotes}
                          onChange={(e) => setRegNotes(e.target.value)}
                          placeholder="A few helpful details about this person"
                          rows={3}
                          className="w-full resize-y bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>

                      {regStatus && (
                        <p className="text-[10px] text-blue-300 font-medium animate-pulse">{regStatus}</p>
                      )}

                      <button
                        type="submit"
                        disabled={isRegistering || capturedSnapshots.length === 0}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-900 disabled:to-slate-900 disabled:text-slate-600 font-semibold py-2.5 text-xs cursor-pointer shadow-lg transition mt-2"
                      >
                        <UserPlus className="size-4" />
                        {isRegistering ? "Saving..." : "Register Person"}
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                /* ACCURATE DATA FLASHCARDS (NO FAKE / PLACEHOLDER CONTENT) */
                <div className="flex flex-col h-full justify-between">
                  <div className="space-y-3.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Client Flashcards
                    </span>

                    {/* Card 1: WHO IS THIS? */}
                    <div className="bg-emerald-950/40 border border-emerald-500/30 backdrop-blur-md rounded-2xl p-4 space-y-1.5 shadow-lg animate-in fade-in duration-300">
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                        <User className="size-3" />
                        Who is this?
                      </span>
                      <p className="text-xl font-extrabold text-white">
                        {matchedPerson ? matchedPerson.name : "Observing..."}
                      </p>
                    </div>

                    {/* Card 2: RELATIONSHIP */}
                    <div className="bg-amber-950/40 border border-amber-500/30 backdrop-blur-md rounded-2xl p-4 space-y-1.5 shadow-lg animate-in fade-in duration-300">
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-amber-400 uppercase tracking-widest">
                        <Heart className="size-3" />
                        Relationship
                      </span>
                      <p className="text-lg font-extrabold text-white leading-tight">
                        {matchedPerson ? matchedPerson.relationship : "Scanning..."}
                      </p>
                      <p className="text-xs text-slate-300 font-medium">
                        {matchedPerson
                          ? `${matchedPerson.relationship}`
                          : "Awaiting face..."}
                      </p>
                    </div>

                    {/* Card 3: STATUS */}
                    <div className="bg-blue-950/40 border border-blue-500/30 backdrop-blur-md rounded-2xl p-4 space-y-1.5 shadow-lg animate-in fade-in duration-300">
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-blue-400 uppercase tracking-widest">
                        <Sparkles className="size-3" />
                        Recognition Status
                      </span>
                      <p className="text-sm font-extrabold text-white">
                        {matchedPerson ? "Recognized (Trusted)" : "Analyzing..."}
                      </p>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {matchedPerson
                          ? matchedPerson.notes || "Identity verified by reference photo."
                          : "Continuous facial observation."}
                      </p>
                    </div>

                    {/* Card 4: ENCOUNTER STATUS (NO FAKE DATES) */}
                    <div className="bg-violet-950/40 border border-violet-500/30 backdrop-blur-md rounded-2xl p-4 space-y-1.5 shadow-lg animate-in fade-in duration-300">
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-violet-400 uppercase tracking-widest">
                        <Video className="size-3" />
                        Interaction Flow
                      </span>
                      <p className="text-sm font-extrabold text-white">
                        {isFirstEncounter ? "First interaction" : matchedPerson ? "Known contact" : "Awaiting person..."}
                      </p>
                      <p className="text-[11px] text-slate-300 font-semibold">
                        {recordingState === "RECORDING"
                          ? `Recording real interaction (${recordingCountdown}s)...`
                          : recordingState === "UPLOADING"
                          ? "Uploading real video to Spring Boot..."
                          : recordingState === "SAVED"
                          ? "Memory 001 persisted successfully!"
                          : isFirstEncounter
                          ? "Zero previous memories. Recording automatic."
                          : matchedPerson
                          ? `${existingMemoryCount} recorded memory on file.`
                          : "Waiting for encounter..."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 4: RIGHT TIMELINE (REAL MEMORIES ONLY) */}
            <div className="w-[300px] flex flex-col flex-shrink-0 h-full bg-slate-900/30 border border-white/10 rounded-[32px] p-5 shadow-2xl overflow-hidden justify-between backdrop-blur-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Memory Timeline
              </span>

              {matchedPerson && matchedPerson.memories && matchedPerson.memories.length > 0 ? (
                <MemoryReplayEngine
                  memories={matchedPerson.memories}
                  scrollModeEnabled={gestureState.scrollModeEnabled}
                />
              ) : isFirstEncounter ? (
                /* FIRST ENCOUNTER: 0 PREVIOUS MEMORIES */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-14 h-14 rounded-full border border-dashed border-emerald-400/50 bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Video className="size-6 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-extrabold text-white">
                      First Real Interaction
                    </p>
                    <p className="text-xs font-semibold text-slate-400 max-w-[220px] leading-relaxed mx-auto">
                      There are 0 previous memories for {matchedPerson.name}.
                    </p>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-emerald-400 font-bold space-y-1">
                      {recordingState === "RECORDING" ? (
                        <>
                          <div className="flex items-center justify-center gap-1.5 text-red-400">
                            <span className="size-2 rounded-full bg-red-500 animate-ping" />
                            <span>Recording... ({recordingCountdown}s)</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-normal">
                            Webcam video & microphone audio being captured
                          </p>
                        </>
                      ) : recordingState === "UPLOADING" ? (
                        <span>Saving to backend...</span>
                      ) : recordingState === "SAVED" ? (
                        <span>✓ Memory 001 created!</span>
                      ) : (
                        <span>Starting 15-second recording...</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-10 h-10 rounded-full border border-dashed border-white/20 flex items-center justify-center text-slate-600">
                    <span>📅</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 max-w-[200px] leading-relaxed">
                    No memories loaded. Waiting for recognized person...
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 3. BOTTOM STATUS BAR */}
      <footer className="h-12 flex-shrink-0 flex items-center justify-between px-6 border-t border-white/10 bg-slate-950/40 backdrop-blur-xl relative z-20 text-xs">
        {/* Left Waveform Status */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              recordingState === "RECORDING" ? "bg-red-400 animate-ping" : "bg-emerald-400 animate-pulse"
            }`}
          />
          <span className="text-xs text-slate-400 font-bold tracking-wider">
            {recordingState === "RECORDING" ? "Recording Audio & Video..." : "NeuroLens Active"}
          </span>
          <div className="flex items-end gap-[2px] h-3 ml-2">
            <span className="w-[2px] bg-emerald-400 rounded-full animate-bounce h-2" style={{ animationDelay: '0.1s' }} />
            <span className="w-[2px] bg-emerald-400 rounded-full animate-bounce h-3" style={{ animationDelay: '0.3s' }} />
            <span className="w-[2px] bg-emerald-400 rounded-full animate-bounce h-1.5" style={{ animationDelay: '0.5s' }} />
            <span className="w-[2px] bg-emerald-400 rounded-full animate-bounce h-2.5" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>

        {/* Center Sparkles Info */}
        <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
          <Sparkles className="size-3.5 text-violet-400" />
          <span>NeuroLens AI Memory Assistant — Phase 1</span>
        </div>

        {/* Right Active Status */}
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider">
          <Shield className="size-3 text-emerald-400" />
          <span>All Vision & Audio Systems Active</span>
        </div>
      </footer>

      {/* 4. VIRTUAL AR CURSOR & HUD OVERLAYS */}
      <ARVirtualCursor
        currentGesture={gestureState.gesture}
        cursorFrozen={gestureState.cursorFrozen}
        scrollModeEnabled={gestureState.scrollModeEnabled}
        volumeLevel={volumeLevel}
        volumeNoticeVisible={volumeNoticeVisible}
        activeHands={gestureState.activeHands}
      />
    </div>
  )
}
