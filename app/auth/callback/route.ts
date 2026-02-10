import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // Optional: Wenn wir den User nach dem Login woanders hinschicken wollen
  const next = searchParams.get('next') ?? '/admin'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Component Kontext ignorieren
            }
          },
        },
      }
    )
    
    // DER ENTSCHEIDENDE MOMENT:
    // Wir tauschen den Einmal-Code gegen eine echte, sichere Session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Erfolg! Weiterleitung ins Admin-Panel
      // Wir säubern die URL, damit kein ?code= mehr da steht
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Falls etwas schiefging (z.B. Link abgelaufen)
  return NextResponse.redirect(`${origin}/login?error=InvalidAuthCode`)
}