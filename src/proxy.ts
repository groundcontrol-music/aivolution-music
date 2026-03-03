import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Sperrseite (Snake): Nicht eingeloggte Besucher → /lock. Bypass per Cookie (LOCK_BYPASS_USER + LOCK_BYPASS_PASSWORD). Abschalten: NEXT_PUBLIC_LOCK_ENABLED=false
const LOCK_ENABLED = process.env.NEXT_PUBLIC_LOCK_ENABLED !== 'false';
const LOCK_BYPASS_PASSWORD = process.env.LOCK_BYPASS_PASSWORD;
const LOCK_BYPASS_COOKIE_NAME = 'lock_bypass';

type PlatformEvent = {
  id: string;
  event_name: string;
  country_code: string;
  start_date: string;
  end_date: string;
  theme_color_hex: string;
  aivo_skin_id: string;
  is_active: boolean;
  created_at?: string;
};

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

  // Event-Logik: Land des Users erkennen und aktive Events laden
  const country = request.geo?.country || 'DE'; // Fallback auf DE
  const now = new Date();
  let activeEvent: PlatformEvent | null = null;

  try {
    const { data: events, error } = await supabase
      .from('platform_events')
      .select('*')
      .eq('is_active', true)
      .eq('country_code', country)
      .lte('start_date', now.toISOString())
      .gte('end_date', now.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Fehler beim Laden von Platform Events in Middleware:', error);
    } else if (events && events.length > 0) {
      activeEvent = events[0] as PlatformEvent;
    }
  } catch (e) {
    console.error('Exception beim Laden von Platform Events in Middleware:', e);
  }

  if (activeEvent) {
    response.headers.set('x-active-event', JSON.stringify(activeEvent));
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
