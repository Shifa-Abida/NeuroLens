'use client'

import { Person } from './types'
import Image from 'next/image'

interface PersonCardProps {
  person: Person
  onRecallMemory: () => void
  isExpanded: boolean
}

export function PersonCard({ person, onRecallMemory, isExpanded }: PersonCardProps) {
  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20">
      <div className="flex flex-col items-center gap-3">
        {/* Main Card */}
        <div className={`
          bg-white/40 backdrop-blur-xl border border-white/30 rounded-3xl
          shadow-2xl transition-all duration-300 ease-out
          ${isExpanded ? 'w-80 p-6' : 'w-64 p-4'}
        `}>
          {/* Profile Section */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white/50">
              <Image
                src={person.profileImage}
                alt={person.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-gray-900 truncate">
                {person.name}
              </h3>
              <p className="text-sm text-gray-700">
                {person.relationship}
              </p>
            </div>
          </div>

          {/* Details - Show when expanded */}
          {isExpanded && (
            <div className="space-y-3 mb-4 text-sm animate-in fade-in duration-200">
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-gray-800">
                  <span className="font-medium">Last met:</span> {person.lastMet}
                </p>
                <p className="text-gray-800">
                  <span className="font-medium">Location:</span> {person.lastLocation}
                </p>
              </div>

              {/* Memory Tags */}
              <div className="flex flex-wrap gap-2">
                {person.tags.map((tag, idx) => (
                  <span key={idx} className="text-2xl bg-white/20 rounded-lg p-2">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={onRecallMemory}
            className="w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 
              text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200
              text-lg shadow-lg hover:shadow-xl active:scale-95"
            aria-label={`Recall memory for ${person.name}`}
          >
            {isExpanded ? 'Recall Memory' : 'Memory'}
          </button>
        </div>

        {/* Connection indicator */}
        <div className="flex gap-2 items-center text-sm text-blue-600 font-medium animate-pulse">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          Recognized
        </div>
      </div>
    </div>
  )
}
