import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Prüfe User-Status für intelligentes Routing
      const { data: { user } } = await supabase.auth.getUser()
      let targetPath = '/'
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, onboarding_status, artist_name_slug')
          .eq('id', user.id)
          .single()

        // 1. Admin → Startseite (Kommandozentrale)
        if (profile?.role === 'admin') {
          targetPath = '/'
        }
        // 2. Creator approved → Eigenes Profil
        else if (profile?.role === 'creator' && profile?.onboarding_status === 'approved' && profile?.artist_name_slug) {
          targetPath = `/creator/${profile.artist_name_slug}`
        }
        // 3. Creator pending → Startseite (mit Wartestatus)
        else if (profile?.onboarding_status === 'pending' || profile?.onboarding_status === 'submitted') {
          targetPath = '/'
        }
        // 4. Fallback → Startseite
        else {
          targetPath = '/'
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocal = origin.includes('localhost')
      
      if (isLocal) {
        return NextResponse.redirect(`${origin}${targetPath}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${targetPath}`)
      } else {
        return NextResponse.redirect(`${origin}${targetPath}`)
      }
    }
  }

  // Fehler -> Error-Seite
  return NextResponse.redirect(`${origin}/error`)
}
