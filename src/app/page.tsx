import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import FooterWithModal from '@/components/footer/FooterWithModal'

// Kachelgröße wie Creator-Profil-Header (editierbare Media-Boxen)
const BOX_SIZE = 'w-16 h-16 md:w-20 md:h-20'
const BOX_ROUND = 'rounded-[1.5rem]'

export default async function Home() {
  const supabase = await createClient()
  const { data: slots } = await supabase.from('promo_slots').select('*').order('slot_id')

  // Nur 3 Media-Boxen (Slot 1, 2, 3) + Highlight (Slot 5)
  const mediaSlots = slots?.filter((s) => [1, 2, 3].includes(s.slot_id)) ?? []
  const highlight = slots?.find((s) => s.slot_id === 5)

  // Neue Creator: approved + (public oder visibility noch nicht gesetzt); Profilbild in bekannter Kachelgröße
  const { data: newCreators } = await supabase
    .from('profiles')
    .select('id, artist_name, artist_name_slug, avatar_url, created_at')
    .eq('role', 'creator')
    .eq('onboarding_status', 'approved')
    .or('visibility.eq.public,visibility.is.null')
    .order('created_at', { ascending: false })
    .limit(12)

  // Top Ten (nach Verkäufen → download_count)
  const { data: topTenRows } = await supabase
    .from('songs')
    .select('id, title, price, cover_url, file_url, mp3_preview_url, wav_url, download_count, release_type, genres, user_id')
    .eq('is_probe', false)
    .order('download_count', { ascending: false })
    .limit(10)

  // Top Genres: alle Shop-Songs für Genre-Aggregation
  const { data: allSongsForGenres } = await supabase
    .from('songs')
    .select('id, title, price, cover_url, release_type, genres, user_id')
    .eq('is_probe', false)

  // Creator-Namen für Top Ten + Genre-Songs
  const creatorIds = [...new Set([...(topTenRows ?? []).map((s) => s.user_id), ...(allSongsForGenres ?? []).map((s) => s.user_id)].filter(Boolean))]
  const { data: creatorProfiles } = await supabase
    .from('profiles')
    .select('id, artist_name, artist_name_slug')
    .in('id', creatorIds)
  const creatorMap = new Map((creatorProfiles ?? []).map((p) => [p.id, p]))

  const topTen = (topTenRows ?? []).map((s) => ({
    ...s,
    creator: creatorMap.get(s.user_id),
  }))

  const genreCounts: Record<string, number> = {}
  ;(allSongsForGenres ?? []).forEach((s) => {
    const genres = Array.isArray(s.genres) ? s.genres : []
    genres.forEach((g: string) => {
      const key = (g || '').trim()
      if (key) genreCounts[key] = (genreCounts[key] || 0) + 1
    })
  })
  const topGenreNames = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name)

  // Pro Genre bis zu 5 Songs (gleiche Kachelgröße, max 5 nebeneinander)
  const genreSongs: { genre: string; songs: typeof topTen }[] = []
  for (const genreName of topGenreNames) {
    const inGenre = (allSongsForGenres ?? []).filter(
      (s) => Array.isArray(s.genres) && s.genres.some((g: string) => (g || '').trim() === genreName)
    )
    const withCreator = inGenre.slice(0, 5).map((s) => ({
      ...s,
      creator: creatorMap.get(s.user_id),
    }))
    genreSongs.push({ genre: genreName, songs: withCreator })
  }

  const formatType = (t: string | null | undefined) => {
    const v = (t || 'single').toString().toLowerCase()
    if (v === 'ep') return 'EP'
    if (v === 'album') return 'Album'
    return 'Single'
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-black font-sans selection:bg-red-600 selection:text-white py-6 md:py-8">
      <div className="max-w-6xl mx-auto px-3 md:px-4">
        {/* Rahmen wie Creator-Profil */}
        <div className="bg-white border-2 border-black rounded-[2.5rem] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          {/* SECTION 1: Drei Media-Boxen + Highlight */}
          <div className="grid grid-cols-12 gap-4 md:gap-6 p-4 md:p-6 items-stretch">
            <div className="col-span-12 lg:col-span-9 flex flex-col gap-4 md:gap-6">
              {/* 3 Media-Boxen */}
              <div className="grid grid-cols-3 gap-4 md:gap-6">
                {[1, 2, 3].map((id) => {
                  const slot = mediaSlots.find((s) => s.slot_id === id)
                  return (
                    <div
                      key={id}
                      className="aspect-square flex flex-col justify-between p-0 bg-white border-2 border-black rounded-[2.5rem] transition-all duration-200 hover:shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] hover:-translate-y-0.5 group relative overflow-hidden"
                    >
                      {slot?.media_type === 'image' && slot.media_url && (
                        <div className="absolute inset-0 z-0">
                          <img src={slot.media_url} alt={slot.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        </div>
                      )}
                      {slot?.media_type === 'youtube' && slot.youtube_id && (
                        <div className="absolute inset-0 z-0 overflow-hidden bg-black flex items-center justify-center">
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${slot.youtube_id}?rel=0&modestbranding=1`}
                            title={slot.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            className="w-full h-full min-w-full min-h-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                        </div>
                      )}
                      {slot?.media_type === 'tiktok' && slot.tiktok_id && (
                        <div className="absolute inset-0 z-0 overflow-hidden bg-black flex items-center justify-center">
                          <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold p-4 text-center">
                            <p className="text-[10px] opacity-60">TikTok Slot</p>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        </div>
                      )}
                      <div className={`relative z-10 p-4 flex flex-col justify-between h-full ${slot?.media_type === 'youtube' || slot?.media_type === 'tiktok' ? 'pointer-events-none' : ''}`}>
                        <span className="opacity-20 text-[10px] font-black uppercase italic tracking-widest group-hover:text-red-600 transition-colors text-white">0{id}</span>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase italic leading-none text-red-400">{slot?.subtitle || 'PLATFORM'}</p>
                          <h3 className="text-xs font-black uppercase leading-tight tracking-tighter text-white drop-shadow-lg">{slot?.title || 'Slot'}</h3>
                          {slot?.body_text && <p className="text-[9px] leading-tight line-clamp-2 mt-1 text-white/90">{slot.body_text}</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Neuer Creator (unter den 3 Boxen) */}
              <div className="flex flex-col border-2 border-black rounded-[2.5rem] bg-white p-4 md:p-5 min-h-[200px]">
                <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
                  <h3 className="text-lg font-black uppercase italic tracking-tight">
                    Neue <span className="text-red-600">Creator</span>
                  </h3>
                  <Link href="/join" className="text-[10px] font-bold uppercase tracking-wider text-red-600 hover:text-black transition-colors flex items-center gap-1">
                    <Sparkles size={12} />
                    Creator werden
                  </Link>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 flex-1 content-start">
                  {newCreators && newCreators.length > 0 ? (
                    newCreators.map((creator) => (
                      <Link
                        key={creator.id}
                        href={`/creator/${creator.artist_name_slug || creator.id}`}
                        className="group flex flex-col items-center text-center hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] hover:-translate-y-0.5 transition-all cursor-pointer"
                      >
                        {/* Profilbild in bekannter Boxengröße (wie Creator-Profil-Header / Media-Boxen) */}
                        <div className={`${BOX_SIZE} ${BOX_ROUND} border-2 border-black bg-zinc-100 overflow-hidden flex-shrink-0 group-hover:border-red-600 transition-all`}>
                          {creator.avatar_url ? (
                            <img src={creator.avatar_url} alt={creator.artist_name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-black text-zinc-300 group-hover:text-red-600 transition-colors">
                              {creator.artist_name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <p className="mt-1.5 font-black uppercase text-[9px] leading-tight line-clamp-2 w-full px-1 group-hover:text-red-600 transition-colors">{creator.artist_name}</p>
                        <p className="text-[7px] opacity-40 font-mono uppercase tracking-wider">
                          {new Date(creator.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8 text-xs font-bold uppercase text-zinc-400 bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-[1.5rem]">
                      Noch keine Creator – sei der erste!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Highlight Box (rechts) */}
            <div className="col-span-12 lg:col-span-3 flex min-h-[320px]">
              <div className="w-full h-full min-h-[320px] flex-1 bg-white border-2 border-black rounded-[2.5rem] flex flex-col justify-between p-6 transition-all duration-300 hover:shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] hover:-translate-y-0.5 group relative overflow-hidden">
                {highlight?.media_type === 'image' && highlight.media_url && (
                  <div className="absolute inset-0 z-0">
                    <img src={highlight.media_url} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  </div>
                )}
                {highlight?.media_type === 'youtube' && highlight.youtube_id && (
                  <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 w-[178%] h-full -translate-x-1/2 -translate-y-1/2">
                      <iframe
                        src={`https://www.youtube.com/embed/${highlight.youtube_id}`}
                        title={highlight.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
                  </div>
                )}
                {highlight?.media_type === 'tiktok' && highlight.tiktok_id && (
                  <div className="absolute inset-0 z-0 overflow-hidden bg-black">
                    <div className="absolute top-1/2 left-1/2 w-full h-[178%] -translate-x-1/2 -translate-y-1/2">
                      <iframe
                        src={`https://www.tiktok.com/embed/v2/${highlight.tiktok_id}`}
                        title={highlight.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
                  </div>
                )}
                <div className={`relative z-10 flex flex-col justify-between h-full ${highlight?.media_type === 'youtube' || highlight?.media_type === 'tiktok' ? 'pointer-events-none' : ''}`}>
                  <div className="bg-black text-white px-3 py-1 text-[9px] font-black uppercase italic w-fit rounded-full group-hover:bg-red-600 transition-colors">HIGHLIGHT</div>
                  <div className="mt-auto space-y-3">
                    <div className="w-full h-[1px] bg-black/10 group-hover:bg-red-600/50 transition-colors" />
                    <h4 className={`text-2xl md:text-3xl font-black uppercase italic leading-none tracking-tighter group-hover:scale-105 transition-transform origin-left ${highlight?.media_type && highlight.media_type !== 'none' ? 'text-white drop-shadow-lg' : ''}`}>
                      {highlight?.title || 'AUDIO CORE'}
                    </h4>
                    <p className={`text-[10px] font-bold uppercase tracking-widest leading-none ${highlight?.media_type && highlight.media_type !== 'none' ? 'text-white/90' : 'opacity-50'}`}>
                      {highlight?.subtitle || 'Technologische Einblicke.'}
                    </p>
                    {highlight?.body_text && (
                      <p className={`text-xs font-medium leading-relaxed line-clamp-2 ${highlight?.media_type && highlight.media_type !== 'none' ? 'text-white/90' : 'text-gray-600'}`}>{highlight.body_text}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Aivolution Creator Store: Top Ten + Top Genres */}
          <div className="border-t-2 border-black px-4 md:px-6 py-6 md:py-8">
            <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter mb-6">
              Aivolution <span className="text-red-600">Creator Store</span>
            </h2>

            {/* Top Ten (nach Verkäufen) */}
            <section className="mb-8">
              <h3 className="text-lg font-black uppercase tracking-wide mb-4 border-b-2 border-black pb-2 w-fit">Top Ten</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
                {topTen.length > 0 ? (
                  topTen.map((song, idx) => (
                    <Link
                      key={song.id}
                      href={song.creator?.artist_name_slug ? `/creator/${song.creator.artist_name_slug}#song-${song.id}` : '#'}
                      className="group flex flex-col items-center text-center"
                    >
                      <div className={`relative ${BOX_SIZE} ${BOX_ROUND} border-2 border-black overflow-hidden bg-zinc-100 flex-shrink-0 hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] transition-all`}>
                        {song.cover_url ? (
                          <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl font-black text-zinc-300">🎵</div>
                        )}
                        <span className="absolute top-0 left-0 bg-black text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-br-md">{idx + 1}</span>
                      </div>
                      <p className="mt-1.5 text-[11px] font-black uppercase leading-tight line-clamp-2">{song.title}</p>
                      <p className="text-[9px] text-zinc-600 font-bold">{song.creator?.artist_name ?? '–'}</p>
                      <p className="text-[9px] text-red-600 font-black">€{(Number(song.price) || 0).toFixed(2)} · {formatType(song.release_type)}</p>
                    </Link>
                  ))
                ) : (
                  <p className="col-span-full text-sm text-zinc-500 font-bold uppercase">Noch keine Verkäufe – Top Ten folgt.</p>
                )}
              </div>
            </section>

            {/* Top Genres (3–4 Genres, max 5 Kacheln pro Reihe) */}
            {genreSongs.length > 0 && (
              <section className="space-y-6">
                <h3 className="text-lg font-black uppercase tracking-wide border-b-2 border-black pb-2 w-fit">Top Genres</h3>
                {genreSongs.map(({ genre, songs }) => (
                  <div key={genre}>
                    <h4 className="text-sm font-black uppercase text-red-600 mb-3">{genre}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
                      {songs.map((song) => (
                        <Link
                          key={song.id}
                          href={song.creator?.artist_name_slug ? `/creator/${song.creator.artist_name_slug}#song-${song.id}` : '#'}
                          className="group flex flex-col items-center text-center"
                        >
                          <div className={`${BOX_SIZE} ${BOX_ROUND} border-2 border-black overflow-hidden bg-zinc-100 flex-shrink-0 hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] transition-all relative`}>
                            {song.cover_url ? (
                              <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl font-black text-zinc-300">🎵</div>
                            )}
                          </div>
                          <p className="mt-1.5 text-[11px] font-black uppercase leading-tight line-clamp-2">{song.title}</p>
                          <p className="text-[9px] text-zinc-600 font-bold">{song.creator?.artist_name ?? '–'}</p>
                          <p className="text-[9px] text-red-600 font-black">€{(Number(song.price) || 0).toFixed(2)} · {formatType(song.release_type)}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Footer: Impressum, AGB, Hilfe – Klick öffnet große Modal-Box */}
            <FooterWithModal variant="home" />
          </div>
        </div>
      </div>
    </div>
  )
}
