'use client'

import Link from 'next/link'
import { ShieldCheck, LogOut, User, MessageSquare, ShoppingCart } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [cartItems, setCartItems] = useState(0)
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

        // Fetch unread messages count (TODO: implement after messages table exists)
        // const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('recipient_id', user.id).eq('is_read', false)
        // setUnreadMessages(count || 0)
        
        // Fetch cart items (TODO: implement after cart table exists)
        // const { count: cartCount } = await supabase.from('cart_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
        // setCartItems(cartCount || 0)
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

        <nav className="flex items-center gap-4">
          {user && (
            <>
              {/* Messages */}
              <Link 
                href="/messages" 
                className="relative p-2 hover:bg-zinc-100 rounded-sm transition-colors border-2 border-transparent hover:border-black"
                title="Messages"
              >
                <MessageSquare size={20} />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link 
                href="/cart" 
                className="relative p-2 hover:bg-zinc-100 rounded-sm transition-colors border-2 border-transparent hover:border-black"
                title="Warenkorb"
              >
                <ShoppingCart size={20} />
                {cartItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItems}
                  </span>
                )}
              </Link>
            </>
          )}

          {/* Admin */}
          {isAdmin && (
            <Link href="/admin" className="flex items-center gap-2 font-black uppercase text-xs tracking-widest text-red-600 border-2 border-red-600 px-3 py-2 hover:bg-red-600 hover:text-white transition-colors rounded-sm">
              <ShieldCheck size={14} /> Admin
            </Link>
          )}
          
          {/* User Menu */}
          {user ? (
            <div className="flex items-center gap-3 border-l-2 border-black pl-4">
              <span className="text-xs font-mono opacity-50 hidden md:inline">{user.email}</span>
              <button onClick={handleLogout} className="flex items-center gap-2 font-black uppercase text-xs tracking-widest hover:text-red-600 transition-colors">
                <LogOut size={14} /> Exit
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="flex items-center gap-2 font-bold uppercase text-xs tracking-widest hover:text-red-600 transition-colors">
                <User size={14} /> Login
              </Link>
              <Link href="/creator-signup" className="bg-black text-white px-4 py-2 font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-colors rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
                Creator werden
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
