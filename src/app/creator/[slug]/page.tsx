import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { Disc3, ExternalLink, Zap, Eye } from 'lucide-react'
import Link from 'next/link'
import ShopSongCard from '@/components/creator/ShopSongCard'

export default async function CreatorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { slug } = await params // Next.js 16: params is a Promise
  
  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userRole } = user ? await supabase.rpc('get_my_role') : { data: null }
  const isAdmin = userRole === 'admin'
  
  // Fetch Creator Profile by slug (artist_name_slug)
  // WICHTIG: Auch 'user' mit onboarding_status='submitted' zulassen (für Admin-Preview)
  const { data: creator, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('artist_name_slug', slug)
    .or('role.eq.creator,role.eq.user') // Creator ODER User (pending)
    .single()

  if (error || !creator) {
    notFound()
  }

  // Visibility Check: Nur Admins sehen pending/rejected Profile
  if (creator.visibility !== 'public' && !isAdmin) {
    notFound()
  }
  
  // Für normale User: Nur freigeschaltete Creator zeigen
  if (!isAdmin && creator.role !== 'creator') {
    notFound()
  }

  // Check if current user is the creator owner
  const isCreatorOwner = user?.id === creator.id

  // Fetch Songs (alle für Admin/Owner, nur nicht-probe für andere)
  let songsQuery = supabase
    .from('songs')
    .select('*')
    .eq('user_id', creator.id)
    .order('created_at', { ascending: false })
  
  // Admins und Creator sehen auch Probe-Songs (für Kuration)
  if (!isAdmin && !isCreatorOwner) {
    songsQuery = songsQuery.eq('is_probe', false)
  }
  
  const { data: songs } = await songsQuery

  // Social Links
  const socials = creator.social_links || {}
  const socialIcons: { [key: string]: string } = {
    spotify: '🎧',
    soundcloud: '☁️',
    instagram: '📸',
    tiktok: '🎬',
    youtube: '▶️'
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      
      {/* ADMIN PREVIEW BANNER (nur bei pending) */}
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
              <form action={`/api/admin/approve-profile`} method="POST">
                <input type="hidden" name="userId" value={creator.id} />
                <button 
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 font-black uppercase text-xs hover:bg-green-700 transition-colors"
                >
                  ✅ FREISCHALTEN
                </button>
              </form>
              <form action={`/api/admin/reject-profile`} method="POST">
                <input type="hidden" name="userId" value={creator.id} />
                <button 
                  type="submit"
                  className="bg-red-600 text-white px-6 py-2 font-black uppercase text-xs hover:bg-red-700 transition-colors"
                >
                  ❌ ABLEHNEN
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b-2 border-black">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Avatar */}
            <div className="relative">
              <div className="w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-black shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] overflow-hidden bg-zinc-100">
                {creator.avatar_url ? (
                  <img src={creator.avatar_url} alt={creator.artist_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl font-black text-zinc-300">
                    {creator.artist_name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter leading-none mb-3">
                {creator.artist_name}
              </h1>
              
              {creator.tech_stack && creator.tech_stack.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {creator.tech_stack.map((tech: string) => (
                    <span key={tech} className="text-xs font-bold uppercase px-3 py-1 bg-red-600 text-white rounded-full">
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-base font-medium text-gray-700 leading-relaxed mb-6 max-w-2xl">
                {creator.bio || 'Kein Bio vorhanden.'}
              </p>

              {/* Social Links */}
              {Object.keys(socials).filter(k => socials[k]).length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {Object.keys(socials).filter(k => socials[k]).map((key) => (
                    <a
                      key={key}
                      href={socials[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors text-xs font-bold uppercase"
                    >
                      <span>{socialIcons[key] || '🔗'}</span>
                      {key}
                      <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">

        {/* //THE LAB (Music Releases) */}
        <section>
          <div className="flex items-center gap-3 mb-6 border-b-2 border-black pb-3">
            <Disc3 className="text-red-600" size={32} />
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">
              //THE <span className="text-red-600">LAB</span>
            </h2>
          </div>

          {songs && songs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {songs.map((song: any) => (
                <ShopSongCard key={song.id} song={song} />
              ))}
            </div>
          ) : (
            <div className="bg-zinc-100 border-2 border-dashed border-zinc-300 rounded-lg p-12 text-center">
              <Disc3 className="mx-auto mb-4 text-zinc-400" size={48} />
              <p className="text-sm font-bold uppercase text-zinc-500">Noch keine Songs veröffentlicht.</p>
            </div>
          )}
        </section>

        {/* Spotlight Videos (Optional) */}
        <section>
          <div className="flex items-center gap-3 mb-6 border-b-2 border-black pb-3">
            <Zap className="text-red-600" size={32} />
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">
              Spotlight <span className="text-red-600">Videos</span>
            </h2>
          </div>

          <div className="bg-zinc-100 border-2 border-dashed border-zinc-300 rounded-lg p-12 text-center">
            <p className="text-sm font-bold uppercase text-zinc-500">Coming Soon</p>
          </div>
        </section>

        {/* Stats */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border-2 border-black rounded-lg p-6 text-center">
              <div className="text-3xl font-black text-red-600 mb-1">{songs?.length || 0}</div>
              <div className="text-xs font-bold uppercase opacity-60">Releases</div>
            </div>
            <div className="bg-white border-2 border-black rounded-lg p-6 text-center">
              <div className="text-3xl font-black text-red-600 mb-1">-</div>
              <div className="text-xs font-bold uppercase opacity-60">Downloads</div>
            </div>
            <div className="bg-white border-2 border-black rounded-lg p-6 text-center">
              <div className="text-3xl font-black text-red-600 mb-1">-</div>
              <div className="text-xs font-bold uppercase opacity-60">Fans</div>
            </div>
            <div className="bg-white border-2 border-black rounded-lg p-6 text-center">
              <div className="text-3xl font-black text-red-600 mb-1">
                <Eye size={24} className="mx-auto" />
              </div>
              <div className="text-xs font-bold uppercase opacity-60">Views</div>
            </div>
          </div>
        </section>

        {/* TODO: Creator Mini-Forum später hinzufügen */}

      </div>
    </div>
  )
}
