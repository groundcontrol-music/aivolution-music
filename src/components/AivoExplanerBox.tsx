'use client';

import { useState } from 'react';
import VideoLightbox from '@/components/VideoLightbox';

interface AivoExplanerBoxProps {
  aivoSkinId: string;
}

const DEFAULT_AIVO_VIDEO_ID = 'dQw4w9WgXcQ'; // Beispiel: Rick Astley - Never Gonna Give You Up

export default function AivoExplanerBox({ aivoSkinId }: AivoExplanerBoxProps) {
  const [showVideoLightbox, setShowVideoLightbox] = useState(false);

  let aivoImageSrc = '/aivo-robot.png'; // Standardbild
  let aivoLabel = '[AIVO_EXPL_V1.0]';
  let aivoVideoId = DEFAULT_AIVO_VIDEO_ID;

  if (aivoSkinId === 'ostern') {
    aivoImageSrc = '/aivo-ostern.png'; // Beispiel: Oster-Aivo Bild
    aivoLabel = '[AIVO_EASTER_EDITION]';
    // aivoVideoId = 'OSTER_VIDEO_ID'; // Später aus Events ziehen
  } else if (aivoSkinId === 'xmas') {
    aivoImageSrc = '/aivo-xmas.png'; // Beispiel: Weihnachts-Aivo Bild
    aivoLabel = '[AIVO_XMAS_EDITION]';
    // aivoVideoId = 'XMAS_VIDEO_ID'; // Später aus Events ziehen
  } else if (aivoSkinId === 'national') {
    aivoImageSrc = '/aivo-national.png'; // Beispiel: National-Aivo Bild
    aivoLabel = '[AIVO_NATIONAL_EDITION]';
    // aivoVideoId = 'NATIONAL_VIDEO_ID'; // Später aus Events ziehen
  }

  return (
    <div className="md:col-span-1 aspect-square rounded-[2.5rem] bg-black border border-red-600/20 p-6 flex flex-col items-center justify-between text-center relative overflow-hidden group">
      <div className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 animate-pulse text-white text-5xl font-black mb-4">
        <img src={aivoImageSrc} alt="Aivo" className="w-full h-full object-contain" />
      </div> {/* Aivo Avatar Placeholder */}
      <button
        onClick={() => setShowVideoLightbox(true)}
        className="bg-red-600 text-white px-6 py-2 rounded-full font-mono text-[10px] tracking-tighter hover:bg-white hover:text-red-600 transition-colors"
      >
        PLAY_GUIDE
      </button>
      <span className="font-mono text-[9px] text-red-500 uppercase opacity-50">{aivoLabel}</span>

      <VideoLightbox
        isOpen={showVideoLightbox}
        onClose={() => setShowVideoLightbox(false)}
        videoId={aivoVideoId}
      />
    </div>
  );
}
