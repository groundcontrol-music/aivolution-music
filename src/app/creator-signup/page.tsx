'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ALTE ROUTE - Redirect zu /join
export default function CreatorSignupPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/join')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm font-bold">Weiterleitung...</p>
    </div>
  )
}
