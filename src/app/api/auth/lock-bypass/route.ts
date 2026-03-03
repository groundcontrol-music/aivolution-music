import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Sperre umgehen (ohne Supabase-Login): Setzt Cookie, Proxy lässt dann durch.
 * .env: LOCK_BYPASS_USER=dein_name  LOCK_BYPASS_PASSWORD=dein_geheim
 * Wieder aktivieren: Link "Sperre wieder aktivieren" → /api/auth/lock-bypass-clear
 */
const COOKIE_NAME = 'lock_bypass'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 Tage

export async function POST(request: NextRequest) {
  const user = process.env.LOCK_BYPASS_USER
  const password = process.env.LOCK_BYPASS_PASSWORD

  let inputUser: string
  let inputPassword: string
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}))
    inputUser = (body.user ?? '').trim()
    inputPassword = body.password ?? ''
  } else {
    const form = await request.formData().catch(() => null)
    inputUser = (form?.get('user') ?? '').toString().trim()
    inputPassword = (form?.get('password') ?? '').toString()
  }

  if (!inputUser || !inputPassword) {
    return NextResponse.json({ error: 'Anmeldename oder Passwort fehlt' }, { status: 400 })
  }

  if (user && password) {
    if (inputUser !== user || inputPassword !== password) {
      return NextResponse.json({ error: 'Anmeldename oder Passwort falsch' }, { status: 401 })
    }
  } else {
    // Fallback: Admin-Login per Supabase, wenn kein Bypass-ENV gesetzt ist
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase ENV fehlt' }, { status: 500 })
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseKey)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: inputUser,
      password: inputPassword,
    })
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Login fehlgeschlagen' }, { status: 401 })
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Nur Admins dürfen den Bypass nutzen' }, { status: 403 })
    }
  }

  const origin = request.nextUrl.origin
  const response = NextResponse.redirect(new URL('/', origin), 303)
  const cookieValue = password || 'admin'
  response.cookies.set(COOKIE_NAME, cookieValue, {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    secure: origin.startsWith('https'),
    sameSite: 'lax',
  })

  return response
}
