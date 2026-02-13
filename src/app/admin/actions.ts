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

  // Update Profile (bei approved -> role = 'creator')
  const updateData: any = { 
    onboarding_status: status,
    updated_at: new Date().toISOString()
  }

  if (status === 'approved') {
    updateData.role = 'creator'
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)

  if (profileError) {
    console.error('Profile Update Error:', profileError)
    return { error: `Profil-Update fehlgeschlagen: ${profileError.message}` }
  }

  // Bei Freischaltung: Probe-Songs auf is_probe = false (erscheinen in THE LAB)
  if (status === 'approved') {
    const { error: songsError } = await supabase
      .from('songs')
      .update({ is_probe: false })
      .eq('user_id', userId)
      .eq('is_probe', true)

    if (songsError) {
      console.error('Songs Update Error:', songsError)
      // Trotzdem success – Profil ist freigeschaltet
    }
  }

  revalidatePath('/admin/applications')
  revalidatePath('/')
  return { success: true }
}
