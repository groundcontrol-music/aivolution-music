import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // MASTER-CHECK: Server-seitiger Schutz
  if (!user) redirect('/login');

  const { data: role } = await supabase.rpc('get_my_role');
  if (role !== 'admin') redirect('/');

  return (
    <div className="bg-[#F4F4F4] min-h-screen text-black flex flex-col font-sans">
      {/* 1. HEADER: Brutalistisch & Klar */}
      <header className="border-b-4 border-black p-8 bg-white flex justify-between items-end">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-[0.8]">
            KOMMANDO<br/><span className="text-red-600">ZENTRALE</span>
          </h1>
          <p className="text-[10px] font-bold opacity-50 uppercase tracking-[0.3em] mt-2 ml-1">
            Administrative Control // Unit_01
          </p>
        </div>
        <div className="hidden md:flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-red-600 font-black uppercase italic text-[10px]">
            <ShieldCheck size={14} /> System_Secure
          </div>
          <div className="text-[9px] font-mono opacity-30">ID: {user.id?.slice(0,8)}...</div>
        </div>
      </header>

      {/* 2. NAVIGATION: Die Button-Leiste */}
      <AdminNav />

      {/* 3. CONTENT AREA */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
