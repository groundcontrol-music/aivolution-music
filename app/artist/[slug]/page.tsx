'use client';

import React, { useEffect, useState } from 'react';
// NEUER STANDARD: Wir nutzen den Client-Utils-Pfad statt der gelöschten Lib
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function CreatorProfile({ params }: { params: Promise<{ slug: string }> }) {
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadCreator() {
      const resolvedParams = await params;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('slug', resolvedParams.slug)
        .single();

      if (!error) setCreator(data);
      setLoading(false);
    }
    loadCreator();
  }, [params, supabase]);

  if (loading) return <div className="bg-black text-white p-20 font-black uppercase">Lädt...</div>;
  if (!creator) return <div className="bg-black text-white p-20 font-black uppercase text-red-600">Creator nicht gefunden</div>;

  return (
    <main className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-4xl mx-auto border-[4px] border-red-600 rounded-[2.5rem] overflow-hidden bg-black shadow-[10px_10px_0px_0px_rgba(255,255,255,1)]">
        <div className="p-10 border-b-[4px] border-red-600 bg-white text-black">
          <h1 className="text-6xl font-black uppercase tracking-tighter italic">
            {creator.username || 'Unbekannter Artist'}
          </h1>
        </div>
        
        <div className="p-10 space-y-6">
          <div className="bg-white/5 p-8 rounded-[2.5rem] border-2 border-white/20">
            <h2 className="text-2xl font-black uppercase text-red-600 mb-4">Über den Creator</h2>
            <p className="text-xl leading-relaxed text-gray-300 font-bold">
              {creator.bio || 'Keine Bio vorhanden.'}
            </p>
          </div>

          <Link 
            href="/"
            className="inline-block bg-red-600 text-white px-10 py-4 rounded-[2.5rem] font-black uppercase hover:bg-white hover:text-black transition-all border-[3px] border-black"
          >
            ← Zurück
          </Link>
        </div>
      </div>
    </main>
  );
}