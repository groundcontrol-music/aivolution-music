'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HeroRotator({ artists }: { artists: any[] }) {
  const [index, setIndex] = useState(0);

  // Automatischer Wechsel alle 20 Sekunden
  useEffect(() => {
    if (artists.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % Math.min(artists.length, 4)); // Max 4 items
    }, 20000); // 20.000 ms = 20s
    return () => clearInterval(timer);
  }, [artists]);

  if (!artists.length) return null;
  const active = artists[index];

  return (
    <div className="relative h-[500px] w-full bg-gray-50 rounded-2xl overflow-hidden shadow-sm group">
      
      {/* Hintergrundbild (Dezent abgedunkelt) */}
      {active.image_url ? (
         /* eslint-disable-next-line @next/next/no-img-element */
        <img 
            src={active.image_url} 
            alt={active.name} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[20s] ease-linear scale-100 group-hover:scale-110" 
        />
      ) : (
        <div className="absolute inset-0 bg-gray-200" />
      )}
      
      {/* Overlay Gradient (Schwarz zu Transparent für Lesbarkeit) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Content unten links */}
      <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full">
         <div className="flex items-end justify-between">
            <div>
                <p className="text-red-500 font-bold tracking-widest text-xs uppercase mb-2">Featured Artist</p>
                <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
                    {active.name}
                </h2>
                <p className="text-gray-300 text-sm md:text-base max-w-lg line-clamp-2 mb-6 group-hover:text-white transition-colors">
                    {active.description || "Entdecke den neuen Sound der AI Revolution."}
                </p>
                <Link 
                    href={`/artist/${active.slug}`}
                    className="inline-block bg-white text-black px-8 py-3 rounded-full font-bold text-sm hover:bg-red-600 hover:text-white transition-all transform hover:scale-105 shadow-lg"
                >
                    Profil ansehen
                </Link>
            </div>

            {/* Pagination Dots (Zeigt an, welcher der 4 aktiv ist) */}
            <div className="flex gap-2 mb-4">
                {[0, 1, 2, 3].map(i => (
                    <button 
                        key={i}
                        onClick={() => setIndex(i)}
                        className={`h-1 rounded-full transition-all duration-500 ${index === i ? 'w-8 bg-red-600' : 'w-2 bg-gray-500'}`}
                    />
                ))}
            </div>
         </div>
      </div>
    </div>
  );
}