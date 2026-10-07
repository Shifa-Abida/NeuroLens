'use client'

import { useEffect, useRef, useState } from 'react'
import type { GestureType } from './gestureTypes'
import { Volume2, VolumeX, Sparkles, Hand, Scroll, CheckCircle2 } from 'lucide-react'

interface ARVirtualCursorProps {
  currentGesture: GestureType
  cursorFrozen: boolean
  scrollModeEnabled: boolean
  volumeLevel: number
  volumeNoticeVisible: boolean
  activeHands: number
}

export function ARVirtualCursor({
  currentGesture,
  cursorFrozen,
  scrollModeEnabled,
  volumeLevel,
  volumeNoticeVisible,
  activeHands,
}: ARVirtualCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [isClicking, setIsClicking] = useState(false)
  const [visible, setVisible] = useState(false)

  // Expose global callback for high-performance direct cursor styling
  useEffect(() => {
    const handleCursorUpdate = (e: CustomEvent<{ x: number; y: number; hovering: boolean; visible?: boolean }>) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.detail.x}px, ${e.detail.y}px, 0)`
      }
      setIsHovering(e.detail.hovering)
      if (e.detail.visible !== undefined) {
        setVisible(e.detail.visible)
      } else {
        setVisible(true)
      }
    }

    const handleCursorVisibility = (e: CustomEvent<{ visible: boolean }>) => {
      setVisible(e.detail.visible)
    }

    const handleClickPulse = () => {
      setIsClicking(true)
      window.setTimeout(() => setIsClicking(false), 280)
    }

    window.addEventListener('neurolens-cursor-move' as any, handleCursorUpdate)
    window.addEventListener('neurolens-cursor-visibility' as any, handleCursorVisibility)
    window.addEventListener('neurolens-cursor-click' as any, handleClickPulse)

    return () => {
      window.removeEventListener('neurolens-cursor-move' as any, handleCursorUpdate)
      window.removeEventListener('neurolens-cursor-visibility' as any, handleCursorVisibility)
      window.removeEventListener('neurolens-cursor-click' as any, handleClickPulse)
    }
  }, [])

  return (
    <>
      {/* 1. VIRTUAL AR CURSOR (Fixed Overlay) */}
      <div
        ref={cursorRef}
        className={`fixed top-0 left-0 pointer-events-none z-[9999] transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transform: 'translate3d(-100px, -100px, 0)' }}
      >
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          {/* Outer futuristic ring */}
          <div
            className={`w-9 h-9 rounded-full border transition-all duration-150 flex items-center justify-center ${
              isClicking
                ? 'scale-75 border-amber-300 bg-amber-400/20'
                : cursorFrozen
                ? 'scale-100 border-amber-400/80 border-dashed animate-spin-slow bg-amber-500/10'
                : isHovering
                ? 'scale-125 border-emerald-400 bg-emerald-400/15 shadow-[0_0_15px_rgba(52,211,153,0.6)]'
                : 'scale-100 border-cyan-400/80 bg-cyan-500/10 shadow-[0_0_12px_rgba(34,211,238,0.5)]'
            }`}
          >
            {/* Center target dot */}
            <div
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                cursorFrozen
                  ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                  : isHovering
                  ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]'
                  : 'bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,1)]'
              }`}
            />
          </div>

          {/* Crosshair accents */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-0.5 h-1.5 bg-cyan-400/60" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-0.5 h-1.5 bg-cyan-400/60" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1.5 h-0.5 bg-cyan-400/60" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-1.5 h-0.5 bg-cyan-400/60" />

          {/* Click Ripple Effect */}
          {isClicking && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 border-amber-400 animate-ping pointer-events-none" />
          )}

          {/* Frozen state tag */}
          {cursorFrozen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/90 text-slate-950 uppercase tracking-widest shadow-md">
              PAUSED
            </div>
          )}
        </div>
      </div>

      {/* 2. AR HUD GESTURE STATUS BADGE (Top Center) */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center gap-2">
        {scrollModeEnabled && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-lg backdrop-blur-md animate-pulse">
            <Scroll className="size-3.5 text-emerald-400" />
            <span>TIMELINE AUTO-SCROLL ACTIVE</span>
            <span className="text-[10px] text-emerald-400/80 font-mono">(✌️✌️ to stop)</span>
          </div>
        )}

        {currentGesture !== "IDLE" && (
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/80 border border-white/10 text-white text-xs font-medium backdrop-blur-md shadow-xl animate-in fade-in duration-200">
            {currentGesture === "ONE_INDEX" && (
              <>
                <span className="text-sm">☝️</span>
                <span className="text-cyan-300 font-semibold">Cursor Active</span>
              </>
            )}
            {currentGesture === "ONE_OPEN_PALM" && (
              <>
                <span className="text-sm">🤚</span>
                <span className="text-amber-300 font-semibold">Cursor Stopped</span>
              </>
            )}
            {currentGesture === "TWO_OPEN_PALMS" && (
              <>
                <span className="text-sm">🤚🤚</span>
                <span className="text-emerald-300 font-semibold">Timeline Scrolling Enabled</span>
              </>
            )}
            {currentGesture === "TWO_PEACE" && (
              <>
                <span className="text-sm">✌️✌️</span>
                <span className="text-slate-300 font-semibold">Timeline Scrolling Disabled</span>
              </>
            )}
            {currentGesture === "PINCH" && (
              <>
                <span className="text-sm">👌</span>
                <span className="text-yellow-300 font-semibold">Memory Selected</span>
              </>
            )}
            {currentGesture === "THUMBS_UP" && (
              <>
                <span className="text-sm">👍</span>
                <span className="text-blue-300 font-semibold">Volume Up +5%</span>
              </>
            )}
            {currentGesture === "THUMBS_DOWN" && (
              <>
                <span className="text-sm">👎</span>
                <span className="text-blue-300 font-semibold">Volume Down -5%</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* 3. AR VOLUME FEEDBACK OVERLAY (Center Right / Video HUD) */}
      {volumeNoticeVisible && (
        <div className="fixed top-28 right-8 z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 border border-white/20 backdrop-blur-xl shadow-2xl">
            {volumeLevel > 0 ? (
              <Volume2 className="size-5 text-cyan-400" />
            ) : (
              <VolumeX className="size-5 text-rose-400" />
            )}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-white gap-4">
                <span>Volume</span>
                <span className="font-mono text-cyan-300">{Math.round(volumeLevel * 100)}%</span>
              </div>
              <div className="w-32 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-150"
                  style={{ width: `${Math.round(volumeLevel * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
