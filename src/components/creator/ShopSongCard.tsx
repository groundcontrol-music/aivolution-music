'use client'

import { useState } from 'react'
import { Play, ShoppingCart, Heart, Share2, Download } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface Song {
  id: string
  title: string
  genres: string[]
  file_url: string
  price: number
  currency: string
  is_free: boolean
}

export default function ShopSongCard({ song }: { song: Song }) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const addToCart = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Bitte logge dich ein, um Songs zu kaufen!')
        router.push('/login')
        return
      }

      const { error } = await supabase
        .from('cart_items')
        .insert({ user_id: user.id, song_id: song.id })

      if (error) {
        if (error.code === '23505') { // Duplicate key (already in cart)
          alert('Dieser Song ist bereits in deinem Warenkorb!')
        } else {
          throw error
        }
      } else {
        alert('✓ In den Warenkorb gelegt!')
        router.refresh()
      }
    } catch (error: any) {
      console.error('Cart Error:', error)
      alert('Fehler beim Hinzufügen.')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = () => {
    if (song.is_free) return 'Gratis'
    return `€${song.price.toFixed(2)}`
  }

  return (
    <div className="bg-white border-2 border-black rounded-lg p-5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-black uppercase text-lg tracking-tight leading-tight">
            {song.title}
          </h3>
          {song.genres && song.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {song.genres.slice(0, 3).map((g: string) => (
                <span key={g} className="text-[9px] font-bold uppercase px-2 py-0.5 bg-zinc-100 border border-zinc-300 rounded-full">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
        <Play className="text-red-600 flex-shrink-0" size={24} />
      </div>

      {/* Audio Player (Preview) */}
      {song.file_url && (
        <audio controls className="w-full mb-3" preload="metadata">
          <source src={song.file_url} type="audio/mpeg" />
        </audio>
      )}

      {/* Price */}
      <div className="mb-3 text-center">
        <div className={`text-2xl font-black ${song.is_free ? 'text-green-600' : 'text-black'}`}>
          {formatPrice()}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {song.is_free ? (
          <button 
            className="flex-1 bg-green-600 text-white py-2 text-xs font-bold uppercase hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
            disabled
          >
            <Download size={12} />
            Download
          </button>
        ) : (
          <button 
            onClick={addToCart}
            disabled={loading}
            className="flex-1 bg-black text-white py-2 text-xs font-bold uppercase hover:bg-red-600 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <ShoppingCart size={12} />
            {loading ? 'Laden...' : 'In den Warenkorb'}
          </button>
        )}
        <button className="px-3 py-2 border-2 border-black hover:bg-zinc-100 transition-colors">
          <Heart size={14} />
        </button>
        <button className="px-3 py-2 border-2 border-black hover:bg-zinc-100 transition-colors">
          <Share2 size={14} />
        </button>
      </div>
    </div>
  )
}
