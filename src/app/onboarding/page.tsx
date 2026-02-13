'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, Check, X, Music, Disc } from 'lucide-react'

// Optionen für Tech-Stack und Genres
const TECH_OPTIONS = ['Suno', 'Udio', 'Mubert', 'Soundraw', 'AIVA', 'Boomy', 'Splash', 'Beatoven.ai']
const GENRE_OPTIONS = ['Techno', 'House', 'Hip Hop', 'Lo-Fi', 'Ambient', 'Rock', 'Metal', 'Pop', 'Classical', 'Jazz', 'Experimental', 'Drum & Bass', 'Synthwave']

// Bad-Word-Filter
const BAD_WORDS = ['nazi', 'hitler', 'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'kill', 'murder', 'rape', 'terrorist', 'bomb', 'weapon', 'drug', 'cocaine', 'heroin', 'meth', 'pedo', 'pedophil', 'porn', 'xxx', 'sex', 'nigger', 'faggot', 'retard', 'suicide', 'illegal', 'scam', 'fraud', 'hack']

function containsBadWords(text: string): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return BAD_WORDS.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    return regex.test(lower)
  })
}

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Profil, 2: Tech, 3: Songs

  // Form State
  const [formData, setFormData] = useState({
    artistName: '',
    bio: '',
    techStack: [] as string[],
    socials: { spotify: '', instagram: '', soundcloud: '' },
    avatarFile: null as File | null,
    avatarPreview: null as string | null,
    song1: { title: '', genres: [] as string[], file: null as File | null },
    song2: { title: '', genres: [] as string[], file: null as File | null },
  })

  // Helper: File Upload
  const handleFileUpload = async (file: File, bucket: 'avatars' | 'songs') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return publicUrl
  }

  // Submit Handler
  const handleSubmit = async () => {
    setLoading(true)
    try {
      console.log('🚀 START: Onboarding Submit')

      // 0. BAD-WORD-CHECK
      const textToCheck = `${formData.artistName} ${formData.bio} ${formData.song1.title} ${formData.song2.title}`
      if (containsBadWords(textToCheck)) {
        alert('❌ Dein Inhalt enthält unzulässige Begriffe. Bitte entferne diese und versuche es erneut.')
        setLoading(false)
        return
      }
      console.log('✅ Bad-Word-Check passed')

      // 1. Upload Avatar
      console.log('📷 STEP 1: Avatar Upload...')
      let avatarUrl = null
      if (formData.avatarFile) {
        avatarUrl = await handleFileUpload(formData.avatarFile, 'avatars')
        console.log('✅ Avatar URL:', avatarUrl)
      } else {
        console.log('⏭️ No Avatar uploaded')
      }

      // 2. Upload Songs
      console.log('🎵 STEP 2: Songs Upload...')
      let song1Url = null
      let song2Url = null
      if (formData.song1.file) {
        console.log('  Uploading Song 1...')
        song1Url = await handleFileUpload(formData.song1.file, 'songs')
        console.log('  ✅ Song 1 URL:', song1Url)
      }
      if (formData.song2.file) {
        console.log('  Uploading Song 2...')
        song2Url = await handleFileUpload(formData.song2.file, 'songs')
        console.log('  ✅ Song 2 URL:', song2Url)
      }

      // 3. Get User
      console.log('👤 STEP 3: Get User...')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No User')
      console.log('✅ User ID:', user.id)

      // 4. Update Profile
      console.log('💾 STEP 4: Update Profile...')
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          artist_name: formData.artistName,
          bio: formData.bio,
          tech_stack: formData.techStack,
          social_links: formData.socials,
          onboarding_status: 'submitted',
          avatar_url: avatarUrl
        })
        .eq('id', user.id)

      if (profileError) {
        console.error('❌ Profile Update Error:', profileError)
        throw new Error(`Profile Update fehlgeschlagen: ${profileError.message || JSON.stringify(profileError)}`)
      }
      console.log('✅ Profile Updated')

      // 5. Insert Songs
      console.log('🎶 STEP 5: Insert Songs...')
      const songsToInsert = []
      if (song1Url && formData.song1.title) {
        songsToInsert.push({
          user_id: user.id,
          title: formData.song1.title,
          genres: formData.song1.genres,
          file_url: song1Url,
          is_probe: true
        })
      }
      if (song2Url && formData.song2.title) {
        songsToInsert.push({
          user_id: user.id,
          title: formData.song2.title,
          genres: formData.song2.genres,
          file_url: song2Url,
          is_probe: true
        })
      }

      if (songsToInsert.length > 0) {
        console.log('  Inserting', songsToInsert.length, 'songs...')
        const { error: songsError } = await supabase.from('songs').insert(songsToInsert)
        if (songsError) {
          console.error('❌ Songs Insert Error:', songsError)
          throw new Error(`Songs Insert fehlgeschlagen: ${songsError.message || JSON.stringify(songsError)}`)
        }
        console.log('✅ Songs Inserted')
      } else {
        console.log('⏭️ No Songs to insert')
      }

      // Success Redirect
      console.log('✅ SUCCESS! Redirecting...')
      router.push('/?onboarding=success')
      
    } catch (error: any) {
      const msg = error?.message ?? error?.error_description ?? error?.details ?? (typeof error === 'object' && error !== null ? (error.code ? `[${error.code}] ${error.message || ''}` : JSON.stringify(error)) : String(error))
      console.error('Onboarding Error:', msg, error)
      alert(`Fehler: ${msg || 'Unbekannter Fehler. Bitte versuche es erneut.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white border-2 border-black rounded-lg p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
        
        {/* Header */}
        <div className="mb-8 border-b-2 border-black pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">
              Creator <span className="text-red-600">Onboarding</span>
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest opacity-40">Setup your Profile</p>
          </div>
          <div className="text-xl font-black italic text-red-600">STEP {step}/3</div>
        </div>

        {/* STEP 1: IDENTITY */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Avatar Upload */}
            <div className="flex justify-center">
              <label className="cursor-pointer group relative w-32 h-32 bg-zinc-100 rounded-full border-2 border-black flex items-center justify-center overflow-hidden hover:border-red-600 transition-colors">
                {formData.avatarPreview ? (
                  <img src={formData.avatarPreview} className="w-full h-full object-cover" />
                ) : (
                  <Upload className="text-zinc-400 group-hover:text-red-600 transition-colors" />
                )}
                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setFormData({ ...formData, avatarFile: file, avatarPreview: URL.createObjectURL(file) })
                  }
                }} />
                <div className="absolute bottom-0 w-full bg-black/50 text-white text-[8px] text-center py-1 uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  Upload Image
                </div>
              </label>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Artist Name *</label>
                <input 
                  type="text" 
                  value={formData.artistName}
                  onChange={(e) => setFormData({...formData, artistName: e.target.value})}
                  className="w-full p-3 border-2 border-black rounded-sm font-bold focus:outline-none focus:border-red-600 transition-colors"
                  placeholder="DEIN KÜNSTLERNAME"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">Bio / Über dich</label>
                <textarea 
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className="w-full p-3 border-2 border-black rounded-sm font-medium focus:outline-none focus:border-red-600 transition-colors h-24 resize-none"
                  placeholder="Erzähl uns kurz wer du bist und was du machst..."
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={() => formData.artistName && setStep(2)}
                disabled={!formData.artistName}
                className="bg-black text-white px-6 py-2 font-black uppercase tracking-widest hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-black transition-colors"
              >
                Weiter
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: TECH & SOCIALS */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            
            {/* Tech Stack */}
            <div>
              <label className="block text-xs font-black uppercase mb-2">Deine Tools (Tech Stack)</label>
              <div className="flex flex-wrap gap-2">
                {TECH_OPTIONS.map(tech => (
                  <button
                    key={tech}
                    onClick={() => {
                      const newStack = formData.techStack.includes(tech)
                        ? formData.techStack.filter(t => t !== tech)
                        : [...formData.techStack, tech]
                      setFormData({...formData, techStack: newStack})
                    }}
                    className={`
                      px-3 py-1 text-xs font-bold uppercase border-2 rounded-full transition-all
                      ${formData.techStack.includes(tech) 
                        ? 'bg-red-600 border-red-600 text-white' 
                        : 'bg-white border-black text-black hover:bg-zinc-100'}
                    `}
                  >
                    {tech}
                  </button>
                ))}
              </div>
            </div>

            {/* Socials */}
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase">Social Links (Optional)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Spotify URL"
                  value={formData.socials.spotify}
                  onChange={(e) => setFormData({...formData, socials: {...formData.socials, spotify: e.target.value}})}
                  className="p-2 border-2 border-black rounded-sm text-xs font-mono focus:border-red-600 outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Instagram URL"
                  value={formData.socials.instagram}
                  onChange={(e) => setFormData({...formData, socials: {...formData.socials, instagram: e.target.value}})}
                  className="p-2 border-2 border-black rounded-sm text-xs font-mono focus:border-red-600 outline-none"
                />
                <input 
                  type="text" 
                  placeholder="SoundCloud URL"
                  value={formData.socials.soundcloud}
                  onChange={(e) => setFormData({...formData, socials: {...formData.socials, soundcloud: e.target.value}})}
                  className="p-2 border-2 border-black rounded-sm text-xs font-mono focus:border-red-600 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button 
                onClick={() => setStep(1)}
                className="text-xs font-black uppercase text-gray-500 hover:text-black"
              >
                Zurück
              </button>
              <button 
                onClick={() => setStep(3)}
                className="bg-black text-white px-6 py-2 font-black uppercase tracking-widest hover:bg-red-600 transition-colors"
              >
                Weiter
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PROBE UPLOADS */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            
            <p className="text-sm font-medium text-gray-600 bg-zinc-100 p-4 border border-black rounded-sm">
              Lade hier zwei deiner besten Tracks hoch (MP3), um dein Profil freizuschalten. 
              Diese dienen als Arbeitsprobe.
            </p>

            {/* Song 1 */}
            <div className="border-2 border-black/10 p-4 rounded-lg relative hover:border-black transition-colors group">
              <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-black text-red-600 uppercase">Track 01</div>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Titel des Songs"
                  value={formData.song1.title}
                  onChange={(e) => setFormData({...formData, song1: {...formData.song1, title: e.target.value}})}
                  className="w-full p-2 border-b-2 border-zinc-200 font-bold focus:border-red-600 outline-none text-sm"
                />
                
                {/* File Input */}
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer bg-zinc-100 border border-black px-3 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors flex items-center gap-2">
                    <Music size={14} /> 
                    {formData.song1.file ? 'Datei ausgewählt' : 'MP3 wählen'}
                    <input type="file" accept="audio/mp3,audio/mpeg" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0]
                      if(file) setFormData({...formData, song1: {...formData.song1, file}})
                    }} />
                  </label>
                  <span className="text-[10px] font-mono truncate max-w-[150px]">{formData.song1.file?.name}</span>
                </div>

                {/* Genre Select */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {GENRE_OPTIONS.map(g => (
                    <button
                      key={g}
                      onClick={() => {
                        const current = formData.song1.genres
                        const newGenres = current.includes(g) 
                          ? current.filter(x => x !== g)
                          : current.length < 3 ? [...current, g] : current
                        setFormData({...formData, song1: {...formData.song1, genres: newGenres}})
                      }}
                      className={`text-[9px] px-2 py-0.5 border rounded-full uppercase font-bold transition-all ${
                        formData.song1.genres.includes(g) ? 'bg-black text-white' : 'bg-transparent text-gray-400 border-gray-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Song 2 */}
            <div className="border-2 border-black/10 p-4 rounded-lg relative hover:border-black transition-colors group">
              <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-black text-red-600 uppercase">Track 02</div>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Titel des Songs"
                  value={formData.song2.title}
                  onChange={(e) => setFormData({...formData, song2: {...formData.song2, title: e.target.value}})}
                  className="w-full p-2 border-b-2 border-zinc-200 font-bold focus:border-red-600 outline-none text-sm"
                />
                
                 {/* File Input */}
                 <div className="flex items-center gap-4">
                  <label className="cursor-pointer bg-zinc-100 border border-black px-3 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors flex items-center gap-2">
                    <Music size={14} /> 
                    {formData.song2.file ? 'Datei ausgewählt' : 'MP3 wählen'}
                    <input type="file" accept="audio/mp3,audio/mpeg" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0]
                      if(file) setFormData({...formData, song2: {...formData.song2, file}})
                    }} />
                  </label>
                  <span className="text-[10px] font-mono truncate max-w-[150px]">{formData.song2.file?.name}</span>
                </div>

                {/* Genre Select */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {GENRE_OPTIONS.map(g => (
                    <button
                      key={g}
                      onClick={() => {
                        const current = formData.song2.genres
                        const newGenres = current.includes(g) 
                          ? current.filter(x => x !== g)
                          : current.length < 3 ? [...current, g] : current
                        setFormData({...formData, song2: {...formData.song2, genres: newGenres}})
                      }}
                      className={`text-[9px] px-2 py-0.5 border rounded-full uppercase font-bold transition-all ${
                        formData.song2.genres.includes(g) ? 'bg-black text-white' : 'bg-transparent text-gray-400 border-gray-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 items-center">
              <button 
                onClick={() => setStep(2)}
                className="text-xs font-black uppercase text-gray-500 hover:text-black"
              >
                Zurück
              </button>
              <button 
                onClick={handleSubmit}
                disabled={loading || !formData.song1.file}
                className="bg-red-600 text-white px-8 py-3 font-black uppercase tracking-widest hover:bg-black disabled:opacity-50 disabled:hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Profil abschliessen'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
