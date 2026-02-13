'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateApplicationStatus(userId: string, status: 'approved' | 'rejected') {
  const supabase = await createClient()

  // Admin Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin') return { error: 'Keine Berechtigung' }

  // Hole Profil-Daten für Notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('artist_name')
    .eq('id', userId)
    .single()

  if (status === 'approved') {
    // ============================================================
    // FREISCHALTUNG
    // ============================================================
    
    // 1. Profil freischalten
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: 'creator',
        onboarding_status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Profile Update Error:', profileError)
      return { error: `Profil-Update fehlgeschlagen: ${profileError.message}` }
    }

    // 2. Songs freischalten (is_probe = false)
    const { error: songsError } = await supabase
      .from('songs')
      .update({ is_probe: false })
      .eq('user_id', userId)
      .eq('is_probe', true)

    if (songsError) {
      console.error('Songs Update Error:', songsError)
      // Nicht kritisch, machen weiter
    }

    // 3. Benachrichtigung an Creator (GRÜN)
    await supabase.from('messages').insert({
      recipient_id: userId,
      sender_id: null,
      message_type: 'system',
      subject: '🎉 Willkommen bei Aivolution!',
      content: `Hallo ${profile?.artist_name || 'Creator'}! Deine Bewerbung wurde geprüft und FREIGESCHALTET. Du kannst jetzt Songs verkaufen und dein Profil verwalten. Viel Erfolg!`,
      related_id: userId,
      status: 'approved' // Custom field für grüne Farbe
    })

  } else {
    // ============================================================
    // ABLEHNUNG (mit Daten-Löschung)
    // ============================================================
    
    // 1. Benachrichtigung an Creator (ROT)
    await supabase.from('messages').insert({
      recipient_id: userId,
      sender_id: null,
      message_type: 'system',
      subject: '❌ Bewerbung abgelehnt',
      content: `Hallo ${profile?.artist_name || 'Creator'}! Deine Bewerbung wurde leider abgelehnt. Gründe können Verstöße gegen unsere Richtlinien oder unzureichende Qualität sein. Du kannst dich nach 30 Tagen erneut bewerben.`,
      related_id: userId,
      status: 'rejected' // Custom field für rote Farbe
    })

    // 2. Songs löschen (Storage + DB)
    const { data: songsToDelete } = await supabase
      .from('songs')
      .select('file_url')
      .eq('user_id', userId)
      .eq('is_probe', true)

    if (songsToDelete && songsToDelete.length > 0) {
      for (const song of songsToDelete) {
        // Extrahiere Dateinamen aus URL und lösche aus Storage
        const fileName = song.file_url.split('/songs/').pop()
        if (fileName) {
          await supabase.storage.from('songs').remove([fileName])
        }
      }
    }

    await supabase.from('songs').delete().eq('user_id', userId).eq('is_probe', true)

    // 3. Avatar löschen (Storage + DB)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()

    if (profileData?.avatar_url) {
      const avatarFileName = profileData.avatar_url.split('/avatars/').pop()
      if (avatarFileName) {
        await supabase.storage.from('avatars').remove([avatarFileName])
      }
    }

    // 4. Profil zurücksetzen (NICHT löschen, wegen Auth/AGB)
    await supabase
      .from('profiles')
      .update({
        artist_name: null,
        bio: null,
        tech_stack: null,
        social_links: null,
        avatar_url: null,
        onboarding_status: 'rejected',
        role: 'user',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
  }

  revalidatePath('/admin/applications')
  revalidatePath('/')
  return { success: true }
}
