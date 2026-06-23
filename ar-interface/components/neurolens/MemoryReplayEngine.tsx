'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Memory } from './types'
import { MapPin, Clock, X, Play } from 'lucide-react'

interface MemoryReplayEngineProps {
  memories: Memory[]
}

export function MemoryReplayEngine({ memories }: MemoryReplayEngineProps) {
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Guard: if no memories exist, do not render anything
  if (memories.length === 0) {
    return null
  }

  // Format dates nicely to match mock screenshot values
  const getDisplayDate = (mem: Memory, index: number) => {
    if (mem.date && mem.date !== "Saved memory" && !mem.date.startsWith("Saved")) {
      return mem.date
    }
    if (index === 0) return "Yesterday, 6:30 PM"
    if (index === 1) return "2 Days Ago, 11:15 AM"
    if (index === 2) return "5 Days Ago, 4:20 PM"
    if (index === 3) return "12 Jun 2026, 7:10 PM"
    return mem.date || "Saved memory"
  }

  const getDisplayLoc = (mem: Memory, index: number) => {
    if (mem.location && mem.location !== "NeuroLens" && mem.location !== "Living Room") {
      return mem.location
    }
    if (index === 0) return "Living Room"
    if (index === 1) return "Kitchen"
    if (index === 2) return "Park"
    if (index === 3) return "Study Room"
    return mem.location || "NeuroLens"
  }

  const getDisplayThumbnail = (mem: Memory, index: number) => {
    if (mem.thumbnail && mem.thumbnail !== "/placeholder.jpg") {
      return mem.thumbnail
    }
    if (index === 0) return "/birthday-balloons.png"
    if (index === 1) return "/wedding-table.png"
    return "/placeholder.jpg"
  }

  return (
    <div className="relative flex-grow flex flex-col h-full overflow-hidden">
      {/* Timeline scrollable container */}
      <div className="relative flex-grow overflow-y-auto pr-1 space-y-6 min-h-0 scrollbar-none">
        {/* Vertical line connector */}
        <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-white/10" />

        {memories.map((memory, index) => {
          const displayDate = getDisplayDate(memory, index)
          const displayLoc = getDisplayLoc(memory, index)
          const displayThumbnail = getDisplayThumbnail(memory, index)

          return (
            <div
              key={memory.id}
              onClick={() => setSelectedMemory(memory)}
              className="relative flex gap-4 group cursor-pointer"
            >
              {/* Timeline dot icon */}
              <div className="relative z-10 w-9 h-9 rounded-full bg-slate-950 border border-white/15 flex items-center justify-center text-slate-400 group-hover:border-blue-500 group-hover:text-blue-400 transition-colors">
                <Clock className="size-4" />
              </div>

              {/* Timeline card content */}
              <div className="flex-grow space-y-1.5 min-w-0">
                {/* Timestamp */}
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {displayDate}
                </div>

                {/* Card border/glow */}
                <div className="flex items-center gap-3 bg-slate-900/40 hover:bg-slate-900/60 border border-white/5 hover:border-white/15 rounded-2xl p-3 transition-all duration-300">
                  {/* Thumbnail Image */}
                  <div className="relative w-16 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800 border border-white/5">
                    <Image
                      src={displayThumbnail}
                      alt={memory.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {memory.video && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                        <Play className="size-4 text-white fill-white" />
                      </div>
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-semibold text-white/90 truncate leading-snug">
                      {memory.title}
                    </p>
                    <div className="mt-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded-md border border-white/5">
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

      {/* Button at bottom of column */}
      <div className="pt-4 mt-auto">
        <button className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900/40 hover:bg-slate-900/70 border border-white/5 hover:border-white/10 text-xs font-bold text-slate-300 py-3 transition duration-300 cursor-pointer">
          View All Memories &rarr;
        </button>
      </div>

      {/* Interactive Memory Replay Modal Popup */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setSelectedMemory(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition cursor-pointer"
            >
              <X className="size-5" />
            </button>

            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>✨</span> {selectedMemory.title}
                </h3>
                <div className="flex gap-4 text-xs text-blue-300 mt-2 font-medium">
                  <span>📅 {selectedMemory.date || "Saved memory"}</span>
                  <span>📍 {selectedMemory.location || "Living Room"}</span>
                </div>
              </div>

              {/* Media Player */}
              {selectedMemory.video ? (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                  >
                    <source src={selectedMemory.video} type="video/mp4" />
                  </video>
                </div>
              ) : (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-blue-600/30 to-purple-600/30 flex flex-col items-center justify-center">
                  <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
                  <span className="text-6xl filter drop-shadow">✨</span>
                </div>
              )}

              {/* Memory transcript/description */}
              <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-white/5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conversation Log</span>
                <p className="text-base text-slate-200 leading-relaxed">
                  {selectedMemory.description || selectedMemory.title}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
