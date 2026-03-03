import Link from 'next/link'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import CompactSongCard from '@/components/creator/CompactSongCard'
import FooterWithModal from '@/components/footer/FooterWithModal'
import AivoExplanerBox from '@/components/AivoExplanerBox';
import HomepageMediaCard from '@/components/HomepageMediaCard'; // Neuer Import // Neue Import für AivoExplanerBox
import { headers } from 'next/headers';

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

type PromoSlot = {
  id?: string;
  slot_id: number;
  title: string;
  subtitle: string;
  body_text?: string;
  media_type?: 'image' | 'youtube' | 'tiktok' | 'none';
  media_url?: string;
  youtube_id?: string;
  tiktok_id?: string;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase ENV fehlt: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY')
  }
  const supabase = createSupabaseClient(supabaseUrl, supabaseKey)


  let trackFilter: 'most_purchased' | 'most_listened' | 'newest' = 'most_purchased'
  try {
    const { data: trackFilterRow } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'homepage_track_filter')
      .single()
    if (trackFilterRow?.value) {
      trackFilter = trackFilterRow.value
    }
  } catch {
    // Fallback auf Default
  }

  // Top Ten (nach Kriterien)
  const topTenQuery = supabase
    .from('songs')
    .select('id, title, price, cover_url, file_url, mp3_preview_url, wav_url, download_count, release_type, genres, user_id, created_at')
    .eq('is_probe', false)

  if (trackFilter === 'newest') {
    topTenQuery.order('created_at', { ascending: false })
  } else {
    // most_purchased + most_listened (Fallback: download_count)
    topTenQuery.order('download_count', { ascending: false })
  }

  const { data: topTenRows } = await topTenQuery.limit(10)

  // Top Genres: alle Shop-Songs für Genre-Aggregation
  const { data: allSongsForGenres } = await supabase
    .from('songs')
    .select('id, title, price, cover_url, release_type, genres, user_id')
    .eq('is_probe', false)

  // Media Slots für die Startseite laden (Slot 1, 2, 3, 5)
  const { data: rawMediaSlots } = await supabase
    .from('promo_slots')
    .select('*')
    .in('slot_id', [1, 2, 3, 5])
    .order('slot_id', { ascending: true });

  const mediaSlots = (rawMediaSlots ?? []).map(slot => ({
    ...slot,
    id: slot.id || `slot-${slot.slot_id}` // Sicherstellen, dass jede Slot ein id hat
  })) as PromoSlot[];

  // Creator-Namen für Top Ten + Genre-Songs
  const creatorIds = [...new Set([...(topTenRows ?? []).map((s) => s.user_id), ...(allSongsForGenres ?? []).map((s) => s.user_id)].filter(Boolean))]
  const { data: creatorProfiles } = await supabase
    .from('profiles')
    .select('id, artist_name, artist_name_slug')
    .in('id', creatorIds)
  const creatorMap = new Map((creatorProfiles ?? []).map((p) => [p.id, p]))

  type CreatorInfo = {
    id: string
    artist_name: string
    artist_name_slug: string
  }
  type ShopSong = {
    id: string
    title: string
    price: number | string | null
    cover_url?: string | null
    file_url?: string | null
    mp3_preview_url?: string | null
    wav_url?: string | null
    download_count?: number | null
    release_type?: string | null
    genres?: string[] | null
    user_id?: string | null
    creator?: CreatorInfo
  }

  const topTen: ShopSong[] = (topTenRows ?? []).map((s) => ({
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
  const genreSongs: { genre: string; songs: ShopSong[] }[] = []
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

  const headersList = await headers();
  const activeEventHeader = headersList.get('x-active-event');
  const activeEvent: PlatformEvent | null = activeEventHeader ? JSON.parse(activeEventHeader) : null;

  const signupSuccess =
    (typeof searchParams?.signup === 'string' && searchParams.signup === 'success') ||
    (Array.isArray(searchParams?.signup) && searchParams?.signup.includes('success'))

  return (
    <div className="w-full font-sans selection:bg-red-500/30">
      {signupSuccess && (
        <div className="mb-8 rounded-[2.5rem] bg-white/80 backdrop-blur-xl border border-slate-200 p-4 md:p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-[1.5rem] border-2 border-black bg-white flex items-center justify-center text-2xl">
              🤖
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500">AIVO STATUS</p>
              <p className="text-sm md:text-base font-black uppercase">
                Bewerbung erfolgreich eingereicht. Songs wurden hochgeladen.
              </p>
              <p className="text-xs text-slate-500">
                Du erhältst eine Nachricht, sobald dein Profil geprüft wurde.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* 1. HEADER MIT INTELLIGENTER SUCHE */}
      <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-black italic tracking-tighter uppercase">
          AIVOLUTION<span className="text-red-600">MUSIC</span>
        </h1>
        <div className="relative w-full max-w-2xl">
          <input 
            type="text" 
            placeholder="SUCHE: GENRE, CREATOR, TITEL, TOOL..."
            className="w-full rounded-full border border-slate-200 bg-white/80 px-8 py-4 font-mono text-sm backdrop-blur-md transition-all focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/10"
          />
        </div>
      </header>

      <main className="space-y-14">
        {/* OBERE KACHELN (MEDIA) */}
        <section>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {mediaSlots.slice(0, 4).map((slot) => (
              <HomepageMediaCard key={slot.id} slot={slot} />
            ))}
          </div>
        </section>

        {/* TOP TEN CREATOR TRACKS + AIVO */}
        <section>
          <div className="flex flex-col gap-2 mb-6">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-slate-400">
              // CREATOR TOP TEN TRACKS — KURATIERT VON AIVOLUTION
            </h2>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Klick auf Track führt zum Creator Store
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_3fr]">
            <AivoExplanerBox aivoSkinId={activeEvent?.aivo_skin_id || 'default'} />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {(topTen ?? []).slice(0, 10).map((song) => (
                <Link
                  key={song.id}
                  href={song.creator?.artist_name_slug ? `/creator/${song.creator.artist_name_slug}#song-${song.id}` : '#'}
                  className="group relative aspect-square rounded-[2.5rem] border-2 border-black bg-white/80 backdrop-blur-xl overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] transition-all"
                >
                  {song.cover_url ? (
                    <img src={song.cover_url} alt={song.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-4xl font-black text-zinc-300">🎵</div>
                  )}
                  <div className="absolute inset-0 flex flex-col justify-end p-2 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                    <div className="mb-2 h-10 w-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      ▶
                    </div>
                    <p className="text-[10px] font-black uppercase leading-tight text-white line-clamp-1">{song.title}</p>
                    <p className="text-[9px] font-bold text-white/80 line-clamp-1">{song.creator?.artist_name ?? '–'}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CREATOR STORE */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* CREATOR SHOP PREVIEW (Genre Zeilen) */}
          <div className="md:col-span-4 space-y-8">
            {genreSongs.length > 0 ? (
              genreSongs.map(({ genre, songs }) => (
                <div key={genre} className="flex flex-col gap-3">
                  <h3 className="font-black italic text-xl uppercase tracking-tighter">{genre}</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {songs.map((song) => (
                      <Link
                        key={song.id}
                        href={song.creator?.artist_name_slug ? `/creator/${song.creator.artist_name_slug}#song-${song.id}` : '#'}
                        className="min-w-[90px] h-24 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2rem] hover:border-red-500 transition-colors cursor-pointer relative overflow-hidden p-1 group"
                      >
                        <div className="h-full w-full rounded-[1.5rem] overflow-hidden relative">
                          {song.cover_url ? (
                            <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl font-black text-slate-300">🎵</div>
                          )}
                          <div className="absolute inset-0 flex flex-col justify-end p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                            <div className="h-8 w-8 bg-red-600 rounded-full flex items-center justify-center shadow-lg text-white mx-auto mb-1">▶</div>
                            <p className="text-[7px] font-black uppercase leading-tight line-clamp-1 text-white">{song.title}</p>
                            <p className="text-[6px] text-white/80 font-bold">{song.creator?.artist_name ?? '–'}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    <button className="min-w-[90px] h-24 bg-slate-100 rounded-[2rem] font-mono text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all">
                      [Mehr]
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-full text-sm text-slate-500 font-bold uppercase">Noch keine Genre-Songs.</p>
            )}
          </div>
        </section>

        {/* WERBEFLAECHEN UNTEN */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-[2.5rem] bg-slate-100 border-2 border-dashed border-slate-200 h-64 flex items-center justify-center text-slate-400 font-mono text-xs uppercase tracking-widest">
            Ad_Space_01
          </div>
          <div className="rounded-[2.5rem] bg-red-50 border border-red-100 h-64 flex items-center justify-center text-red-300 font-mono text-xs uppercase tracking-widest">
            Partner_Tool_Showcase
          </div>
        </section>
      </main>

      <footer className="mt-20 border-t border-slate-200 py-10 text-center">
        <button className="font-mono text-sm uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors mb-4">
          [ ENTDECKE ALLE GENRES & CREATOR — GESAMTÜBERSICHT ]
        </button>
        <FooterWithModal variant="home" />
      </footer>
    </div>
  );
}