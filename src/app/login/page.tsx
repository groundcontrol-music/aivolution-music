'use client'

import { useState } from 'react'
import { Loader2, LogIn } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password')
      })
    })

    if (response.ok) {
      const { redirect } = await response.json()
      window.location.href = redirect || '/'
    } else {
      const { error } = await response.json()
      alert(error || 'Login fehlgeschlagen')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-white border-2 border-black rounded-lg p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] space-y-6">
        
        <div className="border-b-2 border-black pb-4">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-center">
            <LogIn className="inline mr-2 mb-1" size={28} />
            Login
          </h1>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest" htmlFor="email">
            Künstlername oder Email
          </label>
          <input
            id="email"
            name="email"
            type="text"
            required
            className="w-full p-3 border-2 border-black font-mono text-sm focus:outline-none focus:border-red-600 transition-colors"
            placeholder="DEIN_KÜNSTLERNAME"
          />
          <p className="text-[10px] text-gray-500 mt-1">
            💡 Du kannst dich mit deinem Künstlernamen einloggen (DSGVO-freundlich!)
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest" htmlFor="password">
            Passwort
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full p-3 border-2 border-black font-mono text-sm focus:outline-none focus:border-red-600 transition-colors"
            placeholder="Dein Passwort"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white p-4 font-black uppercase tracking-widest hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Einloggen'}
        </button>

        <p className="text-xs text-center text-gray-500">
          Noch kein Account? <Link href="/join" className="text-red-600 font-bold hover:underline">Creator werden</Link>
        </p>

      </form>
    </div>
  )
}
