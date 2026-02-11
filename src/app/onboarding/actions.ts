'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

// Einfacher Bad-Word-Filter (kann später erweitert/ausgelagert werden)
const BAD_WORDS = ['badword1', 'illegal', 'scam', 'spam', 'hate', 'kill'] // Beispiel-Liste

function checkContentSafety(text: string): boolean {
  if (!text) return true
  const lower = text.toLowerCase()
  return !BAD_WORDS.some(word => lower.includes(word))
}

export async function completeOnboarding(formData: {
  artistName: string
  bio: string
  techStack: string[]
  socialLinks: { spotify?: string; instagram?: string; soundcloud?: string }
  avatarUrl: string | null
  probeSongs: { title: string; genres: string[]; url: string }[]
}) {
  const supabase = await createClient()

  // 1. User Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt')

  // 2. Content Safety Check (Basis-Filter)
  const allText = `${formData.artistName} ${formData.bio} ${formData.probeSongs.map(s => s.title).join(' ')}`
  if (!checkContentSafety(allText)) {
    return { error: 'Inhalt verstößt gegen die Richtlinien (Bad Words detected).' }
  }

  // 3. Update Profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      artist_name: formData.artistName,
      bio: formData.bio,
      tech_stack: formData.techStack,
      social_links: formData.socialLinks,
      avatar_url: formData.avatarUrl,
      onboarding_status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('Profile Update Error:', profileError)
    return { error: 'Fehler beim Speichern des Profils.' }
  }

  // 4. Probe-Songs speichern (in eine separate Tabelle 'songs' oder vorerst im Profil-JSON? 
  // Wir erstellen eine songs Tabelle im nächsten Schritt, speichern es hier erstmal ab).
  // Für das Onboarding reicht es, die Songs anzulegen.
  
  // Wir gehen davon aus, dass die Songs Tabelle existiert oder wir sie noch anlegen müssen.
  // UPDATE: Ich habe noch keine Songs-Tabelle im SQL angelegt. 
  // Ich werde das im nächsten Schritt ergänzen oder die Songs als JSON im Profil speichern für den Anfang?
  // Besser: Songs Tabelle. Ich füge das INSERT hier hinzu, aber wir müssen die Tabelle noch erstellen.
  // Workaround: Wir speichern die Probe-Songs erstmal nicht relational, sondern wir loggen es nur.
  // NEIN, wir machen es richtig. Ich füge gleich das SQL für die 'songs' Tabelle hinzu.
  
  /* 
    Da die 'songs' Tabelle noch nicht existiert (mein Fehler im SQL Skript vorhin),
    werde ich das Skript gleich aktualisieren.
    Hier im Code gehe ich davon aus, dass 'songs' existiert.
  */

  if (formData.probeSongs.length > 0) {
    const songInserts = formData.probeSongs.map(song => ({
      user_id: user.id,
      title: song.title,
      genres: song.genres,
      file_url: song.url,
      is_probe: true
    }))

    const { error: songError } = await supabase.from('songs').insert(songInserts)
    if (songError) {
       console.error('Song Insert Error:', songError)
       // Wir brechen nicht ab, Profil ist wichtiger
    }
  }

  return { success: true }
}
