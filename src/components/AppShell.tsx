'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'
import OnboardingHelper from './OnboardingHelper'
import GlobalPlayer from './GlobalPlayer'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLockPage = pathname?.startsWith('/lock')

  if (isLockPage) {
    return <>{children}</>
  }

  return (
    <>
      <Header />
      <OnboardingHelper />
      {children}
      <GlobalPlayer />
    </>
  )
}
