'use client';

import Image from 'next/image';
import { Person } from './types';

interface ARInfoStripProps {
  person: Person;
}

export function ARInfoStrip({ person }: ARInfoStripProps) {
  return (
    <div className="fixed left-0 top-0 h-screen w-1/4 flex flex-col items-center justify-center p-6 pointer-events-none">
      {/* Holographic info strip */}
      <div className="ar-glass ar-glow flex flex-col items-center gap-8 p-8 max-w-xs">
        {/* Profile Photo */}
        <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-white/30 shadow-2xl">
          <Image
            src={person.profileImage}
            alt={person.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 via-transparent to-transparent" />
        </div>

        {/* Name */}
        <div className="text-center">
          <h1 className="ar-text-glow text-4xl font-bold mb-2">
            {person.name}
          </h1>
        </div>

        {/* Relationship */}
        <div className="text-center">
          <p className="text-xl text-blue-200 font-semibold">
            {person.relationship}
          </p>
        </div>

        {/* Last Meeting Info */}
        <div className="text-center space-y-1 border-t border-white/10 pt-6 w-full">
          <p className="text-sm text-white/70">Last Met</p>
          <p className="text-lg text-white font-semibold">
            {person.lastMet}
          </p>
          <p className="text-sm text-blue-300">
            {person.lastLocation}
          </p>
        </div>

        {/* System Status */}
        <div className="text-center space-y-2 border-t border-white/10 pt-6 w-full">
          <p className="text-xs text-white/50 uppercase tracking-wider">System</p>
          <p className="text-sm text-green-300 font-semibold">
            Memory Replay Engine
          </p>
        </div>
      </div>
    </div>
  );
}
