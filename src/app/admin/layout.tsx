import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import AdminNav from '@/components/admin/AdminNav';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect('/login');

  const { data: role } = await supabase.rpc('get_my_role');
  if (role !== 'admin') redirect('/');

  return (
    <div className="bg-[#F4F4F4] min-h-screen text-black flex flex-col font-sans">
      <Header />
      
      {/* Admin Sub-Navigation */}
      <AdminNav />

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
