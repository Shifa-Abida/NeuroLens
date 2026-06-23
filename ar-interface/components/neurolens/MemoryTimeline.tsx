'use client'

import { Memory } from './types'
import Image from 'next/image'

interface MemoryTimelineProps {
  memories: Memory[]
  onSelectMemory: (memory: Memory) => void
}

export function MemoryTimeline({ memories, onSelectMemory }: MemoryTimelineProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-2xl p-4 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Memories</h3>
        
        {/* Horizontal Scroll Container */}
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
          {memories.map((memory) => (
            <button
              key={memory.id}
              onClick={() => onSelectMemory(memory)}
              className="flex-shrink-0 snap-center group cursor-pointer transition-transform duration-200 
                hover:scale-105 active:scale-95"
              aria-label={`View ${memory.title}`}
            >
              <div className="bg-white/30 backdrop-blur-md border border-white/40 rounded-xl overflow-hidden
                shadow-lg hover:shadow-xl transition-shadow duration-200">
                
                {/* Thumbnail */}
                <div className="relative w-32 h-32 md:w-40 md:h-40 overflow-hidden">
                  <Image
                    src={memory.thumbnail || memory.image}
                    alt={memory.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  
                  {/* Video indicator */}
                  {memory.video && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 
                      group-hover:bg-black/40 transition-colors duration-200">
                      <div className="text-white text-3xl">▶</div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 bg-white/20 backdrop-blur-sm">
                  <p className="font-semibold text-gray-900 text-sm line-clamp-1">
                    {memory.title}
                  </p>
                  <p className="text-xs text-gray-700">
                    {memory.date}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Scroll Hint */}
        <p className="text-xs text-gray-700 mt-3 text-center">
          Scroll to see more memories →
        </p>
      </div>
    </div>
  )
}
