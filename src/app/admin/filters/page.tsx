import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import FiltersEditor from '@/components/admin/FiltersEditor'

export default async function AdminFiltersPage() {
  const supabase = await createClient()

  // Admin Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin') redirect('/')

  // Hole Bad-Words
  const { data: filters } = await supabase
    .from('content_filters')
    .select('*')
    .order('word')

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b-2 border-black pb-4">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            Content <span className="text-red-600">Filter</span>
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40">
            Blockierte Begriffe für Artist Name, Bio & Song-Titel
          </p>
        </div>
      </div>

      <div className="bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-8">
        <h2 className="text-xl font-black uppercase tracking-tight mb-4">Upload‑Gate Checks</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            {
              title: 'Badword‑Check',
              detail: 'Quelle: content_filters (Admin editierbar)',
              trigger: 'Bei jedem Upload + vor Freigabe',
            },
            {
              title: 'Audio‑Format',
              detail: 'Nur echte MP3/WAV Header; Extension allein reicht nicht',
              trigger: 'Bei jedem Upload',
            },
            {
              title: 'Copyright / Nicht‑KI‑Musik',
              detail: 'Risiko‑Check → flagged bei Unsicherheit',
              trigger: 'Bei jedem Upload',
            },
            {
              title: 'Stille / Dauer',
              detail: 'Kurz / Stille‑Anteil → flagged',
              trigger: 'Bei jedem Upload',
            },
          ].map((item) => (
            <div key={item.title} className="border-2 border-black rounded-2xl p-4">
              <div className="text-xs font-black uppercase">{item.title}</div>
              <p className="text-[11px] font-mono opacity-70 mt-1">{item.detail}</p>
              <p className="text-[10px] font-bold uppercase mt-3">
                Trigger: <span className="text-red-600">{item.trigger}</span>
              </p>
            </div>
          ))}
        </div>
        <p className="text-[11px] font-mono opacity-60 mt-4">
          Alles mit Unsicherheit wird auf <span className="font-bold">needs_review</span> gesetzt und in der Kommandozentrale geprüft.
        </p>
      </div>

      <FiltersEditor initialFilters={filters || []} />
    </div>
  )
}
