import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Sperrseite (Snake): Nicht eingeloggte Besucher → /lock. Bypass per Cookie (LOCK_BYPASS_USER + LOCK_BYPASS_PASSWORD). Abschalten: NEXT_PUBLIC_LOCK_ENABLED=false
const LOCK_ENABLED = process.env.NEXT_PUBLIC_LOCK_ENABLED !== 'false'
const LOCK_BYPASS_PASSWORD = process.env.LOCK_BYPASS_PASSWORD
const LOCK_BYPASS_COOKIE_NAME = 'lock_bypass'

const PUBLIC_PATHS = [
  '/lock',
  '/api/',
  '/auth/',
  '/_next/',
  '/favicon',
  '/aivo-robot',
  '/robots.txt',
  '/sitemap.xml',
]

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(p => path.startsWith(p))
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!LOCK_ENABLED) {
    return response
  }

  const bypassCookie = request.cookies.get(LOCK_BYPASS_COOKIE_NAME)?.value
  const bypassValid = !!LOCK_BYPASS_PASSWORD && bypassCookie === LOCK_BYPASS_PASSWORD

  if (isPublicPath(pathname)) {
    // Bypass aktiv: von /lock weg zur Startseite
    if (pathname.startsWith('/lock') && bypassValid) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    // Eingeloggter Admin auf Sperrseite → Startseite
    if (pathname.startsWith('/lock') && user) {
      const { data: role } = await supabase.rpc('get_my_role')
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
    return response
  }

  // Nicht eingeloggt: mit gültigem Bypass-Cookie durchlassen, sonst → /lock
  if (!user) {
    if (bypassValid) {
      return response
    }
    const lockUrl = new URL('/lock', request.url)
    return NextResponse.redirect(lockUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
