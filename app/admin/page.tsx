import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { updateWelcomeText } from '@/app/actions/update-content';
import { Save, Type, ShieldCheck, Database } from 'lucide-react';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // MASTER-CHECK: Server-seitiger Schutz (Frage 2)
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/');

  // Daten für den Willkommenstext laden
  const { data: slot99 } = await supabase.from('promo_slots').select('*').eq('slot_id', 99).single();

  return (
    <div className="bg-[#F4F4F4] min-h-screen p-8 md:p-16 text-black">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* HEADER: Brutalistisch & Klar */}
        <header className="border-b-4 border-black pb-8 flex justify-between items-end">
          <div>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">
              KOMMANDO<span className="text-red-600">BRÜCKE</span>
            </h1>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-[0.3em] mt-3">
              Administrative Control // Unit_01
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-red-600 font-black uppercase italic text-xs">
              <ShieldCheck size={18} /> System_Secure
            </div>
            <div className="text-[9px] font-mono opacity-30">ID: {user.id}</div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* LINKER BEREICH: Editor */}
          <main className="lg:col-span-8 space-y-8">
            <div className="bg-white border-2 border-black p-10 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3 mb-10 border-b border-black pb-4">
                <Type size={24} className="text-red-600" />
                <h2 className="text-2xl font-black uppercase italic tracking-tight">Willkommenstext</h2>
              </div>
              
              {/* Das Formular nutzt jetzt die neue Server Action */}
              <form action={updateWelcomeText} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-red-600 tracking-widest">Haupt-Headline</label>
                  <input 
                    name="title"
                    defaultValue={slot99?.title}
                    className="w-full p-5 border-2 border-black font-black uppercase italic text-3xl outline-none focus:bg-[#FFF9F9] focus:border-red-600 transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-red-600 tracking-widest">Subtext / Vision</label>
                  <textarea 
                    name="subtitle"
                    defaultValue={slot99?.subtitle}
                    className="w-full p-5 border-2 border-black font-bold italic text-gray-500 h-44 outline-none focus:bg-[#FFF9F9] focus:border-red-600 transition-all resize-none"
                  />
                </div>
                <button className="w-full py-6 bg-black text-white font-black uppercase italic text-2xl flex items-center justify-center gap-4 hover:bg-red-600 transition-all group">
                  <Save size={28} className="group-hover:scale-110 transition-transform" /> 
                  System_Update_Push
                </button>
              </form>
            </div>
          </main>

          {/* RECHTER BEREICH: Status-Infos */}
          <aside className="lg:col-span-4 space-y-8">
            <div className="bg-white border-2 border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-sm font-black uppercase italic mb-6 flex items-center gap-2 border-b border-black pb-2">
                <Database size={16} className="text-red-600" /> System_Stats
              </h3>
              <div className="space-y-4 font-mono text-[10px] uppercase opacity-60">
                <p>RLS_Status: <span className="text-green-600 font-bold">Protected</span></p>
                <p>Welcome_Slot: ID_99</p>
                <p>Branding: Brutalist_White</p>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}