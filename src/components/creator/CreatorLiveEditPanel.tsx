'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Save, Upload } from 'lucide-react'

type Props = {
  userId: string
  initialBio: string
  initialAvatarUrl: string
  initialTechStack: string
  initialSocials: Record<string, any>
}

export default function CreatorLiveEditPanel({
  userId,
  initialBio,
  initialAvatarUrl,
  initialTechStack,
  initialSocials,
}: Props) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [bio, setBio] = useState(initialBio || '')
  const [techStack, setTechStack] = useState(initialTechStack || '')
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [instagram, setInstagram] = useState(initialSocials?.instagram || '')
  const [spotify, setSpotify] = useState(initialSocials?.spotify || '')
  const [soundcloud, setSoundcloud] = useState(initialSocials?.soundcloud || '')
  const [youtube, setYoutube] = useState(initialSocials?.youtube || '')
  const [tiktok, setTiktok] = useState(initialSocials?.tiktok || '')
  const [video1, setVideo1] = useState(initialSocials?.video_1 || '')
  const [video2, setVideo2] = useState(initialSocials?.video_2 || '')

  const handleAvatarChange = (file: File | null) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Avatar zu groß (max. 2MB)')
      return
    }
    setAvatarFile(file)
    setAvatarUrl(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let nextAvatarUrl = avatarUrl
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const fileName = `${userId}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
        nextAvatarUrl = data.publicUrl
      }

      const social_links = {
        instagram,
        spotify,
        soundcloud,
        youtube,
        tiktok,
        video_1: video1,
        video_2: video2,
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          bio,
          tech_stack: techStack,
          avatar_url: nextAvatarUrl || null,
          social_links,
        })
        .eq('id', userId)

      if (error) throw error
      alert('✅ Live-Profil aktualisiert')
      window.location.reload()
    } catch (err: any) {
      alert(`Fehler beim Speichern: ${err?.message || 'Unbekannt'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-8">
      <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-4">
        Live-Edit <span className="text-red-600">Creator</span>
      </h3>
      <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-6">
        Du bearbeitest direkt das Profil, das Besucher sehen
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-black uppercase mb-2">Bio</label>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full p-3 border-2 border-black focus:border-red-600 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase mb-2">Tech-Stack</label>
          <input
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
            className="w-full p-3 border-2 border-black focus:border-red-600 outline-none"
            placeholder="z.B. Suno, Udio"
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase mb-2">Avatar (max. 2MB)</label>
          <label className="w-full p-3 border-2 border-black cursor-pointer flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-colors">
            <Upload size={16} />
            Bild wählen
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <div>
          <label className="block text-xs font-black uppercase mb-2">Instagram</label>
          <input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="w-full p-3 border-2 border-black" />
        </div>
        <div>
          <label className="block text-xs font-black uppercase mb-2">Spotify</label>
          <input value={spotify} onChange={(e) => setSpotify(e.target.value)} className="w-full p-3 border-2 border-black" />
        </div>
        <div>
          <label className="block text-xs font-black uppercase mb-2">SoundCloud</label>
          <input value={soundcloud} onChange={(e) => setSoundcloud(e.target.value)} className="w-full p-3 border-2 border-black" />
        </div>
        <div>
          <label className="block text-xs font-black uppercase mb-2">TikTok Profil-Link</label>
          <input value={tiktok} onChange={(e) => setTiktok(e.target.value)} className="w-full p-3 border-2 border-black" />
        </div>
        <div>
          <label className="block text-xs font-black uppercase mb-2">YouTube Kanal-Link</label>
          <input value={youtube} onChange={(e) => setYoutube(e.target.value)} className="w-full p-3 border-2 border-black" />
        </div>

        <div>
          <label className="block text-xs font-black uppercase mb-2">Video 1 (YouTube/TikTok URL)</label>
          <input value={video1} onChange={(e) => setVideo1(e.target.value)} className="w-full p-3 border-2 border-black" />
        </div>
        <div>
          <label className="block text-xs font-black uppercase mb-2">Video 2 (YouTube/TikTok URL)</label>
          <input value={video2} onChange={(e) => setVideo2(e.target.value)} className="w-full p-3 border-2 border-black" />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 bg-red-600 text-white px-6 py-3 font-black uppercase hover:bg-black transition-colors flex items-center gap-2"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Live speichern
      </button>
    </section>
  )
}
