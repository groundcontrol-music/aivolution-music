'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Edit, ExternalLink, ImagePlus, Loader2, Video } from 'lucide-react'
import BioModal from '@/components/modals/BioModal'
import ThumbnailCircle from './ThumbnailCircle'
import CompactSongCard from './CompactSongCard'

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
  const supabase = createClient()
  const [isBioModalOpen, setIsBioModalOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const [socialState, setSocialState] = useState<any>(socials || {})
  const [bannerPreview, setBannerPreview] = useState('')
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingImpressum, setUploadingImpressum] = useState(false)
  const bannerInputRef = useRef<HTMLInputElement | null>(null)
  const impressumInputRef = useRef<HTMLInputElement | null>(null)
  const bannerImageUrl =
    bannerPreview ||
    creator.banner_url ||
    creator.banner_image_url ||
    creator.header_image_url ||
    creator.cover_image_url ||
    socialState?._banner_url ||
    ''
  const creatorSlug =
    creator.artist_name_slug ||
    (creator.artist_name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

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
  const videoLinks = [socialState.video_1, socialState.video_2].filter(Boolean)

  // Get featured content (first 3 songs for thumbnails)
  const featuredSongs = songs.slice(0, 3)
  
  // Get shop songs (not probe)
  const shopSongs = songs.filter(s => !s.is_probe)

  const readImageDimensions = (file: File) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.width, height: img.height })
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })

  const tryUpdateBannerOnProfile = async (url: string) => {
    const profileColumns = ['banner_url', 'banner_image_url', 'header_image_url', 'cover_image_url']

    for (const column of profileColumns) {
      const { error } = await supabase
        .from('profiles')
        .update({ [column]: url } as any)
        .eq('id', creator.id)

      if (!error) return
      if (!String(error?.message || '').toLowerCase().includes('column')) {
        throw error
      }
    }

    const nextSocials = { ...(socialState || {}), _banner_url: url }
    const { error: fallbackError } = await supabase
      .from('profiles')
      .update({ social_links: nextSocials } as any)
      .eq('id', creator.id)

    if (fallbackError) throw fallbackError
    setSocialState(nextSocials)
  }

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Nur JPG, PNG oder WEBP sind erlaubt.')
      return
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('Banner zu groß (max. 3 MB).')
      return
    }

    try {
      const dims = await readImageDimensions(file)
      if (dims.width < 1200 || dims.height < 300) {
        alert('Banner zu klein. Bitte mindestens 1200x300 Pixel verwenden.')
        return
      }

      setUploadingBanner(true)
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const filePath = `${creator.id}/banner.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = publicData.publicUrl

      await tryUpdateBannerOnProfile(publicUrl)
      setBannerPreview(publicUrl)
      alert('Banner erfolgreich gespeichert.')
    } catch (error: any) {
      const msg = error?.message || 'Unbekannter Fehler'
      alert(`Banner-Upload fehlgeschlagen: ${msg}`)
    } finally {
      setUploadingBanner(false)
      if (bannerInputRef.current) bannerInputRef.current.value = ''
    }
  }

  const handleImpressumImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Nur JPG, PNG oder WEBP sind erlaubt.')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      alert('Datei zu groß (max. 3 MB).')
      return
    }

    try {
      setUploadingImpressum(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/creator/impressum', {
        method: 'POST',
        body: formData,
      })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json?.error || 'Upload fehlgeschlagen')
      }
      alert('Creator-Impressum erfolgreich gespeichert.')
    } catch (error: any) {
      alert(`Creator-Impressum Upload fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      setUploadingImpressum(false)
      if (impressumInputRef.current) impressumInputRef.current.value = ''
    }
  }

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

      <div className="min-h-screen bg-zinc-50 py-6 md:py-8">
        <div className="max-w-6xl mx-auto px-3 md:px-4">
          <div className="bg-white border-2 border-black rounded-[2.5rem] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        
        {/* HERO SECTION */}
        <div className="bg-white border-b-2 border-black relative overflow-visible">
          {bannerImageUrl && (
            <>
              <img
                src={bannerImageUrl}
                alt={`${creator.artist_name} Banner`}
                className="absolute inset-0 w-full h-full object-cover opacity-20"
              />
              <div className="absolute inset-0 bg-white/70" />
            </>
          )}
          <div className="px-4 md:px-6 py-6 md:py-8 relative z-10">
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
              
              {/* LEFT: Avatar + Small Thumbnails */}
              <div className="flex-shrink-0">
                {/* Main Avatar */}
                <div className="w-40 h-40 md:w-52 md:h-52 rounded-full border-4 border-black shadow-[10px_10px_0px_0px_rgba(220,38,38,1)] overflow-hidden bg-zinc-100 mb-4">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt={creator.artist_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-7xl font-black text-zinc-300">
                      {creator.artist_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* 4 Small Round Thumbnails + Social Links darunter */}
                <div className="flex flex-col items-center gap-4">
                  
                  {/* Thumbnails Row */}
                  <div className="flex justify-center gap-2">
                    
                    {/* Secret Lounge - Zugang wird in der Lounge selbst streng geprüft */}
                    <button
                      onClick={() => {
                        const slug =
                          creator.artist_name_slug ||
                          (creator.artist_name || '')
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '')
                        if (!slug) return
                        window.location.href = `/creator/${slug}/secret-lounge`
                      }}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-black bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transform"
                      title="Secret Lounge (18+)"
                    >
                      🔒
                    </button>

                    {/* Thumbnail 1: Featured (editierbar) */}
                    <ThumbnailCircle
                      imageUrl={featuredSongs[0]?.cover_url}
                      fallbackIcon="🎵"
                      onClick={() => {}}
                      title={featuredSongs[0]?.title || 'Featured'}
                    />

                    {/* Thumbnail 2: Featured (editierbar) */}
                    <ThumbnailCircle
                      imageUrl={featuredSongs[1]?.cover_url}
                      fallbackIcon="🎵"
                      onClick={() => {}}
                      title={featuredSongs[1]?.title || 'Featured'}
                    />

                    {/* Thumbnail 3: Featured (editierbar) */}
                    <ThumbnailCircle
                      imageUrl={featuredSongs[2]?.cover_url}
                      fallbackIcon="📸"
                      onClick={() => {}}
                      title={featuredSongs[2]?.title || 'Featured'}
                    />

                  </div>

                  {/* Social Links (mittig unter Thumbnails) */}
                  {Object.keys(socialState).filter(k => socialState[k] && k !== 'video_1' && k !== 'video_2' && !k.startsWith('_')).length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {Object.keys(socialState).filter(k => socialState[k] && k !== 'video_1' && k !== 'video_2' && !k.startsWith('_')).map((key) => (
                        <a
                          key={key}
                          href={socialState[key]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full border-2 border-black bg-white hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors flex items-center justify-center text-lg"
                          title={key}
                        >
                          <span>{socialIcons[key] || '🔗'}</span>
                        </a>
                      ))}
                    </div>
                  )}

                </div>
              </div>

              {/* RIGHT: Info + Aivo */}
              <div className="flex-1 min-w-0 relative">
                
                {/* Name + Small Edit Icon */}
                <div className="flex items-start gap-4 mb-4">
                  <div>
                    <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none mb-2">
                      {creator.artist_name}
                    </h1>
                    <p className="text-sm font-bold uppercase tracking-wider text-red-600">
                      AI MUSIC CREATOR
                    </p>
                  </div>
                  {isCreatorOwner && (
                    <div className="flex flex-col items-start gap-2">
                      <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsBioModalOpen(true)}
                        className="flex-shrink-0 w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors flex items-center justify-center"
                        title="Profil bearbeiten"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => bannerInputRef.current?.click()}
                        className="h-10 px-3 bg-black hover:bg-zinc-800 text-white rounded-full transition-colors flex items-center gap-2 text-xs font-bold uppercase"
                        title="Bannerbild hochladen (max 3 MB)"
                        disabled={uploadingBanner}
                      >
                        {uploadingBanner ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                        Banner
                      </button>
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleBannerChange}
                      />
                      </div>
                      <p className="text-[11px] font-medium text-zinc-600">
                        Banner: empfohlen 1600x500, JPG/PNG/WEBP, max. 3 MB
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Tech Stack */}
                {creator.tech_stack && creator.tech_stack.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {creator.tech_stack.map((tech: string) => (
                      <span key={tech} className="text-xs font-bold uppercase px-3 py-1 bg-red-600 text-white rounded-full">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

              </div>

            </div>

            {/* AIVO ROBOT - rechts unten an der Bannerlinie, ~50% Bannerhöhe */}
            <div className="absolute bottom-0 right-3 md:right-6 h-[120px] md:h-[170px] w-auto pointer-events-none">
              <img 
                src="/aivo-robot.png" 
                alt="Aivo Assistant" 
                className="h-full w-auto object-contain object-bottom drop-shadow-lg"
              />
            </div>

          </div>
        </div>

        {/* BIO + THE LAB (Two Column) */}
        <div className="px-4 md:px-6 py-7 md:py-10">
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

            {/* RIGHT: THE SHOW (YouTube/TikTok Media) */}
            <div className="bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4 text-red-600">
                // THE SHOW
              </h2>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {videoLinks.length > 0 ? (
                  videoLinks.map((videoUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedVideo(videoUrl)}
                      className="w-full bg-zinc-50 border-2 border-black rounded-[1.5rem] p-4 hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg border-2 border-black bg-red-600 flex-shrink-0 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                          <Video size={28} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-bold text-sm uppercase text-gray-900">
                            {getYouTubeEmbed(videoUrl) ? '▶️ YouTube Video' : '🎬 TikTok Video'}
                          </p>
                          <p className="text-xs text-gray-600">Klicken zum Abspielen</p>
                        </div>
                        <ExternalLink size={20} className="text-red-600" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Video size={48} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Keine Videos vorhanden</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* MUSIC SHOP */}
        {shopSongs.length > 0 && (
          <div className="px-4 md:px-6 py-7 md:py-10">
            
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

        {/* CREATOR IMPRESSUM HINWEIS */}
        <div className="px-4 md:px-6 pb-8 md:pb-10">
          <div className="bg-zinc-50 border-2 border-black rounded-[2rem] p-4 md:p-5">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tighter">
                Creator Impressum
              </h3>
              {isCreatorOwner && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => impressumInputRef.current?.click()}
                    className="h-9 px-3 bg-black hover:bg-zinc-800 text-white rounded-full transition-colors flex items-center gap-2 text-xs font-bold uppercase"
                    disabled={uploadingImpressum}
                    title="Impressum-Bild hochladen (max 3 MB)"
                  >
                    {uploadingImpressum ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                    Impressum hochladen
                  </button>
                  <input
                    ref={impressumInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImpressumImageChange}
                  />
                </div>
              )}
            </div>
            <p className="text-sm md:text-base text-zinc-700">
              Rechtliche Angaben dieses Creators erreichst du im Impressums-Bereich.
              {creatorSlug ? (
                <>
                  {' '}
                  Direkter Link:{' '}
                  <a
                    href={`/impressum/${creatorSlug}`}
                    className="font-bold underline underline-offset-4 hover:text-red-600 transition-colors"
                  >
                    /impressum/{creatorSlug}
                  </a>
                </>
              ) : (
                ' Der personalisierte Link wird automatisch ergänzt, sobald der Slug gesetzt ist.'
              )}
            </p>
            <p className="text-[11px] text-zinc-500 mt-2">
              Schutz: private Speicherung in der Datenbank/Storage, öffentliche Anzeige nur über geschützte Auslieferung.
            </p>
          </div>
        </div>

          </div>
        </div>

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
