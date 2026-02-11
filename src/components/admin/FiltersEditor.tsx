'use client'

import { useState } from 'react'
import { Trash2, Plus, Shield } from 'lucide-react'

type Filter = {
  id: string
  word: string
  severity: 'low' | 'medium' | 'high'
  is_active: boolean
}

export default function FiltersEditor({ initialFilters }: { initialFilters: Filter[] }) {
  const [filters, setFilters] = useState(initialFilters)
  const [newWord, setNewWord] = useState('')

  const handleAdd = async () => {
    if (!newWord.trim()) return

    const response = await fetch('/api/admin/filters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: newWord.toLowerCase().trim() })
    })

    if (response.ok) {
      const { data } = await response.json()
      setFilters([...filters, data])
      setNewWord('')
    } else {
      alert('Fehler beim Hinzufügen (Word existiert evtl. schon)')
    }
  }

  const handleToggle = async (id: string, currentState: boolean) => {
    const response = await fetch('/api/admin/filters', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !currentState })
    })

    if (response.ok) {
      setFilters(filters.map(f => f.id === id ? { ...f, is_active: !currentState } : f))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Wirklich löschen?')) return

    const response = await fetch('/api/admin/filters', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })

    if (response.ok) {
      setFilters(filters.filter(f => f.id !== id))
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-600 text-white'
      case 'medium': return 'bg-orange-500 text-white'
      case 'low': return 'bg-yellow-500 text-black'
      default: return 'bg-gray-500 text-white'
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Add New */}
      <div className="border-2 border-black bg-white p-4 rounded-lg flex gap-3">
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Neues Bad-Word eingeben..."
          className="flex-1 p-2 border-2 border-black rounded-sm font-mono text-sm focus:border-red-600 outline-none"
        />
        <button
          onClick={handleAdd}
          className="px-6 py-2 bg-black text-white font-bold uppercase text-xs hover:bg-red-600 transition-colors flex items-center gap-2"
        >
          <Plus size={14} /> Hinzufügen
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filters.map((filter) => (
          <div
            key={filter.id}
            className={`border-2 border-black p-3 rounded-lg flex justify-between items-center ${!filter.is_active ? 'opacity-50 bg-zinc-100' : 'bg-white'}`}
          >
            <div className="flex items-center gap-3">
              <Shield size={16} className={filter.is_active ? 'text-red-600' : 'text-gray-400'} />
              <span className="font-mono font-bold text-sm">{filter.word}</span>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${getSeverityColor(filter.severity)}`}>
                {filter.severity}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleToggle(filter.id, filter.is_active)}
                className={`px-2 py-1 text-[9px] font-bold uppercase border border-black ${filter.is_active ? 'bg-green-500 text-white' : 'bg-zinc-200'}`}
                title={filter.is_active ? 'Deaktivieren' : 'Aktivieren'}
              >
                {filter.is_active ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => handleDelete(filter.id)}
                className="p-1 border border-black hover:bg-red-600 hover:text-white transition-colors"
                title="Löschen"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filters.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-400 font-bold uppercase text-sm">Keine Filter vorhanden</p>
        </div>
      )}

    </div>
  )
}
