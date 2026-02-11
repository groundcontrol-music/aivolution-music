import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { artist_name, email } = await request.json()

  const supabase = await createClient()

  // Automatische URL-Erkennung (localhost vs. Codespace)
  const url = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  
  let redirectUrl: string
  if (isLocal) {
    redirectUrl = `http://localhost:3000/auth/callback`
  } else if (forwardedHost) {
    redirectUrl = `https://${forwardedHost}/auth/callback`
  } else {
    redirectUrl = `${url.protocol}//${url.host}/auth/callback`
  }

  // Magic Link senden (mit artist_name in Metadaten)
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: {
        artist_name
      },
      emailRedirectTo: redirectUrl
    }
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
