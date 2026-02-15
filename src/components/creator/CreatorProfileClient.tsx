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
  videoLinks: string[]
  getYouTubeEmbed: (input: string) => string | null
  getTikTokEmbed: (input: string) => string | null
}

export default function CreatorProfileClient({
  creator,
  songs,
  isCreatorOwner,
  socials,
  socialIcons,
  videoLinks,
  getYouTubeEmbed,
  getTikTokEmbed
}: CreatorProfileClientProps) {
  const [isBioModalOpen, setIsBioModalOpen] = useState(false)
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)

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
        <div className="bg-white border-b-2 border-black">
          <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
            
            {/* Top: Name + Edit Button */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">
                {creator.artist_name}
              </h1>
              {isCreatorOwner && (
                <button
                  onClick={() => setIsEditPanelOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-sm rounded-[1.5rem] transition-colors"
                >
                  <Edit size={18} />
                  EDIT
                </button>
              )}
            </div>

            {/* Center: Avatar + Thumbnails */}
            <div className="flex items-center justify-center gap-6 md:gap-8 mb-8">
              
              {/* Left Thumbnails */}
              {featuredSongs[0] && (
                <ThumbnailCircle
                  imageUrl={featuredSongs[0].cover_url}
                  label={featuredSongs[0].title}
                  size="md"
                  onClick={() => console.log('Play song:', featuredSongs[0])}
                />
              )}
              {videoLinks[0] && (
                <ThumbnailCircle
                  icon={<Video size={32} />}
                  label="Video 1"
                  size="sm"
                  onClick={() => setSelectedVideo(videoLinks[0])}
                />
              )}

              {/* Main Avatar (Click for Bio) */}
              <button
                onClick={() => setIsBioModalOpen(true)}
                className="relative group"
              >
                <div className="w-44 h-44 md:w-56 md:h-56 rounded-full border-4 border-black shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] overflow-hidden bg-zinc-100 transition-all duration-200 hover:shadow-[16px_16px_0px_0px_rgba(220,38,38,1)] hover:scale-105">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt={creator.artist_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-8xl font-black text-zinc-300">
                      {creator.artist_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all">
                    <span className="text-white font-black uppercase text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      BIO LESEN
                    </span>
                  </div>
                </div>
              </button>

              {/* Right Thumbnails */}
              {videoLinks[1] && (
                <ThumbnailCircle
                  icon={<Video size={32} />}
                  label="Video 2"
                  size="sm"
                  onClick={() => setSelectedVideo(videoLinks[1])}
                />
              )}
              {featuredSongs[1] && (
                <ThumbnailCircle
                  imageUrl={featuredSongs[1].cover_url}
                  label={featuredSongs[1].title}
                  size="md"
                  onClick={() => console.log('Play song:', featuredSongs[1])}
                />
              )}

            </div>

            {/* Tech Stack */}
            {creator.tech_stack && creator.tech_stack.length > 0 && (
              <div className="flex justify-center flex-wrap gap-2 mb-6">
                {creator.tech_stack.map((tech: string) => (
                  <span key={tech} className="text-xs font-bold uppercase px-4 py-2 bg-red-600 text-white rounded-full">
                    {tech}
                  </span>
                ))}
              </div>
            )}

            {/* Social Links */}
            {Object.keys(socials).filter(k => socials[k] && k !== 'video_1' && k !== 'video_2').length > 0 && (
              <div className="flex justify-center flex-wrap gap-3">
                {Object.keys(socials).filter(k => socials[k] && k !== 'video_1' && k !== 'video_2').map((key) => (
                  <a
                    key={key}
                    href={socials[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors text-xs font-bold uppercase rounded-full"
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

        {/* MUSIC SHOP */}
        {shopSongs.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 py-12">
            
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                <span>MUSIC SHOP</span>
                <span className="text-red-600">{shopSongs.length}</span>
              </h2>
            </div>

            {/* Compact Grid: 4-5 per row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
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
