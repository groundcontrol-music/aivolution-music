 'use client'

 import { useEffect, useState } from 'react'
 import { createClient } from '@/utils/supabase/client'
 import { Filter } from 'lucide-react'

 type FilterOption = 'most_purchased' | 'most_listened' | 'newest'

 const OPTIONS: { id: FilterOption; label: string; hint: string }[] = [
   { id: 'most_purchased', label: 'Am meisten gekauft', hint: 'Sortiert nach Verkäufen.' },
   { id: 'most_listened', label: 'Am meisten gehört', hint: 'Sortiert nach Listenings (falls verfügbar).' },
   { id: 'newest', label: 'Neueste Veröffentlichungen', hint: 'Sortiert nach Datum.' },
 ]

 export default function HomepageTrackFilterCard() {
   const supabase = createClient()
   const [selected, setSelected] = useState<FilterOption>('most_purchased')
   const [loading, setLoading] = useState(true)
   const [saving, setSaving] = useState(false)
   const [status, setStatus] = useState<string | null>(null)

   useEffect(() => {
     const loadSetting = async () => {
       setLoading(true)
       setStatus(null)
       const { data, error } = await supabase
         .from('platform_settings')
         .select('value')
         .eq('key', 'homepage_track_filter')
         .single()

       if (!error && data?.value) {
         setSelected(data.value as FilterOption)
       }
       setLoading(false)
     }
     void loadSetting()
   }, [supabase])

   const handleSave = async () => {
     setSaving(true)
     setStatus(null)
     const { error } = await supabase.from('platform_settings').upsert({
       key: 'homepage_track_filter',
       value: selected,
     })
     if (error) {
       setStatus('Speichern fehlgeschlagen.')
     } else {
       setStatus('Gespeichert.')
     }
     setSaving(false)
   }

   return (
     <div className="bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
       <div className="flex items-center justify-between mb-6">
         <div>
           <h2 className="text-2xl font-black uppercase italic tracking-tighter">
             Track<span className="text-red-600">filter</span> Startseite
           </h2>
           <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-2">
             Auswahl der Kriterien für die Startseiten-Tracks
           </p>
         </div>
         <Filter className="text-red-600" size={32} />
       </div>

       <div className="space-y-3">
         {OPTIONS.map((opt) => (
           <label
             key={opt.id}
             className={`flex items-center justify-between gap-3 border-2 rounded-[1.5rem] px-4 py-3 transition-colors cursor-pointer ${
               selected === opt.id ? 'border-red-600 bg-red-50' : 'border-black/10 bg-white'
             }`}
           >
             <div>
               <div className="text-sm font-black uppercase">{opt.label}</div>
               <div className="text-[11px] font-mono opacity-60">{opt.hint}</div>
             </div>
             <input
               type="radio"
               name="homepage-track-filter"
               value={opt.id}
               checked={selected === opt.id}
               onChange={() => setSelected(opt.id)}
               className="h-4 w-4 accent-red-600"
               disabled={loading}
             />
           </label>
         ))}
       </div>

       <div className="mt-6 flex items-center gap-3">
         <button
           type="button"
           onClick={handleSave}
           disabled={saving || loading}
           className="bg-black text-white px-4 py-2 rounded-full font-black uppercase text-xs hover:bg-red-600 transition-colors disabled:opacity-60"
         >
           {saving ? '...' : 'Speichern'}
         </button>
         {status && <span className="text-xs font-bold uppercase text-zinc-500">{status}</span>}
       </div>
     </div>
   )
 }
