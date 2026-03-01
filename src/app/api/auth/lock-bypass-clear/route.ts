import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'lock_bypass'

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const response = NextResponse.redirect(new URL('/lock', origin), 303)
  response.cookies.set(COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: origin.startsWith('https'),
    sameSite: 'lax',
  })
  return response
}
