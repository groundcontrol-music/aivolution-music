import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import TrackList from "@/components/artists/TrackList"; 

// Helper Funktion: Daten laden
async function getArtistData(slug: string) {
  const supabase = await createClient();

  // 1. Artist Profil laden
  const { data: artist } = await supabase
    .from('artists')
    .select('id, name, description, image_url, genre')
    .eq('slug', slug)
    .single();

  if (!artist) return null;

  // 2. Tracks dieses Artists laden (MP3 URL ist wichtig!)
  // Wir filtern das Profil selbst raus (.neq id)
  const { data: tracks } = await supabase
    .from('artists')
    .select('id, title, price, format, created_at, demo_url')
    .eq('name', artist.name)
    .neq('id', artist.id) 
    .order('created_at', { ascending: false })
    .limit(50); // Scaling Schutz

  return { artist, tracks: tracks || [] };
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; // Next.js 15 Syntax
  const data = await getArtistData(slug);

  if (!data) return notFound();

  const { artist, tracks } = data;

  return (
    <main className="min-h-screen bg-black text-white pb-40 font-sans">
      
      {/* --- HERO HEADER --- */}
      <div className="relative h-[40vh] w-full overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-red-950" />
        
        {artist.image_url && (
            <Image 
              src={artist.image_url} 
              alt={artist.name} 
              fill 
              className="object-cover opacity-40 blur-md scale-105"
              priority 
            />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      {/* --- PROFIL CONTENT --- */}
      <div className="max-w-6xl mx-auto px-6 -mt-32 relative z-10">
         
         {/* Artist Info Box */}
         <div className="flex flex-col md:flex-row gap-8 items-end mb-12">
            <div className="w-40 h-40 md:w-64 md:h-64 rounded-full border-[6px] border-black shadow-2xl overflow-hidden bg-gray-800 relative shrink-0">
               {artist.image_url ? (
                  <Image src={artist.image_url} alt={artist.name} fill className="object-cover" />
               ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-black text-gray-500">
                    {artist.name.substring(0,2).toUpperCase()}
                  </div>
               )}
            </div>
            
            <div className="mb-4 flex-1 w-full text-center md:text-left">
                <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-3">
                    {artist.name}
                </h1>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">
                    <span className="bg-white/10 px-3 py-1 rounded-full text-white border border-white/10">{artist.genre || 'Artist'}</span>
                    <span>{tracks.length} Releases</span>
                </div>
                
                <div className="flex gap-4 justify-center md:justify-start">
                    <button className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-full font-black uppercase tracking-wide transition transform hover:scale-105 shadow-lg shadow-red-900/20">
                        Play Latest
                    </button>
                    <button className="border border-white/20 hover:border-white text-white px-8 py-3 rounded-full font-black uppercase tracking-wide transition">
                        Follow
                    </button>
                </div>
            </div>
         </div>

         {/* Grid Layout: Bio & Tracks */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
             
             {/* Linke Spalte: Bio */}
             <div className="lg:col-span-1">
                 <h3 className="text-red-600 font-bold uppercase tracking-widest text-xs mb-4 border-b border-red-900/30 pb-2 inline-block">About</h3>
                 <p className="text-gray-300 leading-relaxed text-lg font-light">
                    {artist.description || "Keine Biographie vorhanden."}
                 </p>
             </div>

             {/* Rechte Spalte: Track Liste */}
             <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                    <h2 className="text-2xl font-black uppercase tracking-tight">
                        Selected Tracks
                    </h2>
                </div>
                
                {/* Client Component Integration */}
                <TrackList tracks={tracks} />
             </div>
         </div>
      </div>
    </main>
  );
}