import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { Disc3, ExternalLink, Zap, Eye } from 'lucide-react'
import Link from 'next/link'
import ShopSongCard from '@/components/creator/ShopSongCard'
import CreatorLiveEditPanel from '@/components/creator/CreatorLiveEditPanel'

export default async function CreatorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { slug } = await params // Next.js 16: params is a Promise
  const slugLower = slug.toLowerCase()
  const compactSlug = slugLower.replace(/[^a-z0-9]/g, '')
  
  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userRole } = user ? await supabase.rpc('get_my_role') : { data: null }
  const isAdmin = userRole === 'admin'
  const isPublicView = !isAdmin
  
  // Fetch Creator Profile by slug (artist_name_slug)
  // Robust: nicht mit .single() abbrechen, falls Daten historisch inkonsistent sind
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

  // Fallback 2: toleranter Slug-Match (z.B. ludexumbrae vs ludex-umbrae)
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

  // Fallback 3: artist_name ohne Sonderzeichen vergleichen (sehr robust für alte Datensätze)
  if (!creator) {
    let candidateQuery = supabase
      .from('profiles')
      .select('*')
      .limit(200)

    if (isPublicView) {
      candidateQuery = candidateQuery.eq('role', 'creator').eq('visibility', 'public')
    } else {
      candidateQuery = candidateQuery.or('role.eq.creator,role.eq.user')
    }

    const { data: candidateRows } = await candidateQuery

    creator = (candidateRows || []).find((row: any) => {
      const normalizedArtist = String(row.artist_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      return normalizedArtist === compactSlug
    })
  }

  // DEBUG: Temporäre Ausgabe für Fehlersuche
  if (!creator) {
    return (
      <div className="min-h-screen bg-red-50 p-8">
        <div className="max-w-2xl mx-auto bg-white border-4 border-red-600 p-6 rounded-lg">
          <h1 className="text-2xl font-black mb-4">DEBUG: Profil nicht gefunden</h1>
          <pre className="text-xs">{JSON.stringify({
            slug,
            slugLower,
            compactSlug,
            isAdmin,
            userRole,
            message: 'Keine Zeile in profiles passt zu diesem Slug'
          }, null, 2)}</pre>
        </div>
      </div>
    )
  }

  // Visibility Check: Nur Admins sehen pending/rejected Profile
  if (creator.visibility !== 'public' && !isAdmin) {
    return (
      <div className="min-h-screen bg-yellow-50 p-8">
        <div className="max-w-2xl mx-auto bg-white border-4 border-yellow-600 p-6 rounded-lg">
          <h1 className="text-2xl font-black mb-4">DEBUG: Visibility blockiert</h1>
          <pre className="text-xs">{JSON.stringify({
            visibility: creator.visibility,
            isAdmin,
            userRole,
            message: 'Profil ist nicht public und User ist kein Admin'
          }, null, 2)}</pre>
        </div>
      </div>
    )
  }
  
  // Für normale User: Nur freigeschaltete Creator zeigen
  if (!isAdmin && creator.role !== 'creator') {
    return (
      <div className="min-h-screen bg-orange-50 p-8">
        <div className="max-w-2xl mx-auto bg-white border-4 border-orange-600 p-6 rounded-lg">
          <h1 className="text-2xl font-black mb-4">DEBUG: Role blockiert</h1>
          <pre className="text-xs">{JSON.stringify({
            role: creator.role,
            isAdmin,
            userRole,
            message: 'Profil ist kein creator und User ist kein Admin'
          }, null, 2)}</pre>
        </div>
      </div>
    )
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

  const getYouTubeEmbed = (input: string) => {
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    const match = input?.match(regex)
    return match ? `https://www.youtube.com/embed/${match[1]}` : null
  }

  const getTikTokEmbed = (input: string) => {
    const match = input?.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/)
    return match ? `https://www.tiktok.com/embed/v2/${match[1]}` : null
  }

  const videoLinks = [socials.video_1, socials.video_2].filter(Boolean)

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
              <form action={`/api/admin/approve-creator`} method="POST">
                <input type="hidden" name="user_id" value={creator.id} />
                <button 
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 font-black uppercase text-xs hover:bg-green-700 transition-colors"
                >
                  ✅ FREISCHALTEN
                </button>
              </form>
              <form action={`/api/admin/reject-creator`} method="POST">
                <input type="hidden" name="user_id" value={creator.id} />
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

        {/* Owner Live Edit */}
        {isCreatorOwner && (
          <CreatorLiveEditPanel
            userId={creator.id}
            initialBio={creator.bio || ''}
            initialAvatarUrl={creator.avatar_url || ''}
            initialTechStack={creator.tech_stack || ''}
            initialSocials={socials}
          />
        )}

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

        {/* Spotlight Videos */}
        <section>
          <div className="flex items-center gap-3 mb-6 border-b-2 border-black pb-3">
            <Zap className="text-red-600" size={32} />
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">
              Spotlight <span className="text-red-600">Videos</span>
            </h2>
          </div>
          {videoLinks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {videoLinks.map((link: string, idx: number) => {
                const yt = getYouTubeEmbed(link)
                const tt = getTikTokEmbed(link)
                return (
                  <div key={`${link}-${idx}`} className="border-2 border-black rounded-lg overflow-hidden bg-black">
                    {yt ? (
                      <iframe
                        width="100%"
                        height="280"
                        src={yt}
                        title={`YouTube Video ${idx + 1}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : tt ? (
                      <iframe
                        width="100%"
                        height="280"
                        src={tt}
                        title={`TikTok Video ${idx + 1}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="p-8 text-white text-xs font-bold uppercase">
                        Link nicht erkannt. Bitte YouTube- oder TikTok-URL verwenden.
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-zinc-100 border-2 border-dashed border-zinc-300 rounded-lg p-12 text-center">
              <p className="text-sm font-bold uppercase text-zinc-500">Noch keine Videos eingebunden.</p>
              {isCreatorOwner && (
                <p className="text-xs mt-2 opacity-60">Du kannst 2 Videos oben im Live-Edit hinterlegen.</p>
              )}
            </div>
          )}
        </section>

        {/* Creator Forum Hinweis */}
        <section>
          <div className="bg-white border-2 border-black rounded-lg p-6">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2">
              Creator <span className="text-red-600">Forum</span>
            </h3>
            <p className="text-sm font-medium mb-3">
              Jeder Creator bekommt ein eigenes Mini-Forum mit bis zu 3 Themen. Antworten werden per Nachricht gemeldet.
              Zusätzlich gibt es ein globales Plattform-Forum mit Hauptkategorien.
            </p>
            <div className="flex gap-3">
              <a href="/messages" className="px-4 py-2 border-2 border-black text-xs font-black uppercase hover:bg-black hover:text-white transition-colors">
                Nachrichten öffnen
              </a>
              <span className="px-4 py-2 bg-zinc-100 border-2 border-black text-xs font-bold uppercase">Forum-Preview folgt im nächsten Schritt</span>
            </div>
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

        {/* TODO: Creator Mini-Forum + globales Forum im nächsten Schritt */}

      </div>
    </div>
  )
}
