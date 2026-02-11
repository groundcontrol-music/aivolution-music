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
          .select('terms_accepted_at, onboarding_status')
          .eq('id', user.id)
          .single()

        // 1. Terms nicht akzeptiert? -> /onboarding/terms
        if (!profile?.terms_accepted_at) {
          targetPath = '/onboarding/terms'
        }
        // 2. Onboarding nicht abgeschlossen? -> /onboarding
        else if (!profile?.onboarding_status || profile.onboarding_status === 'pending') {
          targetPath = '/onboarding'
        }
        // 3. Alles fertig -> Startseite
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
