"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [identity, setIdentity] = useState(''); // Username oder Email
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let email = identity;

    // Username-zu-Email Check
    if (!identity.includes('@')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', identity)
        .single();
      
      if (profile) {
        email = profile.email;
      } else {
        setError("System_Error: Identity not found.");
        setLoading(false);
        return;
      }
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Access_Denied: " + authError.message);
      setLoading(false);
    } else {
      router.push('/admin');
      router.refresh();
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-md border-2 border-black p-10 shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]">
        <header className="mb-8 border-b border-black pb-4">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">
            User_Auth<span className="text-red-600">.</span>
          </h2>
          <p className="text-[10px] font-bold opacity-40 uppercase">Enter Credentials for Network Access</p>
        </header>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-red-600 tracking-widest">Identity (Username/Email)</label>
            <input 
              type="text" 
              required
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              className="w-full p-4 border border-black rounded-none bg-white text-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
              placeholder="AIV_USER_01"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-red-600 tracking-widest">Passcode</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 border border-black rounded-none bg-white text-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
              placeholder="********"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-600 text-white text-[10px] font-black uppercase italic">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-black text-white font-black uppercase italic text-lg hover:bg-red-600 transition-all disabled:opacity-50"
          >
            {loading ? "Authorizing..." : "Initiate_Login"}
          </button>
        </form>
      </div>
    </div>
  );
}