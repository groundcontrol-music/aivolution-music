'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, Music, Check } from 'lucide-react'

const LEGAL_CHECKBOXES = [
  { id: 'age', text: 'Ich bin mindestens 18 Jahre alt' },
  { id: 'rights', text: 'Ich besitze alle Rechte an den hochgeladenen Songs' },
  { id: 'ai', text: 'Meine Songs wurden mit KI-Tools erstellt' },
  { id: 'laws', text: 'Meine Songs verstoßen nicht gegen Gesetze oder Richtlinien' },
  { id: 'agb', text: 'Ich akzeptiere die AGBs & Datenschutzerklärung' },
  { id: 'deletion', text: 'Ich verstehe, dass bei Ablehnung alle Daten gelöscht werden' },
]

const BAD_WORDS = ['nazi', 'hitler', 'fuck', 'shit', 'porn', 'sex', 'drug', 'kill', 'terror']

function containsBadWords(text: string): boolean {
  const lower = text.toLowerCase()
  return BAD_WORDS.some(word => lower.includes(word))
}

export default function JoinPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'legal' | 'upload'>('legal')

  const [legalChecks, setLegalChecks] = useState<Record<string, boolean>>({})
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [artistName, setArtistName] = useState('')
  
  const [song1, setSong1] = useState<File | null>(null)
  const [song2, setSong2] = useState<File | null>(null)

  const allChecked = LEGAL_CHECKBOXES.every(item => legalChecks[item.id])

  const handleLegalSubmit = async () => {
    if (!email || !password || !artistName || !allChecked) {
      alert('Bitte fülle alle Felder aus und akzeptiere alle Bedingungen.')
      return
    }

    // Bad-Word-Check
    if (containsBadWords(artistName)) {
      alert('❌ Künstlername enthält unzulässige Begriffe.')
      return
    }

    setLoading(true)
    try {
      // Registrierung
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error) throw error
      if (!data.user) throw new Error('User creation failed')

      // Minimales Profil erstellen
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          artist_name: artistName,
          role: 'user', // Noch KEIN Creator (erst nach Freischaltung)
          onboarding_status: 'pending',
          visibility: 'pending'
        })

      if (profileError) throw profileError

      setStep('upload')
      
    } catch (error: any) {
      alert(error?.message || 'Fehler bei der Registrierung')
    } finally {
      setLoading(false)
    }
  }

  const handleSongUpload = async () => {
    if (!song1) {
      alert('Bitte lade mindestens einen Song hoch.')
      return
    }

    // Bad-Word-Check für Song-Titel
    if (containsBadWords(song1.name) || (song2 && containsBadWords(song2.name))) {
      alert('❌ Song-Titel enthalten unzulässige Begriffe.')
      return
    }

    setLoading(true)
    const log: string[] = []
    
    try {
      log.push('🚀 START Signup-Prozess')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      log.push(`✅ User: ${user.id}`)

      // Upload Songs (WAV-Files in songs-wav Bucket)
      const uploadSong = async (file: File, songNumber: number) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}-${songNumber}.${fileExt}`
        
        log.push(`📤 Upload Song ${songNumber}: ${fileName}`)
        const { error: uploadError } = await supabase.storage
          .from('songs-wav')
          .upload(fileName, file)

        if (uploadError) {
          log.push(`❌ Storage Error: ${uploadError.message}`)
          throw uploadError
        }
        log.push(`✅ Song ${songNumber} hochgeladen`)

        const wavUrl = `songs-wav/${fileName}`
        return { url: wavUrl, title: file.name.replace(/\.[^/.]+$/, '') }
      }

      const song1Data = await uploadSong(song1, 1)
      let song2Data = null
      if (song2) {
        song2Data = await uploadSong(song2, 2)
      }

      // Songs als Probe speichern
      const songsToInsert = [
        {
          user_id: user.id,
          title: song1Data.title,
          file_url: song1Data.url, // Backward-compat: alte DBs erwarten NOT NULL
          wav_url: song1Data.url,
          is_probe: true,
          price: 2.99,
          preview_generated: false
        }
      ]

      if (song2Data) {
        songsToInsert.push({
          user_id: user.id,
          title: song2Data.title,
          file_url: song2Data.url, // Backward-compat: alte DBs erwarten NOT NULL
          wav_url: song2Data.url,
          is_probe: true,
          price: 2.99,
          preview_generated: false
        })
      }

      log.push(`💾 Speichere ${songsToInsert.length} Songs...`)
      const { error: songsError } = await supabase.from('songs').insert(songsToInsert)
      if (songsError) {
        log.push(`❌ Songs Error: ${songsError.message}`)
        throw songsError
      }
      log.push(`✅ Songs gespeichert`)

      // Profil updaten
      const slug = artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      log.push(`🔄 Update Profil: slug=${slug}`)
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          onboarding_status: 'submitted',
          artist_name_slug: slug
        })
        .eq('id', user.id)
      
      if (profileError) {
        log.push(`❌ Profile Error: ${profileError.message}`)
        throw profileError
      }
      log.push(`✅ Profil updated`)

      // Admins suchen
      log.push(`🔍 Suche Admins...`)
      const { data: admins, error: adminError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('role', 'admin')
      
      if (adminError) {
        log.push(`❌ Admin-Lookup Error: ${adminError.message}`)
      } else {
        log.push(`✅ ${admins?.length || 0} Admin(s) gefunden: ${JSON.stringify(admins)}`)
      }
      
      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          recipient_id: admin.id,
          sender_id: null,
          message_type: 'application',
          subject: `🎸 Neue Bewerbung: ${artistName}`,
          content: `Creator "${artistName}" hat sich beworben. Email: ${email}. Songs: ${song2 ? '2' : '1'}. Klicke unten auf "Bewerbung prüfen".`,
          related_id: user.id, // User-ID für Review-Link
          related_slug: slug,
          status: 'unread'
        }))
        
        log.push(`📧 Sende ${notifications.length} Notification(s)...`)
        log.push(`📧 Data: ${JSON.stringify(notifications[0])}`)
        
        const { data: insertedMsg, error: msgError } = await supabase
          .from('messages')
          .insert(notifications)
          .select()
        
        if (msgError) {
          log.push(`❌ Message Error: ${msgError.message}`)
          log.push(`❌ Details: ${JSON.stringify(msgError)}`)
          // Fallback: als Systemmessage senden, damit Kuration nie "leer" ist
          const fallback = admins.map(admin => ({
            recipient_id: admin.id,
            sender_id: null,
            message_type: 'system',
            subject: `🎸 Bewerbung (Fallback): ${artistName}`,
            content: `Neue Creator-Bewerbung von ${artistName}. Öffne die Kuration in /admin/review/${user.id}`,
            related_id: user.id,
            related_slug: slug,
            status: 'unread'
          }))
          const { error: fallbackError } = await supabase.from('messages').insert(fallback)
          if (fallbackError) {
            log.push(`❌ Fallback Message Error: ${fallbackError.message}`)
          } else {
            log.push('✅ Fallback-Systemmessage versendet')
          }
        } else {
          log.push(`✅ Message versendet! IDs: ${insertedMsg?.map(m => m.id).join(', ')}`)
        }
      } else {
        log.push(`⚠️ Keine Admins gefunden`)
      }

      // Log ausgeben
      console.log('=== SIGNUP DEBUG ===')
      log.forEach(l => console.log(l))
      console.log('====================')

      router.push('/?signup=success')
      
    } catch (error: any) {
      const msg = error?.message ?? String(error)
      log.push(`❌ FATAL: ${msg}`)
      
      console.log('=== SIGNUP ERROR ===')
      log.forEach(l => console.log(l))
      console.log('====================')
      
      alert(`Fehler: ${msg}\n\nSiehe Console (F12)`)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'legal') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white border-2 border-black rounded-[2.5rem] p-8 shadow-[12px_12px_0px_0px_rgba(220,38,38,1)]">
          
          <div className="mb-8 border-b-2 border-black pb-6">
            <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none">
              Creator <span className="text-red-600">werden</span>
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-3">
              Ein Fenster - Alles erledigt!
            </p>
          </div>

          <div className="space-y-6">
            
            {/* Basis-Daten */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase mb-2">Künstlername *</label>
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  className="w-full p-3 border-2 border-black font-bold focus:border-red-600 outline-none"
                  placeholder="DEIN STAGE NAME"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-2">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border-2 border-black font-mono focus:border-red-600 outline-none"
                  placeholder="deine@email.de"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-2">Passwort *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="w-full p-3 border-2 border-black font-mono focus:border-red-600 outline-none"
                placeholder="Mindestens 6 Zeichen"
              />
            </div>

            {/* Rechtliche Checkboxen */}
            <div className="bg-zinc-50 border-2 border-black p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-sm font-black uppercase mb-4 pb-2 border-b border-black">
                Rechtliche Bestätigung
              </h3>
              {LEGAL_CHECKBOXES.map((item) => (
                <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={legalChecks[item.id] || false}
                      onChange={(e) => setLegalChecks({ ...legalChecks, [item.id]: e.target.checked })}
                      className="w-5 h-5 border-2 border-black"
                    />
                  </div>
                  <span className="text-sm font-medium group-hover:text-red-600 transition-colors">
                    {item.text}
                  </span>
                </label>
              ))}
            </div>

            {/* Info-Box */}
            <div className="bg-yellow-50 border-2 border-yellow-600 p-4 rounded-lg text-sm">
              <p className="font-bold mb-2">ℹ️ So geht es weiter:</p>
              <ul className="space-y-1 text-xs">
                <li>✅ Du lädst im nächsten Schritt 2 Songs hoch</li>
                <li>✅ Wir prüfen deine Bewerbung <strong>innerhalb von 48 Stunden</strong></li>
                <li>✅ Nach Freischaltung baust du dein vollständiges Profil aus (Avatar, Bio, etc.)</li>
                <li>✅ Bei Ablehnung werden alle Daten sofort gelöscht (Datenschutz!)</li>
              </ul>
            </div>

            <button
              onClick={handleLegalSubmit}
              disabled={loading || !allChecked || !email || !password || !artistName}
              className="w-full bg-black text-white py-4 font-black uppercase tracking-widest hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Weiter zu Song-Upload <Check size={18} /></>}
            </button>
          </div>

        </div>
      </div>
    )
  }

  // Step 2: Song Upload (MINIMAL!)
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white border-2 border-black rounded-[2.5rem] p-8 shadow-[12px_12px_0px_0px_rgba(220,38,38,1)]">
        
        <div className="mb-8 border-b-2 border-black pb-6">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none">
            Deine <span className="text-red-600">Songs</span>
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-3">
            Schritt 2/2: Upload deiner besten Tracks
          </p>
        </div>

        <div className="space-y-6">
          
          <div className="bg-blue-50 border-2 border-blue-600 p-4 rounded-lg text-sm space-y-2">
            <p className="font-bold">🎵 Wichtig: Bitte WAV-Dateien hochladen!</p>
            <ul className="text-xs space-y-1">
              <li>✅ <strong>WAV</strong> = Hochwertig, für späteren Verkauf</li>
              <li>✅ <strong>MP3-Preview</strong> wird automatisch bei Freischaltung generiert (30 Sek.)</li>
              <li>✅ WAV bleibt geschützt (nur für Käufer zugänglich)</li>
              <li>✅ Max. 50MB pro Song</li>
            </ul>
          </div>

          {/* Song 1 */}
          <div className="border-2 border-black p-6 rounded-[2.5rem] bg-white">
            <div className="text-xs font-black text-red-600 uppercase mb-4">Track 01 (Pflicht)</div>
            <label className="cursor-pointer bg-zinc-100 border-2 border-black px-6 py-4 text-sm font-bold uppercase hover:bg-black hover:text-white transition-colors flex items-center gap-3 justify-center rounded-lg">
              <Music size={20} />
              {song1 ? `✅ ${song1.name}` : 'WAV wählen (max. 50MB)'}
              <input type="file" accept="audio/wav,audio/wave,audio/x-wav" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0]
                if (file && file.size <= 50 * 1024 * 1024) {
                  setSong1(file)
                } else {
                  alert('Datei zu groß (max. 50MB)')
                }
              }} />
            </label>
          </div>

          {/* Song 2 */}
          <div className="border-2 border-dashed border-gray-300 p-6 rounded-[2.5rem] bg-zinc-50">
            <div className="text-xs font-black text-gray-400 uppercase mb-4">Track 02 (Optional)</div>
            <label className="cursor-pointer bg-white border-2 border-gray-300 px-6 py-4 text-sm font-bold uppercase hover:border-black hover:bg-black hover:text-white transition-colors flex items-center gap-3 justify-center rounded-lg">
              <Music size={20} />
              {song2 ? `✅ ${song2.name}` : 'WAV wählen (max. 50MB)'}
              <input type="file" accept="audio/wav,audio/wave,audio/x-wav" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0]
                if (file && file.size <= 50 * 1024 * 1024) {
                  setSong2(file)
                } else {
                  alert('Datei zu groß (max. 50MB)')
                }
              }} />
            </label>
          </div>

          {/* Info: Was passiert jetzt? */}
          <div className="bg-green-50 border-2 border-green-600 p-6 rounded-[2.5rem]">
            <h3 className="text-sm font-black uppercase mb-3">✅ Was passiert nach dem Upload?</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2"><span className="flex-shrink-0">🕐</span> Wir prüfen deine Bewerbung <strong>innerhalb von 48 Stunden</strong></li>
              <li className="flex gap-2"><span className="flex-shrink-0">📧</span> Du bekommst eine Nachricht über die Freischaltung</li>
              <li className="flex gap-2"><span className="flex-shrink-0">🎨</span> <strong>Nach Freischaltung:</strong> Du baust dein vollständiges Profil aus (Bio, Avatar, Social Links, etc.)</li>
              <li className="flex gap-2"><span className="flex-shrink-0">🗑️</span> <strong>Bei Ablehnung:</strong> Alle Daten werden sofort gelöscht (Datenschutz!)</li>
            </ul>
          </div>

          {/* DSGVO-Hinweis */}
          <p className="text-[10px] text-gray-500 text-center">
            Wir speichern nur das Nötigste: Email (für Login & Kontakt), Künstlername & Songs (für Prüfung). 
            Bei Ablehnung wird alles gelöscht. Mehr Infos in unserer <a href="/privacy" className="underline">Datenschutzerklärung</a>.
          </p>

          <button
            onClick={handleSongUpload}
            disabled={loading || !song1}
            className="w-full bg-red-600 text-white py-5 font-black uppercase tracking-widest hover:bg-black disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-lg"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : <>Bewerbung absenden 🚀</>}
          </button>

        </div>

      </div>
    </div>
  )
}
