import type { GestureRecognizer as GestureRecognizerType } from "@mediapipe/tasks-vision"

let gestureRecognizerInstance: GestureRecognizerType | null = null
let isInitializing = false

export async function getGestureRecognizer(): Promise<GestureRecognizerType | null> {
  if (typeof window === "undefined") return null
  if (gestureRecognizerInstance) return gestureRecognizerInstance
  if (isInitializing) return null

  isInitializing = true
  try {
    const { FilesetResolver, GestureRecognizer } = await import("@mediapipe/tasks-vision")

    // Try loading wasm locally from /wasm, fallback to CDN if needed
    let vision
    try {
      vision = await FilesetResolver.forVisionTasks("/wasm")
    } catch {
      vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
      )
    }

    // Try loading model locally from /models/gesture_recognizer.task, fallback to Google Storage
    const modelPaths = [
      "/models/gesture_recognizer.task",
      "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task"
    ]

    for (const modelPath of modelPaths) {
      try {
        gestureRecognizerInstance = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        })
        if (gestureRecognizerInstance) break
      } catch (err) {
        console.warn(`Failed loading gesture model from ${modelPath}, trying fallback...`, err)
        try {
          // Fallback to CPU delegate if GPU not supported on machine
          gestureRecognizerInstance = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: modelPath,
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numHands: 2,
          })
          if (gestureRecognizerInstance) break
        } catch {
          // continue loop
        }
      }
    }

    return gestureRecognizerInstance
  } catch (error) {
    console.error("Error initializing MediaPipe GestureRecognizer:", error)
    return null
  } finally {
    isInitializing = false
  }
}
