export type GestureType =
  | "IDLE"
  | "ONE_INDEX"        // ☝️ Cursor control
  | "ONE_OPEN_PALM"     // 🤚 Stop cursor movement
  | "TWO_OPEN_PALMS"    // 🤚🤚 Enable timeline scrolling
  | "TWO_PEACE"         // ✌️✌️ Disable timeline scrolling
  | "PINCH"             // 👌 Left click / select
  | "THUMBS_UP"         // 👍 Volume up (when video playing)
  | "THUMBS_DOWN"       // 👎 Volume down (when video playing)

export interface GestureState {
  currentGesture: GestureType
  activeHandsCount: number
  cursorActive: boolean
  cursorFrozen: boolean
  scrollModeEnabled: boolean
  isClicking: boolean
  cursorX: number
  cursorY: number
  lastActionMessage?: string
}

export interface VolumeFeedback {
  volume: number
  visible: boolean
}
