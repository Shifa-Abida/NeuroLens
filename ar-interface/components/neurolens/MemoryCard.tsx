'use client'

import { Memory } from './types'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { Volume2 } from 'lucide-react'

interface MemoryCardProps {
  memory: Memory
  onClose: () => void
}

export function MemoryCard({ memory, onClose }: MemoryCardProps) {
  const [showDescription, setShowDescription] = useState(!memory.video)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (videoRef.current && memory.video) {
      videoRef.current.play().catch(() => {
        // Auto-play prevented by browser
      })
      videoRef.current.onended = () => {
        setShowDescription(true)
      }
    }
  }, [memory.video])

  const handleAudioToggle = () => {
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause()
        setIsPlayingAudio(false)
      } else {
        audioRef.current.play()
        setIsPlayingAudio(true)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred Background */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in scale-95 duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="sticky top-4 right-4 z-10 text-white hover:text-gray-200 text-2xl font-bold
            transition-colors duration-200 float-right"
          aria-label="Close memory"
        >
          ✕
        </button>

        {/* Card */}
        <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-3xl 
          shadow-2xl overflow-hidden">
          
          {/* Media Section */}
          <div className="relative w-full bg-gradient-to-b from-blue-100 to-blue-50">
            {memory.video && !showDescription ? (
              <video
                ref={videoRef}
                className="w-full h-auto max-h-96 object-cover"
                controls
                controlsList="nodownload"
              >
                <source src={memory.video} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="relative w-full h-80">
                <Image
                  src={memory.image}
                  alt={memory.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-8 space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">
                {memory.title}
              </h2>
              <div className="flex flex-wrap gap-4 text-lg text-gray-700">
                <span>📅 {memory.date}</span>
                <span>📍 {memory.location}</span>
              </div>
            </div>

            {/* Description */}
            <div className="animate-in fade-in duration-500">
              <p className="text-xl leading-relaxed text-gray-800 mb-6">
                {memory.description}
              </p>

              {/* Audio Button */}
              {memory.audio && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAudioToggle}
                    className={`
                      flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-lg
                      transition-all duration-200 shadow-lg
                      ${isPlayingAudio
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : 'bg-white/40 text-gray-900 hover:bg-white/50 border border-white/40'
                      }
                    `}
                    aria-label={isPlayingAudio ? 'Stop audio' : 'Play audio'}
                  >
                    <Volume2 size={24} />
                    {isPlayingAudio ? 'Stop Audio' : 'Play Audio'}
                  </button>
                  <audio
                    ref={audioRef}
                    onEnded={() => setIsPlayingAudio(false)}
                  >
                    <source src={memory.audio} type="audio/mpeg" />
                  </audio>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
