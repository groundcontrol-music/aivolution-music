'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Performance Bonus!

export default function HeroSlider({ artists }: { artists: any[] }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (artists.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % Math.min(artists.length, 5));
      }, 8000);
      return () => clearInterval(timer);
    }
  }, [artists]);

  if (!artists.length) return <div className="h-[450px] flex items-center justify-center text-gray-400">Keine Highlights</div>;

  const activeArtist = artists[currentSlide];

  return (
    <div className="h-[450px] relative bg-gray-50 overflow-hidden border-r border-gray-100 flex items-center justify-center group">
       {/* HIER DEIN SLIDER HTML REINKOPIEREN (mit activeArtist statt artists[currentSlide]) */}
       {/* Tipp: Nutze <Image /> von Next.js für automatische Optimierung */}
       <div className="relative z-10">
          <img 
            src={activeArtist.image_url} 
            className="w-64 h-64 shadow-2xl object-cover border-4 border-white transform group-hover:scale-105 transition duration-700" 
            alt={activeArtist.name}
          />
       </div>
       {/* ... Rest deines Slider Codes ... */}
       <div className="absolute bottom-10 left-12 z-20">
          <Link href={`/artist/${activeArtist.slug}`}>
            <h3 className="text-5xl font-black uppercase italic hover:text-red-600 transition cursor-pointer">
                {activeArtist.name}
            </h3>
          </Link>
       </div>
    </div>
  );
}