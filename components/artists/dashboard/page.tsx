import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CreatorProfileModule from '@/components/CreatorProfileModule'

export default async function ArtistDashboard() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      {/* Wir nutzen dein vorhandenes Modul und setzen isOwner auf true */}
      <CreatorProfileModule creatorId={user.id} isOwner={true} />
    </div>
  )
}