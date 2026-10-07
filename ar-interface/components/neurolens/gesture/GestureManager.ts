import type { GestureRecognizer } from "@mediapipe/tasks-vision"
import { getGestureRecognizer } from "@/lib/gestureRecognizer"
import type { GestureType } from "./gestureTypes"

export interface GestureManagerOptions {
  onCursorMove?: (x: number, y: number, isHovering: boolean, visible: boolean) => void
  onClick?: (x: number, y: number) => void
  onScrollModeChange?: (enabled: boolean) => void
  onVolumeChange?: (delta: number) => void
  onGestureStateChange?: (state: {
    gesture: GestureType
    cursorFrozen: boolean
    scrollModeEnabled: boolean
    activeHands: number
    cursorEnabled: boolean
  }) => void
  isVideoPlaying?: () => boolean
}

export class GestureManager {
  private recognizer: GestureRecognizer | null = null
  private isInitializing = false

  // Cursor state
  private cursorX = typeof window !== "undefined" ? window.innerWidth / 2 : 500
  private cursorY = typeof window !== "undefined" ? window.innerHeight / 2 : 400
  private cursorEnabled = false
  private cursorFrozen = false

  // Pinch click state with hysteresis
  private isPinching = false
  private wasPinching = false
  private readonly PINCH_START_THRESHOLD = 0.055
  private readonly PINCH_RELEASE_THRESHOLD = 0.085

  // Gesture activation / deactivation debounce & cooldown
  private pointingStartTime: number | null = null
  private openPalmStartTime: number | null = null
  private lastCursorToggleTime = 0
  private readonly TOGGLE_HOLD_DURATION = 250 // ms required holding gesture to toggle
  private readonly TOGGLE_COOLDOWN = 500 // ms cooldown after toggle to prevent bounce

  // Scroll state
  private scrollModeEnabled = false
  private twoPalmsStartTime: number | null = null
  private twoPeaceStartTime: number | null = null

  // Volume state
  private lastVolumeChangeTime = 0

  // State cache for notifications
  private lastReportedGesture: GestureType = "IDLE"
  private lastReportedFrozen = false
  private lastReportedScroll = false
  private lastReportedEnabled = false

  private options: GestureManagerOptions

  constructor(options: GestureManagerOptions = {}) {
    this.options = options
  }

  public setOptions(options: Partial<GestureManagerOptions>) {
    this.options = { ...this.options, ...options }
  }

  public async init(): Promise<boolean> {
    if (this.recognizer) return true
    if (this.isInitializing) return false

    this.isInitializing = true
    try {
      this.recognizer = await getGestureRecognizer()
      return this.recognizer !== null
    } finally {
      this.isInitializing = false
    }
  }

  public processFrame(video: HTMLVideoElement, timestamp: number) {
    if (!this.recognizer || video.readyState < 2) return

    let result
    try {
      result = this.recognizer.recognizeForVideo(video, timestamp)
    } catch {
      return
    }

    if (!result || !result.landmarks || result.landmarks.length === 0) {
      this.twoPalmsStartTime = null
      this.twoPeaceStartTime = null
      this.pointingStartTime = null
      this.openPalmStartTime = null
      this.notifyState("IDLE", 0)
      return
    }

    const handCount = result.landmarks.length
    const now = Date.now()

    // Determine posture per hand
    const handInfo = result.landmarks.map((lm, idx) => {
      const gestureData = result.gestures?.[idx]?.[0]
      const category = gestureData?.categoryName || "None"
      const score = gestureData?.score || 0

      // Calculate 3D pinch distance between Thumb tip (landmark 4) and Index tip (landmark 8)
      const pinchDist = Math.hypot(
        lm[4].x - lm[8].x,
        lm[4].y - lm[8].y,
        (lm[4].z - lm[8].z) * 0.5
      )

      // Landmark geometry checks
      const isIndexExtended = lm[8].y < lm[6].y && lm[8].y < lm[5].y
      const isMiddleCurled = lm[12].y > lm[10].y
      const isRingCurled = lm[16].y > lm[14].y
      const isPinkyCurled = lm[20].y > lm[18].y
      const isPointingGeometry = isIndexExtended && isMiddleCurled && isRingCurled && isPinkyCurled

      const isOpenPalm = category === "Open_Palm" || (
        lm[8].y < lm[6].y && lm[12].y < lm[10].y && lm[16].y < lm[14].y && lm[20].y < lm[18].y
      )

      const isPeace = category === "Victory" || (
        isIndexExtended && lm[12].y < lm[10].y && isRingCurled && isPinkyCurled
      )

      const isThumbUp = category === "Thumb_Up"
      const isThumbDown = category === "Thumb_Down"

      return {
        lm,
        category,
        score,
        pinchDist,
        isOpenPalm,
        isPeace,
        isPointing: category === "Pointing_Up" || isPointingGeometry,
        isThumbUp,
        isThumbDown,
      }
    })

    // -------------------------------------------------------------
    // MULTI-HAND HANDLING (2 HANDS)
    // -------------------------------------------------------------
    if (handCount >= 2) {
      const bothOpenPalms = handInfo[0].isOpenPalm && handInfo[1].isOpenPalm
      const bothPeace = handInfo[0].isPeace && handInfo[1].isPeace

      if (bothOpenPalms) {
        this.twoPeaceStartTime = null
        if (!this.twoPalmsStartTime) {
          this.twoPalmsStartTime = now
        } else if (now - this.twoPalmsStartTime >= 320 && !this.scrollModeEnabled) {
          this.scrollModeEnabled = true
          this.options.onScrollModeChange?.(true)
        }
        this.notifyState("TWO_OPEN_PALMS", handCount)
        return
      } else {
        this.twoPalmsStartTime = null
      }

      if (bothPeace) {
        this.twoPalmsStartTime = null
        if (!this.twoPeaceStartTime) {
          this.twoPeaceStartTime = now
        } else if (now - this.twoPeaceStartTime >= 320 && this.scrollModeEnabled) {
          this.scrollModeEnabled = false
          this.options.onScrollModeChange?.(false)
        }
        this.notifyState("TWO_PEACE", handCount)
        return
      } else {
        this.twoPeaceStartTime = null
      }
    } else {
      this.twoPalmsStartTime = null
      this.twoPeaceStartTime = null
    }

    // -------------------------------------------------------------
    // SINGLE HAND / PRIMARY HAND HANDLING
    // -------------------------------------------------------------
    const primary = handInfo[0]
    const isVideoPlaying = this.options.isVideoPlaying ? this.options.isVideoPlaying() : false

    // 1. VOLUME CONTROLS (Only while memory video is actively playing)
    if (isVideoPlaying) {
      if (primary.isThumbUp && now - this.lastVolumeChangeTime > 400) {
        this.lastVolumeChangeTime = now
        this.options.onVolumeChange?.(+0.05)
        this.notifyState("THUMBS_UP", handCount)
        return
      } else if (primary.isThumbDown && now - this.lastVolumeChangeTime > 400) {
        this.lastVolumeChangeTime = now
        this.options.onVolumeChange?.(-0.05)
        this.notifyState("THUMBS_DOWN", handCount)
        return
      }
    }

    // 2. PINCH CLICK (Active when cursor is enabled)
    if (this.cursorEnabled) {
      // Hysteresis logic
      if (primary.pinchDist < this.PINCH_START_THRESHOLD) {
        this.isPinching = true
        if (!this.wasPinching) {
          this.wasPinching = true
          console.log("[NeuroLens][Gesture] PINCH START")
          console.log("[NeuroLens][Gesture] PINCH CLICK")
          this.triggerClick()
        }
        this.notifyState("PINCH", handCount)
        return
      } else if (primary.pinchDist > this.PINCH_RELEASE_THRESHOLD) {
        if (this.wasPinching) {
          console.log("[NeuroLens][Gesture] PINCH RELEASE")
        }
        this.isPinching = false
        this.wasPinching = false
      }
    }

    // 3. CURSOR DEACTIVATION GESTURE: SINGLE OPEN PALM
    if (primary.isOpenPalm && handCount === 1) {
      this.pointingStartTime = null

      if (this.cursorEnabled) {
        if (!this.openPalmStartTime) {
          this.openPalmStartTime = now
        } else if (now - this.openPalmStartTime >= this.TOGGLE_HOLD_DURATION && now - this.lastCursorToggleTime > this.TOGGLE_COOLDOWN) {
          this.cursorEnabled = false
          this.cursorFrozen = false
          this.lastCursorToggleTime = now
          this.openPalmStartTime = null
          console.log("[NeuroLens][Cursor] DISABLED")
          this.options.onCursorMove?.(this.cursorX, this.cursorY, false, false)
        }
      }

      this.cursorFrozen = true
      this.notifyState("ONE_OPEN_PALM", handCount)
      return
    } else {
      this.openPalmStartTime = null
    }

    // 4. CURSOR ACTIVATION & MOVEMENT: INDEX FINGER POINTING
    if (primary.isPointing) {
      // Map index fingertip (landmark 8) coordinates
      const rawX = primary.lm[8].x
      const rawY = primary.lm[8].y

      const screenW = typeof window !== "undefined" ? window.innerWidth : 1920
      const screenH = typeof window !== "undefined" ? window.innerHeight : 1080

      // Mirrored horizontally to match video view (scale-x-[-1])
      const targetX = Math.max(0, Math.min(screenW, (1 - rawX) * screenW))
      const targetY = Math.max(0, Math.min(screenH, rawY * screenH))

      // Adaptive smoothing (Low-Pass Filter)
      const dx = targetX - this.cursorX
      const dy = targetY - this.cursorY
      const dist = Math.hypot(dx, dy)

      if (dist > 1.2) {
        const alpha = Math.min(0.65, Math.max(0.35, dist / 160))
        this.cursorX += dx * alpha
        this.cursorY += dy * alpha
      }

      // Check if cursor needs activation
      if (!this.cursorEnabled) {
        if (!this.pointingStartTime) {
          this.pointingStartTime = now
        } else if (now - this.pointingStartTime >= this.TOGGLE_HOLD_DURATION && now - this.lastCursorToggleTime > this.TOGGLE_COOLDOWN) {
          this.cursorEnabled = true
          this.cursorFrozen = false
          this.lastCursorToggleTime = now
          this.pointingStartTime = null
          console.log("[NeuroLens][Gesture] Cursor activation gesture detected")
          console.log("[NeuroLens][Cursor] ENABLED")
        }
      } else {
        this.cursorFrozen = false
      }

      if (this.cursorEnabled) {
        const isHovering = this.checkIsHovering(this.cursorX, this.cursorY)
        this.options.onCursorMove?.(this.cursorX, this.cursorY, isHovering, true)
      }

      this.notifyState("ONE_INDEX", handCount)
      return
    } else {
      this.pointingStartTime = null
    }

    // Default when hand is visible but no specific gesture matches
    this.notifyState("IDLE", handCount)
  }

  private checkIsHovering(x: number, y: number): boolean {
    if (typeof document === "undefined") return false
    const el = document.elementFromPoint(x, y)
    if (!el) return false
    return el.closest('button, [data-clickable], [data-memory-card], .cursor-pointer, a') !== null
  }

  private triggerClick() {
    if (typeof document === "undefined") return

    this.options.onClick?.(this.cursorX, this.cursorY)

    const el = document.elementFromPoint(this.cursorX, this.cursorY)
    if (!el) return

    const clickable = (el.closest('button, [data-clickable], [data-memory-card], .cursor-pointer, a, input') || el) as HTMLElement

    clickable.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: this.cursorX,
      clientY: this.cursorY,
    }))
    clickable.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      clientX: this.cursorX,
      clientY: this.cursorY,
    }))
    clickable.click()
  }

  private notifyState(gesture: GestureType, activeHands: number) {
    if (
      this.lastReportedGesture !== gesture ||
      this.lastReportedFrozen !== this.cursorFrozen ||
      this.lastReportedScroll !== this.scrollModeEnabled ||
      this.lastReportedEnabled !== this.cursorEnabled
    ) {
      this.lastReportedGesture = gesture
      this.lastReportedFrozen = this.cursorFrozen
      this.lastReportedScroll = this.scrollModeEnabled
      this.lastReportedEnabled = this.cursorEnabled

      this.options.onGestureStateChange?.({
        gesture,
        cursorFrozen: this.cursorFrozen,
        scrollModeEnabled: this.scrollModeEnabled,
        activeHands,
        cursorEnabled: this.cursorEnabled,
      })
    }
  }

  public getCursorPosition() {
    return { x: this.cursorX, y: this.cursorY, frozen: this.cursorFrozen, enabled: this.cursorEnabled }
  }

  public isScrollEnabled() {
    return this.scrollModeEnabled
  }

  public isCursorEnabled() {
    return this.cursorEnabled
  }

  public setScrollMode(enabled: boolean) {
    this.scrollModeEnabled = enabled
  }

  public setCursorEnabled(enabled: boolean) {
    this.cursorEnabled = enabled
    this.options.onCursorMove?.(this.cursorX, this.cursorY, false, enabled)
  }
}
