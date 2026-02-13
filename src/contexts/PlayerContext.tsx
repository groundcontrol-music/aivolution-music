'use client'

import { createContext, useContext, useState, useRef, ReactNode } from 'react'

interface Track {
  id: string
  title: string
  artist: string
  preview_url: string // MP3-Preview (30 Sek.)
  full_url?: string // WAV (nur für Käufer)
  cover?: string
}

interface PlayerContextType {
  currentTrack: Track | null
  isPlaying: boolean
  progress: number
  duration: number
  volume: number
  play: (track: Track) => void
  pause: () => void
  resume: () => void
  seek: (time: number) => void
  setVolume: (vol: number) => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.7)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize Audio Element
  if (typeof window !== 'undefined' && !audioRef.current) {
    audioRef.current = new Audio()
    audioRef.current.volume = volume
    
    audioRef.current.addEventListener('timeupdate', () => {
      setProgress(audioRef.current?.currentTime || 0)
    })
    
    audioRef.current.addEventListener('loadedmetadata', () => {
      setDuration(audioRef.current?.duration || 0)
    })
    
    audioRef.current.addEventListener('ended', () => {
      setIsPlaying(false)
      setProgress(0)
    })
  }

  const play = (track: Track) => {
    if (!audioRef.current) return

    // Neuer Track?
    if (currentTrack?.id !== track.id) {
      audioRef.current.src = track.preview_url
      setCurrentTrack(track)
      setProgress(0)
    }

    audioRef.current.play()
    setIsPlaying(true)
  }

  const pause = () => {
    if (!audioRef.current) return
    audioRef.current.pause()
    setIsPlaying(false)
  }

  const resume = () => {
    if (!audioRef.current) return
    audioRef.current.play()
    setIsPlaying(true)
  }

  const seek = (time: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = time
    setProgress(time)
  }

  const setVolume = (vol: number) => {
    if (!audioRef.current) return
    audioRef.current.volume = vol
    setVolumeState(vol)
  }

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        progress,
        duration,
        volume,
        play,
        pause,
        resume,
        seek,
        setVolume,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider')
  }
  return context
}
