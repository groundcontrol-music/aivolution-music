'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function GenrePage() {
  const { slug } = useParams();
  const [artists, setArtists] = useState<any[]>([]);
  const genreName = slug.toString().replace(/-/g, ' ');

  useEffect(() => {
    async function fetchGenreData() {
      // Wir suchen in 'genre' ODER 'subgenre' nach dem Namen
      const { data } = await supabase
        .from('artists')
        .select('*')
        .or(`genre.ilike.%${genreName}%,subgenre.ilike.%${genreName}%`)
        .order('created_at', { ascending: true }); // Älteste zuerst = erste Kennzeichnung
      
      if (data) setArtists(data);
    }
    fetchGenreData();
  }, [genreName]);

  return (
    <main className="min-h-screen bg-white p-12">
      <header className="max-w-7xl mx-auto mb-20">
        <Link href="/" className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] hover:text-red-600 transition">← Zurück zur Zentrale</Link>
        <h1 className="text-7xl font-black uppercase tracking-tighter italic mt-6">{genreName}<span className="text-red-600">.</span></h1>
        <p className="text-gray-400 uppercase text-xs font-bold tracking-widest mt-2 ml-1">Archivierte Werke // Erstkennzeichnungen</p>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
        {artists.map(artist => (
          <Link key={artist.id} href={`/artist/${artist.slug}`} className="group">
            <div className="aspect-square bg-gray-100 overflow-hidden mb-4 shadow-sm border border-gray-100 group-hover:border-red-600 transition">
              <img src={artist.image_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-500" />
            </div>
            <h4 className="font-bold text-sm uppercase">{artist.name}</h4>
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">{artist.tier}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}