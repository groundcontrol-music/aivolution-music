'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'
import OnboardingHelper from './OnboardingHelper'
import GlobalPlayer from './GlobalPlayer'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLockPage = pathname?.startsWith('/lock')
  const isCreatorPage = pathname?.startsWith('/creator/')

  if (isLockPage) {
    return <>{children}</>
  }

  return (
    <>
      <Header />
      <OnboardingHelper />
      {isCreatorPage ? (
        <div className="min-h-screen bg-zinc-50 py-6 md:py-8">
          <div className="max-w-7xl mx-auto px-3 md:px-4">
            {children}
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-zinc-50 py-6 md:py-8">
          <div className="max-w-7xl mx-auto px-3 md:px-4">
            <div className="bg-white/80 backdrop-blur-xl border-2 border-black rounded-[2.5rem] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="p-6 md:p-8">
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
      <GlobalPlayer />
    </>
  )
}
