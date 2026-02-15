import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { Eye } from 'lucide-react'
import CreatorProfileClient from '@/components/creator/CreatorProfileClient'

export default async function CreatorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { slug } = await params
  const slugLower = slug.toLowerCase()
  const compactSlug = slugLower.replace(/[^a-z0-9]/g, '')
  
  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userRole } = user ? await supabase.rpc('get_my_role') : { data: null }
  const isAdmin = userRole === 'admin'
  const isPublicView = !isAdmin
  
  // Fetch Creator Profile by slug (with multiple fallbacks for robustness)
  let slugQuery = supabase
    .from('profiles')
    .select('*')
    .ilike('artist_name_slug', slugLower)
    .limit(1)

  if (isPublicView) {
    slugQuery = slugQuery.eq('role', 'creator').eq('visibility', 'public')
  } else {
    slugQuery = slugQuery.or('role.eq.creator,role.eq.user')
  }

  const { data: creatorRows } = await slugQuery
  let creator = creatorRows?.[0]

  // Fallback 1: alte Datensätze ohne/mit falschem slug per artist_name matchen
  if (!creator) {
    const fallbackNamePattern = `%${slugLower.replace(/-/g, '%')}%`
    let fallbackQuery = supabase
      .from('profiles')
      .select('*')
      .ilike('artist_name', fallbackNamePattern)
      .limit(1)

    if (isPublicView) {
      fallbackQuery = fallbackQuery.eq('role', 'creator').eq('visibility', 'public')
    } else {
      fallbackQuery = fallbackQuery.or('role.eq.creator,role.eq.user')
    }

    const { data: fallbackRows } = await fallbackQuery
    creator = fallbackRows?.[0]
  }

  // Fallback 2: fuzzy slug match
  if (!creator) {
    const fuzzyPattern = `%${compactSlug.split('').join('%')}%`
    let fuzzyQuery = supabase
      .from('profiles')
      .select('*')
      .ilike('artist_name_slug', fuzzyPattern)
      .limit(1)

    if (isPublicView) {
      fuzzyQuery = fuzzyQuery.eq('role', 'creator').eq('visibility', 'public')
    } else {
      fuzzyQuery = fuzzyQuery.or('role.eq.creator,role.eq.user')
    }

    const { data: fuzzyRows } = await fuzzyQuery
    creator = fuzzyRows?.[0]
  }

  if (!creator) {
    return notFound()
  }

  // Check visibility
  if (isPublicView && (creator.role !== 'creator' || creator.visibility !== 'public')) {
    return notFound()
  }

  const isCreatorOwner = user?.id === creator.id || isAdmin

  // Fetch Songs
  let songsQuery = supabase
    .from('songs')
    .select('*')
    .eq('user_id', creator.id)
    .order('created_at', { ascending: false })
  
  if (!isAdmin && !isCreatorOwner) {
    songsQuery = songsQuery.eq('is_probe', false)
  }
  
  const { data: songs } = await songsQuery

  // Parse social links
  const parseSocials = (value: any) => {
    if (!value) return {}
    if (typeof value === 'object') return value
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return {}
      }
    }
    return {}
  }

  const socials = parseSocials(creator.social_links)
  const socialIcons: { [key: string]: string } = {
    spotify: '🎧',
    soundcloud: '☁️',
    instagram: '📸',
    tiktok: '🎬',
    youtube: '▶️'
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      
      {/* ADMIN PREVIEW BANNER */}
      {isAdmin && creator.visibility === 'pending' && (
        <div className="bg-yellow-500 border-b-4 border-black px-4 py-3 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Eye className="animate-pulse" />
              <span className="font-black uppercase text-sm">
                ⚠️ VORSCHAU - Profil wartet auf Freischaltung
              </span>
            </div>
            <div className="flex gap-3">
              <form action={`/api/admin/approve-creator`} method="POST">
                <input type="hidden" name="user_id" value={creator.id} />
                <button 
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 font-black uppercase text-xs hover:bg-green-700 transition-colors rounded-full"
                >
                  ✅ FREISCHALTEN
                </button>
              </form>
              <form action={`/api/admin/reject-creator`} method="POST">
                <input type="hidden" name="user_id" value={creator.id} />
                <button 
                  type="submit"
                  className="bg-red-600 text-white px-6 py-2 font-black uppercase text-xs hover:bg-red-700 transition-colors rounded-full"
                >
                  ❌ ABLEHNEN
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* NEW PROFILE LAYOUT */}
      <CreatorProfileClient
        creator={creator}
        songs={songs || []}
        isCreatorOwner={isCreatorOwner}
        socials={socials}
        socialIcons={socialIcons}
      />

    </div>
  )
}
