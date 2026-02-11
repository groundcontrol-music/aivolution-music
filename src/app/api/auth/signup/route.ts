import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { artist_name, email, password } = await request.json()

  const supabase = await createClient()

  // Signup
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        artist_name
      }
    }
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, user: data.user })
}
