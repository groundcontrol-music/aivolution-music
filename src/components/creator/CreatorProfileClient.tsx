'use client'

import { useState } from 'react'
import { Edit, ExternalLink, Play, Video } from 'lucide-react'
import BioModal from '@/components/modals/BioModal'
import ThumbnailCircle from './ThumbnailCircle'
import CompactSongCard from './CompactSongCard'
import CreatorLiveEditPanel from './CreatorLiveEditPanel'

type CreatorProfileClientProps = {
  creator: any
  songs: any[]
  isCreatorOwner: boolean
  socials: any
  socialIcons: any
}

export default function CreatorProfileClient({
  creator,
  songs,
  isCreatorOwner,
  socials,
  socialIcons
}: CreatorProfileClientProps) {
  const [isBioModalOpen, setIsBioModalOpen] = useState(false)
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)

  // Helper functions (moved from server component)
  const getYouTubeEmbed = (input: string) => {
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    const match = input?.match(regex)
    return match ? `https://www.youtube.com/embed/${match[1]}` : null
  }

  const getTikTokEmbed = (input: string) => {
    const match = input?.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/)
    return match ? `https://www.tiktok.com/embed/v2/${match[1]}` : null
  }

  // Get video links from socials
  const videoLinks = [socials.video_1, socials.video_2].filter(Boolean)

  // Get featured content (first 3 songs for thumbnails)
  const featuredSongs = songs.slice(0, 3)
  
  // Get shop songs (not probe)
  const shopSongs = songs.filter(s => !s.is_probe)

  return (
    <>
      {/* BIO MODAL */}
      <BioModal
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
        artistName={creator.artist_name}
        bio={creator.bio}
        avatarUrl={creator.avatar_url}
      />

      {/* EDIT PANEL (nur für Owner) */}
      {isCreatorOwner && (
        <CreatorLiveEditPanel 
          isOpen={isEditPanelOpen}
          onClose={() => setIsEditPanelOpen(false)}
          creatorId={creator.id}
          initialData={{
            bio: creator.bio,
            tech_stack: creator.tech_stack,
            social_links: socials,
            avatar_url: creator.avatar_url
          }}
        />
      )}

      <div className="min-h-screen bg-zinc-50">
        
        {/* HERO SECTION */}
        <div className="bg-white border-b-4 border-black">
          <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
              
              {/* LEFT: Avatar */}
              <div className="flex-shrink-0">
                <div className="w-48 h-48 md:w-64 md:h-64 rounded-full border-4 border-black shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] overflow-hidden bg-zinc-100">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt={creator.artist_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-8xl font-black text-zinc-300">
                      {creator.artist_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Info + Social */}
              <div className="flex-1 min-w-0">
                
                {/* Name + Edit Button */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-2">
                      {creator.artist_name}
                    </h1>
                    <p className="text-sm font-bold uppercase tracking-wider text-red-600">
                      BEAT ARTIST
                    </p>
                  </div>
                  {isCreatorOwner && (
                    <button
                      onClick={() => setIsEditPanelOpen(true)}
                      className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs rounded-full transition-colors"
                    >
                      <Edit size={16} />
                      EDIT
                    </button>
                  )}
                </div>
                {/* Tech Stack */}
                {creator.tech_stack && creator.tech_stack.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {creator.tech_stack.map((tech: string) => (
                      <span key={tech} className="text-xs font-bold uppercase px-3 py-1 bg-red-600 text-white rounded-full">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {/* Social Links */}
                {Object.keys(socials).filter(k => socials[k] && k !== 'video_1' && k !== 'video_2').length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(socials).filter(k => socials[k] && k !== 'video_1' && k !== 'video_2').map((key) => (
                      <a
                        key={key}
                        href={socials[key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-full border-2 border-black bg-white hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors flex items-center justify-center text-xl"
                        title={key}
                      >
                        <span>{socialIcons[key] || '🔗'}</span>
                      </a>
                    ))}
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>

        {/* BIO + THE LAB (Two Column) */}
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* LEFT: BIO */}
            <div className="bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4 flex items-center gap-2">
                BIO
                {isCreatorOwner && (
                  <button
                    onClick={() => setIsBioModalOpen(true)}
                    className="text-xs px-3 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors"
                  >
                    ✏️ Edit
                  </button>
                )}
              </h2>
              <div className="text-base leading-relaxed text-gray-700 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <p className="whitespace-pre-line">
                  {creator.bio || 'Keine Bio vorhanden.'}
                </p>
              </div>
            </div>

            {/* RIGHT: THE LAB (Featured Songs) */}
            <div className="bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4 text-red-600">
                // THE LAB
              </h2>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {featuredSongs.slice(0, 3).map((song) => (
                  <div 
                    key={song.id}
                    className="bg-zinc-50 border-2 border-black rounded-[1.5rem] p-4 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                    onClick={() => {
                      const { play } = require('@/contexts/PlayerContext')
                      // Play song
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg border-2 border-black bg-zinc-200 flex-shrink-0 overflow-hidden">
                        {song.cover_url ? (
                          <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">🎵</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm uppercase truncate">{song.title}</p>
                        <p className="text-xs text-gray-600">WAV • {song.duration || '3:45'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-red-600">€{(song.price || 2.99).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* MUSIC SHOP */}
        {shopSongs.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">
                MUSIC SHOP 
                <span className="text-red-600 ml-3">({shopSongs.length})</span>
              </h2>
            </div>

            {/* Compact Grid: 4-5 per row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {shopSongs.map((song) => (
                <CompactSongCard
                  key={song.id}
                  songId={song.id}
                  title={song.title}
                  artist={creator.artist_name}
                  price={song.price || 2.99}
                  coverUrl={song.cover_url}
                  previewUrl={song.mp3_preview_url || song.wav_url || song.file_url}
                  onBuy={() => console.log('Buy:', song.id)}
                />
              ))}
            </div>

          </div>
        )}

        {/* VIDEO MODAL */}
        {selectedVideo && (
          <>
            <div 
              className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
              onClick={() => setSelectedVideo(null)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-4xl px-4">
              <div className="bg-white border-4 border-black rounded-[2.5rem] overflow-hidden">
                <div className="aspect-video">
                  {getYouTubeEmbed(selectedVideo) ? (
                    <iframe
                      src={getYouTubeEmbed(selectedVideo)!}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : getTikTokEmbed(selectedVideo) ? (
                    <iframe
                      src={getTikTokEmbed(selectedVideo)!}
                      className="w-full h-full"
                      allow="encrypted-media;"
                      allowFullScreen
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </>
  )
}
