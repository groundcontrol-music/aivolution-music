'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'

export default function TermsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [terms, setTerms] = useState<any[]>([])
  const [accepted, setAccepted] = useState<{ [key: string]: boolean }>({})
  const [loading, setLoading] = useState(false)
  const [artistName, setArtistName] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      // Hole Terms
      const { data: termsData } = await supabase
        .from('onboarding_terms')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      
      setTerms(termsData || [])

      // Hole Artist Name
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('artist_name')
          .eq('id', user.id)
          .single()
        
        setArtistName(profile?.artist_name || '')
      }
    }
    fetchData()
  }, [])

  const allAccepted = terms.every(term => 
    !term.is_required || accepted[term.id]
  )

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      // Speichere Akzeptanz
      const { error } = await supabase
        .from('profiles')
        .update({ terms_accepted_at: new Date().toISOString() })
        .eq('id', user.id)

      if (error) throw error

      // Weiter zu Profil-Erstellung
      router.push('/onboarding')
    } catch (error) {
      console.error(error)
      alert('Fehler beim Speichern. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white border-2 border-black rounded-lg p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
        
        <div className="mb-8 border-b-2 border-black pb-4">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            Willkommen, <span className="text-red-600">{artistName}</span>!
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-2">
            Bitte bestätige die folgenden Punkte
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {terms.map(term => (
            <label
              key={term.id}
              className="flex items-start gap-3 p-4 border-2 border-black rounded-lg cursor-pointer hover:bg-zinc-50 transition-colors group"
            >
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={accepted[term.id] || false}
                  onChange={(e) => setAccepted({ ...accepted, [term.id]: e.target.checked })}
                  className="peer appearance-none w-6 h-6 border-2 border-black rounded-sm cursor-pointer checked:bg-black"
                />
                <Check className="absolute top-0.5 left-0.5 w-5 h-5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
              </div>
              <span className="text-sm font-medium leading-relaxed">
                {term.label}
                {term.is_required && <span className="text-red-600 ml-1">*</span>}
              </span>
            </label>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!allAccepted || loading}
          className="w-full bg-black text-white py-4 font-black uppercase tracking-widest hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-black transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Profil erstellen'}
        </button>

      </div>
    </div>
  )
}
