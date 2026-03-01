import { NextRequest, NextResponse } from 'next/server'

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

  if (!user || !password) {
    return NextResponse.json({ error: 'Bypass nicht konfiguriert' }, { status: 501 })
  }

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

  if (inputUser !== user || inputPassword !== password) {
    return NextResponse.json({ error: 'Anmeldename oder Passwort falsch' }, { status: 401 })
  }

  const origin = request.nextUrl.origin
  const response = NextResponse.redirect(new URL('/', origin), 303)
  response.cookies.set(COOKIE_NAME, password, {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    secure: origin.startsWith('https'),
    sameSite: 'lax',
  })

  return response
}
