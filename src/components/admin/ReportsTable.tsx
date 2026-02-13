'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Report {
  id: string
  reporter_id: string
  reported_content_type: string
  reported_content_id: string
  reason?: string
  status: 'pending' | 'reviewed' | 'ignored' | 'action_taken'
  created_at: string
  reviewed_by?: string
  reviewed_at?: string
  admin_notes?: string
  profiles: { artist_name: string }
  reviewed?: { artist_name: string }
}

export default function ReportsTable({ reports }: { reports: Report[] }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'ignored' | 'action_taken'>('pending')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const filteredReports = filter === 'all' 
    ? reports 
    : reports.filter(r => r.status === filter)

  const updateReportStatus = async (reportId: string, status: Report['status'], notes?: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('reports')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: notes || null
      })
      .eq('id', reportId)

    if (!error) {
      setSelectedReport(null)
      setAdminNotes('')
      router.refresh()
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-600',
      reviewed: 'bg-blue-100 text-blue-800 border-blue-600',
      ignored: 'bg-gray-100 text-gray-800 border-gray-600',
      action_taken: 'bg-green-100 text-green-800 border-green-600'
    }
    return (
      <span className={`text-xs font-bold uppercase px-2 py-1 border rounded-sm ${styles[status as keyof typeof styles]}`}>
        {status === 'pending' && '⏳ Offen'}
        {status === 'reviewed' && '✓ Geprüft'}
        {status === 'ignored' && '⊘ Ignoriert'}
        {status === 'action_taken' && '⚡ Maßnahme'}
      </span>
    )
  }

  const getContentTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      creator_forum_post: 'Creator Forum Post',
      global_forum_post: 'Globales Forum',
      profile: 'Profil',
      song: 'Song'
    }
    return labels[type] || type
  }

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'pending', 'reviewed', 'ignored', 'action_taken'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            className={`px-4 py-2 text-xs font-bold uppercase border-2 rounded-sm transition-all whitespace-nowrap ${
              filter === status
                ? 'bg-black text-white border-black'
                : 'bg-white border-black hover:bg-zinc-100'
            }`}
          >
            {status === 'all' && 'Alle'}
            {status === 'pending' && '⏳ Offen'}
            {status === 'reviewed' && '✓ Geprüft'}
            {status === 'ignored' && '⊘ Ignoriert'}
            {status === 'action_taken' && '⚡ Maßnahme'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-black text-white">
            <tr>
              <th className="text-left p-4 text-xs font-black uppercase">Gemeldet von</th>
              <th className="text-left p-4 text-xs font-black uppercase">Typ</th>
              <th className="text-left p-4 text-xs font-black uppercase">Grund</th>
              <th className="text-left p-4 text-xs font-black uppercase">Status</th>
              <th className="text-left p-4 text-xs font-black uppercase">Datum</th>
              <th className="text-left p-4 text-xs font-black uppercase">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length > 0 ? (
              filteredReports.map((report, idx) => (
                <tr 
                  key={report.id} 
                  className={`border-t-2 border-black hover:bg-zinc-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}`}
                >
                  <td className="p-4 text-sm font-bold">{report.profiles?.artist_name || 'Unbekannt'}</td>
                  <td className="p-4 text-xs font-medium">{getContentTypeLabel(report.reported_content_type)}</td>
                  <td className="p-4 text-xs">{report.reason || '-'}</td>
                  <td className="p-4">{getStatusBadge(report.status)}</td>
                  <td className="p-4 text-xs font-mono opacity-60">
                    {new Date(report.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => {
                        setSelectedReport(report)
                        setAdminNotes(report.admin_notes || '')
                      }}
                      className="flex items-center gap-1 text-xs font-bold uppercase px-3 py-1 border-2 border-black hover:bg-black hover:text-white transition-colors rounded-sm"
                    >
                      <Eye size={12} />
                      Prüfen
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-12 text-center text-sm font-medium text-zinc-400">
                  Keine Meldungen
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedReport(null)}>
          <div className="bg-white border-4 border-black rounded-lg p-6 max-w-2xl w-full shadow-[12px_12px_0px_0px_rgba(220,38,38,1)]" onClick={(e) => e.stopPropagation()}>
            
            <div className="flex items-start justify-between mb-6 border-b-2 border-black pb-4">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tight mb-2">
                  Meldung <span className="text-red-600">prüfen</span>
                </h2>
                <div className="text-xs font-mono opacity-50">ID: {selectedReport.id}</div>
              </div>
              {getStatusBadge(selectedReport.status)}
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-black uppercase opacity-60 mb-1">Gemeldet von:</div>
                  <div className="text-sm font-bold">{selectedReport.profiles?.artist_name}</div>
                </div>
                <div>
                  <div className="text-xs font-black uppercase opacity-60 mb-1">Content-Typ:</div>
                  <div className="text-sm font-bold">{getContentTypeLabel(selectedReport.reported_content_type)}</div>
                </div>
                <div>
                  <div className="text-xs font-black uppercase opacity-60 mb-1">Content-ID:</div>
                  <div className="text-xs font-mono">{selectedReport.reported_content_id}</div>
                </div>
                <div>
                  <div className="text-xs font-black uppercase opacity-60 mb-1">Datum:</div>
                  <div className="text-xs font-mono">{new Date(selectedReport.created_at).toLocaleString('de-DE')}</div>
                </div>
              </div>

              {selectedReport.reason && (
                <div>
                  <div className="text-xs font-black uppercase opacity-60 mb-1">Grund:</div>
                  <div className="text-sm font-medium bg-zinc-50 border border-black p-3 rounded-sm">
                    {selectedReport.reason}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase opacity-60 mb-1">Admin-Notizen:</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full p-3 border-2 border-black rounded-sm font-medium focus:border-red-600 outline-none resize-none"
                  rows={3}
                  placeholder="Interne Notizen..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => updateReportStatus(selectedReport.id, 'reviewed', adminNotes)}
                className="flex-1 bg-blue-600 text-white py-3 text-xs font-bold uppercase hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle size={14} />
                Als geprüft markieren
              </button>
              <button
                onClick={() => updateReportStatus(selectedReport.id, 'action_taken', adminNotes)}
                className="flex-1 bg-green-600 text-white py-3 text-xs font-bold uppercase hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <AlertTriangle size={14} />
                Maßnahme ergriffen
              </button>
              <button
                onClick={() => updateReportStatus(selectedReport.id, 'ignored', adminNotes)}
                className="flex-1 bg-gray-600 text-white py-3 text-xs font-bold uppercase hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle size={14} />
                Ignorieren
              </button>
            </div>

            <button
              onClick={() => setSelectedReport(null)}
              className="w-full mt-3 border-2 border-black py-2 text-xs font-bold uppercase hover:bg-zinc-100 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
