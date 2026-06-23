'use client'

import { Memory } from './types'
import { MemoryCard } from './MemoryCard'
import { MemoryTimeline } from './MemoryTimeline'
import { useState } from 'react'

interface MemoryRecallModeProps {
  memories: Memory[]
  onClose: () => void
}

export function MemoryRecallMode({ memories, onClose }: MemoryRecallModeProps) {
  const [selectedMemory, setSelectedMemory] = useState(memories[0])

  return (
    <>
      <MemoryCard memory={selectedMemory} onClose={onClose} />
      
      {/* Timeline at bottom */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-4 md:px-8">
        <MemoryTimeline 
          memories={memories}
          onSelectMemory={setSelectedMemory}
        />
      </div>
    </>
  )
}
