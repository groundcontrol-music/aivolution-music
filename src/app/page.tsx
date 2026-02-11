import Header from '@/components/Header'
import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: slots } = await supabase.from('promo_slots').select('*').order('slot_id')

  const welcome = slots?.find(s => s.slot_id === 99)
  const highlight = slots?.find(s => s.slot_id === 5)

  return (
    <div className="min-h-screen bg-zinc-50 text-black font-sans selection:bg-red-600 selection:text-white">
      <Header />
      
      <main className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-12">
        
        {/* SECTION 1: HAUPT-GRID */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* LINKER BEREICH (75%) */}
          <div className="col-span-12 lg:col-span-9 flex flex-col gap-6">
            
            {/* 1. MEDIA BOXEN */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((id) => {
                const slot = slots?.find(s => s.slot_id === id)
                return (
                  <div key={id} className="
                    aspect-square flex flex-col justify-between p-6 
                    bg-white border-2 border-black rounded-lg 
                    transition-all duration-200 
                    hover:shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] hover:-translate-y-1
                    group relative overflow-hidden
                  ">
                    <div className="opacity-20 text-[10px] font-black uppercase italic tracking-widest group-hover:text-red-600 transition-colors">SLOT_0{id}</div>
                    <div className="space-y-1 z-10">
                      <p className="text-[9px] font-black text-red-600 uppercase italic leading-none">{slot?.subtitle || "PLATFORM VISION"}</p>
                      <h3 className="text-xs font-black uppercase text-black leading-tight tracking-tighter">{slot?.title || "Update Slot..."}</h3>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 2. TEXTFELD (Box-Style) */}
            <div className="
              flex-1 bg-white border-2 border-black rounded-lg p-8
              flex flex-col justify-center min-h-[200px]
              hover:shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] transition-all duration-200
            ">
              <h3 className="text-2xl font-black uppercase italic tracking-tight mb-4">
                {welcome?.title || "Willkommen"}
              </h3>
              <p className="text-gray-600 font-medium leading-relaxed max-w-2xl">
                {welcome?.subtitle || "Hier steht der Einleitungstext für die Community..."}
              </p>
            </div>

          </div>

          {/* RECHTER BEREICH (25%) - HIGHLIGHT BOX */}
          <div className="col-span-12 lg:col-span-3 flex">
            <div className="
              w-full h-full min-h-[400px]
              bg-white border-[3px] border-black rounded-xl
              flex flex-col justify-between p-8
              transition-all duration-300
              hover:shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] hover:-translate-y-1
              cursor-pointer group relative overflow-hidden
            ">
              <div className="flex justify-between items-start">
                <div className="bg-black text-white px-3 py-1 text-[9px] font-black uppercase italic w-fit rounded-sm group-hover:bg-red-600 transition-colors">
                  HIGHLIGHT
                </div>
                <div className="text-[10px] font-mono opacity-30">AD_SPACE</div>
              </div>
              
              <div className="mt-auto space-y-4">
                 <div className="w-full h-[1px] bg-black/10 group-hover:bg-red-600/50 transition-colors" />
                 <h4 className="text-4xl font-black uppercase italic leading-none tracking-tighter group-hover:scale-105 transition-transform origin-left">
                   {highlight?.title || "AUDIO CORE"}
                 </h4>
                 <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest leading-none">
                   {highlight?.subtitle || "Technologische Einblicke."}
                 </p>
              </div>
            </div>
          </div>

        </div>

        {/* SECTION 2: NEUE CREATOR (Volle Breite) */}
        <section>
          <div className="flex items-end gap-4 mb-6 border-b-2 border-black pb-4">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
              Neue <span className="text-red-600">Creator</span>
            </h2>
            <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">auf Aivolution Music</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {/* Platzhalter für Creator-Karten */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[3/4] bg-white border-2 border-black rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer">
                <div className="w-16 h-16 bg-zinc-100 rounded-full border border-black grayscale hover:grayscale-0 transition-all" />
                <div className="text-center">
                  <p className="font-black uppercase text-xs">Artist_0{i}</p>
                  <p className="text-[9px] opacity-50 font-mono">Joined today</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  )
}
