'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Memory } from './types';

interface MemoryProjectionProps {
  memories: Memory[];
}

export function MemoryProjection({ memories }: MemoryProjectionProps) {
  const [currentMemoryIndex, setCurrentMemoryIndex] = useState(0);
  const [isShowingVideo, setIsShowingVideo] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentMemory = memories[currentMemoryIndex];

  // Video ended handler
  const handleVideoEnd = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsShowingVideo(false);
      setIsFadingOut(false);
    }, 800);
  };

  // Auto-advance to next memory after showing current
  const handlePhotoTimeout = () => {
    setTimeout(() => {
      setIsShowingVideo(true);
      setCurrentMemoryIndex((prev) => (prev + 1) % memories.length);
    }, 5000); // Show photo for 5 seconds before transitioning
  };

  useEffect(() => {
    if (isShowingVideo && videoRef.current && currentMemory.video) {
      // Start video and audio simultaneously
      videoRef.current.play().catch(() => {
        console.log('Video autoplay prevented');
        // If video fails to play, show photo instead after short delay
        setTimeout(() => {
          setIsShowingVideo(false);
        }, 1500);
      });
      if (audioRef.current && currentMemory.audio) {
        audioRef.current.play().catch(() => {
          console.log('Audio autoplay prevented');
        });
      }
    } else if (isShowingVideo && !currentMemory.video) {
      // If no video, show photo immediately
      setTimeout(() => {
        setIsShowingVideo(false);
      }, 500);
    }
  }, [currentMemoryIndex, isShowingVideo, currentMemory]);

  useEffect(() => {
    if (!isShowingVideo) {
      handlePhotoTimeout();
    }
  }, [isShowingVideo]);

  return (
    <div className="fixed right-0 top-0 h-screen w-3/4 flex items-center justify-center p-12 pointer-events-none overflow-hidden">
      {/* Memory Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Video Memory */}
        {isShowingVideo && currentMemory.video && (
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-800 ${
              isFadingOut ? 'memory-fade-out' : 'memory-fade-in'
            }`}
          >
            <div className="ar-glass-strong ar-glow rounded-3xl overflow-hidden max-w-4xl w-full aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                onEnded={handleVideoEnd}
                controlsList="nodownload"
              >
                <source src={currentMemory.video} type="video/mp4" />
              </video>
              <audio ref={audioRef} />
            </div>
          </div>
        )}

        {/* Photo & Description Memory */}
        {!isShowingVideo && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-8 transition-opacity duration-800 memory-fade-in`}
          >
            {/* Photo */}
            <div className="ar-glass-strong ar-glow rounded-3xl overflow-hidden w-full max-w-2xl aspect-square">
              <Image
                src={currentMemory.image}
                alt={currentMemory.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 via-transparent to-transparent" />
            </div>

            {/* Description */}
            <div className="text-center max-w-2xl">
              <h2 className="ar-text-glow text-5xl font-bold mb-6">
                {currentMemory.title}
              </h2>
              <p className="text-2xl leading-relaxed text-white/90">
                {currentMemory.description}
              </p>
              <div className="flex justify-center gap-4 mt-8 text-lg text-blue-300">
                <span>📅 {currentMemory.date}</span>
                <span>📍 {currentMemory.location}</span>
              </div>
            </div>
          </div>
        )}

        {/* Memory Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3">
          {memories.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentMemoryIndex
                  ? 'w-8 bg-blue-400'
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
