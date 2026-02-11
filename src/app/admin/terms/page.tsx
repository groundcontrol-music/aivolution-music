import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TermsEditor from '@/components/admin/TermsEditor'

export default async function AdminTermsPage() {
  const supabase = await createClient()

  // Admin Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin') redirect('/')

  // Hole Terms
  const { data: terms } = await supabase
    .from('onboarding_terms')
    .select('*')
    .order('sort_order')

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b-2 border-black pb-4">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            Onboarding <span className="text-red-600">Terms</span>
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40">
            Editiere die Checkboxen für neue Creator
          </p>
        </div>
      </div>

      <TermsEditor initialTerms={terms || []} />
    </div>
  )
}
