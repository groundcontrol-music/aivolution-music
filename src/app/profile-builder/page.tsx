'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, Save, Sparkles } from 'lucide-react'

/**
 * PROFIL-BUILDER: Creator baut sein vollständiges Profil NACH Freischaltung aus
 */
export default function ProfileBuilderPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [artistName, setArtistName] = useState('')
  const [bio, setBio] = useState('')
  const [techStack, setTechStack] = useState('')
  const [socialLinks, setSocialLinks] = useState('')
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      // Lade existierendes Profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        // Wenn Creator schon approved + slug vorhanden: direkt zu öffentlichem Profil
        if (profile.role === 'creator' && profile.onboarding_status === 'approved' && profile.artist_name_slug) {
          router.push(`/creator/${profile.artist_name_slug}`)
          return
        }

        setArtistName(profile.artist_name || '')
        setBio(profile.bio || '')
        setTechStack(profile.tech_stack || '')
        setSocialLinks(profile.social_links || '')
        setAvatarPreview(profile.avatar_url || '')
      }
      
    } catch (error: any) {
      console.error('Profil laden fehlgeschlagen:', error)
      alert('Fehler beim Laden des Profils')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('Avatar zu groß (max. 2MB)')
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!userId) return
    if (!bio || !techStack) {
      alert('Bitte fülle mindestens Bio und Tech-Stack aus')
      return
    }

    setSaving(true)
    try {
      let avatarUrl = avatarPreview

      // Upload Avatar (falls neu)
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${userId}/avatar.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)
        
        avatarUrl = publicUrl
      }

      // Update Profil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          bio,
          tech_stack: techStack,
          social_links: socialLinks,
          avatar_url: avatarUrl
        })
        .eq('id', userId)

      if (updateError) throw updateError

      alert('✅ Profil erfolgreich gespeichert!')
      
      // Navigiere zum eigenen Profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('artist_name_slug')
        .eq('id', userId)
        .single()

      if (profile?.artist_name_slug) {
        router.push(`/creator/${profile.artist_name_slug}`)
      } else {
        router.push('/')
      }
      
    } catch (error: any) {
      console.error('Fehler beim Speichern:', error)
      alert(`Fehler: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={48} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-green-400 to-green-600 border-4 border-black rounded-[2.5rem] p-8 mb-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-4 mb-4">
            <Sparkles className="text-white" size={40} />
            <h1 className="text-4xl font-black uppercase text-white">
              Profil aufbauen
            </h1>
          </div>
          <p className="text-white font-bold">
            🎉 Glückwunsch! Du wurdest freigeschaltet. Vervollständige jetzt dein Creator-Profil.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white border-2 border-black rounded-[2.5rem] p-8 space-y-8">
          
          {/* Künstlername (Read-Only) */}
          <div>
            <label className="block text-xs font-black uppercase mb-2">Künstlername</label>
            <input
              type="text"
              value={artistName}
              disabled
              className="w-full p-4 border-2 border-gray-300 bg-gray-100 font-black text-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              (kann nicht geändert werden)
            </p>
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-xs font-black uppercase mb-2">Avatar (max. 2MB)</label>
            <div className="flex items-center gap-6">
              {avatarPreview && (
                <img 
                  src={avatarPreview} 
                  alt="Avatar Preview" 
                  className="w-24 h-24 rounded-full border-4 border-black object-cover"
                />
              )}
              <label className="cursor-pointer bg-black text-white px-6 py-3 font-bold uppercase hover:bg-red-600 transition-colors flex items-center gap-2 rounded-lg">
                <Upload size={18} />
                {avatarPreview ? 'Ändern' : 'Hochladen'}
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp" 
                  className="hidden" 
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-black uppercase mb-2">Bio * (max. 500 Zeichen)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={5}
              className="w-full p-4 border-2 border-black focus:border-red-600 outline-none font-medium"
              placeholder="Erzähle uns deine Story..."
            />
            <p className="text-xs text-gray-500 mt-1">{bio.length}/500</p>
          </div>

          {/* Tech-Stack */}
          <div>
            <label className="block text-xs font-black uppercase mb-2">Tech-Stack * (KI-Tools, die du nutzt)</label>
            <input
              type="text"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              className="w-full p-4 border-2 border-black focus:border-red-600 outline-none font-medium"
              placeholder="z.B. Udio, Suno, Stable Audio"
            />
          </div>

          {/* Social Links */}
          <div>
            <label className="block text-xs font-black uppercase mb-2">Social Links (Optional)</label>
            <textarea
              value={socialLinks}
              onChange={(e) => setSocialLinks(e.target.value)}
              rows={3}
              className="w-full p-4 border-2 border-black focus:border-red-600 outline-none font-mono text-sm"
              placeholder="https://instagram.com/dein_name&#10;https://youtube.com/@dein_kanal"
            />
            <p className="text-xs text-gray-500 mt-1">
              Eine URL pro Zeile
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={handleSave}
            disabled={saving || !bio || !techStack}
            className="w-full bg-red-600 text-white py-5 font-black uppercase text-lg hover:bg-black disabled:opacity-50 transition-colors flex items-center justify-center gap-3 rounded-lg"
          >
            {saving ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24} /> Profil speichern</>}
          </button>

        </div>

      </div>
    </div>
  )
}
