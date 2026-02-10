'use client';

import { useState } from 'react';

interface Track {
  id: string;
  title: string;
  price: number;
  format: string;
  demo_url: string | null;
}

export default function TrackList({ tracks }: { tracks: Track[] }) {
  // Welcher Track läuft gerade? (Später verbinden wir das mit dem StickyPlayer Context)
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handlePlay = (track: Track) => {
    if (!track.demo_url) {
      alert("Keine Audio-Preview verfügbar.");
      return;
    }

    if (playingId === track.id) {
      setPlayingId(null); // Pause
      console.log("Pause:", track.title);
      // TODO: Hier später: StickyPlayer.pause()
    } else {
      setPlayingId(track.id); // Play
      console.log("Playing:", track.title, track.demo_url);
      // TODO: Hier später: StickyPlayer.play(track.demo_url)
    }
  };

  if (tracks.length === 0) {
    return <div className="text-gray-500 italic py-10 opacity-50">Noch keine Tracks veröffentlicht.</div>;
  }

  return (
    <div className="space-y-2">
      {tracks.map((track, index) => {
        const isPlaying = playingId === track.id;

        return (
          <div 
            key={track.id} 
            className={`group flex items-center gap-4 p-4 rounded-xl transition border cursor-pointer
              ${isPlaying ? 'bg-white/10 border-red-600' : 'hover:bg-white/5 border-transparent hover:border-white/10'}
            `}
          >
            {/* Nummer / Equalizer Animation */}
            <div className="w-8 flex justify-center">
                {isPlaying ? (
                    <div className="flex gap-[2px] items-end h-4">
                        <div className="w-1 bg-red-600 animate-pulse h-2"></div>
                        <div className="w-1 bg-red-600 animate-pulse h-4 delay-75"></div>
                        <div className="w-1 bg-red-600 animate-pulse h-3 delay-150"></div>
                    </div>
                ) : (
                    <span className="text-gray-600 font-black text-sm">{index + 1}</span>
                )}
            </div>

            {/* Play Button Icon */}
            <button 
              onClick={() => handlePlay(track)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition shrink-0
                ${isPlaying ? 'bg-red-600 text-white' : 'bg-white/10 text-white group-hover:bg-white group-hover:text-black'}
              `}
            >
              {isPlaying ? (
                 <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
              ) : (
                 <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <h4 className={`font-bold text-lg leading-none mb-1 truncate ${isPlaying ? 'text-red-500' : 'text-white group-hover:text-red-500'} transition`}>
                {track.title}
              </h4>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold flex items-center gap-2">
                <span>{track.format}</span>
                {track.demo_url && <span className="text-green-500">• Preview Ready</span>}
              </div>
            </div>

            {/* Preis & Buy Button */}
            <div className="flex items-center gap-4 pl-4 border-l border-white/10 ml-2">
              <span className="font-bold text-white text-sm hidden md:block">{track.price} €</span>
              <button 
                className="bg-white text-black px-4 py-2 rounded-full text-xs font-black uppercase hover:bg-red-600 hover:text-white transition"
                onClick={(e) => {
                    e.stopPropagation(); // Verhindert, dass der Play-Click ausgelöst wird
                    alert(`Add to cart: ${track.title}`);
                }}
              >
                Buy
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}