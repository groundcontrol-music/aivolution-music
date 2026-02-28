import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

type SearchParams = Promise<{
  q?: string
  range?: 'all' | 'online' | '24h' | '7d' | '30d'
}>

function rangeToThreshold(range: string | undefined) {
  const now = Date.now()
  if (range === 'online') return new Date(now - 10 * 60 * 1000).toISOString()
  if (range === '24h') return new Date(now - 24 * 60 * 60 * 1000).toISOString()
  if (range === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  if (range === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  return null
}

export default async function AdminUseruebersichtPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')
  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin') redirect('/')

  const params = await searchParams
  const q = (params.q || '').trim()
  const range = params.range || 'all'

  const thresholdOnline = rangeToThreshold('online')!
  const threshold24h = rangeToThreshold('24h')!
  const threshold7d = rangeToThreshold('7d')!
  const threshold30d = rangeToThreshold('30d')!
  const activeThreshold = rangeToThreshold(range)

  const [{ count: onlineNow }, { count: active24h }, { count: active7d }, { count: active30d }] =
    await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', thresholdOnline),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', threshold24h),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', threshold7d),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', threshold30d),
    ])

  let listQuery = supabase
    .from('profiles')
    .select('id, artist_name, artist_name_slug, role, onboarding_status, visibility, updated_at')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(100)

  if (q) {
    listQuery = listQuery.or(`artist_name.ilike.%${q}%,artist_name_slug.ilike.%${q}%`)
  }
  // WICHTIG: Bei manueller Suche immer global suchen (auch offline User finden)
  if (activeThreshold && !q) {
    listQuery = listQuery.gte('updated_at', activeThreshold)
  }

  const { data: rows } = await listQuery

  const { data: suggestionRows } = await supabase
    .from('profiles')
    .select('artist_name')
    .not('artist_name', 'is', null)
    .order('artist_name', { ascending: true })
    .limit(200)

  const suggestions = (suggestionRows || [])
    .map((row: any) => row.artist_name as string)
    .filter(Boolean)

  const rangeLabel =
    range === 'online'
      ? 'Aktiv (letzte 10 Minuten)'
      : range === '24h'
        ? 'Aktiv in 24h'
        : range === '7d'
          ? 'Aktiv in 7 Tagen'
          : range === '30d'
            ? 'Aktiv in 30 Tagen'
            : 'Alle User'

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">
            User<span className="text-red-600">übersicht</span>
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-2">
            Admin-Zugriff auf Creator/User Aktivität und Profile
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/admin/useruebersicht?range=online" className="bg-white border-2 border-black rounded-xl p-4 hover:bg-black hover:text-white transition-colors">
            <div className="text-[11px] font-black uppercase opacity-60">Online jetzt</div>
            <div className="text-3xl font-black mt-1">{onlineNow || 0}</div>
          </Link>
          <Link href="/admin/useruebersicht?range=24h" className="bg-white border-2 border-black rounded-xl p-4 hover:bg-black hover:text-white transition-colors">
            <div className="text-[11px] font-black uppercase opacity-60">Aktiv 24h</div>
            <div className="text-3xl font-black mt-1">{active24h || 0}</div>
          </Link>
          <Link href="/admin/useruebersicht?range=7d" className="bg-white border-2 border-black rounded-xl p-4 hover:bg-black hover:text-white transition-colors">
            <div className="text-[11px] font-black uppercase opacity-60">Aktiv 7 Tage</div>
            <div className="text-3xl font-black mt-1">{active7d || 0}</div>
          </Link>
          <Link href="/admin/useruebersicht?range=30d" className="bg-white border-2 border-black rounded-xl p-4 hover:bg-black hover:text-white transition-colors">
            <div className="text-[11px] font-black uppercase opacity-60">Aktiv 30 Tage</div>
            <div className="text-3xl font-black mt-1">{active30d || 0}</div>
          </Link>
        </div>

        <div className="bg-white border-2 border-black rounded-xl p-4 md:p-5">
          <form method="GET" className="flex flex-col md:flex-row gap-3">
            <input type="hidden" name="range" value={range} />
            <input
              type="text"
              name="q"
              defaultValue={q}
              list="artist-suggestions"
              placeholder="Profilname suchen (z.B. Lud...)"
              className="flex-1 border-2 border-black rounded-md px-3 py-2 font-medium"
            />
            <datalist id="artist-suggestions">
              {suggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <button type="submit" className="bg-black text-white px-4 py-2 rounded-md font-black uppercase text-xs hover:bg-red-600 transition-colors">
              Suchen
            </button>
            <Link href="/admin/useruebersicht?range=all" className="bg-zinc-200 px-4 py-2 rounded-md font-black uppercase text-xs text-center hover:bg-zinc-300 transition-colors">
              Reset
            </Link>
          </form>
          <p className="text-xs mt-2 opacity-60">Anzeige: {rangeLabel}</p>
        </div>

        <div className="bg-white border-2 border-black rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead className="bg-zinc-100">
                <tr className="text-left text-xs uppercase">
                  <th className="px-3 py-2 font-black">Name</th>
                  <th className="px-3 py-2 font-black">Slug</th>
                  <th className="px-3 py-2 font-black">Role</th>
                  <th className="px-3 py-2 font-black">Status</th>
                  <th className="px-3 py-2 font-black">Sichtbarkeit</th>
                  <th className="px-3 py-2 font-black">Zuletzt aktiv</th>
                  <th className="px-3 py-2 font-black">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {(rows || []).map((row: any) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 text-sm font-semibold">{row.artist_name || '—'}</td>
                    <td className="px-3 py-2 text-xs font-mono">{row.artist_name_slug || '—'}</td>
                    <td className="px-3 py-2 text-xs">{row.role || '—'}</td>
                    <td className="px-3 py-2 text-xs">{row.onboarding_status || '—'}</td>
                    <td className="px-3 py-2 text-xs">{row.visibility || '—'}</td>
                    <td className="px-3 py-2 text-xs">
                      {row.updated_at ? new Date(row.updated_at).toLocaleString('de-DE') : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="flex gap-2">
                        {row.artist_name_slug ? (
                          <Link
                            href={`/creator/${row.artist_name_slug}`}
                            className="px-2 py-1 border border-black rounded hover:bg-black hover:text-white transition-colors"
                          >
                            Profil
                          </Link>
                        ) : (
                          <span className="px-2 py-1 border border-zinc-300 rounded text-zinc-400">Kein Slug</span>
                        )}
                        <Link
                          href={`/admin/review/${row.id}`}
                          className="px-2 py-1 border border-black rounded hover:bg-black hover:text-white transition-colors"
                        >
                          Review
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {(rows || []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm opacity-60">
                      Keine User gefunden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
