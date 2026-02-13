import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const formData = await request.formData()
  const userId = formData.get('userId') as string

  // Admin Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin') return redirect('/')

  // Hole Profil-Daten
  const { data: profile } = await supabase
    .from('profiles')
    .select('artist_name, avatar_url')
    .eq('id', userId)
    .single()

  // Notification (rot)
  await supabase.from('messages').insert({
    recipient_id: userId,
    sender_id: null,
    message_type: 'system',
    subject: '❌ Bewerbung abgelehnt',
    content: `Hallo ${profile?.artist_name}! Deine Bewerbung wurde abgelehnt. Du kannst dich nach 30 Tagen erneut bewerben.`,
    status: 'rejected'
  })

  // Songs löschen (Storage + DB)
  const { data: songs } = await supabase
    .from('songs')
    .select('file_url')
    .eq('user_id', userId)

  if (songs) {
    for (const song of songs) {
      const fileName = song.file_url.split('/songs/').pop()
      if (fileName) {
        await supabase.storage.from('songs').remove([fileName])
      }
    }
  }

  await supabase.from('songs').delete().eq('user_id', userId)

  // Avatar löschen (Storage)
  if (profile?.avatar_url) {
    const avatarFileName = profile.avatar_url.split('/avatars/').pop()
    if (avatarFileName) {
      await supabase.storage.from('avatars').remove([avatarFileName])
    }
  }

  // Profil zurücksetzen
  await supabase
    .from('profiles')
    .update({
      artist_name: null,
      bio: null,
      tech_stack: null,
      social_links: null,
      avatar_url: null,
      visibility: 'rejected',
      onboarding_status: 'rejected',
      role: 'user',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  return redirect('/admin/applications')
}
