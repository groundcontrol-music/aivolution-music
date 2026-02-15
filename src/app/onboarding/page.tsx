'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * DEPRECATED: Alter 3-Schritt-Onboarding-Flow
 * Leitet jetzt zu /join (neuer 2-Schritt-Flow mit Checkboxen)
 */
export default function OnboardingRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/join')
  }, [router])

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-red-600 mx-auto mb-4" />
        <p className="text-sm font-mono text-gray-600">Weiterleitung zum Creator-Signup...</p>
      </div>
    </div>
  )
}
