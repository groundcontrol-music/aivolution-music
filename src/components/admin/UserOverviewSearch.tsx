'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  initialQuery: string
  range: 'all' | 'online' | '24h' | '7d' | '30d'
  suggestions: string[]
}

export default function UserOverviewSearch({ initialQuery, range, suggestions }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = query.trim()
    const params = new URLSearchParams()
    params.set('range', range)
    if (q) params.set('q', q)
    router.push(`/admin/useruebersicht?${params.toString()}`)
  }

  function handleReset() {
    setQuery('')
    router.push('/admin/useruebersicht?range=all')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        list="artist-suggestions"
        placeholder="Profilname suchen (z.B. Lud...)"
        className="flex-1 border-2 border-black rounded-md px-3 py-2 font-medium"
      />
      <datalist id="artist-suggestions">
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <button
        type="submit"
        className="bg-black text-white px-4 py-2 rounded-md font-black uppercase text-xs hover:bg-red-600 transition-colors"
      >
        Suchen
      </button>
      <button
        type="button"
        onClick={handleReset}
        className="bg-zinc-200 px-4 py-2 rounded-md font-black uppercase text-xs text-center hover:bg-zinc-300 transition-colors"
      >
        Reset
      </button>
    </form>
  )
}
