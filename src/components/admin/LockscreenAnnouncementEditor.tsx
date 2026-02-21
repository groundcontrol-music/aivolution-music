'use client'

import { useEffect, useState } from 'react'

type Row = {
  id: string
  content: string
  is_active: boolean
  created_at: string
}

export default function LockscreenAnnouncementEditor() {
  const [content, setContent] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void loadRows()
  }, [])

  async function loadRows() {
    const res = await fetch('/api/admin/lockscreen', { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setRows(data.rows || [])
  }

  async function submit() {
    if (!content.trim()) return
    setLoading(true)
    const res = await fetch('/api/admin/lockscreen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) {
      alert(data.error || 'Fehler beim Speichern.')
      return
    }
    setContent('')
    await loadRows()
  }

  async function toggleActive(row: Row) {
    const res = await fetch('/api/admin/lockscreen', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, is_active: !row.is_active }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(data.error || 'Fehler beim Aktualisieren.')
      return
    }
    await loadRows()
  }

  return (
    <div className="bg-white border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
      <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">
        Sperrseite <span className="text-red-600">Meldung</span>
      </h2>
      <p className="text-xs font-bold uppercase opacity-50 mb-4">
        Kurze Hinweise unter dem Snake-Spiel anzeigen (mit Datum)
      </p>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="z. B. Wartung heute 22:00 Uhr. Login weiterhin über Aivo."
        className="w-full border-2 border-black rounded-sm p-3 text-sm font-medium resize-none focus:outline-none focus:border-red-600"
      />

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-mono opacity-60">{content.length}/500</span>
        <button
          onClick={submit}
          disabled={loading || !content.trim()}
          className="bg-black text-white px-4 py-2 text-xs font-black uppercase rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Speichern...' : 'Meldung posten'}
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {rows.length === 0 && (
          <p className="text-sm opacity-50">Noch keine Meldungen vorhanden.</p>
        )}
        {rows.map((row) => (
          <div key={row.id} className="border border-black rounded-sm p-3 bg-zinc-50">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-mono opacity-70">
                {new Date(row.created_at).toLocaleString('de-DE')}
              </p>
              <button
                onClick={() => toggleActive(row)}
                className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                  row.is_active
                    ? 'bg-green-100 border-green-600 text-green-700'
                    : 'bg-zinc-200 border-zinc-500 text-zinc-700'
                }`}
              >
                {row.is_active ? 'Aktiv' : 'Inaktiv'}
              </button>
            </div>
            <p className="mt-2 text-sm">{row.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
