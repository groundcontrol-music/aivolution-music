'use client'

import { login, signup } from './actions'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData, action: typeof login) {
    setLoading(true)
    try {
      await action(formData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <form className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md space-y-6">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-center">
          Login <span className="text-red-600">//</span> Register
        </h1>
        
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="w-full p-3 border-2 border-black font-mono text-sm focus:outline-none focus:border-red-600 transition-colors" />
        </div>
        
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required className="w-full p-3 border-2 border-black font-mono text-sm focus:outline-none focus:border-red-600 transition-colors" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4">
          <button formAction={(formData) => handleSubmit(formData, login)} disabled={loading} className="bg-black text-white p-3 font-black uppercase tracking-widest hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Login'}
          </button>
          <button formAction={signup} disabled={loading} className="bg-white text-black border-2 border-black p-3 font-black uppercase tracking-widest hover:bg-zinc-100 transition-colors">
            Register
          </button>
        </div>
      </form>
    </div>
  )
}
