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

      <FiltersEditor initialFilters={filters || []} />
    </div>
  )
}
