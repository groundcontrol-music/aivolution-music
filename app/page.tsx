import { createClient } from '@/utils/supabase/server';
import SalesModule from '@/components/SalesModule';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: slots } = await supabase.from('promo_slots').select('*').order('slot_id');
  const { data: tracks } = await supabase.from('tracks').select('*').limit(6);

  const welcome = slots?.find(s => s.slot_id === 99);
  const highlight = slots?.find(s => s.slot_id === 5);

  return (
    <div className="flex flex-col bg-white">
      {/* OBERE SEKTION: BOXEN & HIGHLIGHT */}
      <section className="grid grid-cols-12 border-b border-black">
        {/* Links: Boxen 1-4 (75% Breite) */}
        <div className="col-span-12 lg:col-span-9 grid grid-cols-2 md:grid-cols-4 border-r border-black bg-white">
          {[1, 2, 3, 4].map((id) => {
            const slot = slots?.find(s => s.slot_id === id);
            return (
              <div key={id} className="border-r last:border-r-0 border-black p-6 aspect-square flex flex-col justify-between group bg-white relative">
                <div className="opacity-10 text-[10px] font-black uppercase italic tracking-widest">SLOT_0{id}</div>
                <div className="space-y-1 z-10">
                  <p className="text-[9px] font-black text-red-600 uppercase italic leading-none">{slot?.subtitle || "PLATFORM VISION"}</p>
                  <h3 className="text-[10px] font-black uppercase text-black leading-tight tracking-tighter">{slot?.title || "Update Slot..."}</h3>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rechts: Große Highlight Box (25% Breite) */}
        <div className="col-span-12 lg:col-span-3 p-4 flex flex-col justify-center bg-white relative overflow-hidden group">
          <div className="border-[4px] border-red-600 p-6 h-full flex flex-col justify-between shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer">
            <div className="bg-red-600 text-white px-3 py-1 text-[8px] font-black uppercase italic w-fit">EXECUTIVE PARTNER</div>
            <div className="mt-4">
               <h4 className="text-3xl font-black uppercase italic leading-none tracking-tighter">{highlight?.title || "AUDIO CORE"}</h4>
               <p className="text-[9px] font-bold opacity-40 uppercase mt-2 tracking-widest leading-none">Technologische Einblicke.</p>
            </div>
          </div>
        </div>
      </section>

      {/* MITTLERE SEKTION: WILLKOMMENSTEXT (Schreibfeld) */}
      <section className="p-16 border-b border-black bg-white">
        <h2 className="text-8xl font-black uppercase italic tracking-tighter leading-[0.75] mb-8 text-black">
          {welcome?.title || "AUDIO REVOLUTION"}
        </h2>
        <div className="w-20 h-1.5 bg-red-600 mb-8" />
        <p className="text-gray-500 font-bold italic text-sm max-w-2xl leading-relaxed">
          {welcome?.subtitle || "Initialisiere Manifest..."}
        </p>
      </section>

      {/* UNTERE SEKTION: SHOP / VERKÄUFE */}
      <div className="p-4 bg-[#F9F9F9] border-b border-black text-[9px] font-black uppercase italic tracking-[0.3em] opacity-40 italic">
        // Aktuelle Veröffentlichungen_Module
      </div>
      <SalesModule items={tracks || []} />
    </div>
  );
}