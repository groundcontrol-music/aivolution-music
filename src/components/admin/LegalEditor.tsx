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

export default function LegalEditor({ initial }: { initial: LegalPage[] }) {
  const [impressum, setImpressum] = useState<LegalPage | null>(null)
  const [agb, setAgb] = useState<LegalPage | null>(null)
  const [datenschutz, setDatenschutz] = useState<LegalPage | null>(null)
  const [hilfe, setHilfe] = useState<LegalPage | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    setImpressum(initial.find((p) => p.key === 'impressum') ?? { key: 'impressum', title: 'Impressum', content: '' })
    setAgb(initial.find((p) => p.key === 'agb') ?? { key: 'agb', title: 'AGB', content: '' })
    setDatenschutz(initial.find((p) => p.key === 'datenschutz') ?? { key: 'datenschutz', title: 'Datenschutz', content: '' })
    setHilfe(initial.find((p) => p.key === 'hilfe') ?? { key: 'hilfe', title: 'Hilfe', content: '' })
  }, [initial])

  const setters: Record<LegalKey, React.Dispatch<React.SetStateAction<LegalPage | null>>> = {
    impressum: setImpressum,
    agb: setAgb,
    datenschutz: setDatenschutz,
    hilfe: setHilfe,
  }

  const save = async (key: LegalKey, page: LegalPage) => {
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

  if (!impressum || !agb || !datenschutz || !hilfe) return null

  const boxClass = 'bg-white border-2 border-black rounded-[1.5rem] p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
  const a4Width = 'max-w-[210mm]' // Din A4 Breite

  const LegalBox = ({ page, keyName }: { page: LegalPage; keyName: LegalKey }) => (
    <div key={keyName} className={`${boxClass} ${a4Width} mx-auto`}>
      <h3 className="text-lg font-black uppercase mb-3">{page.title}</h3>
      <p className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Titel</p>
      <input
        value={page.title}
        onChange={(e) => setters[keyName]((p) => (p ? { ...p, title: e.target.value } : p))}
        className="w-full border-2 border-black rounded px-3 py-2 text-sm mb-4"
      />
      <p className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Inhalt (Style wie Din A4)</p>
      <textarea
        value={page.content}
        onChange={(e) => setters[keyName]((p) => (p ? { ...p, content: e.target.value } : p))}
        className="w-full border-2 border-black rounded px-3 py-2 text-sm min-h-[280px] resize-y font-mono text-xs"
        placeholder={`${keyName}-Text…`}
      />
      <button
        onClick={() => save(keyName, page)}
        disabled={saving === keyName}
        className="mt-4 px-4 py-2 bg-black text-white font-bold uppercase text-xs hover:bg-red-600 flex items-center gap-2 rounded-lg"
      >
        {saving === keyName ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {keyName} speichern
      </button>
    </div>
  )

  return (
    <div className="space-y-8">
      <LegalBox page={impressum} keyName="impressum" />
      <LegalBox page={agb} keyName="agb" />
      <LegalBox page={datenschutz} keyName="datenschutz" />
      <LegalBox page={hilfe} keyName="hilfe" />
    </div>
  )
}
