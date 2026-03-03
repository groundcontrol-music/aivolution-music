'use client';

import Image from 'next/image';
import { Youtube, Music2, Play, ImageIcon } from 'lucide-react';

interface PromoSlot {
  id?: string;
  slot_id: number;
  title: string;
  subtitle: string;
  body_text?: string;
  media_type?: 'image' | 'youtube' | 'tiktok' | 'none';
  media_url?: string;
  youtube_id?: string;
  tiktok_id?: string;
}

interface HomepageMediaCardProps {
  slot: PromoSlot;
}

export default function HomepageMediaCard({ slot }: HomepageMediaCardProps) {
  const isVideo = slot.media_type === 'youtube' || slot.media_type === 'tiktok';
  const videoId = slot.youtube_id || slot.tiktok_id;

  const handlePlayClick = () => {
    if (isVideo && videoId) {
      const videoUrl = slot.media_type === 'tiktok'
        ? `https://www.tiktok.com/@tiktok/video/${videoId}`
        : `https://www.youtube.com/watch?v=${videoId}`;
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Dynamische CSS-Klassen für den Glasmorphismus und Glow-Effekt
  const cardClasses = `
    relative aspect-square rounded-[2.5rem] p-2 overflow-hidden cursor-pointer
    bg-white/10 backdrop-blur-md border border-slate-100/20
    shadow-lg transition-all duration-300
    hover:border-red-500 hover:shadow-[0_0_30px_rgba(220,38,38,0.2)]
    group
  `;

  const mediaContent = (
    <>
      {slot.media_type === 'image' && slot.media_url && (
        <Image
          src={slot.media_url}
          alt={slot.title}
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          style={{ objectFit: 'cover' }}
          className="rounded-[2rem]"
        />
      )}

      {isVideo && videoId && (
        <div className="w-full h-full flex items-center justify-center rounded-[2rem] bg-black/80 text-white">
          {slot.media_type === 'youtube' && <Youtube size={64} className="text-red-600" />}
          {slot.media_type === 'tiktok' && <Music2 size={64} className="text-red-600" />}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play size={48} className="text-white drop-shadow-md" />
          </div>
        </div>
      )}

      {/* Fallback für keinen Media-Typ oder leere Slots */}
      {(!slot.media_type || slot.media_type === 'none') && (
        <div className="w-full h-full flex flex-col items-center justify-center rounded-[2rem] bg-zinc-800 text-zinc-500 text-sm font-bold uppercase">
          <ImageIcon size={32} className="mb-2" />
          <p>Slot {slot.slot_id}</p>
          <p>leer</p>
        </div>
      )}
    </>
  );

  return (
    <div className={cardClasses} onClick={handlePlayClick}>
      <div className="h-full w-full rounded-[2rem] overflow-hidden relative">
        {mediaContent}
        <div className="absolute inset-0 flex items-end p-4 bg-gradient-to-t from-black/60 to-transparent rounded-[2rem]">
          <div>
            <p className="text-lg font-black uppercase leading-tight text-white drop-shadow-sm">{slot.title}</p>
            <p className="text-xs text-white/80 font-bold drop-shadow-sm">{slot.subtitle}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
