'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

/**
 * MASTER-CHECK (Frage 6): IST-Zustand Next.js 16
 * Global Discovery: Aggregiert alle Creator-Uploads mit Filter-Logik.
 */
export default function DiscoveryEngine() {
  const supabase = createClient();
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter-Status
  const [filters, setFilters] = useState({
    style: '',
    tool: '',
    quality: '',
    search: ''
  });

  useEffect(() => {
    async function fetchLatestSongs() {
      setLoading(true);
      let query = supabase
        .from('songs')
        .select(`
          *,
          profiles (artist_name)
        `)
        .order('created_at', { ascending: false })
        .limit(24);

      // Differenzierte Suche (Deine Anforderung)
      if (filters.style) query = query.contains('genre_tags', [filters.style]);
      if (filters.tool) query = query.eq('ai_tool', filters.tool);
      if (filters.quality) query = query.eq('recording_quality', filters.quality);
      if (filters.search) query = query.ilike('title', `%${filters.search}%`);

      const { data } = await query;
      setSongs(data || []);
      setLoading(false);
    }
    fetchLatestSongs();
  }, [filters]);

  return (
    <section className="space-y-12">
      {/* DIE KOMMANDOZEILE DER SUCHE */}
      <div className="bg-white p-8 rounded-[3rem] border-2 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex flex-wrap gap-4 items-center">
        <input 
          type="text" 
          placeholder="Songname oder Creator..." 
          className="flex-1 min-w-[200px] p-4 bg-gray-50 rounded-2xl text-xs font-black uppercase tracking-widest border-none focus:ring-2 focus:ring-red-600 outline-none"
          onChange={(e) => setFilters({...filters, search: e.target.value})}
        />
        
        <select 
          className="p-4 bg-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest border-none outline-none"
          onChange={(e) => setFilters({...filters, style: e.target.value})}
        >
          <option value="">Alle Stile</option>
          <option value="Techno">Techno</option>
          <option value="Ambient">Ambient</option>
          <option value="Cinematic">Cinematic</option>
        </select>

        <select 
          className="p-4 bg-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest border-none outline-none"
          onChange={(e) => setFilters({...filters, tool: e.target.value})}
        >
          <option value="">Alle Tools</option>
          <option value="Udio">Udio</option>
          <option value="Suno">Suno</option>
        </select>

        <select 
          className="p-4 bg-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest border-none outline-none"
          onChange={(e) => setFilters({...filters, quality: e.target.value})}
        >
          <option value="">Qualität</option>
          <option value="WAV">WAV (Hi-Res)</option>
          <option value="MP3">MP3</option>
        </select>
      </div>

      {/* RESULTAT GRID (Neueste zuerst) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {loading ? (
          <div className="col-span-full py-20 text-center animate-pulse font-black uppercase text-[10px]">Scanne Archiv...</div>
        ) : (
          songs.map((song) => (
            <div key={song.id} className="group bg-white p-6 rounded-[2.5rem] border-2 border-transparent hover:border-black transition-all shadow-sm hover:shadow-2xl">
              <div className="aspect-square bg-gray-100 rounded-[2rem] mb-6 overflow-hidden relative">
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button className="bg-white text-black px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest">Preview</button>
                </div>
              </div>
              
              <h4 className="text-sm font-black uppercase italic truncate">{song.title}</h4>
              <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest mb-4">
                {song.profiles?.artist_name}
              </p>
              
              <div className="flex flex-wrap gap-2">
                {song.genre_tags?.map((tag: string) => (
                  <span key={tag} className="text-[7px] font-black px-2 py-1 bg-gray-50 rounded-md border border-gray-100 text-gray-400 uppercase">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}