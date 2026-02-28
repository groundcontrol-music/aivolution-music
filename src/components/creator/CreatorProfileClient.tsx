'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Edit, ExternalLink, ImagePlus, Loader2, Video } from 'lucide-react'
import BioModal from '@/components/modals/BioModal'
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
  const [selectedSong, setSelectedSong] = useState<any | null>(null)
  const [songNoteDraft, setSongNoteDraft] = useState('')
  const [savingSongNote, setSavingSongNote] = useState(false)
  const [socialState, setSocialState] = useState<any>(socials || {})
  const [bioDraft, setBioDraft] = useState(creator.bio || '')
  const [savingBio, setSavingBio] = useState(false)
  const [bannerPreview, setBannerPreview] = useState('')
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingThumb, setUploadingThumb] = useState<number | null>(null)
  const [showImpressumEditor, setShowImpressumEditor] = useState(false)
  const [savingImpressum, setSavingImpressum] = useState(false)
  const [shopSearch, setShopSearch] = useState('')
  const [shopTypeFilter, setShopTypeFilter] = useState<'all' | 'single' | 'ep' | 'album'>('all')
  const [impressumForm, setImpressumForm] = useState({
    legal_name: '',
    street: '',
    zip_city: '',
    country: 'Deutschland',
    email: '',
    phone: '',
    website: '',
  })
  const bannerInputRef = useRef<HTMLInputElement | null>(null)
  const thumbInputRefs = useRef<(HTMLInputElement | null)[]>([])
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
  const creatorImpressumLink = creatorSlug ? `/impressum/${creatorSlug}` : '/impressum'
  const shareLink = creatorImpressumLink
  const songNotes = (socialState?._song_notes && typeof socialState._song_notes === 'object')
    ? socialState._song_notes
    : {}

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

  const videoSlots = [socialState.video_1 || '', socialState.video_2 || '']

  // Get featured content (fallback for thumbnails)
  const featuredSongs = songs.slice(0, 3)
  
  // Get shop songs (not probe)
  const shopSongs = songs.filter(s => !s.is_probe)
  const filteredShopSongs = useMemo(() => {
    const query = shopSearch.trim().toLowerCase()
    return shopSongs.filter((song) => {
      const title = String(song.title || '').toLowerCase()
      const type = String(song.release_type || song.type || 'single').toLowerCase()
      const matchesQuery = !query || title.includes(query)
      const matchesType = shopTypeFilter === 'all' || type === shopTypeFilter
      return matchesQuery && matchesType
    })
  }, [shopSongs, shopSearch, shopTypeFilter])

  const readImageDimensions = (file: File) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.width, height: img.height })
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })

  const upsertSocialLinks = async (patch: Record<string, any>) => {
    const nextSocials = { ...(socialState || {}), ...patch }
    const { error } = await supabase
      .from('profiles')
      .update({ social_links: nextSocials } as any)
      .eq('id', creator.id)
    if (error) throw error
    setSocialState(nextSocials)
  }

  const containsBlockedWords = (value: string) => {
    const blocked = ['nazi', 'hitler', 'terror', 'isis', 'vergewaltigung', 'kinderporn', 'genozid']
    const normalized = value.toLowerCase()
    return blocked.some((w) => normalized.includes(w))
  }

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

  const handleSaveImpressumFromData = async () => {
    if (!impressumForm.legal_name || !impressumForm.street || !impressumForm.zip_city) {
      alert('Bitte mindestens Name, Straße und PLZ/Ort eintragen.')
      return
    }
    try {
      setSavingImpressum(true)
      const response = await fetch('/api/creator/impressum/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(impressumForm),
      })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json?.error || 'Speichern fehlgeschlagen')
      }
      alert('Creator-Impressum gespeichert und Bild erzeugt.')
      setShowImpressumEditor(false)
    } catch (error: any) {
      alert(`Creator-Impressum Speichern fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      setSavingImpressum(false)
    }
  }

  const handleSaveBio = async () => {
    try {
      setSavingBio(true)
      const { error } = await supabase
        .from('profiles')
        .update({ bio: bioDraft } as any)
        .eq('id', creator.id)
      if (error) throw error
      alert('Bio gespeichert.')
    } catch (error: any) {
      alert(`Bio speichern fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      setSavingBio(false)
    }
  }

  const handleThumbUpload = async (slot: 1 | 2 | 3, file?: File) => {
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Nur JPG, PNG oder WEBP sind erlaubt.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Bild zu groß (max. 2 MB).')
      return
    }
    try {
      const dims = await readImageDimensions(file)
      if (dims.width < 300 || dims.height < 300) {
        alert('Bild zu klein. Bitte mindestens 300x300 Pixel verwenden.')
        return
      }
      setUploadingThumb(slot)
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const filePath = `${creator.id}/thumb-${slot}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      await upsertSocialLinks({ [`_thumb_${slot}_url`]: publicData.publicUrl })
    } catch (error: any) {
      alert(`Thumbnail speichern fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      setUploadingThumb(null)
      if (thumbInputRefs.current[slot]) thumbInputRefs.current[slot]!.value = ''
    }
  }

  const getVideoTypeLabel = (url: string) => {
    if (getYouTubeEmbed(url)) return 'YouTube'
    if (getTikTokEmbed(url)) return 'TikTok'
    if (/suno\.com/i.test(url || '')) return 'Suno'
    return 'Extern'
  }

  const handleEditVideoSlot = async (slot: 1 | 2) => {
    const current = socialState[`video_${slot}`] || ''
    const next = window.prompt(`Video-Link für Slot ${slot} (TikTok/YouTube/Suno):`, current)
    if (next === null) return
    const trimmed = next.trim()
    try {
      await upsertSocialLinks({ [`video_${slot}`]: trimmed || null })
      alert(`Video-Slot ${slot} gespeichert.`)
    } catch (error: any) {
      alert(`Video-Slot ${slot} speichern fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    }
  }

  const openSongDetail = (song: any) => {
    setSelectedSong(song)
    setSongNoteDraft(songNotes[song.id] || '')
  }

  const handleSaveSongNote = async () => {
    if (!selectedSong) return
    const cleaned = songNoteDraft.trim()
    if (cleaned.length > 1200) {
      alert('Text zu lang (max. 1200 Zeichen).')
      return
    }
    if (containsBlockedWords(cleaned)) {
      alert('Der Text enthält gesperrte Begriffe und konnte nicht gespeichert werden.')
      return
    }
    try {
      setSavingSongNote(true)
      const nextNotes = { ...songNotes, [selectedSong.id]: cleaned }
      await upsertSocialLinks({ _song_notes: nextNotes })
      alert('Song-Info gespeichert.')
    } catch (error: any) {
      alert(`Song-Info speichern fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      setSavingSongNote(false)
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
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-black/10" />
            </>
          )}
          <div className="px-4 md:px-6 py-6 md:py-8 relative z-10">
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
              
              {/* LEFT: Avatar + Small Thumbnails */}
              <div className="flex-shrink-0">
                {/* Main Avatar */}
                <div className="w-40 h-40 md:w-52 md:h-52 rounded-[2.5rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(220,38,38,1)] overflow-hidden bg-zinc-100 mb-4">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt={creator.artist_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-7xl font-black text-zinc-300">
                      {creator.artist_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* 4 Small Buttons + Social Links darunter */}
                <div className="flex flex-col items-center gap-4">
                  
                  {/* Buttons Row */}
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
                      className="w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] border-2 border-black bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transform"
                      title="Secret Lounge (18+)"
                    >
                      🔒
                    </button>

                    {[1, 2, 3].map((slot, idx) => {
                      const imageUrl = socialState[`_thumb_${slot}_url`] || featuredSongs[idx]?.cover_url || ''
                      return (
                        <button
                          key={slot}
                          onClick={() => isCreatorOwner && thumbInputRefs.current[slot]?.click()}
                          className="w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] border-2 border-black bg-white overflow-hidden hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] transition-all relative"
                          title={isCreatorOwner ? `Bild ${slot} bearbeiten` : `Featured ${slot}`}
                        >
                          {imageUrl ? (
                            <img src={imageUrl} alt={`Featured ${slot}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl bg-zinc-100">
                              {uploadingThumb === slot ? <Loader2 size={18} className="animate-spin" /> : '📷'}
                            </div>
                          )}
                          {isCreatorOwner && (
                            <input
                              ref={(el) => {
                                thumbInputRefs.current[slot] = el
                              }}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => handleThumbUpload(slot as 1 | 2 | 3, e.target.files?.[0])}
                            />
                          )}
                        </button>
                      )
                    })}

                  </div>
                  {isCreatorOwner && (
                    <p className="text-[11px] font-medium text-zinc-600 text-center">
                      Featured-Bilder: empfohlen 600x600, JPG/PNG/WEBP, max. 2 MB
                    </p>
                  )}

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

          </div>
        </div>

        {/* BIO + THE SHOW (Independent Boxes) */}
        <div className="px-4 md:px-6 py-7 md:py-10">
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* LEFT: BIO */}
            <div className="relative bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-8">
              <div className="absolute left-1/2 -translate-x-1/2 -top-4 bg-white px-4 py-1 border-2 border-black rounded-full text-sm font-black uppercase tracking-wide">
                BIO
              </div>
              {isCreatorOwner && (
                <button
                  onClick={handleSaveBio}
                  className="absolute top-4 right-4 text-[11px] px-3 py-1 border-2 border-black rounded-full hover:bg-black hover:text-white transition-colors"
                  disabled={savingBio}
                >
                  {savingBio ? 'Speichern...' : 'Speichern'}
                </button>
              )}
              <div className="text-base leading-relaxed text-gray-700 max-h-[400px] overflow-y-auto pt-4 pr-2 custom-scrollbar">
                {isCreatorOwner ? (
                  <textarea
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                    placeholder="Deine Bio..."
                    className="w-full min-h-[220px] bg-transparent p-0 text-base leading-relaxed resize-y focus:outline-none border-0"
                  />
                ) : (
                  <p className="whitespace-pre-line">
                    {bioDraft || 'Keine Bio vorhanden.'}
                  </p>
                )}
              </div>
            </div>

            {videoSlots.map((videoUrl, idx) => {
              const slot = (idx + 1) as 1 | 2
              const ytEmbed = getYouTubeEmbed(videoUrl)
              const ttEmbed = getTikTokEmbed(videoUrl)
              return (
                <div key={slot} className="relative bg-white border-2 border-black rounded-[2.5rem] overflow-hidden min-h-[320px] md:min-h-[400px]">
                  <div className="absolute left-1/2 -translate-x-1/2 -top-4 bg-white px-4 py-1 border-2 border-black rounded-full text-sm font-black uppercase tracking-wide">
                    {slot === 1 ? 'THE SHOW' : 'VIDEO 2'}
                  </div>
                  {isCreatorOwner && (
                    <button
                      onClick={() => handleEditVideoSlot(slot)}
                      className="absolute top-4 right-4 z-20 text-[11px] px-3 py-1 border-2 border-black rounded-full bg-white hover:bg-black hover:text-white transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  <div className="absolute inset-0">
                    {videoUrl ? (
                      ytEmbed ? (
                        <iframe
                          src={ytEmbed}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : ttEmbed ? (
                        <iframe
                          src={ttEmbed}
                          className="w-full h-full"
                          allow="encrypted-media;"
                          allowFullScreen
                        />
                      ) : (
                        <button
                          onClick={() => setSelectedVideo(videoUrl)}
                          className="w-full h-full bg-zinc-100 hover:bg-zinc-200 transition-colors flex items-center justify-center"
                        >
                          <div className="flex items-center gap-2 text-sm font-black uppercase">
                            <span>{getVideoTypeLabel(videoUrl)} öffnen</span>
                            <ExternalLink size={16} />
                          </div>
                        </button>
                      )
                    ) : (
                      <div className="w-full h-full border-2 border-dashed border-zinc-300 flex items-center justify-center text-xs text-zinc-500 bg-zinc-50">
                        Keine URL hinterlegt
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

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

            <div className="mb-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              <input
                type="text"
                value={shopSearch}
                onChange={(e) => setShopSearch(e.target.value)}
                placeholder="Suche nach Titel..."
                className="w-full md:w-72 border-2 border-black rounded-full px-4 py-2 text-sm focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'single', label: 'Single' },
                  { id: 'ep', label: 'EP' },
                  { id: 'album', label: 'Album' },
                ].map((item) => {
                  const active = shopTypeFilter === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setShopTypeFilter(item.id as 'single' | 'ep' | 'album')}
                      className={`text-[11px] px-3 py-1 border-2 border-black rounded-full transition-colors ${
                        active ? 'bg-black text-white' : 'hover:bg-black hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
                <button
                  onClick={() => setShopTypeFilter('all')}
                  className={`text-[11px] px-3 py-1 border-2 border-black rounded-full transition-colors ${
                    shopTypeFilter === 'all' ? 'bg-black text-white' : 'hover:bg-black hover:text-white'
                  }`}
                >
                  Alle
                </button>
              </div>
            </div>

            {/* Compact Grid: 4-5 per row */}
            <div className="flex flex-wrap gap-3 md:gap-4">
              {filteredShopSongs.map((song) => (
                <CompactSongCard
                  key={song.id}
                  songId={song.id}
                  title={song.title}
                  artist={creator.artist_name}
                  price={song.price || 2.99}
                  coverUrl={song.cover_url}
                  previewUrl={song.mp3_preview_url || song.wav_url || song.file_url}
                  onBuy={() => console.log('Buy:', song.id)}
                  onOpen={() => openSongDetail(song)}
                />
              ))}
            </div>
            {filteredShopSongs.length === 0 && (
              <p className="mt-4 text-sm text-zinc-600">Keine Tracks für den aktuellen Filter gefunden.</p>
            )}

          </div>
        )}

        {/* CREATOR IMPRESSUM - dezenter Link unten mittig */}
        <div className="px-4 md:px-6 pb-8 md:pb-10">
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-end gap-3">
            <a
              href={creatorImpressumLink}
              className="text-sm md:text-base font-black uppercase tracking-wide underline underline-offset-4 hover:text-red-600 transition-colors"
            >
              Creator Impressum (klick)
            </a>
            <a
              href={`mailto:folgt?subject=${encodeURIComponent('Urheberrechtsverletzung melden')}&body=${encodeURIComponent(`Bitte Creator und Werk melden: ${creator.artist_name} (${creatorImpressumLink})`)}`}
              className="text-[10px] font-black uppercase px-3 py-1.5 rounded-full border-2 border-black bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Urheberrechtsverletzung melden
            </a>
          </div>
          {isCreatorOwner && (
            <div className="mt-3">
              <button
                onClick={() => setShowImpressumEditor((v) => !v)}
                className="text-xs font-bold uppercase px-3 py-2 rounded-full border-2 border-black hover:bg-black hover:text-white transition-colors"
              >
                {showImpressumEditor ? 'Impressum Editor schließen' : 'Impressum bearbeiten'}
              </button>
            </div>
          )}
        </div>

        {showImpressumEditor && isCreatorOwner && (
          <div className="px-4 md:px-6 pb-10">
            <div className="bg-white border-2 border-black rounded-[1.5rem] p-4 md:p-5">
              <h3 className="text-lg font-black uppercase mb-3">Impressum Daten</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="border-2 border-black rounded px-3 py-2 text-sm" placeholder="Rechtlicher Name / Firma *" value={impressumForm.legal_name} onChange={(e) => setImpressumForm((p) => ({ ...p, legal_name: e.target.value }))} />
                <input className="border-2 border-black rounded px-3 py-2 text-sm" placeholder="Straße + Nr. *" value={impressumForm.street} onChange={(e) => setImpressumForm((p) => ({ ...p, street: e.target.value }))} />
                <input className="border-2 border-black rounded px-3 py-2 text-sm" placeholder="PLZ + Ort *" value={impressumForm.zip_city} onChange={(e) => setImpressumForm((p) => ({ ...p, zip_city: e.target.value }))} />
                <input className="border-2 border-black rounded px-3 py-2 text-sm" placeholder="Land" value={impressumForm.country} onChange={(e) => setImpressumForm((p) => ({ ...p, country: e.target.value }))} />
                <input className="border-2 border-black rounded px-3 py-2 text-sm" placeholder="E-Mail" value={impressumForm.email} onChange={(e) => setImpressumForm((p) => ({ ...p, email: e.target.value }))} />
                <input className="border-2 border-black rounded px-3 py-2 text-sm" placeholder="Telefon" value={impressumForm.phone} onChange={(e) => setImpressumForm((p) => ({ ...p, phone: e.target.value }))} />
                <input className="md:col-span-2 border-2 border-black rounded px-3 py-2 text-sm" placeholder="Webseite" value={impressumForm.website} onChange={(e) => setImpressumForm((p) => ({ ...p, website: e.target.value }))} />
              </div>
              <div className="mt-4 flex flex-col md:flex-row md:items-center gap-3">
                <button
                  onClick={handleSaveImpressumFromData}
                  className="bg-black text-white px-4 py-2 rounded font-black uppercase text-xs hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  disabled={savingImpressum}
                >
                  {savingImpressum ? <Loader2 size={14} className="animate-spin" /> : null}
                  Bild erzeugen & speichern
                </button>
                <p className="text-xs text-zinc-600">
                  Share-Link: {creatorSlug ? <a href={creatorImpressumLink} className="underline font-bold">{shareLink || creatorImpressumLink}</a> : 'wird nach Slug-Erstellung sichtbar'}
                </p>
              </div>
            </div>
          </div>
        )}

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
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-zinc-100">
                      <p className="text-sm font-bold uppercase">Externe Video-Quelle</p>
                      <a
                        href={selectedVideo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 border-2 border-black rounded-full font-black text-xs uppercase hover:bg-black hover:text-white transition-colors"
                      >
                        Video im neuen Tab öffnen
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* SONG DETAIL MODAL */}
        {selectedSong && (
          <>
            <div
              className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
              onClick={() => setSelectedSong(null)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl px-4">
              <div className="bg-white border-4 border-black rounded-[2.5rem] overflow-hidden">
                <div className="grid md:grid-cols-[280px_1fr]">
                  <div className="bg-zinc-100 border-r-2 border-black">
                    {selectedSong.cover_url ? (
                      <img src={selectedSong.cover_url} alt={selectedSong.title} className="w-full h-full object-cover min-h-[240px]" />
                    ) : (
                      <div className="w-full min-h-[240px] flex items-center justify-center text-6xl text-zinc-300">🎵</div>
                    )}
                  </div>
                  <div className="p-5 md:p-6 space-y-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-zinc-500">
                        {String(selectedSong.release_type || selectedSong.type || 'single').toUpperCase()}
                      </p>
                      <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight mt-1">
                        {selectedSong.title}
                      </h3>
                      <p className="text-sm text-zinc-600">{creator.artist_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-red-600">€{Number(selectedSong.price || 2.99).toFixed(2)}</span>
                      <button
                        onClick={() => console.log('Buy:', selectedSong.id)}
                        className="bg-black text-white px-4 py-2 rounded-full font-bold text-xs uppercase hover:bg-red-600 transition-colors"
                      >
                        BUY
                      </button>
                    </div>
                    {(selectedSong.mp3_preview_url || selectedSong.wav_url || selectedSong.file_url) && (
                      <audio controls className="w-full" preload="metadata">
                        <source src={selectedSong.mp3_preview_url || selectedSong.wav_url || selectedSong.file_url} />
                      </audio>
                    )}
                    <div className="border-2 border-black rounded-[1.2rem] p-3">
                      <p className="text-[11px] font-black uppercase tracking-wide mb-2">Info / Tracklist / Lyrics</p>
                      {isCreatorOwner ? (
                        <>
                          <textarea
                            value={songNoteDraft}
                            onChange={(e) => setSongNoteDraft(e.target.value)}
                            placeholder="Optionaler Text zum Song/Album..."
                            className="w-full min-h-[110px] border-0 focus:outline-none resize-y text-sm"
                          />
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={handleSaveSongNote}
                              disabled={savingSongNote}
                              className="text-[11px] px-3 py-1 border-2 border-black rounded-full hover:bg-black hover:text-white transition-colors"
                            >
                              {savingSongNote ? 'Speichern...' : 'Speichern'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm whitespace-pre-line text-zinc-700">
                          {songNotes[selectedSong.id] || 'Keine Zusatzinfos vorhanden.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </>
  )
}
