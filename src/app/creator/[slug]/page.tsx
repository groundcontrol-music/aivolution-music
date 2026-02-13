import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { Disc3, ExternalLink, Zap, Eye } from 'lucide-react'
import Link from 'next/link'
import ShopSongCard from '@/components/creator/ShopSongCard'
import CreatorMiniForum from '@/components/creator/CreatorMiniForum'

export default async function CreatorProfilePage({ params }: { params: { slug: string } }) {
  const supabase = await createClient()
  
  // Fetch Creator Profile by slug (artist_name_slug)
  const { data: creator, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('artist_name_slug', params.slug)
    .eq('role', 'creator')
    .single()

  if (error || !creator) {
    notFound()
  }

  // Fetch Songs
  const { data: songs } = await supabase
    .from('songs')
    .select('*')
    .eq('user_id', creator.id)
    .eq('is_probe', false)
    .order('created_at', { ascending: false })

  // Check if current user is the creator owner
  const { data: { user } } = await supabase.auth.getUser()
  const isCreatorOwner = user?.id === creator.id

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

        {/* Creator Mini-Forum */}
        <CreatorMiniForum creatorId={creator.id} isCreatorOwner={isCreatorOwner} />

      </div>
    </div>
  )
}
