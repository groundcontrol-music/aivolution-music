'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpenText, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react'

type Category = 'Wartung' | 'Code' | 'Werbung' | 'To do' | 'Idee' | 'Rechtliches'

type LogEntry = {
  id: string
  title: string
  note: string
  category: Category
  done: boolean
  createdAt: string
}

const STORAGE_KEY = 'aivolution_admin_logbuch_v1'
const CATEGORIES: Category[] = ['Wartung', 'Code', 'Werbung', 'To do', 'Idee', 'Rechtliches']

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function AdminLogbuchPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [category, setCategory] = useState<Category>('To do')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as LogEntry[]
      setEntries(Array.isArray(parsed) ? parsed : [])
    } catch {
      setEntries([])
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  const grouped = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      category: cat,
      items: entries
        .filter((e) => e.category === cat)
        .sort((a, b) => Number(a.done) - Number(b.done) || (a.createdAt < b.createdAt ? 1 : -1)),
    }))
  }, [entries])

  const addEntry = () => {
    if (!title.trim()) return
    const newItem: LogEntry = {
      id: makeId(),
      title: title.trim(),
      note: note.trim(),
      category,
      done: false,
      createdAt: new Date().toISOString(),
    }
    setEntries((prev) => [newItem, ...prev])
    setTitle('')
    setNote('')
  }

  const toggleDone = (id: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, done: !e.done } : e)))
  }

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const openCount = entries.filter((e) => !e.done).length

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-8 mb-6 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
                Log<span className="text-red-600">buch</span>
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest opacity-50 mt-2">
                Wartung • Code • Werbung • To do • Idee • Rechtliches
              </p>
            </div>
            <BookOpenText size={42} className="text-red-600" />
          </div>

          <div className="mt-5 inline-flex items-center gap-2 bg-zinc-100 border-2 border-black px-3 py-2 rounded-lg text-xs font-black uppercase">
            <span>Offen:</span>
            <span className="text-red-600">{openCount}</span>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-[2.5rem] p-6 mb-6">
          <h2 className="text-sm font-black uppercase mb-4">Neuer Eintrag</h2>
          <div className="grid md:grid-cols-4 gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="border-2 border-black p-3 font-bold"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel (Pflicht)"
              className="md:col-span-2 border-2 border-black p-3 font-medium"
            />

            <button
              onClick={addEntry}
              className="bg-black text-white font-black uppercase p-3 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Hinzufügen
            </button>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notiz (optional)"
            rows={3}
            className="mt-3 w-full border-2 border-black p-3 font-medium"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {grouped.map((group) => (
            <section key={group.category} className="bg-white border-2 border-black rounded-[2.5rem] p-5">
              <h3 className="text-lg font-black uppercase mb-4 border-b-2 border-black pb-2">{group.category}</h3>

              {group.items.length === 0 ? (
                <p className="text-sm text-zinc-500 font-medium">Keine Einträge.</p>
              ) : (
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className={`border-2 rounded-xl p-3 ${item.done ? 'border-green-600 bg-green-50' : 'border-black bg-white'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`font-black uppercase text-sm ${item.done ? 'line-through opacity-60' : ''}`}>
                            {item.title}
                          </p>
                          {item.note && <p className="text-sm mt-1 whitespace-pre-wrap">{item.note}</p>}
                          <p className="text-[10px] font-mono opacity-50 mt-2">
                            {new Date(item.createdAt).toLocaleString('de-DE')}
                          </p>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => toggleDone(item.id)}
                            className="border-2 border-black p-2 hover:bg-black hover:text-white transition-colors"
                            title={item.done ? 'Als offen markieren' : 'Als erledigt markieren'}
                          >
                            {item.done ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                          </button>
                          <button
                            onClick={() => removeEntry(item.id)}
                            className="border-2 border-red-600 text-red-600 p-2 hover:bg-red-600 hover:text-white transition-colors"
                            title="Eintrag löschen"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
