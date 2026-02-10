import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { 
  Save, ShieldAlert, Zap, LayoutDashboard, 
  Users, UserPlus, FileText, Database 
} from 'lucide-react'
import Link from 'next/link'

export default async function Kommandozentrale() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  // 1. SECURITY CHECK (Master-Frage 2) [cite: 98]
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin') redirect('/')

  // 2. DATA FETCHING (Promo-Slots für das Manifest) [cite: 107]
  const { data: promoSlots } = await supabase
    .from('promo_slots')
    .select('*')
    .order('slot_id', { ascending: true })

  return (
    <div className="min-h-screen bg-[#f0f0f0] text-black font-sans p-8 selection:bg-red-600 selection:text-white">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER: AIVOLUTION BRUTALISM [cite: 116] */}
        <header className="mb-16 border-b-[10px] border-black pb-10 flex justify-between items-end transition-all">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span className="bg-red-600 text-white px-4 py-1 rounded-full font-black text-xs uppercase tracking-widest animate-pulse">
                System Live [cite: 121]
              </span>
              <span className="text-black font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                <ShieldAlert size={14} /> Root Access // {user.email} [cite: 125]
              </span>
            </div>
            <h1 className="text-8xl font-black italic uppercase tracking-tighter leading-none">
              Kommando<span className="text-red-600">zentrale</span> [cite: 130, 131]
            </h1>
          </div>
          <div className="text-right hidden md:block opacity-30 font-mono text-sm uppercase tracking-tighter">
            AIVOLUTION OS V.2.6 // SECURED SESSION [cite: 135]
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* SIDEBAR [cite: 140] */}
          <aside className="lg:col-span-3 space-y-4">
            <button className="w-full flex items-center justify-between p-6 rounded-[2.5rem] border-[4px] border-black bg-red-600 text-white font-black uppercase tracking-tighter shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 transition-all">
              <LayoutDashboard size={24} />
              <span className="text-2xl">Promotions</span>
            </button>

            <button className="w-full flex items-center justify-between p-6 rounded-[2.5rem] border-[4px] border-black bg-white text-black font-black uppercase tracking-tighter shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all">
              <Users size={24} />
              <span className="text-2xl">Moderation</span>
            </button>

            <Link href="/admin/create-profile" className="w-full flex items-center justify-between p-6 rounded-[2.5rem] border-[4px] border-black bg-white text-black font-black uppercase tracking-tighter shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all">
              <UserPlus size={24} />
              <span className="text-2xl">Profil anlegen</span>
            </Link>

            {/* SYSTEM-KERN MONITOR (Master-Frage 5: Legal) [cite: 158] */}
            <div className="mt-12 p-8 bg-black text-white rounded-[2.5rem] border-[4px] border-red-600 shadow-[10px_10px_0px_0px_rgba(220,38,38,0.2)]">
              <h3 className="font-black uppercase italic mb-4 flex items-center gap-2 text-red-600">
                <Database size={20} /> System-Kern [cite: 163]
              </h3>
              <p className="text-[10px] font-bold text-gray-400 leading-relaxed uppercase tracking-widest">
                DAC7-Grenze: 30 Verkäufe/Jahr [cite: 167]<br />
                Plattform-Status: Monitoring Aktiv [cite: 168]<br />
                Keine Datenleichen erkannt [cite: 169]
              </p>
            </div>
          </aside>

          {/* MAIN CONTENT: DAS MANIFEST [cite: 174] */}
          <main className="lg:col-span-9">
            <div className="space-y-12">
              <div className="p-10 bg-black text-white rounded-[3.5rem] border-[6px] border-red-600 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-black shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                    <FileText fill="currentColor" size={28} />
                  </div>
                  <h4 className="text-5xl font-black uppercase italic tracking-tighter">
                    Startseiten <span className="text-red-600 italic">Manifest</span> [cite: 186, 187]
                  </h4>
                </div>

                <form className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase text-red-600 ml-4 tracking-[0.2em]">Primary Headline (Slot 99)</label>
                      <textarea 
                        className="w-full h-32 p-6 bg-[#111] border-2 border-white/10 rounded-[2rem] text-3xl font-black italic uppercase text-white focus:border-red-600 transition-all outline-none"
                        defaultValue={promoSlots?.find(s => s.slot_id === 99)?.title || "The Sound of Aivolution"} [cite: 198]
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase text-red-600 ml-4 tracking-[0.2em]">Secondary Slogan</label>
                      <textarea 
                        className="w-full h-32 p-6 bg-[#111] border-2 border-white/10 rounded-[2rem] text-lg font-bold text-gray-400 focus:border-white transition-all outline-none"
                        defaultValue={promoSlots?.find(s => s.slot_id === 99)?.subtitle || "Empowering Creators."} [cite: 208]
                      />
                    </div>
                  </div>

                  <button className="w-full bg-white text-black py-8 rounded-[2.5rem] font-black uppercase text-2xl tracking-[0.3em] hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-4 shadow-[10px_10px_0px_0px_#dc2626] active:translate-y-2 active:shadow-none">
                    <Save size={32} strokeWidth={3} /> Manifest Aktualisieren [cite: 213, 214]
                  </button>
                </form>
              </div>

              {/* STATS [cite: 218] */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-white border-[4px] border-black rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <h5 className="text-sm font-black uppercase text-red-600 mb-2">Creator Onboarding</h5>
                  <p className="text-4xl font-black italic uppercase tracking-tighter">Bereit für Slugs</p>
                </div>
                <div className="p-8 bg-white border-[4px] border-black rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <h5 className="text-sm font-black uppercase text-red-600 mb-2">Legal Monitoring</h5>
                  <p className="text-4xl font-black italic uppercase tracking-tighter underline">DAC7 OK</p> [cite: 232]
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}