import { createClient } from '@/utils/supabase/server';
import { updateWelcomeText } from '@/app/actions/update-content';
import { Type, Save, LayoutGrid } from 'lucide-react';

export default async function MediaPage() {
  const supabase = await createClient();
  const { data: slot99 } = await supabase.from('promo_slots').select('*').eq('slot_id', 99).single();
  const { data: mediaSlots } = await supabase.from('promo_slots').select('*').in('slot_id', [1, 2, 3, 4, 5]).order('slot_id');

  return (
    <div className="p-8 md:p-12 space-y-12 max-w-7xl mx-auto">
      
      {/* 1. SEKTION: WILLKOMMENSTEXT */}
      <section className="bg-white border-2 border-black p-10 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3 mb-10 border-b border-black pb-4">
          <Type size={24} className="text-red-600" />
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Willkommenstext (Startseite)</h2>
        </div>
        
        <form action={updateWelcomeText} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-red-600 tracking-widest">Haupt-Headline</label>
              <input 
                name="title"
                defaultValue={slot99?.title}
                className="w-full p-5 border-2 border-black font-black uppercase italic text-3xl outline-none focus:bg-[#FFF9F9] focus:border-red-600 transition-all"
                placeholder="AUDIO REVOLUTION"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-red-600 tracking-widest">Subtext / Vision</label>
              <textarea 
                name="subtitle"
                defaultValue={slot99?.subtitle}
                className="w-full p-5 border-2 border-black font-bold italic text-gray-500 h-44 outline-none focus:bg-[#FFF9F9] focus:border-red-600 transition-all resize-none"
                placeholder="Initialisiere Manifest..."
              />
            </div>
          </div>
          <button className="w-full py-6 bg-black text-white font-black uppercase italic text-2xl flex items-center justify-center gap-4 hover:bg-red-600 transition-all group">
            <Save size={28} className="group-hover:scale-110 transition-transform" /> 
            System_Update_Push
          </button>
        </form>
      </section>

      {/* 2. SEKTION: MEDIA BOXEN (1-4 & HIGHLIGHT) */}
      <section>
        <div className="flex items-center gap-3 mb-8">
          <LayoutGrid size={24} className="text-red-600" />
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Media Slots Control</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((id) => {
            const slot = mediaSlots?.find(s => s.slot_id === id);
            const isHighlight = id === 5;
            
            return (
              <div key={id} className={`bg-white border-2 ${isHighlight ? 'border-red-600' : 'border-black'} p-6 relative group hover:-translate-y-1 transition-transform`}>
                <div className="absolute top-2 right-2 text-[10px] font-mono opacity-30">ID_0{id}</div>
                <div className={`text-[10px] font-black uppercase mb-4 ${isHighlight ? 'text-red-600' : 'text-gray-400'}`}>
                  {isHighlight ? 'HIGHLIGHT BOX' : `MEDIA BOX 0${id}`}
                </div>
                
                <h3 className="font-black uppercase italic text-lg leading-tight mb-2 line-clamp-2">
                  {slot?.title || "Leer / Verfügbar"}
                </h3>
                <p className="text-[10px] font-bold opacity-60 mb-6 line-clamp-2">
                  {slot?.subtitle || "Keine Inhalte hinterlegt."}
                </p>

                <button className="w-full py-2 border border-black text-[10px] font-black uppercase hover:bg-black hover:text-white transition-colors">
                  Editieren
                </button>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
