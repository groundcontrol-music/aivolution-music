import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  const supabase = await createClient()

  let loginEmail = email.trim()

  // DSGVO: Wenn KEIN @, dann ist es ein Künstlername → Email holen
  if (!loginEmail.includes('@')) {
    try {
      // 1. Finde User-ID per Künstlername
      const { data: userId, error: lookupError } = await supabase
        .rpc('find_user_by_artistname', { name: loginEmail })
      
      if (lookupError || !userId) {
        return NextResponse.json({ error: 'Künstlername nicht gefunden' }, { status: 404 })
      }

      // 2. Hole Email für User-ID
      const { data: emailResult, error: emailError } = await supabase
        .rpc('get_email_for_user', { user_uuid: userId })
      
      if (emailError || !emailResult) {
        return NextResponse.json({ error: 'Email konnte nicht abgerufen werden' }, { status: 500 })
      }

      loginEmail = emailResult
      
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Login-Lookup fehlgeschlagen' }, { status: 500 })
    }
  }

  // Login mit Email
  const { data, error } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Smart Redirect: approved creator → direkt zu eigenem Profil
  let redirectTarget = '/'
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_status, artist_name_slug')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'creator' && profile?.onboarding_status === 'approved' && profile?.artist_name_slug) {
      redirectTarget = `/creator/${profile.artist_name_slug}`
    } else if (!profile?.onboarding_status || profile?.onboarding_status === 'pending') {
      redirectTarget = '/onboarding'
    }
  }

  return NextResponse.json({ success: true, user: data.user, redirect: redirectTarget })
}
