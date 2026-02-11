'use client'

import Link from 'next/link'
import { ShieldCheck, LogOut, User } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        // Safe Admin Check via RPC
        const { data: role } = await supabase.rpc('get_my_role')
        setIsAdmin(role === 'admin')
      }
    }
    getUser()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    router.refresh()
  }

  return (
    <header className="border-b-4 border-black bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-black uppercase italic tracking-tighter">
          Aivolution<span className="text-red-600">Music</span>
        </Link>

        <nav className="flex items-center gap-6">
          {isAdmin && (
            <Link href="/admin" className="flex items-center gap-2 font-black uppercase text-xs tracking-widest text-red-600 border-2 border-red-600 px-3 py-1 hover:bg-red-600 hover:text-white transition-colors">
              <ShieldCheck size={14} /> Admin
            </Link>
          )}
          
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono opacity-50 hidden md:inline">{user.email}</span>
              <button onClick={handleLogout} className="flex items-center gap-2 font-black uppercase text-xs tracking-widest hover:text-red-600 transition-colors">
                <LogOut size={14} /> Exit
              </button>
            </div>
          ) : (
            <Link href="/login" className="flex items-center gap-2 font-black uppercase text-xs tracking-widest hover:text-red-600 transition-colors">
              <User size={14} /> Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
