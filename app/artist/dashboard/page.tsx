import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CreatorProfileModule from '@/components/CreatorProfileModule'

/**
 * MASTER-CHECK (Frage 4 & 7): 
 * State-of-the-Art Next.js Route im bestehenden artist-Zweig.
 * Nutzt das brutalistische CreatorProfileModule.
 */
export default async function ArtistDashboard() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  // 1. SECURITY CHECK (Master-Frage 2)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      {/* Das Modul rendert das Profil. 
          Durch isOwner={true} werden die Bearbeitungs-Funktionen 
          (Upload, Edit) für den Creator freigeschaltet.
      */}
      <CreatorProfileModule creatorId={user.id} isOwner={true} />
    </div>
  )
}