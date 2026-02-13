import { createClient } from '@/utils/supabase/server'
import AdminNav from './AdminNav'

export default async function AdminNavWithBadges() {
  const supabase = await createClient()

  // Fetch Badge Counts
  const badges: { [key: string]: { count: number; type: 'success' | 'warning' | 'danger' } } = {}

  // Kuration: Neue Bewerbungen
  const { count: applicationCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('onboarding_status', 'submitted')
  
  if (applicationCount && applicationCount > 0) {
    badges['/admin/applications'] = { count: applicationCount, type: 'success' }
  }

  // Meldungen: Offene Reports
  const { count: reportsCount } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (reportsCount && reportsCount > 0) {
    badges['/admin/reports'] = { 
      count: reportsCount, 
      type: reportsCount >= 3 ? 'danger' : 'warning' 
    }
  }

  // Filter: Aktive Filter (Grün wenn vorhanden)
  const { count: filterCount } = await supabase
    .from('content_filters')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  if (filterCount && filterCount > 0) {
    badges['/admin/filters'] = { count: filterCount, type: 'success' }
  }

  // Media: Slots mit Media (Grün)
  const { count: mediaCount } = await supabase
    .from('promo_slots')
    .select('*', { count: 'exact', head: true })
    .in('slot_id', [1, 2, 3, 4])
    .not('media_type', 'is', null)
    .neq('media_type', 'none')

  if (mediaCount && mediaCount > 0) {
    badges['/admin/media'] = { count: mediaCount, type: 'success' }
  }

  return <AdminNav badges={badges} />
}
