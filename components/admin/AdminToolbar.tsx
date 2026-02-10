                                                     'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

/**
 * MASTER-CHECK (Frage 2 & 7):
 * Nutzt jetzt user_roles für konsistente Sicherheit. 
 * Brutalistisches Design mit harten Schatten.
 */
export default function AdminToolbar() {
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: role } = await supabase.rpc('get_my_role');
        if (role === 'admin' || role === 'moderator') {
          setIsAdmin(true);
        }
      }
    }
    checkAdmin();
  }, [supabase]);

  if (!isAdmin) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-0 animate-in slide-in-from-right-10 duration-500">
      <div className="bg-red-600 text-[8px] font-black text-white uppercase tracking-[0.3em] px-4 py-1 border-2 border-black border-b-0 inline-block self-start ml-2 shadow-sm">
        Admin Mode Active
      </div>
      <div className="bg-white border-2 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-3 flex flex-col gap-3 min-w-[220px]">
        {pathname.startsWith('/admin') ? (
          <Link
            href="/"
            className="bg-gray-100 hover:bg-white text-black px-4 py-4 text-[10px] font-black uppercase tracking-widest border-2 border-black transition-all text-center flex items-center justify-center gap-2 group"
          >
            <span className="group-hover:rotate-12 transition-transform">🌐</span> Zur Startseite
          </Link>
        ) : (
          <Link
            href="/admin"
            className="bg-black hover:bg-red-600 text-white px-4 py-4 text-[10px] font-black uppercase tracking-widest border-2 border-black transition-all text-center flex items-center justify-center gap-2"
          >
            <span className="animate-pulse">🛋️</span> Kommandozentrale
          </Link>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => window.location.reload()}
            className="bg-white hover:bg-gray-100 text-black p-2 border-2 border-black text-[9px] font-black uppercase italic"
          >
            Reload
          </button>
          <Link
            href="/dashboard"
            className="bg-white hover:bg-gray-100 text-black p-2 border-2 border-black text-[9px] font-black uppercase italic text-center"
          >
            Studio
          </Link>
        </div>
      </div>
    </div>
  );
}