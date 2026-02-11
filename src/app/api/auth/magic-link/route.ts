import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { artist_name, email } = await request.json()

  const supabase = await createClient()

  // Magic Link senden (mit artist_name in Metadaten)
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: {
        artist_name
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
    }
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
