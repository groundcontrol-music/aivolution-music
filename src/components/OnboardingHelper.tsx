'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Sparkles, X } from 'lucide-react'

/**
 * ONBOARDING-HELPER: Grüner blinkender Button für neue Creator
 * Wird nur beim ERSTEN Profil-Besuch angezeigt
 */
export default function OnboardingHelper() {
  const supabase = createClient()
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserId(user.id)

    // Prüfe: Hat Creator schon sein Profil besucht?
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_status, role')
      .eq('id', user.id)
      .single()

    // Zeige Button nur wenn: role='creator' + onboarding_status='approved' + first_visit
    if (profile?.role === 'creator' && profile?.onboarding_status === 'approved') {
      const hasSeenHelper = localStorage.getItem(`onboarding_helper_seen_${user.id}`)
      if (!hasSeenHelper) {
        setShow(true)
      }
    }
  }

  const handleClick = () => {
    if (!userId) return
    
    // Speichere: Helper wurde gesehen
    localStorage.setItem(`onboarding_helper_seen_${userId}`, 'true')
    setShow(false)

    // Navigiere direkt zum öffentlichen Creator-Profil (Live-Edit dort)
    router.push('/profile-builder') // profile-builder prüft selbst und leitet weiter zu /creator/[slug]
  }

  const handleDismiss = () => {
    if (!userId) return
    localStorage.setItem(`onboarding_helper_seen_${userId}`, 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-bounce">
      <div className="relative bg-gradient-to-br from-green-400 to-green-600 border-4 border-black rounded-[2rem] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xs">
        
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 bg-black text-white rounded-full p-1 hover:bg-red-600 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="mb-4 flex items-center gap-3">
          <div className="bg-white rounded-full p-3 border-2 border-black">
            <Sparkles className="text-green-600" size={28} />
          </div>
          <h3 className="text-xl font-black uppercase text-white">
            Hey Creator!
          </h3>
        </div>

        {/* Text */}
        <p className="text-sm font-bold text-white mb-4 leading-relaxed">
          🎉 <strong>Du wurdest freigeschaltet!</strong><br/>
          Jetzt kannst du dein <strong>vollständiges Profil</strong> aufbauen:<br/>
          ✅ Avatar hochladen<br/>
          ✅ Bio schreiben<br/>
          ✅ Social Links hinzufügen<br/>
          ✅ Tech-Stack angeben
        </p>

        {/* CTA Button */}
        <button
          onClick={handleClick}
          className="w-full bg-black text-white py-3 px-4 font-black uppercase text-sm hover:bg-white hover:text-black border-2 border-black transition-colors rounded-lg flex items-center justify-center gap-2"
        >
          <Sparkles size={18} />
          Profil aufbauen
        </button>

      </div>

      {/* Pulse Animation Ring */}
      <div className="absolute -inset-4 bg-green-400/30 rounded-[2.5rem] animate-ping pointer-events-none"></div>
    </div>
  )
}
