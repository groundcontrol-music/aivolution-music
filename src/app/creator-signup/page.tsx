'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, Music, Lock } from 'lucide-react'

const TECH_OPTIONS = ['Suno', 'Udio', 'Mubert', 'Soundraw', 'AIVA', 'Boomy', 'Splash', 'Beatoven.ai', 'Stable Audio', 'MusicLM']
const GENRE_OPTIONS = [
  'Techno', 'House', 'Hip Hop', 'Lo-Fi', 'Ambient', 'Rock', 'Metal', 'Pop', 
  'Classical', 'Jazz', 'Experimental', 'Drum & Bass', 'Synthwave', 'Trance',
  'Dubstep', 'Reggae', 'Soul', 'Funk', 'Blues', 'Country', 'Folk', 'Indie'
]

// Bad-Word-Filter (Basis-Liste, kann erweitert werden)
const BAD_WORDS = ['nazi', 'hitler', 'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'kill', 'murder', 'rape', 'terrorist', 'bomb', 'weapon', 'drug', 'cocaine', 'heroin', 'meth', 'pedo', 'pedophil', 'porn', 'xxx', 'sex', 'nigger', 'faggot', 'retard', 'suicide', 'illegal', 'scam', 'fraud', 'hack']

function containsBadWords(text: string): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return BAD_WORDS.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i') // Ganze Wörter
    return regex.test(lower)
  })
}

export default function CreatorSignupPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'auth' | 'profile'>('auth')

  // Auth State
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    artistName: '',
    termsAccepted: false
  })

  // Profile State
  const [profileData, setProfileData] = useState({
    bio: '',
    techStack: [] as string[],
    socials: { spotify: '', instagram: '', soundcloud: '', tiktok: '', youtube: '' },
    avatarFile: null as File | null,
    avatarPreview: null as string | null,
    song1: { title: '', genres: [] as string[], file: null as File | null },
    song2: { title: '', genres: [] as string[], file: null as File | null }
  })

  // Step 1: Registrierung
  const handleAuth = async () => {
    if (!authData.termsAccepted) {
      alert('Bitte akzeptiere die Nutzungsbedingungen.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authData.email,
        password: authData.password
      })

      if (error) throw error
      if (!data.user) throw new Error('User creation failed')

      // Profil erstellen (Client-Side, Session ist aktiv)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          artist_name: authData.artistName,
          role: 'user',
          onboarding_status: 'pending'
        })

      if (profileError) throw profileError

      // Weiter zu Profil-Erstellung
      setStep('profile')
      
    } catch (error: any) {
      alert(error?.message || 'Fehler bei der Registrierung')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Profil + Songs hochladen
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

  const handleSubmit = async () => {
    setLoading(true)
    try {
      console.log('🚀 START: Creator Signup')

      // 0. Bad-Word-Check
      const textToCheck = `${authData.artistName} ${profileData.bio} ${profileData.song1.title} ${profileData.song2.title}`
      if (containsBadWords(textToCheck)) {
        alert('❌ Dein Inhalt enthält unzulässige Begriffe. Bitte entferne diese und versuche es erneut.')
        setLoading(false)
        return
      }

      // 1. Upload Avatar
      let avatarUrl = null
      if (profileData.avatarFile) {
        console.log('📷 Uploading Avatar...')
        avatarUrl = await handleFileUpload(profileData.avatarFile, 'avatars')
      }

      // 2. Upload Songs
      let song1Url = null
      let song2Url = null
      if (profileData.song1.file) {
        console.log('🎵 Uploading Song 1...')
        song1Url = await handleFileUpload(profileData.song1.file, 'songs')
        if (!profileData.song1.title) {
          profileData.song1.title = profileData.song1.file.name.replace(/\.[^/.]+$/, '')
        }
      }
      if (profileData.song2.file) {
        console.log('🎵 Uploading Song 2...')
        song2Url = await handleFileUpload(profileData.song2.file, 'songs')
        if (!profileData.song2.title) {
          profileData.song2.title = profileData.song2.file.name.replace(/\.[^/.]+$/, '')
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No User')

      // 3. Update Profile (EINE Transaction)
      console.log('💾 Updating Profile...')
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          bio: profileData.bio,
          tech_stack: profileData.techStack,
          social_links: profileData.socials,
          avatar_url: avatarUrl,
          onboarding_status: 'submitted' // Wartet auf Freischaltung
        })
        .eq('id', user.id)

      if (profileError) throw new Error(`Profile Update: ${profileError.message}`)

      // 4. Insert Songs
      console.log('🎶 Inserting Songs...')
      const songsToInsert = []
      if (song1Url) songsToInsert.push({ user_id: user.id, title: profileData.song1.title, genres: profileData.song1.genres, file_url: song1Url, is_probe: true })
      if (song2Url) songsToInsert.push({ user_id: user.id, title: profileData.song2.title, genres: profileData.song2.genres, file_url: song2Url, is_probe: true })

      if (songsToInsert.length > 0) {
        const { error: songsError } = await supabase.from('songs').insert(songsToInsert)
        if (songsError) throw new Error(`Songs Insert: ${songsError.message}`)
      }

      console.log('✅ SUCCESS!')
      router.push('/?status=pending')
      
    } catch (error: any) {
      const msg = error?.message ?? error?.error_description ?? (typeof error === 'object' ? JSON.stringify(error) : String(error))
      console.error('Creator Signup Error:', msg, error)
      alert(`Fehler: ${msg || 'Unbekannter Fehler'}`)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'auth') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-2 border-black rounded-lg p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
          
          <div className="mb-8 border-b-2 border-black pb-4">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">
              Creator <span className="text-red-600">werden</span>
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-2">
              Registrierung
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase mb-2">Künstlername *</label>
              <input
                type="text"
                value={authData.artistName}
                onChange={(e) => setAuthData({ ...authData, artistName: e.target.value })}
                className="w-full p-3 border-2 border-black font-bold focus:border-red-600 outline-none"
                placeholder="DEIN STAGE NAME"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-2">Email *</label>
              <input
                type="email"
                value={authData.email}
                onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                className="w-full p-3 border-2 border-black font-mono focus:border-red-600 outline-none"
                placeholder="deine@email.de"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-2">Passwort *</label>
              <input
                type="password"
                value={authData.password}
                onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                minLength={6}
                className="w-full p-3 border-2 border-black font-mono focus:border-red-600 outline-none"
                placeholder="Mindestens 6 Zeichen"
              />
            </div>

            {/* Terms (vereinfacht, ohne DB) */}
            <div className="bg-zinc-50 border border-black p-4 rounded-sm space-y-3 text-xs">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={authData.termsAccepted}
                  onChange={(e) => setAuthData({ ...authData, termsAccepted: e.target.checked })}
                  className="mt-0.5"
                />
                <span className="font-medium">
                  Ich bin mindestens 18 Jahre alt, meine Songs verstoßen nicht gegen Gesetze/Richtlinien, 
                  und ich akzeptiere die AGBs & Datenschutzerklärung.
                </span>
              </label>
            </div>

            <button
              onClick={handleAuth}
              disabled={loading || !authData.artistName || !authData.email || !authData.password || !authData.termsAccepted}
              className="w-full bg-black text-white py-4 font-black uppercase tracking-widest hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Weiter zum Profil'}
            </button>
          </div>

        </div>
      </div>
    )
  }

  // Step 2: Profil + Songs (All-in-One)
  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white border-2 border-black rounded-lg p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
        
        <div className="mb-8 border-b-2 border-black pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">
              Erstelle dein <span className="text-red-600">Profil</span>
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-2">
              Alles auf einmal - wartet dann auf Freischaltung
            </p>
          </div>
          <Lock className="text-red-600" size={32} />
        </div>

        <div className="space-y-8">

          {/* Avatar Upload */}
          <div className="flex justify-center">
            <label className="cursor-pointer group relative w-32 h-32 bg-zinc-100 rounded-full border-2 border-black flex items-center justify-center overflow-hidden hover:border-red-600 transition-colors">
              {profileData.avatarPreview ? (
                <img src={profileData.avatarPreview} className="w-full h-full object-cover" />
              ) : (
                <Upload className="text-zinc-400 group-hover:text-red-600 transition-colors" />
              )}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setProfileData({ ...profileData, avatarFile: file, avatarPreview: URL.createObjectURL(file) })
                }
              }} />
            </label>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-black uppercase mb-2">Bio / Über dich</label>
            <textarea
              value={profileData.bio}
              onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
              className="w-full p-4 border-2 border-black rounded-sm font-medium focus:border-red-600 outline-none h-32 resize-none"
              placeholder="Erzähl uns kurz wer du bist und was du machst..."
            />
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-xs font-black uppercase mb-2">Deine Tools (Tech Stack)</label>
            <div className="flex flex-wrap gap-2">
              {TECH_OPTIONS.map(tech => (
                <button
                  key={tech}
                  type="button"
                  onClick={() => {
                    const newStack = profileData.techStack.includes(tech)
                      ? profileData.techStack.filter(t => t !== tech)
                      : [...profileData.techStack, tech]
                    setProfileData({ ...profileData, techStack: newStack })
                  }}
                  className={`px-3 py-1 text-xs font-bold uppercase border-2 rounded-full transition-all ${
                    profileData.techStack.includes(tech)
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-white border-black text-black hover:bg-zinc-100'
                  }`}
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>

          {/* Socials */}
          <div>
            <label className="block text-xs font-black uppercase mb-2">Social Links (Optional)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.keys(profileData.socials).map((key) => (
                <input
                  key={key}
                  type="text"
                  placeholder={`${key.charAt(0).toUpperCase() + key.slice(1)} URL`}
                  value={profileData.socials[key as keyof typeof profileData.socials]}
                  onChange={(e) => setProfileData({
                    ...profileData,
                    socials: { ...profileData.socials, [key]: e.target.value }
                  })}
                  className="p-2 border-2 border-black rounded-sm text-xs font-mono focus:border-red-600 outline-none"
                />
              ))}
            </div>
          </div>

          {/* Songs */}
          <div className="border-t-2 border-black pt-8">
            <h2 className="text-2xl font-black uppercase italic mb-4">
              Deine <span className="text-red-600">Probe-Songs</span>
            </h2>
            <p className="text-sm font-medium text-gray-600 mb-6">
              Lade 2 deiner besten Tracks hoch (MP3, max. 10MB). Diese dienen als Arbeitsprobe.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Song 1 */}
              <div className="border-2 border-black p-4 rounded-lg">
                <div className="text-xs font-black text-red-600 uppercase mb-3">Track 01</div>
                <input
                  type="text"
                  placeholder="Titel"
                  value={profileData.song1.title}
                  onChange={(e) => setProfileData({ ...profileData, song1: { ...profileData.song1, title: e.target.value } })}
                  className="w-full p-2 border-b-2 border-zinc-200 font-bold focus:border-red-600 outline-none text-sm mb-3"
                />
                <label className="cursor-pointer bg-zinc-100 border border-black px-3 py-2 text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors flex items-center gap-2 justify-center mb-3">
                  <Music size={14} />
                  {profileData.song1.file ? 'Datei ausgewählt' : 'MP3 wählen'}
                  <input type="file" accept="audio/mp3,audio/mpeg" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const title = file.name.replace(/\.[^/.]+$/, '')
                      setProfileData({ ...profileData, song1: { ...profileData.song1, file, title } })
                    }
                  }} />
                </label>
                {profileData.song1.file && (
                  <div className="text-[10px] font-mono truncate mb-3 text-gray-500">{profileData.song1.file.name}</div>
                )}
                <div className="flex flex-wrap gap-1">
                  {GENRE_OPTIONS.slice(0, 12).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        const current = profileData.song1.genres
                        const newGenres = current.includes(g)
                          ? current.filter(x => x !== g)
                          : current.length < 3 ? [...current, g] : current
                        setProfileData({ ...profileData, song1: { ...profileData.song1, genres: newGenres } })
                      }}
                      className={`text-[9px] px-2 py-0.5 border rounded-full uppercase font-bold transition-all ${
                        profileData.song1.genres.includes(g) ? 'bg-black text-white' : 'bg-transparent text-gray-400 border-gray-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Song 2 */}
              <div className="border-2 border-black p-4 rounded-lg">
                <div className="text-xs font-black text-red-600 uppercase mb-3">Track 02 (Optional)</div>
                <input
                  type="text"
                  placeholder="Titel"
                  value={profileData.song2.title}
                  onChange={(e) => setProfileData({ ...profileData, song2: { ...profileData.song2, title: e.target.value } })}
                  className="w-full p-2 border-b-2 border-zinc-200 font-bold focus:border-red-600 outline-none text-sm mb-3"
                />
                <label className="cursor-pointer bg-zinc-100 border border-black px-3 py-2 text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors flex items-center gap-2 justify-center mb-3">
                  <Music size={14} />
                  {profileData.song2.file ? 'Datei ausgewählt' : 'MP3 wählen'}
                  <input type="file" accept="audio/mp3,audio/mpeg" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const title = file.name.replace(/\.[^/.]+$/, '')
                      setProfileData({ ...profileData, song2: { ...profileData.song2, file, title } })
                    }
                  }} />
                </label>
                {profileData.song2.file && (
                  <div className="text-[10px] font-mono truncate mb-3 text-gray-500">{profileData.song2.file.name}</div>
                )}
                <div className="flex flex-wrap gap-1">
                  {GENRE_OPTIONS.slice(0, 12).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        const current = profileData.song2.genres
                        const newGenres = current.includes(g)
                          ? current.filter(x => x !== g)
                          : current.length < 3 ? [...current, g] : current
                        setProfileData({ ...profileData, song2: { ...profileData.song2, genres: newGenres } })
                      }}
                      className={`text-[9px] px-2 py-0.5 border rounded-full uppercase font-bold transition-all ${
                        profileData.song2.genres.includes(g) ? 'bg-black text-white' : 'bg-transparent text-gray-400 border-gray-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Locked Notice */}
          <div className="bg-yellow-50 border-2 border-yellow-600 p-4 rounded-lg flex items-start gap-3">
            <Lock className="text-yellow-600 flex-shrink-0" size={20} />
            <div className="text-sm font-medium">
              <p className="mb-2">
                Dein Profil wird nach dem Absenden <strong>gesperrt</strong> sein, bis wir deine Bewerbung 
                geprüft haben.
              </p>
              <p className="text-xs text-yellow-800 font-bold">
                ⏱️ Freischaltung erfolgt in der Regel <strong>innerhalb von 48 Stunden</strong>. 
                Du wirst per Email benachrichtigt!
              </p>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !profileData.song1.file}
            className="w-full bg-red-600 text-white py-4 font-black uppercase tracking-widest hover:bg-black disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Bewerbung absenden'}
          </button>

        </div>
      </div>
    </div>
  )
}
