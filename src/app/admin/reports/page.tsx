import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ReportsTable from '@/components/admin/ReportsTable'
import { Flag } from 'lucide-react'

export default async function AdminReportsPage() {
  const supabase = await createClient()

  // Admin Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin' && role !== 'moderation') redirect('/')

  // Fetch Reports (with related data)
  const { data: reports } = await supabase
    .from('reports')
    .select(`
      *,
      profiles!reports_reporter_id_fkey (artist_name),
      reviewed:profiles!reports_reviewed_by_fkey (artist_name)
    `)
    .order('created_at', { ascending: false })

  // Count by status
  const pendingCount = reports?.filter(r => r.status === 'pending').length || 0
  const reviewedCount = reports?.filter(r => r.status === 'reviewed').length || 0

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white border-2 border-black rounded-lg p-6 mb-6 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                Meldungen <span className="text-red-600">&</span> Warnungen
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-1">
                {pendingCount} offen • {reviewedCount} bearbeitet
              </p>
            </div>
            <Flag className="text-red-600" size={48} />
          </div>
        </div>

        {/* Reports Table */}
        <ReportsTable reports={reports || []} />

      </div>
    </div>
  )
}
