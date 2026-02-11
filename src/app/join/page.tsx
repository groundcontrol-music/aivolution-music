'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function JoinPage() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artist_name: formData.get('artist_name'),
        email: formData.get('email'),
        password: formData.get('password')
      })
    })

    if (response.ok) {
      window.location.href = '/onboarding/terms'
    } else {
      const { error } = await response.json()
      alert(error || 'Fehler bei der Registrierung')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-white border-2 border-black rounded-lg p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] space-y-6">
        
        <div className="border-b-2 border-black pb-4">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-center">
            Creator <span className="text-red-600">werden</span>
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40 text-center mt-2">
            Registrierung
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest" htmlFor="artist_name">
            Künstlername *
          </label>
          <input
            id="artist_name"
            name="artist_name"
            type="text"
            required
            className="w-full p-3 border-2 border-black font-bold text-sm focus:outline-none focus:border-red-600 transition-colors"
            placeholder="DEIN STAGE NAME"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest" htmlFor="email">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full p-3 border-2 border-black font-mono text-sm focus:outline-none focus:border-red-600 transition-colors"
            placeholder="deine@email.de"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest" htmlFor="password">
            Passwort *
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full p-3 border-2 border-black font-mono text-sm focus:outline-none focus:border-red-600 transition-colors"
            placeholder="Mindestens 6 Zeichen"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white p-4 font-black uppercase tracking-widest hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Account erstellen'}
        </button>

        <p className="text-xs text-center text-gray-500">
          Schon registriert? <Link href="/login" className="text-red-600 font-bold hover:underline">Zum Login</Link>
        </p>

      </form>
    </div>
  )
}
