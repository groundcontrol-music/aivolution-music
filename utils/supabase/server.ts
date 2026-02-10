import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * IST-CHECK (Frage 6): Next.js 16 Standard für Server-Side-Clients.
 * Nutzt die neuen asynchronen Cookies für Turbopack-Kompatibilität.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
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
            // Die Middleware/Proxy übernimmt das Setzen der Cookies,
            // wenn dieser Client in einer Server Component aufgerufen wird.
          }
        },
      },
    }
  )
}