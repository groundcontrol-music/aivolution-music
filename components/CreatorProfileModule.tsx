'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

/**
 * MASTER-CHECK (Frage 7): BRAND IDENTITY
 * Fix: TypeScript Typisierung für creatorId (Bild c7).
 */
interface CreatorProfileProps {
  creatorId: string;
  isOwner?: boolean;
}

export default function CreatorProfileModule({ creatorId, isOwner = false }: CreatorProfileProps) {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'shop' | 'bio' | 'legal'>('shop');

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.from('profiles').select('*').eq('id', creatorId).single();
      if (data) setProfile(data);
    }
    loadProfile();
  }, [creatorId, supabase]);

  if (!profile) return (
    <div className="p-20 text-center animate-pulse font-black uppercase text-[10px] tracking-[0.5em]">
      Syncing Artist Data...
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-12 font-sans text-black space-y-16">
      <header className="border-b-8 border-black pb-12 flex flex-col md:flex-row justify-between items-end gap-8">
        <div className="space-y-4">
          <p className="text-red-600 font-black uppercase tracking-[0.5em] text-[10px] italic">// Verified Creator</p>
          <h1 className="text-7xl md:text-9xl font-black italic uppercase tracking-tighter leading-[0.8]">
            {profile.artist_name || 'Anonymous'}
          </h1>
        </div>
        <div className="bg-black text-white p-8 rounded-[2.5rem] border-2 border-black shadow-[10px_10px_0px_0px_rgba(220,38,38,1)]">
          <p className="text-[9px] font-black uppercase tracking-widest text-red-600 mb-2 italic">Tech Engine</p>
          <p className="text-xl font-black italic uppercase tracking-tight">{profile.tech_stack || 'AI Audio Engine'}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-3 space-y-8">
          <nav className="flex flex-col gap-4">
            {['shop', 'bio', isOwner && 'legal'].filter(Boolean).map((tab: any) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-left p-6 rounded-[1.5rem] border-2 border-black text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                  ? 'bg-black text-white shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]' 
                  : 'bg-white text-black hover:bg-gray-50'
                }`}
              >
                {tab === 'shop' ? 'Discography' : tab === 'bio' ? 'About Artist' : 'Legal Access'}
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-9">
          {activeTab === 'shop' && (
            <div className="space-y-16 animate-in fade-in duration-500">
               <h3 className="text-4xl font-black italic uppercase tracking-tighter underline decoration-red-600 decoration-8 underline-offset-4">Releases</h3>
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="aspect-square bg-white border-2 border-black rounded-[2rem] shadow-sm hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center text-[10px] font-black uppercase italic text-gray-200 hover:text-red-600">
                    Track Slot {i}
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'bio' && (
            <div className="bg-white p-12 rounded-[3.5rem] border-2 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,0.05)] animate-in slide-in-from-right-8 duration-500">
              <p className="text-xl font-medium leading-relaxed italic text-gray-800">{profile.bio || "No Manifest yet."}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}