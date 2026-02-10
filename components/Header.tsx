"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Mail, Search, Sofa, User, LogOut } from 'lucide-react';

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: role } = await supabase.rpc('get_my_role');
        setIsAdmin(role === 'admin');
      }
    };
    checkAdmin();
  }, [supabase]);

  return (
    <header className="w-full border-b border-black bg-white sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto grid grid-cols-12 items-center">
        {/* Branding */}
        <div className="col-span-7 p-6 border-r border-black">
          <Link href="/">
            <h1 className="text-3xl font-black tracking-tighter uppercase italic text-black">
              AIVOLUTION<span className="text-red-600">MUSIC</span>
            </h1>
          </Link>
        </div>

        {/* Navigation - Alle Buttons wieder da */}
        <div className="col-span-5 flex justify-end h-full">
          <nav className="flex items-center h-full">
            {isAdmin && (
              <HeaderIcon href="/admin" icon={<Sofa size={20} />} label="Admin" highlight />
            )}
            <HeaderIcon href="/search" icon={<Search size={18} />} label="Suche" />
            <HeaderIcon href="/messages" icon={<Mail size={18} />} label="Mail" />
            <HeaderIcon href={user ? "/profile" : "/login"} icon={<User size={20} />} label="Profil" />
            
            {user && (
              <button 
                onClick={async () => { await supabase.auth.signOut(); window.location.href='/'; }}
                className="h-full px-6 bg-black text-white font-black text-[10px] uppercase italic hover:bg-red-600 transition-all flex items-center"
              >
                <LogOut size={14} className="mr-2" /> EXIT
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

function HeaderIcon({ href, icon, label, highlight = false }: { href: string; icon: any; label: string; highlight?: boolean }) {
  return (
    <Link href={href} title={label} className={`h-full px-5 flex items-center border-l border-black transition-all ${highlight ? 'text-red-600 bg-red-600/5 hover:bg-red-600 hover:text-white' : 'hover:bg-black hover:text-white'}`}>
      {icon}
    </Link>
  );
}