// ============================================================
// AUTH HELPERS: Login mit Künstlername (DSGVO-freundlich)
// ============================================================

import { createClient } from '@/utils/supabase/client'

/**
 * Login mit Künstlername statt Email
 * Lookup: artist_name_lower → email → signInWithPassword
 */
export async function signInWithArtistName(artistName: string, password: string) {
  const supabase = createClient()

  try {
    // 1. Lookup: Finde Email für Künstlername
    const { data: loginData, error: lookupError } = await supabase
      .from('artist_logins')
      .select('user_id')
      .eq('artist_name_lower', artistName.toLowerCase())
      .single()

    if (lookupError || !loginData) {
      return { error: 'Künstlername nicht gefunden' }
    }

    // 2. Hole Email aus auth.users (via RPC oder JOIN)
    // Da wir keinen direkten Zugriff auf auth.users haben, nutzen wir eine Funktion
    const { data: emailData, error: emailError } = await supabase.rpc('get_email_for_user', { 
      user_uuid: loginData.user_id 
    })

    if (emailError || !emailData) {
      return { error: 'Email konnte nicht abgerufen werden' }
    }

    // 3. Login mit Email + Passwort
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailData,
      password: password
    })

    if (error) {
      return { error: error.message }
    }

    return { data, error: null }
    
  } catch (error: any) {
    return { error: error.message || 'Login fehlgeschlagen' }
  }
}

/**
 * Standard-Login mit Email (Fallback)
 */
export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient()
  return await supabase.auth.signInWithPassword({ email, password })
}
