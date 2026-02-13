'use client'

import { useState } from 'react'
import { updateApplicationStatus } from '@/app/admin/actions'
import { Check, X, Play, Pause, ExternalLink } from 'lucide-react'

// Type Definition (vereinfacht)
type Profile = {
  id: string
  artist_name: string | null
  bio: string | null
  tech_stack: string[] | null
  social_links: any
  avatar_url: string | null
  onboarding_status: string | null
  created_at: string
}

type Song = {
  id: string
  title: string
  file_url: string
  genres: string[] | null
}

export default function ApplicationCard({ application, songs }: { application: Profile, songs: Song[] }) {
  const [status, setStatus] = useState<'idle' | 'approving' | 'rejecting'>('idle')
  const [playing, setPlaying] = useState<string | null>(null) // Song ID playing
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  const handlePlay = (url: string, id: string) => {
    if (playing === id) {
      audio?.pause()
      setPlaying(null)
    } else {
      if (audio) audio.pause()
      const newAudio = new Audio(url)
      newAudio.play()
      newAudio.onended = () => setPlaying(null)
      setAudio(newAudio)
      setPlaying(id)
    }
  }

  const handleAction = async (newStatus: 'approved' | 'rejected') => {
    if(!confirm(`Bist du sicher? (${newStatus.toUpperCase()})`)) return

    setStatus(newStatus === 'approved' ? 'approving' : 'rejecting')
    const result = await updateApplicationStatus(application.id, newStatus)
    
    if (result?.error) {
      alert(`Fehler: ${result.error}`)
      setStatus('idle')
      return
    }
    
    // Erfolg – Seite wird durch revalidatePath aktualisiert
    window.location.reload()
  }

  return (
    <div className="border-2 border-black bg-white p-6 rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] transition-all duration-300">
      
      {/* Header: Artist Info */}
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 bg-zinc-100 rounded-full border-2 border-black overflow-hidden relative">
            {application.avatar_url ? (
              <img src={application.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold uppercase text-gray-400">No Pic</div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-start">
             <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">{application.artist_name || 'Unbekannt'}</h2>
                <p className="text-[10px] font-mono text-gray-500 uppercase">{application.id}</p>
             </div>
             <div className="flex gap-2">
                {application.social_links?.spotify && <a href={application.social_links.spotify} target="_blank" className="p-1 border border-black hover:bg-black hover:text-white transition-colors"><ExternalLink size={12}/></a>}
                {application.social_links?.instagram && <a href={application.social_links.instagram} target="_blank" className="p-1 border border-black hover:bg-black hover:text-white transition-colors"><ExternalLink size={12}/></a>}
             </div>
          </div>
          
          <p className="text-sm font-medium text-gray-600 max-w-2xl bg-zinc-50 p-2 border border-black/10 rounded-sm">
            "{application.bio || 'Keine Bio vorhanden.'}"
          </p>

          <div className="flex flex-wrap gap-2">
            {application.tech_stack?.map(tech => (
              <span key={tech} className="bg-black text-white px-2 py-0.5 text-[10px] font-bold uppercase rounded-full">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Songs: Probe Uploads */}
      <div className="grid md:grid-cols-2 gap-4 mb-8 bg-zinc-50 p-4 border-2 border-black/5 rounded-md">
         {songs.map((song, idx) => (
           <div key={song.id} className="bg-white border border-black p-3 flex items-center justify-between gap-4 rounded-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <button 
                  onClick={() => handlePlay(song.file_url, song.id)}
                  className="w-8 h-8 flex items-center justify-center bg-black text-white hover:bg-red-600 transition-colors rounded-full flex-shrink-0"
                >
                  {playing === song.id ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5"/>}
                </button>
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase truncate">{song.title}</div>
                  <div className="flex gap-1 mt-1">
                    {song.genres?.map(g => (
                      <span key={g} className="text-[8px] bg-zinc-100 border border-zinc-200 px-1 rounded uppercase font-bold text-gray-500">{g}</span>
                    ))}
                  </div>
                </div>
              </div>
           </div>
         ))}
         {songs.length === 0 && <div className="text-xs font-bold uppercase text-red-600">Keine Probe-Songs gefunden!</div>}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 border-t-2 border-black pt-4">
        <button 
          onClick={() => handleAction('rejected')}
          disabled={status !== 'idle'}
          className="px-6 py-2 font-black uppercase tracking-widest text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <X size={16} /> Ablehnen
        </button>
        <button 
          onClick={() => handleAction('approved')}
          disabled={status !== 'idle'}
          className="bg-black text-white px-8 py-2 font-black uppercase tracking-widest hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {status === 'approving' ? '...' : <><Check size={16} /> Freischalten</>}
        </button>
      </div>

    </div>
  )
}
