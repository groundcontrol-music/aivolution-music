'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'

type LegalKey = 'impressum' | 'agb' | 'datenschutz' | 'hilfe'

type LegalPage = {
  key: string
  title: string
  content: string
  updated_at?: string
}

const fallback = (key: LegalKey, title: string): LegalPage => ({ key, title, content: '' })
const DEFAULT_KEYS: LegalKey[] = ['impressum', 'agb', 'datenschutz', 'hilfe']
const DEFAULT_TITLES: Record<LegalKey, string> = { impressum: 'Impressum', agb: 'AGB', datenschutz: 'Datenschutz', hilfe: 'Hilfe' }

export default function LegalEditor() {
  const [pages, setPages] = useState<LegalPage[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/admin/legal')
      .then((res) => res.json())
      .then((data: LegalPage[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const merged = DEFAULT_KEYS.map((key) => data.find((p) => p.key === key) ?? fallback(key, DEFAULT_TITLES[key]))
          setPages(merged)
        } else {
          setPages(DEFAULT_KEYS.map((key) => fallback(key, DEFAULT_TITLES[key])))
        }
        setLoaded(true)
      })
      .catch(() => {
        setPages(DEFAULT_KEYS.map((key) => fallback(key, DEFAULT_TITLES[key])))
        setLoaded(true)
      })
  }, [])

  const updatePage = (key: LegalKey, patch: Partial<LegalPage>) => {
    setPages((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)))
  }

  const save = async (key: LegalKey) => {
    const page = pages.find((p) => p.key === key)
    if (!page) return
    setSaving(key)
    try {
      const res = await fetch('/api/admin/legal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: page.key, title: page.title, content: page.content }),
      })
      if (!res.ok) throw new Error(await res.text())
      alert('Gespeichert.')
    } catch (e) {
      alert('Fehler: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(null)
    }
  }

  const boxClass = 'bg-white border-2 border-black rounded-[1.5rem] p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-[210mm] mx-auto'

  if (!loaded) {
    return <p className="text-sm text-zinc-500 py-4">Laden…</p>
  }

  return (
    <div className="space-y-8">
      {pages.map((page) => (
        <div key={page.key} className={boxClass}>
          <h3 className="text-lg font-black uppercase mb-3">{page.title}</h3>
          <p className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Titel</p>
          <input
            value={page.title}
            onChange={(e) => updatePage(page.key as LegalKey, { title: e.target.value })}
            className="w-full border-2 border-black rounded px-3 py-2 text-sm mb-4"
          />
          <p className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Inhalt (Style wie Din A4)</p>
          <textarea
            value={page.content}
            onChange={(e) => updatePage(page.key as LegalKey, { content: e.target.value })}
            className="w-full border-2 border-black rounded px-3 py-2 text-sm min-h-[280px] resize-y font-mono text-xs"
            placeholder={`${page.key}-Text…`}
          />
          <button
            onClick={() => save(page.key as LegalKey)}
            disabled={saving === page.key}
            className="mt-4 px-4 py-2 bg-black text-white font-bold uppercase text-xs hover:bg-red-600 flex items-center gap-2 rounded-lg"
          >
            {saving === page.key ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {page.key} speichern
          </button>
        </div>
      ))}
    </div>
  )
}
