'use client'

import { Play, ShoppingCart } from 'lucide-react'
import { useState } from 'react'

type CompactSongCardProps = {
  title: string
  price: number
  coverUrl?: string
  wavUrl?: string
  onBuy?: () => void
}

export default function CompactSongCard({ title, price, coverUrl, wavUrl, onBuy }: CompactSongCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlay = () => {
    // TODO: Integrate with global audio player
    console.log('Play:', title, wavUrl)
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="group bg-white border-2 border-black rounded-[1.5rem] overflow-hidden hover:shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] transition-all duration-200">
      
      {/* Cover Image */}
      <div className="relative aspect-square bg-zinc-100 overflow-hidden">
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
        {wavUrl && (
          <button
            onClick={handlePlay}
            className="absolute inset-0 bg-black/0 group-hover:bg-black/60 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
          >
            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform">
              <Play className="text-white" fill="white" size={28} />
            </div>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-sm uppercase tracking-tight mb-3 line-clamp-2 min-h-[2.5rem]">
          {title}
        </h3>
        
        <div className="flex items-center justify-between gap-2">
          <span className="text-2xl font-black text-red-600">
            €{price.toFixed(2)}
          </span>
          <button
            onClick={onBuy}
            className="bg-black text-white px-4 py-2 rounded-full font-bold text-xs uppercase hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <ShoppingCart size={14} />
            BUY
          </button>
        </div>
      </div>

    </div>
  )
}
