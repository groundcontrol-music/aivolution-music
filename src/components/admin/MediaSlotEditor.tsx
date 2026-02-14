'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Upload, Youtube, Trash2, Save, Image as ImageIcon, Music2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PromoSlot {
  id?: string
  slot_id: number
  title: string
  subtitle: string
  body_text?: string
  media_type?: 'image' | 'youtube' | 'tiktok' | 'none'
  media_url?: string
  youtube_id?: string
  tiktok_id?: string
}

export default function MediaSlotEditor({ slot }: { slot: PromoSlot }) {
  const [data, setData] = useState(slot)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(slot.media_url || null)
  const supabase = createClient()
  const router = useRouter()

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `slot_${slot.slot_id}_${Date.now()}.${fileExt}`
      
      // Upload zu Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Public URL generieren
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName)

      setPreview(publicUrl)
      setData({ ...data, media_type: 'image', media_url: publicUrl, youtube_id: null, tiktok_id: null })
      
    } catch (error: any) {
      console.error('Upload Error:', error)
      alert('Fehler beim Hochladen!')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setUploading(true)
    try {
      // slot_id ist immer vorhanden und eindeutig; id könnte in manchen Setups fehlen
      const { error } = await supabase
        .from('promo_slots')
        .update({
          title: data.title,
          subtitle: data.subtitle,
          body_text: data.body_text || null,
          media_type: data.media_type,
          media_url: data.media_url,
          youtube_id: data.youtube_id,
          tiktok_id: data.tiktok_id || null
        })
        .eq('slot_id', slot.slot_id)

      if (error) throw error

      alert('✓ Gespeichert!')
      router.refresh()
    } catch (error: any) {
      const msg = error?.message ?? error?.error_description ?? error?.details ?? (typeof error === 'object' ? JSON.stringify(error) : String(error))
      console.error('Save Error:', msg, error)
      alert(`Fehler beim Speichern: ${msg}`)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveMedia = () => {
    setData({ ...data, media_type: 'none', media_url: null, youtube_id: null, tiktok_id: null })
    setPreview(null)
  }

  const extractTikTokID = (input: string) => {
    const urlMatch = input.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/)
    if (urlMatch) return urlMatch[1]
    const digits = input.replace(/[^\d]/g, '')
    if (digits.length >= 10) return digits
    return input
  }

  const extractYouTubeID = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    const match = url.match(regex)
    return match ? match[1] : url // Falls nur ID eingegeben wurde
  }

  const getSlotLabel = (slotId: number) => {
    if (slotId === 5) return 'Highlight Box'
    if (slotId === 99) return 'Welcome Text'
    if (slotId === 201) return 'Kuration Zusage-Mail'
    if (slotId === 202) return 'Kuration Ablehnungs-Mail'
    return `SLOT_${slotId.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-white border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
        <div>
          <h3 className="text-xl font-black uppercase">
            {getSlotLabel(slot.slot_id)}
          </h3>
          <p className="text-[10px] font-mono opacity-40">slot_id: {slot.slot_id}</p>
        </div>
        <div className="flex gap-2">
          {data.media_type && data.media_type !== 'none' && (
            <button
              onClick={handleRemoveMedia}
              className="p-2 border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors rounded-sm"
              title="Media entfernen"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={uploading}
            className="px-4 py-2 bg-black text-white text-xs font-bold uppercase hover:bg-red-600 transition-colors rounded-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={14} />
            Speichern
          </button>
        </div>
      </div>

      {/* Text Inputs */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs font-black uppercase mb-1">Titel</label>
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => setData({ ...data, title: e.target.value })}
            className="w-full p-2 border-2 border-black rounded-sm font-bold focus:border-red-600 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-black uppercase mb-1">Untertitel</label>
          <input
            type="text"
            value={data.subtitle || ''}
            onChange={(e) => setData({ ...data, subtitle: e.target.value })}
            className="w-full p-2 border-2 border-black rounded-sm font-medium focus:border-red-600 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-black uppercase mb-1">Fließtext / Beschreibung</label>
          <textarea
            value={data.body_text || ''}
            onChange={(e) => setData({ ...data, body_text: e.target.value })}
            placeholder="Längerer Text (erscheint in der Box)"
            rows={3}
            className="w-full p-2 border-2 border-black rounded-sm font-medium focus:border-red-600 outline-none resize-none"
          />
        </div>
      </div>

      {/* Media Type Selection */}
      <div className="mb-4">
        <label className="block text-xs font-black uppercase mb-2">Media-Typ</label>
        <div className="flex gap-2">
          <button
            onClick={() => setData({ ...data, media_type: 'image', youtube_id: null, tiktok_id: null })}
            className={`flex-1 px-3 py-2 text-xs font-bold uppercase border-2 rounded-sm transition-all ${
              data.media_type === 'image' 
                ? 'bg-black text-white border-black' 
                : 'bg-white border-black hover:bg-zinc-100'
            }`}
          >
            <ImageIcon size={14} className="inline mr-1" />
            Bild
          </button>
          <button
            onClick={() => setData({ ...data, media_type: 'youtube', tiktok_id: null })}
            className={`flex-1 px-3 py-2 text-xs font-bold uppercase border-2 rounded-sm transition-all ${
              data.media_type === 'youtube' 
                ? 'bg-black text-white border-black' 
                : 'bg-white border-black hover:bg-zinc-100'
            }`}
          >
            <Youtube size={14} className="inline mr-1" />
            YouTube
          </button>
          <button
            onClick={() => setData({ ...data, media_type: 'tiktok', youtube_id: null })}
            className={`flex-1 px-3 py-2 text-xs font-bold uppercase border-2 rounded-sm transition-all ${
              data.media_type === 'tiktok' 
                ? 'bg-black text-white border-black' 
                : 'bg-white border-black hover:bg-zinc-100'
            }`}
          >
            <Music2 size={14} className="inline mr-1" />
            TikTok
          </button>
          <button
            onClick={() => setData({ ...data, media_type: 'none' })}
            className={`flex-1 px-3 py-2 text-xs font-bold uppercase border-2 rounded-sm transition-all ${
              !data.media_type || data.media_type === 'none' 
                ? 'bg-black text-white border-black' 
                : 'bg-white border-black hover:bg-zinc-100'
            }`}
          >
            Kein Media
          </button>
        </div>
      </div>

      {/* Upload / Input based on media_type */}
      {data.media_type === 'image' && (
        <div className="border-2 border-dashed border-black rounded-sm p-4 text-center">
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-sm mb-2" />
              <p className="text-xs font-mono truncate opacity-50">{data.media_url}</p>
            </div>
          ) : (
            <label className="cursor-pointer">
              <div className="flex flex-col items-center gap-2 py-8">
                <Upload className="text-zinc-400" size={32} />
                <span className="text-sm font-bold uppercase text-zinc-500">
                  {uploading ? 'Uploading...' : 'Bild hochladen (JPG, PNG)'}
                </span>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file)
                }}
              />
            </label>
          )}
        </div>
      )}

      {data.media_type === 'youtube' && (
        <div>
          <label className="block text-xs font-black uppercase mb-2">YouTube Video ID oder URL</label>
          <input
            type="text"
            placeholder="z.B. dQw4w9WgXcQ oder https://youtu.be/dQw4w9WgXcQ"
            value={data.youtube_id || ''}
            onChange={(e) => {
              const input = e.target.value
              const videoId = extractYouTubeID(input)
              setData({ ...data, youtube_id: videoId, media_url: null })
            }}
            className="w-full p-2 border-2 border-black rounded-sm font-mono text-sm focus:border-red-600 outline-none"
          />
          {data.youtube_id && (
            <div className="mt-3 border-2 border-black rounded-sm overflow-hidden">
              <iframe
                width="100%"
                height="200"
                src={`https://www.youtube.com/embed/${data.youtube_id}`}
                title="YouTube Preview"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}

      {data.media_type === 'tiktok' && (
        <div>
          <label className="block text-xs font-black uppercase mb-2">TikTok Video URL</label>
          <input
            type="text"
            placeholder="z.B. https://www.tiktok.com/@user/video/7123456789012345678"
            value={data.tiktok_id || ''}
            onChange={(e) => {
              const input = e.target.value
              const videoId = extractTikTokID(input)
              setData({ ...data, tiktok_id: videoId, media_url: null, youtube_id: null })
            }}
            className="w-full p-2 border-2 border-black rounded-sm font-mono text-sm focus:border-red-600 outline-none"
          />
          {data.tiktok_id && data.tiktok_id.length >= 10 && (
            <div className="mt-3 border-2 border-black rounded-sm overflow-hidden bg-black">
              <iframe
                width="100%"
                height="400"
                src={`https://www.tiktok.com/embed/v2/${data.tiktok_id}`}
                title="TikTok Preview"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}

      {(!data.media_type || data.media_type === 'none') && (
        <div className="border-2 border-dashed border-zinc-300 rounded-sm p-8 text-center">
          <p className="text-sm font-bold uppercase text-zinc-400">Kein Media ausgewählt</p>
        </div>
      )}

    </div>
  )
}
