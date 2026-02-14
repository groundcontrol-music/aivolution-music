import { createClient } from '@/utils/supabase/server'
import { updateApplicationStatus } from '../actions'
import { Check, X, Play, ShieldCheck } from 'lucide-react'

// Einfache Server Action Wrapper Component für Buttons
// (Da wir keine Client Component für die ganze Page machen wollen, 
// bauen wir kleine Client Components für die Buttons oder nutzen Server Actions direkt im Form)
import ApplicationCard from '@/components/admin/ApplicationCard' 

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

export default async function AdminApplicationsPage() {
  const supabase = await createClient()

  // Hole pending Creator-Profile (vereinfachte Ansicht)
  // WICHTIG: Suche nach 'user' mit 'submitted' Status (vor Freischaltung)
  const { data: applications } = await supabase
    .from('profiles')
    .select('id, artist_name, artist_name_slug, avatar_url, bio, created_at, updated_at')
    .eq('visibility', 'pending')
    .eq('onboarding_status', 'submitted')
    .order('updated_at', { ascending: false })

  // Zähle Songs pro Creator
  const userIds = applications?.map(a => a.id) || []
  const { data: songCounts } = await supabase
    .from('songs')
    .select('user_id')
    .in('user_id', userIds)

  const songCountMap = songCounts?.reduce((acc, song) => {
    acc[song.user_id] = (acc[song.user_id] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b-2 border-black pb-4">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            Neue <span className="text-red-600">Bewerbungen</span>
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40">Klicke auf Profil → Direkt prüfen & freischalten</p>
        </div>
        <div className="text-xl font-black">{applications?.length || 0} OFFEN</div>
      </div>

      <div className="grid gap-4">
        {applications?.length === 0 && (
          <div className="p-12 text-center border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-400 font-bold uppercase">Keine offenen Bewerbungen</p>
          </div>
        )}

        {applications?.map((app) => (
          <Link
            key={app.id}
            href={`/creator/${app.artist_name_slug}`}
            className="group border-2 border-black bg-white p-6 rounded-lg hover:shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] hover:-translate-y-1 transition-all duration-200 flex items-center gap-6"
          >
            {/* Avatar */}
            <div className="w-16 h-16 bg-zinc-100 rounded-full border-2 border-black overflow-hidden flex-shrink-0">
              {app.avatar_url ? (
                <img src={app.avatar_url} alt={app.artist_name || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-zinc-300">
                  {app.artist_name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-black uppercase italic tracking-tighter truncate group-hover:text-red-600 transition-colors">
                {app.artist_name || 'Unbekannt'}
              </h3>
              <p className="text-sm text-gray-600 truncate mt-1">{app.bio || 'Keine Bio'}</p>
              <div className="flex items-center gap-4 mt-2 text-xs font-bold uppercase text-gray-500">
                <span>🎵 {songCountMap[app.id] || 0} Songs</span>
                <span>📅 {new Date(app.created_at).toLocaleDateString('de-DE')}</span>
              </div>
            </div>

            {/* Arrow */}
            <ExternalLink className="text-red-600 flex-shrink-0 group-hover:translate-x-1 transition-transform" size={24} />
          </Link>
        ))}
      </div>
    </div>
  )
}
