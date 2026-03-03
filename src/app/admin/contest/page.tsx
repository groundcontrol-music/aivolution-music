import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import SubscriptionPlansClient from '@/components/admin/SubscriptionPlansClient'

export default async function AdminContestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()
  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin') return notFound()

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <SubscriptionPlansClient />
      </div>
    </div>
  )
}
