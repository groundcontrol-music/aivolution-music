import { createClient } from '@/utils/supabase/server'
import { updateApplicationStatus } from '../actions'
import { Check, X, Play, ShieldCheck } from 'lucide-react'

// Einfache Server Action Wrapper Component für Buttons
// (Da wir keine Client Component für die ganze Page machen wollen, 
// bauen wir kleine Client Components für die Buttons oder nutzen Server Actions direkt im Form)
import ApplicationCard from '@/components/admin/ApplicationCard' 

export default async function AdminApplicationsPage() {
  const supabase = await createClient()

  // 1. Hole alle submitted Profiles
  const { data: applications } = await supabase
    .from('profiles')
    .select('*')
    .eq('onboarding_status', 'submitted')
    .order('updated_at', { ascending: false })

  // 2. Hole zugehörige Probe-Songs für diese User
  // (Wir machen das user-by-user oder mit einem "in" query, aber hier ist es einfacher user-by-user im Loop oder Client Comp)
  // Besser: Einmal alle Songs holen wo user_id in applications.map(a => a.id)
  
  const userIds = applications?.map(a => a.id) || []
  const { data: songs } = await supabase
    .from('songs')
    .select('*')
    .in('user_id', userIds)
    .eq('is_probe', true)

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b-2 border-black pb-4">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            Neue <span className="text-red-600">Bewerbungen</span>
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40">Review pending Creator Applications</p>
        </div>
        <div className="text-xl font-black">{applications?.length || 0} OFFEN</div>
      </div>

      <div className="grid gap-8">
        {applications?.length === 0 && (
          <div className="p-12 text-center border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-400 font-bold uppercase">Keine offenen Bewerbungen</p>
          </div>
        )}

        {applications?.map((app) => {
          const appSongs = songs?.filter(s => s.user_id === app.id) || []
          
          return (
             <ApplicationCard key={app.id} application={app} songs={appSongs} />
          )
        })}
      </div>
    </div>
  )
}
