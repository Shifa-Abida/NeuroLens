'use client'

import { useEffect, useState, useRef } from 'react'
import { ARInfoStrip } from './ARInfoStrip'
import { MemoryReplayEngine } from './MemoryReplayEngine'
import { DEMO_PERSON } from './constants'
import { getRecognizedPerson, recognizeFace, registerPerson, logSighting, parseIntroPhrase, saveMemory, saveConversation, parseMemoryPhrase, summarizeConversation } from '@/lib/api'
import type { Person } from './types'
import { Camera, UserPlus, Check, Sparkles, AlertCircle, Scan, Volume2, Heart, MessageSquare, Calendar, Clock, Eye, Wifi, Battery, Shield, User, ChevronRight, MessageCircle, Layers } from 'lucide-react'

export function ARView() {
  const [isFaceApiLoaded, setIsFaceApiLoaded] = useState(false)
  const [systemStatus, setSystemStatus] = useState("Loading System...")
  const [matchedPerson, setMatchedPerson] = useState<Person | null>(null)
  const [isUnknown, setIsUnknown] = useState(false)
  const [confidence, setConfidence] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  // Registration States
  const [introPhrase, setIntroPhrase] = useState("")
  const [regName, setRegName] = useState("")
  const [regRelationship, setRegRelationship] = useState("")
  const [capturedSnapshots, setCapturedSnapshots] = useState<string[]>([])
  const [capturedEmbeddings, setCapturedEmbeddings] = useState<number[][]>([])
  const [isRegistering, setIsRegistering] = useState(false)
  const [regStatus, setRegStatus] = useState("")

  // Auto-Registration States
  const [speechTranscript, setSpeechTranscript] = useState("")
  const [isAutoCapturing, setIsAutoCapturing] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  // Custom Conversation States
  const [hasUnsavedSpeech, setHasUnsavedSpeech] = useState(false)
  const [isSavingMemory, setIsSavingMemory] = useState(false)

  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Session transcript tracking for AI summarization
  const sessionTranscriptsRef = useRef<string[]>([])
  const activePersonIdRef = useRef<string | null>(null)
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Continuous Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn("Browser SpeechRecognition is not supported in this browser.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = async (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        } else {
          interimTranscript += event.results[i][0].transcript
        }
      }

      const liveCaption = finalTranscript || interimTranscript
      if (liveCaption.trim()) {
        setSpeechTranscript(liveCaption)
      }

      if (!isFaceApiLoaded) return

      if (finalTranscript.trim()) {
        const cleanTranscript = finalTranscript.trim()
        console.log("Speech heard:", cleanTranscript)

        const activePersonId = matchedPerson?.id || activePersonIdRef.current
        if (activePersonId) {
          // Accumulate the transcript for session summarization
          sessionTranscriptsRef.current.push(cleanTranscript)
          setHasUnsavedSpeech(true)

          // Save conversation segment to backend database
          saveConversation({
            personId: activePersonId,
            transcript: cleanTranscript
          }).catch(err => console.error("Failed to save conversation segment:", err))

          return
        }

        if (isAutoCapturing || isRegistering) {
          return
        }

        const cleanText = cleanTranscript.toLowerCase()
        const triggers = ["this is", "my name is", "i am", "im your", "i'm your", "he is", "she is"]
        const hasTrigger = triggers.some(t => cleanText.includes(t))

        if (hasTrigger) {
          console.log("Auto-registration triggered by phrase:", cleanTranscript)
          handleAutoRegisterFlow(cleanTranscript)
        }
      }
    }

    recognition.onerror = (event: any) => {
      console.warn("Speech Recognition error encountered:", event.error)
    }

    recognition.onend = () => {
      console.log("Speech recognition service ended. Restarting...")
      try {
        recognition.start()
      } catch (err) {
        // ignore
      }
    }

    try {
      recognition.start()
    } catch (err) {
      console.error("Failed to start SpeechRecognition", err)
    }

    return () => {
      recognition.onend = null
      recognition.onerror = null
      try {
        recognition.stop()
      } catch (err) {
        // ignore
      }
    }
  }, [isFaceApiLoaded, matchedPerson, isAutoCapturing, isRegistering])

  // Clear speech transcript after 4 seconds of silence
  useEffect(() => {
    if (!speechTranscript) return
    const timer = setTimeout(() => {
      setSpeechTranscript("")
    }, 4000)
    return () => clearTimeout(timer)
  }, [speechTranscript])

  const summarizeAndSaveMemory = (personId: string, fullText: string) => {
    setHasUnsavedSpeech(false)
    summarizeConversation(fullText).then((res) => {
      if (res.summary) {
        console.log("Saving summarized memory:", res.summary)
        saveMemory({
          personId: personId,
          title: res.summary,
          description: fullText,
          emotion: res.emotion || "Warm"
        })
        .then((newMemory) => {
          // Immediately append the new memory to the UI state if the same person is matched!
          setMatchedPerson(current => {
            if (current && current.id === personId) {
              const updatedMemories = [
                {
                  id: newMemory.id || `${personId}-memory-${Date.now()}`,
                  personId: personId,
                  title: res.summary,
                  date: "Just now",
                  timestamp: "Just now",
                  location: "Living Room",
                  description: fullText,
                  image: "/placeholder.jpg",
                  emoji: "",
                  emotionalImportance: 10,
                  thumbnail: "/placeholder.jpg"
                },
                ...(current.memories || [])
              ]
              return {
                ...current,
                memories: updatedMemories
              }
            }
            return current
          })
        })
        .catch(err => console.error("Failed to save summarized memory:", err))
      }
    }).catch(err => console.error("Failed to summarize conversation:", err))
  }

  const handleStartConversation = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance("Conversation started. I am listening.")
      window.speechSynthesis.speak(utterance)
    }
    setSpeechTranscript("Starting conversation...")
    setHasUnsavedSpeech(true)
    sessionTranscriptsRef.current = ["Started conversation."]
    if (matchedPerson) {
      activePersonIdRef.current = matchedPerson.id
    }
  }

  const handleConversationButtonClick = () => {
    if (isSavingMemory) return

    if (hasUnsavedSpeech) {
      // Save conversation memory explicitly
      const personId = activePersonIdRef.current || matchedPerson?.id
      if (personId) {
        setIsSavingMemory(true)
        const transcripts = [...sessionTranscriptsRef.current]
        const fullText = transcripts.join(" ")
        
        summarizeConversation(fullText).then((res) => {
          if (res.summary) {
            console.log("Explicitly saving summarized memory:", res.summary)
            saveMemory({
              personId: personId,
              title: res.summary,
              description: fullText,
              emotion: res.emotion || "Warm"
            })
            .then((newMemory) => {
              // Immediately append the new memory to the UI state
              setMatchedPerson(current => {
                if (current && current.id === personId) {
                  const updatedMemories = [
                    {
                      id: newMemory.id || `${personId}-memory-${Date.now()}`,
                      personId: personId,
                      title: res.summary,
                      date: "Just now",
                      timestamp: "Just now",
                      location: "Living Room",
                      description: fullText,
                      image: "/placeholder.jpg",
                      emoji: "",
                      emotionalImportance: 10,
                      thumbnail: "/placeholder.jpg"
                    },
                    ...(current.memories || [])
                  ]
                  return {
                    ...current,
                    memories: updatedMemories
                  }
                }
                return current
              })
              // Reset session
              sessionTranscriptsRef.current = []
              activePersonIdRef.current = null
              setHasUnsavedSpeech(false)
              if (sessionTimeoutRef.current) {
                clearTimeout(sessionTimeoutRef.current)
                sessionTimeoutRef.current = null
              }
            })
            .catch(err => console.error("Failed to save summarized memory:", err))
            .finally(() => {
              setIsSavingMemory(false)
            })
          } else {
            setIsSavingMemory(false)
          }
        }).catch(err => {
          console.error("Failed to summarize conversation:", err)
          setIsSavingMemory(false)
        })
      }
    } else {
      handleStartConversation()
    }
  }

  // Summarize whole conversation when person leaves frame after a 20-second timeout
  useEffect(() => {
    if (matchedPerson) {
      // If we got a match, cancel any active session timeout
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current)
        sessionTimeoutRef.current = null
      }
      
      // If matching a new person, summarize the old one first!
      if (activePersonIdRef.current && activePersonIdRef.current !== matchedPerson.id) {
        const oldPersonId = activePersonIdRef.current
        const transcripts = [...sessionTranscriptsRef.current]
        
        if (transcripts.length > 0) {
          const fullText = transcripts.join(" ")
          console.log(`Switching person - Summarizing conversation for ${oldPersonId}: "${fullText}"`)
          summarizeAndSaveMemory(oldPersonId, fullText)
        }
        sessionTranscriptsRef.current = []
      }
      
      activePersonIdRef.current = matchedPerson.id
    } else {
      // Face lost: start a 20-second timeout to finalize the conversation session
      if (activePersonIdRef.current && !sessionTimeoutRef.current) {
        sessionTimeoutRef.current = setTimeout(() => {
          const personId = activePersonIdRef.current
          const transcripts = [...sessionTranscriptsRef.current]
          
          if (personId && transcripts.length > 0) {
            const fullText = transcripts.join(" ")
            console.log(`absence 20s - Summarizing conversation for ${personId}: "${fullText}"`)
            summarizeAndSaveMemory(personId, fullText)
          }
          
          // Reset session
          sessionTranscriptsRef.current = []
          activePersonIdRef.current = null
          sessionTimeoutRef.current = null
        }, 20000) // 20 seconds timeout
      }
    }

    return () => {
      // cleanups
    }
  }, [matchedPerson])

  // Rate limiting & state tracking refs
  const recognitionInProgressRef = useRef<boolean>(false)
  const lastRecognizedRef = useRef<number>(0)
  const recognizedPersonIdRef = useRef<string | null>(null)
  const lastSeenTimeRef = useRef<number>(0)
  const currentDescriptorRef = useRef<number[] | null>(null)
  const spokenIdRef = useRef<string | null>(null)

  // Hand tracking refs
  const handsRef = useRef<any>(null)
  const handsProcessingRef = useRef<boolean>(false)
  const handLandmarksRef = useRef<any[]>([])
  const wasPinchingRef = useRef<boolean>(false)

  // Dynamic CDNs & Script Loader
  useEffect(() => {
    let isMounted = true

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error(`Failed to load ${src}`))
        document.body.appendChild(script)
      })
    }

    const loadLibraries = async () => {
      try {
        setSystemStatus("Loading Neural Networks...")
        
        // Load face-api.js
        if (!(window as any).faceapi) {
          await loadScript('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.0.1/dist/face-api.js')
        }
        
        // Load MediaPipe Hands
        if (!(window as any).Hands) {
          await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js')
        }

        if (isMounted) {
          await initializeModels()
        }
      } catch (err) {
        console.error("Failed to load libraries", err)
        if (isMounted) {
          setError("Failed to load required vision CDN scripts.")
          setSystemStatus("CDN Load Error")
        }
      }
    }

    const initializeModels = async () => {
      try {
        const faceapi = (window as any).faceapi
        const Hands = (window as any).Hands

        setSystemStatus("Initializing models...")
        const modelUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.0.1/model/'
        
        // Load faceapi models
        await faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl)
        await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl)
        await faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)

        // Initialize MediaPipe Hands
        if (Hands) {
          const hands = new Hands({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
          })
          hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          })
          hands.onResults((results: any) => {
            handLandmarksRef.current = results.multiHandLandmarks || []
          })
          handsRef.current = hands
        }

        if (isMounted) {
          setSystemStatus("System Active")
          setIsFaceApiLoaded(true)
        }
      } catch (err) {
        console.error("Failed to initialize models", err)
        if (isMounted) {
          setError("Failed to initialize vision models.")
          setSystemStatus("Model Init Error")
        }
      }
    }

    loadLibraries()

    return () => {
      isMounted = false
    }
  }, [])

  // Hook up camera feed
  useEffect(() => {
    if (!isFaceApiLoaded) return

    let activeStream: MediaStream | null = null

    navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
    })
      .then((stream) => {
        activeStream = stream
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream
        }
      })
      .catch((err) => {
        console.warn("Webcam access not granted or unavailable.", err)
        setError("Camera access required for live face recognition.")
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
    box: { x: number, y: number, width: number, height: number },
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
    ctx.fillRect(x, y - 30, Math.max(160, width), 30)

    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 13px system-ui, sans-serif"
    ctx.shadowBlur = 0
    ctx.fillText(label, x + 10, y - 10)
  }

  // Voice synthesis announcer
  const speakIntroductionOnce = (person: Person) => {
    if (spokenIdRef.current === person.id) return
    spokenIdRef.current = person.id

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const text = `Hi, ${person.name} is here. She is your ${person.relationship}. You met her yesterday.`
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.85 // spoken slightly slower for elderly comprehension
      window.speechSynthesis.speak(utterance)
    }
  }

  // Sighting logger helper
  const triggerSightingLog = (personId: string) => {
    const video = cameraVideoRef.current
    if (!video) return

    const hiddenCanvas = document.createElement('canvas')
    hiddenCanvas.width = 320
    hiddenCanvas.height = 240
    const hiddenCtx = hiddenCanvas.getContext('2d')
    if (hiddenCtx) {
      // Draw mirrored image to store correct orientation
      hiddenCtx.translate(hiddenCanvas.width, 0)
      hiddenCtx.scale(-1, 1)
      hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height)
      const base64Snapshot = hiddenCanvas.toDataURL('image/jpeg')

      logSighting({
        personId,
        sceneSnapshot: base64Snapshot,
        location: "Living Room"
      }).catch((err) => console.warn("Failed to log sighting", err))
    }
  }

  // Draw hand skeleton nodes
  const drawHandSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    ctx.save()
    
    // Draw connection lines
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [5, 9], [9, 10], [10, 11], [11, 12], // Middle
      [9, 13], [13, 14], [14, 15], [15, 16], // Ring
      [13, 17], [17, 18], [18, 19], [19, 20], [0, 17] // Pinky & Palm
    ]

    ctx.strokeStyle = "rgba(167, 139, 250, 0.45)" // Soft glowing violet lines
    ctx.lineWidth = 2.5
    ctx.shadowColor = "rgb(139, 92, 246)"
    ctx.shadowBlur = 4

    connections.forEach(([from, to]) => {
      const ptFrom = landmarks[from]
      const ptTo = landmarks[to]
      if (ptFrom && ptTo) {
        ctx.beginPath()
        ctx.moveTo(ctx.canvas.width - (ptFrom.x * ctx.canvas.width), ptFrom.y * ctx.canvas.height)
        ctx.lineTo(ctx.canvas.width - (ptTo.x * ctx.canvas.width), ptTo.y * ctx.canvas.height)
        ctx.stroke()
      }
    })

    // Draw landmark points
    landmarks.forEach((pt, idx) => {
      const x = ctx.canvas.width - (pt.x * ctx.canvas.width)
      const y = pt.y * ctx.canvas.height
      
      ctx.beginPath()
      ctx.arc(x, y, idx === 4 || idx === 8 ? 5.5 : 3.5, 0, 2 * Math.PI)
      
      // Highlights for index tip & thumb tip
      if (idx === 4 || idx === 8) {
        ctx.fillStyle = "#ffffff"
        ctx.strokeStyle = "#10b981" // green highlight for click fingers
        ctx.lineWidth = 2
      } else {
        ctx.fillStyle = "#c084fc" // light violet
        ctx.strokeStyle = "rgba(139, 92, 246, 0.6)"
        ctx.lineWidth = 1
      }
      ctx.fill()
      ctx.stroke()
    })

    ctx.restore()
  }

  // Draw Index Tip virtual cursor
  const drawCursor = (ctx: CanvasRenderingContext2D, indexTip: any, isPinching: boolean) => {
    const x = ctx.canvas.width - (indexTip.x * ctx.canvas.width)
    const y = indexTip.y * ctx.canvas.height
    
    ctx.save()
    
    ctx.shadowBlur = 12
    ctx.shadowColor = isPinching ? "#10b981" : "#3b82f6"

    ctx.strokeStyle = isPinching ? "#10b981" : "#3b82f6"
    ctx.lineWidth = isPinching ? 3 : 2
    ctx.beginPath()
    ctx.arc(x, y, isPinching ? 8 : 14, 0, 2 * Math.PI)
    ctx.stroke()

    ctx.fillStyle = isPinching ? "#10b981" : "#3b82f6"
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, 2 * Math.PI)
    ctx.fill()

    ctx.restore()
  }

  // Draw click feedback visual flash circle on overlay
  const drawClickRipple = (ctx: CanvasRenderingContext2D, indexTip: any) => {
    const x = ctx.canvas.width - (indexTip.x * ctx.canvas.width)
    const y = indexTip.y * ctx.canvas.height
    
    ctx.save()
    ctx.strokeStyle = "rgba(16, 185, 129, 0.8)"
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(x, y, 22, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.restore()
  }

  // Main real-time frame loop
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
      const detections = await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors()

      // Feed frame to hands detector in background (fire-and-forget/non-blocking)
      if (handsRef.current && !handsProcessingRef.current) {
        handsProcessingRef.current = true
        handsRef.current.send({ image: video })
          .finally(() => {
            handsProcessingRef.current = false
          })
      }

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw hand landmarks if detected
        const handLandmarks = handLandmarksRef.current
        if (handLandmarks && handLandmarks.length > 0) {
          const primaryHand = handLandmarks[0]
          drawHandSkeleton(ctx, primaryHand)

          const indexTip = primaryHand[8]
          const thumbTip = primaryHand[4]
          if (indexTip && thumbTip) {
            // Calculate pinch distance
            const dx = indexTip.x - thumbTip.x
            const dy = indexTip.y - thumbTip.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            const isPinching = dist < 0.035

            drawCursor(ctx, indexTip, isPinching)

            // Trigger virtual click trigger
            if (isPinching) {
              if (!wasPinchingRef.current) {
                wasPinchingRef.current = true
                drawClickRipple(ctx, indexTip)

                // Dispatch synthetic click event
                const cursorX = window.innerWidth - (indexTip.x * window.innerWidth)
                const cursorY = indexTip.y * window.innerHeight
                
                setTimeout(() => {
                  const element = document.elementFromPoint(cursorX, cursorY) as HTMLElement
                  if (element) {
                    console.log("Virtual click on:", element)
                    element.focus?.()
                    const clickEvent = new MouseEvent('click', {
                      bubbles: true,
                      cancelable: true,
                      clientX: cursorX,
                      clientY: cursorY
                    })
                    element.dispatchEvent(clickEvent)
                  }
                }, 0)
              }
            } else if (dist >= 0.045) {
              wasPinchingRef.current = false
            }
          }
        }

        const resizedDetections = faceapi.resizeResults(detections, displaySize)

        if (resizedDetections.length === 0) {
          // Clear active face target if not seen for 3.5 seconds
          if (Date.now() - lastSeenTimeRef.current > 3500) {
            setMatchedPerson(null)
            setIsUnknown(false)
            recognizedPersonIdRef.current = null
            spokenIdRef.current = null
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
            label = `${matchedPerson.name} (${matchedPerson.relationship}) - Match`
            color = "#10b981" // green
          } else if (isUnknown) {
            label = "Unknown Person - Registration needed"
            color = "#ef4444" // red
          }

          const mirroredBox = {
            x: canvas.width - primary.detection.box.x - primary.detection.box.width,
            y: primary.detection.box.y,
            width: primary.detection.box.width,
            height: primary.detection.box.height
          }
          drawCustomBoundingBox(ctx, mirroredBox, label, color)

          // Perform Server Recognition Lookups
          const now = Date.now()
          if (!recognitionInProgressRef.current && now - lastRecognizedRef.current > 1800) {
            recognitionInProgressRef.current = true
            lastRecognizedRef.current = now

            recognizeFace(descriptor)
              .then((res) => {
                if (res.matched && res.person) {
                  setMatchedPerson(res.person)
                  setIsUnknown(false)
                  setConfidence(res.confidence)
                  speakIntroductionOnce(res.person)

                  // Log sightings
                  if (recognizedPersonIdRef.current !== res.person.id) {
                    recognizedPersonIdRef.current = res.person.id
                    triggerSightingLog(res.person.id)
                  }
                } else {
                  setMatchedPerson(null)
                  setIsUnknown(true)
                  setConfidence(res.confidence || 12.0)
                  recognizedPersonIdRef.current = null
                  spokenIdRef.current = null
                }
              })
              .catch((err) => {
                console.warn("Face recognition endpoint unavailable", err)
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
  }, [isFaceApiLoaded, matchedPerson, isUnknown])

  // Capture face photo snapshot handler
  const handleCaptureSnapshot = () => {
    const video = cameraVideoRef.current
    if (!video || !currentDescriptorRef.current) {
      alert("No face detected in camera viewport. Please frame face correctly.")
      return
    }

    const hiddenCanvas = document.createElement('canvas')
    hiddenCanvas.width = 160
    hiddenCanvas.height = 160
    const hiddenCtx = hiddenCanvas.getContext('2d')
    if (hiddenCtx) {
      // Draw centered face cropping
      hiddenCtx.translate(hiddenCanvas.width, 0)
      hiddenCtx.scale(-1, 1)
      hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height)
      const base64Crop = hiddenCanvas.toDataURL('image/jpeg')

      setCapturedSnapshots(prev => [...prev, base64Crop])
      setCapturedEmbeddings(prev => [...prev, currentDescriptorRef.current!])
    }
  }

  // NLP phrase parser
  const handleParsePhrase = () => {
    if (!introPhrase) return

    const clean = introPhrase.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim()
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

    if (name) {
      setRegName(name.charAt(0).toUpperCase() + name.slice(1))
    }
    if (relationship) {
      setRegRelationship(relationship.charAt(0).toUpperCase() + relationship.slice(1))
    }

    setRegStatus("Intro text parsed successfully.")
  }

  // Registration enrollment submit handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regName || !regRelationship) {
      setRegStatus("Please fill out name and relationship fields.")
      return
    }
    if (capturedSnapshots.length < 3) {
      setRegStatus("Please capture at least 3 photos from different angles.")
      return
    }

    setIsRegistering(true)
    setRegStatus("Registering person...")

    try {
      const newPerson = await registerPerson({
        name: regName,
        relationship: regRelationship,
        faceEmbeddings: capturedEmbeddings,
        faceSnapshots: capturedSnapshots
      })

      setRegStatus("Successfully enrolled!")
      // Clear forms
      setRegName("")
      setRegRelationship("")
      setIntroPhrase("")
      setCapturedSnapshots([])
      setCapturedEmbeddings([])

      // Lock on newly enrolled person
      setMatchedPerson(newPerson)
      setIsUnknown(false)
      setConfidence(98.5)
      speakIntroductionOnce(newPerson)
    } catch (err) {
      console.error(err)
      setRegStatus("Error registering new person.")
    } finally {
      setIsRegistering(false)
    }
  }

  // Triggered when an introductory phrase is detected
  const handleAutoRegisterFlow = async (textPhrase: string) => {
    setIsAutoCapturing(true)
    setRegStatus("Intro speech detected! Starting auto-capture...")

    // 1. Speak voice announcement & countdown
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const announcement = new SpeechSynthesisUtterance(
        "Introduction detected. Please face the camera. Starting snapshot capture in 3... 2... 1..."
      )
      announcement.rate = 0.9
      window.speechSynthesis.speak(announcement)
    }

    // 2. Countdown display (3 seconds visual countdown)
    setCountdown(3)
    let c = 3
    const countdownInterval = setInterval(() => {
      c -= 1
      if (c > 0) {
        setCountdown(c)
      } else {
        setCountdown(null)
        clearInterval(countdownInterval)
        
        // Start automatic snapshot sequence
        runAutoSnapSequence(textPhrase)
      }
    }, 1000)
  }

  // Automatic snapshot capture sequence
  const runAutoSnapSequence = async (textPhrase: string) => {
    setRegStatus("Capturing snapshots...")
    const snapshots: string[] = []
    const embeddings: number[][] = []

    const captureNext = (count: number): Promise<void> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const video = cameraVideoRef.current
          if (video && currentDescriptorRef.current) {
            const hiddenCanvas = document.createElement('canvas')
            hiddenCanvas.width = 160
            hiddenCanvas.height = 160
            const hiddenCtx = hiddenCanvas.getContext('2d')
            if (hiddenCtx) {
              hiddenCtx.translate(hiddenCanvas.width, 0)
              hiddenCtx.scale(-1, 1)
              hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height)
              const base64Crop = hiddenCanvas.toDataURL('image/jpeg')
              
              snapshots.push(base64Crop)
              embeddings.push(currentDescriptorRef.current)
              
              // Visual flash feedback on canvas
              triggerVisualFlash()
              setRegStatus(`Snapshot ${count}/3 captured...`)
            }
          }
          resolve()
        }, 800)
      })
    }

    // Capture 3 snapshots sequentially
    await captureNext(1)
    await captureNext(2)
    await captureNext(3)

    if (snapshots.length < 3) {
      setRegStatus("Capture failed. No face detected. Resuming scan.")
      setIsAutoCapturing(false)
      return
    }

    // Call NLP Parse API (Gemini or Regex fallback)
    setRegStatus("Analyzing introduction phrase...")
    try {
      const parsed = await parseIntroPhrase(textPhrase)
      
      const finalName = parsed.name || "Unknown"
      const finalRel = parsed.relationship || "Contact"

      setRegStatus(`Registering ${finalName} (${finalRel})...`)
      
      const newPerson = await registerPerson({
        name: finalName,
        relationship: finalRel,
        faceEmbeddings: embeddings,
        faceSnapshots: snapshots
      })

      // Lock on newly enrolled person
      setMatchedPerson(newPerson)
      setIsUnknown(false)
      setConfidence(98.0)
      speakIntroductionOnce(newPerson)

      setRegStatus("Auto-enrollment complete!")
    } catch (err) {
      console.error("Auto-registration error", err)
      setRegStatus("Auto-registration failed.")
    } finally {
      setIsAutoCapturing(false)
    }
  }

  // Visual flash effect function
  const triggerVisualFlash = () => {
    const flashEl = document.createElement('div')
    flashEl.className = "fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-300 opacity-80"
    document.body.appendChild(flashEl)
    setTimeout(() => {
      flashEl.style.opacity = '0'
      setTimeout(() => {
        document.body.removeChild(flashEl)
      }, 300)
    }, 50)
  }

  return (
    <div 
      className="fixed inset-0 flex flex-col bg-[#02040a] text-white font-sans overflow-hidden select-none"
      style={{ 
        background: 'radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.16) 0%, transparent 50%), radial-gradient(circle at 15% 85%, rgba(16, 185, 129, 0.12) 0%, transparent 45%), radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 60%), #02040a' 
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
            NeuroLens
          </span>
        </div>

        {/* Navigation Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900/60 border border-white/5 rounded-full p-1 shadow-inner">
          <button className="px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 bg-violet-600 text-white shadow">
            AR View
          </button>
          <button className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-all">
            Memories
          </button>
          <button className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-all">
            People
          </button>
          <button className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-all inline-flex items-center gap-1">
            Settings
          </button>
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
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-400 rounded-full animate-spin" />
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold">Starting NeuroLens Vision</h3>
              <p className="text-sm text-slate-400">Downloading localized facial landmark networks...</p>
            </div>
          </div>
        ) : (
          <>
            {/* COLUMN 1: LEFT SIDEBAR (Person Details + Actions) */}
            <div className="w-[245px] flex flex-col gap-6 flex-shrink-0 h-full overflow-y-auto scrollbar-none">
              {/* Person Recognized Card */}
              <div className="rounded-3xl bg-slate-900/40 border border-white/10 p-5 shadow-2xl backdrop-blur-xl space-y-5">
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {matchedPerson ? "Person Recognized" : "System Scanning"}
                </div>

                {matchedPerson ? (
                  <>
                    <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                      <div className="relative size-16 rounded-full overflow-hidden border-2 border-white/15">
                        <img
                          src={matchedPerson.profileImage}
                          alt={matchedPerson.name}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white leading-tight">{matchedPerson.name}</h2>
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 rounded-full">
                          <User className="size-3" />
                          {matchedPerson.relationship}
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold mt-1">Confidence: {confidence}%</p>
                      </div>
                    </div>

                    {/* Stats List */}
                    <div className="space-y-3.5 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-400">
                          <Calendar className="size-4 text-slate-500" />
                          First Seen
                        </span>
                        <span className="font-semibold text-white">22 Jun 2026</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-400">
                          <Clock className="size-4 text-slate-500" />
                          Last Seen
                        </span>
                        <span className="font-semibold text-white">Today, 10:42 AM</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-400">
                          <Eye className="size-4 text-slate-500" />
                          Times Seen
                        </span>
                        <span className="font-semibold text-white">{matchedPerson.tags[0] || '8'} times</span>
                      </div>
                    </div>

                    {/* Voice Announcement Box */}
                    <div className="bg-violet-950/20 border border-violet-500/20 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-slate-300">
                      <Volume2 className="size-5 text-violet-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-violet-300 mb-0.5">Hi, {matchedPerson.name}!</p>
                        <p>She is your {matchedPerson.relationship.toLowerCase()}. You met yesterday.</p>
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
                        Looking for faces to recognize and analyze relationship timeline...
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions Card */}
              <div className="rounded-3xl bg-slate-900/40 border border-white/10 p-5 shadow-2xl backdrop-blur-xl space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quick Actions</span>
                <div className="space-y-2.5">
                  <button className="w-full flex items-center gap-3 bg-slate-900/40 hover:bg-slate-900/70 border border-white/5 rounded-2xl px-4 py-3 text-xs font-bold text-slate-300 transition cursor-pointer">
                    <MessageSquare className="size-4 text-slate-400" />
                    Add Note
                  </button>
                  {hasUnsavedSpeech ? (
                    <button 
                      onClick={handleConversationButtonClick}
                      disabled={isSavingMemory}
                      className="w-full flex items-center gap-3 bg-violet-600 hover:bg-violet-700 border border-violet-400/20 shadow-lg shadow-violet-500/25 rounded-2xl px-4 py-3 text-xs font-extrabold text-white transition animate-pulse cursor-pointer disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      <MessageCircle className="size-4 text-white" />
                      {isSavingMemory ? "Saving Memory..." : "Save Conversation Memory"}
                    </button>
                  ) : (
                    <button 
                      onClick={handleConversationButtonClick}
                      className="w-full flex items-center gap-3 bg-slate-900/40 hover:bg-slate-900/70 border border-white/5 rounded-2xl px-4 py-3 text-xs font-bold text-slate-300 transition cursor-pointer"
                    >
                      <MessageCircle className="size-4 text-slate-400" />
                      Start Conversation
                    </button>
                  )}
                  <button className="w-full flex items-center gap-3 bg-slate-900/40 hover:bg-slate-900/70 border border-white/5 rounded-2xl px-4 py-3 text-xs font-bold text-slate-300 transition cursor-pointer">
                    <User className="size-4 text-slate-400" />
                    Show Full Profile
                  </button>
                </div>
              </div>
            </div>

            {/* COLUMN 2: CENTER CAMERA PANEL */}
            <div className="flex-grow flex flex-col h-full min-w-0 bg-slate-900/20 border border-white/5 rounded-[32px] overflow-hidden relative shadow-2xl">
              <video
                ref={cameraVideoRef}
                className="w-full h-full object-cover scale-x-[-1]"
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none z-10 animate-fade-in"
              />

              {/* Countdown Overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="text-center space-y-4">
                    <div className="text-9xl font-black text-white animate-ping">{countdown}</div>
                    <p className="text-lg text-blue-300 font-semibold">Hold still, capturing face...</p>
                  </div>
                </div>
              )}

              {/* Auto-capture progress banner */}
              {isAutoCapturing && countdown === null && (
                <div className="absolute bottom-24 left-6 right-6 z-20 rounded-2xl bg-blue-600/90 backdrop-blur p-4 text-sm font-semibold flex items-center gap-3 border border-blue-400/20 animate-pulse">
                  <Camera className="size-5 text-white flex-shrink-0" />
                  <p>{regStatus}</p>
                </div>
              )}

              {/* Live Subtitle Overlay */}
              {speechTranscript && (
                <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20 w-11/12 max-w-xl text-center pointer-events-none">
                  <span className="bg-slate-950/85 text-white text-sm sm:text-base font-semibold px-4 py-2.5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md inline-block">
                    🎤 "{speechTranscript}"
                  </span>
                </div>
              )}

              {/* Floating Camera Control panel */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-950/85 backdrop-blur-xl border border-white/15 rounded-full px-6 py-2 flex items-center gap-8 shadow-2xl z-20">
                <button className="flex flex-col items-center gap-1 group py-1 cursor-pointer">
                  <div className="size-11 rounded-full bg-violet-600 flex items-center justify-center text-white border border-violet-400/20 shadow-lg group-hover:scale-105 transition-all animate-pulse">
                    <Layers className="size-4.5" />
                  </div>
                  <span className="text-[10px] font-black text-violet-400 tracking-wider">Flashcards</span>
                </button>
                <button className="flex flex-col items-center gap-1 group py-1 cursor-pointer">
                  <div className="size-11 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 hover:scale-105 transition-all">
                    <Volume2 className="size-4.5" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 group-hover:text-white tracking-wider">Speak</span>
                </button>
                <button className="flex flex-col items-center gap-1 group py-1 cursor-pointer" onClick={handleCaptureSnapshot}>
                  <div className="size-11 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 hover:scale-105 transition-all">
                    <Camera className="size-4.5" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 group-hover:text-white tracking-wider">Capture</span>
                </button>
              </div>
            </div>

            {/* COLUMN 3: RIGHT-CENTER FLASHCARDS / REGISTRATION */}
            <div className="w-[260px] flex flex-col flex-shrink-0 h-full bg-slate-900/30 border border-white/10 rounded-[32px] p-5 shadow-2xl overflow-y-auto scrollbar-none justify-between backdrop-blur-xl">
              
              {isUnknown ? (
                /* Registration Mode */
                <div className="space-y-5 flex flex-col h-full justify-between animate-in slide-in-from-right duration-300">
                  <div className="space-y-4">
                    <div className="bg-destructive/10 border-l-4 border-destructive text-destructive-foreground p-3 rounded-r-xl text-xs space-y-1">
                      <span className="font-extrabold uppercase block tracking-wider">New Signature Detected</span>
                      <p className="opacity-90">Please enter enrollment details below to create relationship timeline.</p>
                    </div>

                    {/* Face snapshots capturing */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">Face snapshots (3 required)</span>
                        <span className="text-slate-500 font-bold">Captured: {capturedSnapshots.length}/3</span>
                      </div>
                      <div className="flex gap-2">
                        {[0, 1, 2].map((idx) => (
                          <div key={idx} className="flex-1 aspect-square rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center relative overflow-hidden">
                            {capturedSnapshots[idx] ? (
                              <img
                                src={capturedSnapshots[idx]}
                                alt={`angle ${idx + 1}`}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <Camera className="size-5 text-slate-700" />
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleCaptureSnapshot}
                        disabled={capturedSnapshots.length >= 3}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 font-semibold py-2.5 text-xs transition-all border border-white/5"
                      >
                        <Camera className="size-3.5" />
                        Capture Snapshots
                      </button>
                    </div>

                    <hr className="border-white/5" />

                    {/* Registration input fields */}
                    <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Name</label>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Shifa"
                          className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4.5 py-3 text-xs focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Relationship</label>
                        <input
                          type="text"
                          required
                          value={regRelationship}
                          onChange={(e) => setRegRelationship(e.target.value)}
                          placeholder="e.g. Friend, Daughter"
                          className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4.5 py-3 text-xs focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                      
                      {regStatus && (
                        <p className="text-[10px] text-blue-300 font-medium animate-pulse">{regStatus}</p>
                      )}

                      <button
                        type="submit"
                        disabled={isRegistering || capturedSnapshots.length < 3}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-900 disabled:to-slate-900 disabled:text-slate-600 font-semibold py-3 text-sm cursor-pointer shadow-lg shadow-emerald-500/10 transition mt-4"
                      >
                        <UserPlus className="size-4" />
                        {isRegistering ? "Enrolling..." : "Enroll Contact"}
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                /* Standard Flashcard Mode */
                <div className="flex flex-col h-full justify-between">
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Flashcards</span>

                    {/* Card 1: WHO IS THIS? */}
                    <div className="bg-emerald-950/40 border border-emerald-500/30 backdrop-blur-md rounded-2xl p-4 space-y-1.5 shadow-lg animate-in fade-in duration-300">
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                        <User className="size-3" />
                        Who is this?
                      </span>
                      <p className="text-xl font-extrabold text-white">
                        {matchedPerson ? matchedPerson.name : "Scanning..."}
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
                      <p className="text-xs text-slate-355 font-medium">
                        {matchedPerson ? `She is your ${matchedPerson.relationship.toLowerCase()}.` : "Checking database..."}
                      </p>
                    </div>

                    {/* Card 3: ABOUT HER */}
                    <div className="bg-blue-950/40 border border-blue-500/30 backdrop-blur-md rounded-2xl p-4 space-y-1.5 shadow-lg animate-in fade-in duration-300">
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-blue-400 uppercase tracking-widest">
                        <MessageSquare className="size-3" />
                        About Her
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {matchedPerson && matchedPerson.name === "Shifa"
                          ? "You have known Shifa for a few months. She is kind and helpful."
                          : matchedPerson?.notes
                          ? matchedPerson.notes
                          : "Extracting contact details..."}
                      </p>
                    </div>

                    {/* Card 4: LAST TIME YOU MET */}
                    <div className="bg-violet-950/40 border border-violet-500/30 backdrop-blur-md rounded-2xl p-4 space-y-1.5 shadow-lg animate-in fade-in duration-300">
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-violet-400 uppercase tracking-widest">
                        <Calendar className="size-3" />
                        Last Time You Met
                      </span>
                      <p className="text-base font-extrabold text-white">
                        {matchedPerson ? "Yesterday" : "Scanning..."}
                      </p>
                      <p className="text-[10px] text-slate-355 font-semibold">
                        {matchedPerson ? "21 Jun 2026, 6:30 PM" : "Awaiting match..."}
                      </p>
                    </div>
                  </div>

                  {/* Button at bottom of column */}
                  <div className="pt-4 mt-auto">
                    <button className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900/40 hover:bg-slate-900/70 border border-white/5 hover:border-white/10 text-xs font-bold text-slate-300 py-3 transition cursor-pointer">
                      View Full Profile &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 4: RIGHT TIMELINE */}
            <div className="w-[280px] flex flex-col flex-shrink-0 h-full bg-slate-900/30 border border-white/10 rounded-[32px] p-5 shadow-2xl overflow-hidden justify-between backdrop-blur-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-4">Memory Timeline</span>
              
              {matchedPerson && matchedPerson.memories && matchedPerson.memories.length > 0 ? (
                <MemoryReplayEngine memories={matchedPerson.memories} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-10 h-10 rounded-full border border-dashed border-white/20 flex items-center justify-center text-slate-600">
                    <span>📅</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 max-w-[200px] leading-relaxed">
                    No timeline memories available for this contact signature yet.
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
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400 font-bold tracking-wider">Listening...</span>
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
          <span>NeuroLens is here to help</span>
        </div>

        {/* Right Active Status */}
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider">
          <Shield className="size-3 text-emerald-400" />
          <span>All Systems Active</span>
        </div>
      </footer>

    </div>
  )
}
