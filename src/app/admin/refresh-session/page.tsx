'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function RefreshSessionPage() {
  const [status, setStatus] = useState('Lade...')
  const [details, setDetails] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function refreshSession() {
      try {
        setStatus('🔄 Session wird aktualisiert...')
        
        // 1. Aktuelle Session holen
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setStatus('❌ Keine Session gefunden - bitte einloggen!')
          setDetails({ error: 'Not logged in' })
          return
        }

        // 2. Session neu laden
        setStatus('🔄 Session wird neu geladen...')
        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError) {
          setStatus('❌ Fehler beim Aktualisieren')
          setDetails({ error: refreshError.message })
          return
        }

        // 3. User-Daten neu laden
        setStatus('👤 User-Daten werden geladen...')
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setStatus('❌ User nicht gefunden')
          return
        }

        // 4. Rolle prüfen
        setStatus('🔐 Rolle wird geprüft...')
        const { data: role, error: roleError } = await supabase.rpc('get_my_role')
        
        if (roleError) {
          setStatus('❌ Fehler beim Abrufen der Rolle')
          setDetails({ 
            error: roleError.message,
            user: { id: user.id, email: user.email }
          })
          return
        }

        // 5. Erfolg
        setStatus('✅ Session erfolgreich aktualisiert!')
        setDetails({
          user: { 
            id: user.id, 
            email: user.email 
          },
          role: role,
          session: {
            expires_at: newSession?.expires_at,
            refresh_token: newSession?.refresh_token ? '***' : null
          }
        })

        // 6. Nach 2 Sekunden zu /admin/media weiterleiten
        setTimeout(() => {
          router.push('/admin/media')
        }, 2000)

      } catch (error: any) {
        setStatus('❌ Unerwarteter Fehler')
        setDetails({ error: error.message })
      }
    }

    refreshSession()
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white border-2 border-black rounded-lg p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
        
        <div className="mb-8 border-b-2 border-black pb-4">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            Session <span className="text-red-600">Refresh</span>
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-2">
            Behebt Session-Probleme
          </p>
        </div>

        <div className="space-y-6">
          {/* Status */}
          <div className="p-4 bg-zinc-50 border-2 border-black rounded-lg">
            <p className="text-2xl font-black mb-2">{status}</p>
          </div>

          {/* Details */}
          {details && (
            <div className="p-4 bg-zinc-50 border-2 border-black rounded-lg">
              <p className="text-xs font-black uppercase mb-2">Debug-Info:</p>
              <pre className="text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64 p-2 bg-white border border-black rounded">
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          )}

          {/* Anleitung */}
          <div className="p-4 bg-yellow-50 border-2 border-yellow-600 rounded-lg text-sm">
            <p className="font-bold mb-2">Was passiert hier?</p>
            <ul className="space-y-1 text-xs">
              <li>✅ Session wird neu geladen</li>
              <li>✅ User-Daten werden aktualisiert</li>
              <li>✅ Admin-Rolle wird geprüft</li>
              <li>✅ Weiterleitung zu /admin/media</li>
            </ul>
          </div>

          {/* Manueller Redirect Button */}
          <button
            onClick={() => router.push('/admin/media')}
            className="w-full bg-red-600 text-white py-4 font-black uppercase tracking-widest hover:bg-black transition-colors"
          >
            Zu Media-Editor
          </button>
        </div>

      </div>
    </div>
  )
}
