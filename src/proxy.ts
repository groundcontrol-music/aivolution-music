import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const LOCK_ENABLED = process.env.NEXT_PUBLIC_LOCK_ENABLED !== 'false'

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

  if (isPublicPath(pathname)) {
    return response
  }

  if (!user) {
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
