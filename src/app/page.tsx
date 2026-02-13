import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: slots } = await supabase.from('promo_slots').select('*').order('slot_id')

  const highlight = slots?.find(s => s.slot_id === 5)

  // Fetch new Creators (approved, recently joined)
  const { data: newCreators } = await supabase
    .from('profiles')
    .select('id, artist_name, artist_name_slug, avatar_url, created_at')
    .eq('role', 'creator')
    .eq('onboarding_status', 'approved') // NUR freigeschaltete Creator!
    .order('created_at', { ascending: false })
    .limit(6)

  return (
    <div className="min-h-screen bg-zinc-50 text-black font-sans selection:bg-red-600 selection:text-white">
      
      <main className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-12">
        
        {/* SECTION 1: HAUPT-GRID */}
        <div className="grid grid-cols-12 gap-6 items-stretch">
          
          {/* LINKER BEREICH (75%) – schließt unten mit Highlight ab */}
          <div className="col-span-12 lg:col-span-9 flex flex-col gap-6 min-h-0 h-full">
            
            {/* 1. MEDIA BOXEN (Square für bessere YouTube/Bild-Kompatibilität) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((id) => {
                const slot = slots?.find(s => s.slot_id === id)
                return (
                  <div key={id} className="
                    aspect-square flex flex-col justify-between p-0
                    bg-white border-2 border-black rounded-lg 
                    transition-all duration-200 
                    hover:shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] hover:-translate-y-1
                    group relative overflow-hidden
                  ">
                    {/* Media Background */}
                    {slot?.media_type === 'image' && slot.media_url && (
                      <div className="absolute inset-0 z-0">
                        <img 
                          src={slot.media_url} 
                          alt={slot.title} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      </div>
                    )}
                    {slot?.media_type === 'youtube' && slot.youtube_id && (
                      <div className="absolute inset-0 z-0 overflow-hidden bg-black flex items-center justify-center">
                        {/* YouTube Embed mit Referrer Policy (Fehler 153 Fix) */}
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${slot.youtube_id}?rel=0&modestbranding=1`}
                          title={slot.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          className="w-full h-full"
                          style={{ minWidth: '100%', minHeight: '100%' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                      </div>
                    )}
                    {slot?.media_type === 'tiktok' && slot.tiktok_id && (
                      <div className="absolute inset-0 z-0 overflow-hidden bg-black flex items-center justify-center">
                        {/* TikTok Embed (TODO: Für Creator-Profile optimieren) */}
                        <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold p-4 text-center">
                          <div>
                            <p className="mb-2">🎵 TikTok Video</p>
                            <p className="text-[10px] opacity-60">TikTok-Embed wird für Creator-Profile optimiert</p>
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                      </div>
                    )}

                    {/* Text Overlay - pointer-events-none bei Video, damit klickbar */}
                    <div className={`relative z-10 p-6 flex flex-col justify-between h-full ${slot?.media_type === 'youtube' || slot?.media_type === 'tiktok' ? 'pointer-events-none' : ''}`}>
                      <div className={`opacity-20 text-[10px] font-black uppercase italic tracking-widest group-hover:text-red-600 transition-colors ${slot?.media_type && slot.media_type !== 'none' ? 'text-white' : ''}`}>
                        SLOT_0{id}
                      </div>
                      <div className="space-y-1">
                        <p className={`text-[9px] font-black uppercase italic leading-none ${slot?.media_type && slot.media_type !== 'none' ? 'text-red-400' : 'text-red-600'}`}>
                          {slot?.subtitle || "PLATFORM VISION"}
                        </p>
                        <h3 className={`text-xs font-black uppercase leading-tight tracking-tighter ${slot?.media_type && slot.media_type !== 'none' ? 'text-white drop-shadow-lg' : 'text-black'}`}>
                          {slot?.title || "Update Slot..."}
                        </h3>
                        {slot?.body_text && (
                          <p className={`text-[9px] leading-tight line-clamp-2 mt-1 ${slot?.media_type && slot.media_type !== 'none' ? 'text-white/90 drop-shadow' : 'text-gray-600'}`}>
                            {slot.body_text}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 2. NEUE CREATOR (schließt mit Highlight-Box nach unten ab) */}
            <div className="flex-1 min-h-[220px] flex flex-col border-2 border-black rounded-lg bg-white p-4">
              <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
                <h3 className="text-lg font-black uppercase italic tracking-tight">
                  Neue <span className="text-red-600">Creator</span>
                </h3>
                <Link 
                  href="/creator-signup"
                  className="text-[10px] font-bold uppercase tracking-wider text-red-600 hover:text-black transition-colors flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  Creator werden
                </Link>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 flex-1 content-start">
                {newCreators && newCreators.length > 0 ? (
                  newCreators.map((creator) => (
                    <Link 
                      key={creator.id} 
                      href={`/creator/${creator.artist_name_slug || creator.id}`}
                      className="group bg-white border-2 border-black rounded-[20px] p-2 flex flex-col items-center justify-center gap-1.5 hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] hover:-translate-y-0.5 transition-all cursor-pointer aspect-square"
                    >
                      {/* Avatar größer + roter Hover-Ring */}
                      <div className="w-14 h-14 bg-zinc-100 rounded-full border-2 border-black group-hover:border-red-600 overflow-hidden flex-shrink-0 transition-all">
                        {creator.avatar_url ? (
                          <img 
                            src={creator.avatar_url} 
                            alt={creator.artist_name} 
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-300" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl font-black text-zinc-300 group-hover:text-red-600 transition-colors">
                            {creator.artist_name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Name */}
                      <p className="font-black uppercase text-[9px] text-center leading-tight line-clamp-2 w-full px-1 group-hover:text-red-600 transition-colors">
                        {creator.artist_name}
                      </p>
                      {/* Datum */}
                      <p className="text-[7px] opacity-40 font-mono uppercase tracking-wider">
                        {new Date(creator.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-xs font-bold uppercase text-zinc-400 bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-lg">
                    Noch keine Creator – sei der erste!
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RECHTER BEREICH (25%) - HIGHLIGHT BOX */}
          <div className="col-span-12 lg:col-span-3 flex min-h-[400px] h-full">
            <div className="
              w-full h-full min-h-[400px] flex-1
              bg-white border-[3px] border-black rounded-xl
              flex flex-col justify-between p-8
              transition-all duration-300
              hover:shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] hover:-translate-y-1
              group relative overflow-hidden
            ">
              {/* Media Background für Highlight */}
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
                <div className="flex justify-between items-start">
                  <div className="bg-black text-white px-3 py-1 text-[9px] font-black uppercase italic w-fit rounded-sm group-hover:bg-red-600 transition-colors">
                    HIGHLIGHT
                  </div>
                  <div className="text-[10px] font-mono opacity-30">AD_SPACE</div>
                </div>
                
                <div className="mt-auto space-y-4">
                  <div className="w-full h-[1px] bg-black/10 group-hover:bg-red-600/50 transition-colors" />
                  <h4 className={`text-4xl font-black uppercase italic leading-none tracking-tighter group-hover:scale-105 transition-transform origin-left ${highlight?.media_type && highlight.media_type !== 'none' ? 'text-white drop-shadow-lg' : ''}`}>
                    {highlight?.title || "AUDIO CORE"}
                  </h4>
                  <p className={`text-[10px] font-bold uppercase tracking-widest leading-none ${highlight?.media_type && highlight.media_type !== 'none' ? 'text-white/90' : 'opacity-50'}`}>
                    {highlight?.subtitle || "Technologische Einblicke."}
                  </p>
                  {highlight?.body_text && (
                    <p className={`text-xs font-medium leading-relaxed ${highlight?.media_type && highlight.media_type !== 'none' ? 'text-white/90' : 'text-gray-600'}`}>
                      {highlight.body_text}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  )
}
