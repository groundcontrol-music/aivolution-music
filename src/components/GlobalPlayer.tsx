'use client'

import { usePlayer } from '@/contexts/PlayerContext'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'

export default function GlobalPlayer() {
  const { currentTrack, isPlaying, progress, duration, volume, pause, resume, seek, setVolume } = usePlayer()
  const [isMuted, setIsMuted] = useState(false)

  if (!currentTrack) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleVolumeToggle = () => {
    if (isMuted) {
      setVolume(0.7)
      setIsMuted(false)
    } else {
      setVolume(0)
      setIsMuted(true)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
      <div className="max-w-7xl mx-auto px-4 py-3">
        
        {/* Progress Bar */}
        <div className="mb-3">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={progress}
            onChange={(e) => seek(Number(e.target.value))}
            className="w-full h-2 bg-zinc-200 rounded-full appearance-none cursor-pointer 
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
              [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:rounded-full 
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <div className="flex justify-between text-xs font-mono text-gray-600 mt-1">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          
          {/* Track Info */}
          <div className="flex-1 min-w-0 mr-4">
            <div className="font-black text-sm truncate uppercase italic">{currentTrack.title}</div>
            <div className="text-xs text-gray-600 truncate">{currentTrack.artist}</div>
          </div>

          {/* Player Controls */}
          <div className="flex items-center gap-2">
            <button
              className="p-2 hover:bg-zinc-100 rounded-sm transition-colors"
              title="Vorheriger Song"
            >
              <SkipBack size={18} />
            </button>

            <button
              onClick={isPlaying ? pause : resume}
              className="p-3 bg-black text-white hover:bg-red-600 rounded-full transition-colors"
            >
              {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
            </button>

            <button
              className="p-2 hover:bg-zinc-100 rounded-sm transition-colors"
              title="Nächster Song"
            >
              <SkipForward size={18} />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleVolumeToggle}
              className="p-2 hover:bg-zinc-100 rounded-sm transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-24 h-2 bg-zinc-200 rounded-full appearance-none cursor-pointer 
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-full 
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>

        </div>
      </div>
    </div>
  )
}
