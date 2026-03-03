'use client'

import { Play } from 'lucide-react'
import { usePlayer } from '@/contexts/PlayerContext'

type CompactSongCardProps = {
  songId: string
  title: string
  artist: string
  price: number
  coverUrl?: string
  previewUrl?: string
  status?: string
  showDraftBadge?: boolean
  onBuy?: () => void
  onOpen?: () => void
}

export default function CompactSongCard({
  songId,
  title,
  artist,
  price,
  coverUrl,
  previewUrl,
  status,
  showDraftBadge,
  onBuy,
  onOpen
}: CompactSongCardProps) {
  const { play, currentTrack, isPlaying } = usePlayer()
  const isThisTrackPlaying = currentTrack?.id === songId && isPlaying

  const handleOpen = () => {
    if (onOpen) onOpen()
  }

  const handlePlay = () => {
    if (!previewUrl) {
      alert('Vorschau nicht verfügbar')
      return
    }
    play({
      id: songId,
      title,
      artist,
      preview_url: previewUrl,
      cover: coverUrl
    })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleOpen()
        }
      }}
      className="group w-16 h-16 md:w-20 md:h-20 bg-white border-2 border-black rounded-[1.5rem] overflow-hidden hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] transition-all duration-200 relative"
      title={title}
    >
      <div className="absolute inset-0 bg-zinc-100 overflow-hidden">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-black text-zinc-300">
            🎵
          </div>
        )}
        
        {/* Play Button Overlay */}
        {previewUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handlePlay()
            }}
            className="absolute inset-0 bg-black/0 group-hover:bg-black/60 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform ${isThisTrackPlaying ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`}>
              <Play className="text-white" fill="white" size={14} />
            </div>
          </button>
        )}
      </div>
      {showDraftBadge && status && status !== 'approved' && (
        <span className="absolute -top-2 -left-2 bg-white border-2 border-black rounded-full px-2 py-0.5 text-[9px] font-black text-red-600">
          {status === 'needs_review' ? 'REVIEW' : status === 'blocked' ? 'BLOCKED' : 'DRAFT'}
        </span>
      )}
      <span className="absolute -bottom-2 -right-2 bg-white border-2 border-black rounded-full px-2 py-0.5 text-[10px] font-black text-red-600">
        €{price.toFixed(2)}
      </span>
    </div>
  )
}
