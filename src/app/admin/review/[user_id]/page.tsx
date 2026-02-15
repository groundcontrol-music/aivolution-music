import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Music, Mail, CheckCircle, XCircle } from 'lucide-react'

export default async function AdminReviewPage({ params }: { params: Promise<{ user_id: string }> }) {
  const supabase = await createClient()
  const { user_id } = await params
  
  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  const { data: userRole } = await supabase.rpc('get_my_role')
  if (userRole !== 'admin') {
    redirect('/')
  }
  
  // Fetch applicant profile
  const { data: applicant, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user_id)
    .single()
  
  if (error || !applicant) {
    notFound()
  }
  
  // Get email from auth.users
  const { data: authUser } = await supabase.rpc('get_email_for_user', { user_uuid: user_id })
  
  // Fetch songs
  const { data: songs } = await supabase
    .from('songs')
    .select('*')
    .eq('user_id', user_id)
    .eq('is_probe', true)
    .order('created_at', { ascending: false })

  const resolveWavPath = (value: string | null | undefined) => {
    if (!value) return null
    if (value.startsWith('songs-wav/')) return value.replace('songs-wav/', '')
    if (value.includes('/songs-wav/')) {
      const idx = value.indexOf('/songs-wav/')
      return value.slice(idx + '/songs-wav/'.length)
    }
    return value
  }

  const songsWithPreview = await Promise.all(
    (songs || []).map(async (song: any) => {
      const path = resolveWavPath(song.wav_url)
      if (!path) return { ...song, preview_url: null as string | null }
      const { data } = await supabase.storage.from('songs-wav').createSignedUrl(path, 60 * 30)
      return { ...song, preview_url: data?.signedUrl || null }
    })
  )

  const profileSlug =
    applicant.artist_name_slug ||
    (applicant.artist_name
      ? String(applicant.artist_name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : user_id)
  
  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="bg-white border-2 border-black rounded-[2.5rem] p-8 mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b-2 border-black">
            <div className="w-20 h-20 bg-zinc-100 rounded-full border-2 border-black flex items-center justify-center text-4xl font-black text-zinc-300">
              {applicant.artist_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                Bewerbung: <span className="text-red-600">{applicant.artist_name || 'Unbekannt'}</span>
              </h1>
              <div className="flex items-center gap-2 mt-2 text-sm font-mono text-gray-600">
                <Mail size={14} />
                {authUser || 'Email nicht verfügbar'}
              </div>
            </div>
          </div>
          
          {/* Info */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-zinc-50 border border-black p-4 rounded-lg">
              <div className="text-xs font-black uppercase text-gray-500 mb-1">Status</div>
              <div className="text-sm font-bold">
                {applicant.onboarding_status === 'submitted' && '⏳ Wartet auf Prüfung'}
                {applicant.onboarding_status === 'pending' && '⏳ Neu'}
                {applicant.onboarding_status === 'approved' && '✅ Freigegeben'}
                {applicant.onboarding_status === 'rejected' && '❌ Abgelehnt'}
              </div>
            </div>
            <div className="bg-zinc-50 border border-black p-4 rounded-lg">
              <div className="text-xs font-black uppercase text-gray-500 mb-1">Bewerbung eingereicht</div>
              <div className="text-sm font-bold">
                {new Date(applicant.created_at).toLocaleDateString('de-DE', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
          
          {/* Songs */}
          <div className="mb-6">
            <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
              <Music className="text-red-600" size={20} />
              Eingereichte Songs ({songsWithPreview.length || 0})
            </h2>
            
            {songsWithPreview.length > 0 ? (
              <div className="space-y-3">
                {songsWithPreview.map((song: any, index: number) => (
                  <div key={song.id} className="bg-white border-2 border-black p-4 rounded-lg flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-black text-xl">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-black uppercase">{song.title}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {song.wav_url ? 'WAV' : song.file_url ? 'Audio' : 'Keine Datei'}
                      </div>
                    </div>
                    {song.preview_url ? (
                      <audio controls className="max-w-[260px]">
                        <source src={song.preview_url} />
                      </audio>
                    ) : (
                      <span className="text-xs font-bold uppercase text-red-600">Kein Preview verfügbar</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-100 border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center">
                <p className="text-sm font-bold uppercase text-zinc-500">Keine Songs gefunden</p>
              </div>
            )}
          </div>
          
          {/* Actions */}
          {applicant.onboarding_status !== 'approved' && applicant.onboarding_status !== 'rejected' && (
            <div className="flex gap-4 pt-6 border-t-2 border-black">
              <form action="/api/admin/approve-creator" method="POST" className="flex-1">
                <input type="hidden" name="user_id" value={user_id} />
                <input type="hidden" name="return_to" value="/admin/kontrolle" />
                <button 
                  type="submit"
                  className="w-full bg-green-600 text-white py-4 font-black uppercase text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <CheckCircle size={20} />
                  Freischalten & Email senden
                </button>
              </form>
              
              <form action="/api/admin/reject-creator" method="POST" className="flex-1">
                <input type="hidden" name="user_id" value={user_id} />
                <input type="hidden" name="return_to" value="/admin/kontrolle" />
                <button 
                  type="submit"
                  className="w-full bg-red-600 text-white py-4 font-black uppercase text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <XCircle size={20} />
                  Ablehnen & Email senden
                </button>
              </form>
            </div>
          )}
          
          {applicant.onboarding_status === 'approved' && (
            <div className="bg-green-50 border-2 border-green-600 p-6 rounded-lg text-center">
              <CheckCircle className="mx-auto mb-2 text-green-600" size={32} />
              <p className="font-black uppercase text-sm">Bereits freigegeben</p>
              <a 
                href={`/creator/${profileSlug}`}
                className="text-xs text-green-600 underline mt-2 inline-block"
              >
                → Öffentliches Profil ansehen
              </a>
            </div>
          )}
        </div>
        
      </div>
    </div>
  )
}
