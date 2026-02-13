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

  // Freischalten
  await supabase
    .from('profiles')
    .update({
      visibility: 'public',
      onboarding_status: 'approved',
      role: 'creator',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  // Songs freischalten
  await supabase
    .from('songs')
    .update({ is_probe: false })
    .eq('user_id', userId)

  // Notification (grün)
  const { data: profile } = await supabase
    .from('profiles')
    .select('artist_name')
    .eq('id', userId)
    .single()

  await supabase.from('messages').insert({
    recipient_id: userId,
    sender_id: null,
    message_type: 'system',
    subject: '🎉 Willkommen bei Aivolution!',
    content: `Hallo ${profile?.artist_name}! Dein Profil wurde freigeschaltet. Du kannst jetzt Songs verkaufen!`,
    status: 'approved'
  })

  return redirect('/admin/applications')
}
