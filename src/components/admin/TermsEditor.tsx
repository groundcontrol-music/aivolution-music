'use client'

import { useState } from 'react'
import { Pencil, Trash2, Plus, Save, X } from 'lucide-react'

type Term = {
  id: string
  label: string
  is_required: boolean
  sort_order: number
  is_active: boolean
}

export default function TermsEditor({ initialTerms }: { initialTerms: Term[] }) {
  const [terms, setTerms] = useState(initialTerms)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const handleSave = async (id: string) => {
    const response = await fetch('/api/admin/terms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, label: editText })
    })

    if (response.ok) {
      setTerms(terms.map(t => t.id === id ? { ...t, label: editText } : t))
      setEditingId(null)
    } else {
      alert('Fehler beim Speichern')
    }
  }

  const handleToggleActive = async (id: string, currentState: boolean) => {
    const response = await fetch('/api/admin/terms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !currentState })
    })

    if (response.ok) {
      setTerms(terms.map(t => t.id === id ? { ...t, is_active: !currentState } : t))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Wirklich löschen?')) return

    const response = await fetch('/api/admin/terms', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })

    if (response.ok) {
      setTerms(terms.filter(t => t.id !== id))
    }
  }

  return (
    <div className="space-y-4">
      {terms.map((term) => (
        <div
          key={term.id}
          className={`border-2 border-black p-4 rounded-lg ${!term.is_active ? 'opacity-50 bg-zinc-100' : 'bg-white'}`}
        >
          {editingId === term.id ? (
            <div className="space-y-3">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-2 border-2 border-black rounded-sm font-medium text-sm resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(term.id)}
                  className="px-4 py-2 bg-black text-white font-bold uppercase text-xs hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <Save size={14} /> Speichern
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 border-2 border-black font-bold uppercase text-xs hover:bg-zinc-100 transition-colors flex items-center gap-2"
                >
                  <X size={14} /> Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium leading-relaxed">{term.label}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] font-bold uppercase bg-zinc-100 px-2 py-0.5 rounded">
                    {term.is_required ? 'Pflicht' : 'Optional'}
                  </span>
                  <span className="text-[10px] font-bold uppercase bg-zinc-100 px-2 py-0.5 rounded">
                    #{term.sort_order}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingId(term.id)
                    setEditText(term.label)
                  }}
                  className="p-2 border border-black hover:bg-zinc-100 transition-colors"
                  title="Editieren"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleToggleActive(term.id, term.is_active)}
                  className={`px-3 py-2 border border-black text-xs font-bold uppercase ${term.is_active ? 'bg-green-500 text-white' : 'bg-zinc-200'}`}
                  title={term.is_active ? 'Deaktivieren' : 'Aktivieren'}
                >
                  {term.is_active ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => handleDelete(term.id)}
                  className="p-2 border border-black hover:bg-red-600 hover:text-white transition-colors"
                  title="Löschen"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        className="w-full p-4 border-2 border-dashed border-black rounded-lg hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2 font-bold uppercase text-sm"
      >
        <Plus size={16} /> Neue Checkbox hinzufügen
      </button>
    </div>
  )
}
