import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Activity, Shield, Bug, Wrench, FileText, Megaphone, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default async function AdminKontrollePage() {
  const supabase = await createClient()

  const { count: pendingApplications } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('onboarding_status', 'submitted')

  const { count: pendingReports } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: activeFilters } = await supabase
    .from('content_filters')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { data: precheckRows } = await supabase
    .from('system_precheck_status')
    .select('check_key, status, details, next_step, checked_at')
    .order('check_key', { ascending: true })

  const precheckList = precheckRows || []
  const precheckWarns = precheckList.filter((row: any) => row.status === 'WARN')
  const precheckOk = precheckList.filter((row: any) => row.status === 'OK').length
  const precheckStatus = precheckList.length === 0 ? 'unknown' : precheckWarns.length > 0 ? 'warn' : 'ok'
  const precheckCheckedAt = precheckList[0]?.checked_at
    ? new Date(precheckList[0].checked_at).toLocaleString('de-DE')
    : null

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
                Kon<span className="text-red-600">trolle</span>
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-2">
                Schnelle Auskunft ohne Code lesen
              </p>
            </div>
            <Activity className="text-red-600" size={44} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border-2 border-black rounded-xl p-5">
            <div className="text-xs font-black uppercase opacity-50">Neue Bewerbungen</div>
            <div className="text-4xl font-black text-green-600 mt-1">{pendingApplications || 0}</div>
            <p className="text-xs mt-2">Kommt aus dem Messagesystem (Kuration/Logik).</p>
          </div>
          <div className="bg-white border-2 border-black rounded-xl p-5">
            <div className="text-xs font-black uppercase opacity-50">Offene Meldungen</div>
            <div className="text-4xl font-black text-red-600 mt-1">{pendingReports || 0}</div>
            <p className="text-xs mt-2">Nutzerreports, die geprüft werden müssen.</p>
          </div>
          <div className="bg-white border-2 border-black rounded-xl p-5">
            <div className="text-xs font-black uppercase opacity-50">Aktive Filter</div>
            <div className="text-4xl font-black text-black mt-1">{activeFilters || 0}</div>
            <p className="text-xs mt-2">Inhaltsfilter gegen Missbrauch.</p>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase opacity-50">System-Precheck (DB/RLS/Storage)</div>
              <div className="mt-2 flex items-center gap-2">
                {precheckStatus === 'ok' && (
                  <>
                    <CheckCircle2 className="text-green-600" size={18} />
                    <span className="text-lg font-black text-green-600">GRUEN</span>
                  </>
                )}
                {precheckStatus === 'warn' && (
                  <>
                    <AlertTriangle className="text-red-600" size={18} />
                    <span className="text-lg font-black text-red-600">GELB/ROT</span>
                  </>
                )}
                {precheckStatus === 'unknown' && (
                  <>
                    <AlertTriangle className="text-zinc-500" size={18} />
                    <span className="text-lg font-black text-zinc-600">NOCH KEIN LAUF</span>
                  </>
                )}
              </div>
              <p className="text-xs mt-2">
                {precheckStatus === 'unknown'
                  ? 'Fuehre SQL_PRECHECK.sql einmal im Supabase SQL Editor aus.'
                  : `${precheckWarns.length} WARN / ${precheckOk} OK`}
              </p>
              {precheckCheckedAt && (
                <p className="text-[11px] opacity-60 mt-1">Zuletzt geprueft: {precheckCheckedAt}</p>
              )}
            </div>
            <a
              href="/admin/kontrolle"
              className="shrink-0 bg-black text-white px-3 py-2 text-[11px] font-black uppercase rounded-sm hover:bg-red-600 transition-colors"
            >
              Neu laden
            </a>
          </div>

          {precheckWarns.length > 0 && (
            <div className="mt-4 space-y-2">
              {precheckWarns.slice(0, 5).map((row: any) => (
                <div key={row.check_key} className="border border-red-300 bg-red-50 rounded-sm p-2">
                  <p className="text-[11px] font-black uppercase text-red-700">{row.check_key}</p>
                  <p className="text-xs">{row.details}</p>
                  {row.next_step && <p className="text-[11px] mt-1 font-mono opacity-80">{row.next_step}</p>}
                </div>
              ))}
              {precheckWarns.length > 5 && (
                <p className="text-[11px] opacity-60">... und {precheckWarns.length - 5} weitere WARN-Eintraege.</p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/messages" className="bg-white border-2 border-black rounded-xl p-5 hover:bg-black hover:text-white transition-colors">
            <div className="flex items-center gap-2 mb-2"><FileText size={18} /><span className="font-black uppercase text-sm">Messages</span></div>
            <p className="text-sm">Bewerbungen, Systemnachrichten und schnelle Sprünge zur Prüfung.</p>
          </Link>
          <Link href="/admin/messages-inspector" className="bg-white border-2 border-black rounded-xl p-5 hover:bg-black hover:text-white transition-colors">
            <div className="flex items-center gap-2 mb-2"><Shield size={18} /><span className="font-black uppercase text-sm">Behörden-Inspector</span></div>
            <p className="text-sm">Gesicherte Einsicht/Auszug für rechtliche Anfragen.</p>
          </Link>
          <Link href="/admin/refresh-session" className="bg-white border-2 border-black rounded-xl p-5 hover:bg-black hover:text-white transition-colors">
            <div className="flex items-center gap-2 mb-2"><Bug size={18} /><span className="font-black uppercase text-sm">Session Fix</span></div>
            <p className="text-sm">Wenn Rechte/Ansichten hängen, Session sauber aktualisieren.</p>
          </Link>
          <Link href="/admin/filters" className="bg-white border-2 border-black rounded-xl p-5 hover:bg-black hover:text-white transition-colors">
            <div className="flex items-center gap-2 mb-2"><Wrench size={18} /><span className="font-black uppercase text-sm">Filter Wartung</span></div>
            <p className="text-sm">Regeln gegen Bad Content, Spam und Missbrauch.</p>
          </Link>
          <Link href="/admin/media" className="bg-white border-2 border-black rounded-xl p-5 hover:bg-black hover:text-white transition-colors">
            <div className="flex items-center gap-2 mb-2"><Megaphone size={18} /><span className="font-black uppercase text-sm">Media & Mailtexte</span></div>
            <p className="text-sm">Boxen und Kuration-Zusage/Ablehnungstexte zentral anpassen.</p>
          </Link>
          <Link href="/admin/postamt" className="bg-white border-2 border-black rounded-xl p-5 hover:bg-black hover:text-white transition-colors">
            <div className="flex items-center gap-2 mb-2"><FileText size={18} /><span className="font-black uppercase text-sm">Logbuch</span></div>
            <p className="text-sm">Aufgaben, Ideen und rechtliche To-dos schnell notieren.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
