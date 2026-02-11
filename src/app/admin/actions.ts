'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateApplicationStatus(userId: string, status: 'approved' | 'rejected') {
  const supabase = await createClient()

  // Admin Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt')

  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin') throw new Error('Keine Berechtigung')

  // Update Profile (bei approved -> role = 'creator')
  const updateData: any = { 
    onboarding_status: status,
    updated_at: new Date().toISOString()
  }

  if (status === 'approved') {
    updateData.role = 'creator' // User wird zum Creator!
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)

  if (error) {
    console.error('Update Error:', error)
    return { error: 'Fehler beim Aktualisieren des Status.' }
  }

  revalidatePath('/admin/applications')
  return { success: true }
}
