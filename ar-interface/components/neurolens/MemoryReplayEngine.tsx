'use client'

import { useState, useRef, useEffect } from 'react'
import { Memory } from './types'
import { MapPin, X, Play, Video } from 'lucide-react'

interface MemoryReplayEngineProps {
  memories: Memory[]
  scrollModeEnabled?: boolean
}

export function MemoryReplayEngine({ memories, scrollModeEnabled = false }: MemoryReplayEngineProps) {
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [internalScrollMode, setInternalScrollMode] = useState(scrollModeEnabled)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineContainerRef = useRef<HTMLDivElement>(null)
  const hasAutoPlayedRef = useRef<string | null>(null)

  // Sync scrollMode prop or custom event
  useEffect(() => {
    setInternalScrollMode(scrollModeEnabled)
  }, [scrollModeEnabled])

  useEffect(() => {
    const handleScrollToggle = (e: CustomEvent<{ enabled: boolean }>) => {
      setInternalScrollMode(e.detail.enabled)
    }
    window.addEventListener('neurolens-scroll-mode' as any, handleScrollToggle)
    return () => {
      window.removeEventListener('neurolens-scroll-mode' as any, handleScrollToggle)
    }
  }, [])

  // Automatic playback of most relevant / previous memory upon recognition
  useEffect(() => {
    if (memories && memories.length > 0) {
      const firstId = memories[0].id || memories[0].title
      // Only auto-play once per person's memories to not interrupt user navigation
      if (hasAutoPlayedRef.current !== firstId) {
        hasAutoPlayedRef.current = firstId
        setSelectedMemory(memories[0])
      }
    } else {
      setSelectedMemory(null)
      hasAutoPlayedRef.current = null
    }
  }, [memories])

  // Volume gesture listener (+5% / -5%)
  useEffect(() => {
    const handleVolumeEvent = (e: CustomEvent<{ delta: number }>) => {
      if (videoRef.current) {
        const nextVolume = Math.max(0, Math.min(1, videoRef.current.volume + e.detail.delta))
        videoRef.current.volume = nextVolume
        window.dispatchEvent(new CustomEvent('neurolens-volume-updated', {
          detail: { volume: nextVolume }
        }))
      }
    }

    window.addEventListener('neurolens-volume-change' as any, handleVolumeEvent)
    return () => {
      window.removeEventListener('neurolens-volume-change' as any, handleVolumeEvent)
    }
  }, [])

  // Smooth controlled timeline scrolling (approx 40 px/s for clear readability)
  useEffect(() => {
    let animId: number
    let lastTime = performance.now()

    const scrollStep = (time: number) => {
      const dt = (time - lastTime) / 1000
      lastTime = time

      if (internalScrollMode && timelineContainerRef.current) {
        const container = timelineContainerRef.current
        // Moderate readable scroll speed: 42 px per second
        container.scrollTop += 42 * dt
      }

      animId = requestAnimationFrame(scrollStep)
    }

    animId = requestAnimationFrame(scrollStep)
    return () => cancelAnimationFrame(animId)
  }, [internalScrollMode])

  // Notify system whether memory video is actively playing
  const reportPlaying = (isPlaying: boolean) => {
    window.dispatchEvent(new CustomEvent('neurolens-video-playing', { detail: { isPlaying } }))
  }

  // Guard: if no memories exist, do not render anything
  if (!memories || memories.length === 0) {
    return null
  }

  return (
    <div className="relative flex-grow flex flex-col h-full overflow-hidden">
      {/* Timeline scrollable container */}
      <div
        ref={timelineContainerRef}
        className="relative flex-grow overflow-y-auto pr-1 space-y-4 min-h-0 scrollbar-none scroll-smooth"
      >
        {/* Vertical line connector */}
        <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-white/10 pointer-events-none" />

        {memories.map((memory, index) => {
          const displayDate = memory.date || "Recorded interaction"
          const displayLoc = memory.location || "Living Room"

          return (
            <div
              key={memory.id || index}
              data-memory-card="true"
              data-clickable="true"
              onClick={() => {
                setSelectedMemory(memory)
                reportPlaying(Boolean(memory.video))
              }}
              className="relative flex gap-4 group cursor-pointer select-none transition-transform duration-150 active:scale-[0.98]"
            >
              {/* Timeline dot icon */}
              <div className="relative z-10 w-9 h-9 rounded-full bg-slate-950 border border-white/15 flex items-center justify-center text-slate-400 group-hover:border-cyan-400 group-hover:text-cyan-300 transition-colors">
                <Video className="size-4" />
              </div>

              {/* Timeline card content */}
              <div className="flex-grow space-y-1 min-w-0">
                {/* Timestamp */}
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {displayDate}
                </div>

                {/* Card border/glow */}
                <div className="flex items-center gap-3 bg-slate-900/40 hover:bg-slate-900/70 border border-white/5 hover:border-cyan-400/40 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] rounded-2xl p-3 transition-all duration-300">
                  {/* Thumbnail / Video Indicator */}
                  <div className="relative w-16 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800 border border-white/5 flex items-center justify-center">
                    {memory.video ? (
                      <>
                        <video
                          src={memory.video}
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                          <Play className="size-4 text-white fill-white" />
                        </div>
                      </>
                    ) : (
                      <Video className="size-5 text-slate-500" />
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="flex-grow min-w-0">
                    <p className="text-xs font-bold text-white truncate leading-snug group-hover:text-cyan-300 transition-colors">
                      {memory.title}
                    </p>
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded-md border border-white/5">
                        <MapPin className="size-3 text-slate-400" />
                        {displayLoc}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Interactive Memory Replay Modal Popup */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900/95 border border-white/15 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              data-clickable="true"
              onClick={() => {
                setSelectedMemory(null)
                reportPlaying(false)
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 p-2 rounded-full transition cursor-pointer border border-white/10"
              aria-label="Close memory playback"
            >
              <X className="size-5" />
            </button>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🎬</span> {selectedMemory.title}
                </h3>
                <div className="flex gap-4 text-xs text-cyan-300 mt-1 font-medium">
                  <span>📅 {selectedMemory.date || "Recorded interaction"}</span>
                  <span>📍 {selectedMemory.location || "Living Room"}</span>
                </div>
              </div>

              {/* Real Media Player */}
              {selectedMemory.video ? (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    playsInline
                    src={selectedMemory.video}
                    onPlay={() => reportPlaying(true)}
                    onPause={() => reportPlaying(false)}
                    onEnded={() => reportPlaying(false)}
                  />
                </div>
              ) : (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 flex flex-col items-center justify-center">
                  <Video className="size-12 text-slate-400 mb-2" />
                  <span className="text-sm text-slate-300">No video stream available</span>
                </div>
              )}

              {/* Memory transcript/description */}
              {selectedMemory.description && (
                <div className="space-y-1 bg-slate-950/70 p-3 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Details</span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {selectedMemory.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
