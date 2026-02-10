'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

export default function StickyPlayer() {
  const isPremium = false; 
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const track = {
    title: "Midnight City AI",
    artist: "SynthWave Bot",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const duration = audioRef.current.duration;
    
    // Master-Frage 2: Security Check (Preview-Sperre)
    if (!isPremium && current >= 30) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      alert("Preview beendet. Melde dich an für den vollen Track!");
      return;
    }
    setProgress((current / duration) * 100);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)] z-[100] h-20 md:h-24 px-8 flex items-center justify-between transition-all">
      
      {/* 1. Track Info */}
      <div className="flex items-center gap-4 w-1/3 group cursor-pointer">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-lg overflow-hidden shadow-sm border border-gray-100">
           <div className="w-full h-full bg-red-600 animate-pulse" />
        </div>
        <div className="transition-transform duration-300 origin-left group-hover:scale-105">
            <h4 className="font-black text-black text-xs md:text-sm uppercase italic leading-tight truncate">{track.title}</h4>
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{track.artist}</p>
        </div>
      </div>

      {/* 2. Controls */}
      <div className="flex flex-col items-center w-1/3 gap-2">
         <div className="flex items-center gap-6">
            <button className="text-gray-400 hover:text-black transition">⏮</button>
            <button 
              onClick={togglePlay}
              className="w-10 h-10 md:w-12 md:h-12 bg-black text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition active:scale-90"
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <button className="text-gray-400 hover:text-black transition">⏭</button>
         </div>
         <div className="w-full max-w-xs h-1 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-600 transition-all duration-100" 
              style={{ width: `${progress}%` }} 
            />
         </div>
      </div>

      {/* 3. Actions */}
      <div className="w-1/3 flex justify-end">
         {!isPremium && (
            <Link href="/join" className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-5 py-2 rounded-full hover:bg-red-600 transition-all shadow-md">
                Get Premium
            </Link>
         )}
      </div>

      <audio ref={audioRef} src={track.src} onTimeUpdate={handleTimeUpdate} />
    </div>
  );
}