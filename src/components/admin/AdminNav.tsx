'use client';

import { 
  Trophy, 
  AlertTriangle, 
  Mail, 
  Image as ImageIcon, 
  Activity,
  User, 
  Settings, 
  DollarSign,
  Shield,
  Flag
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const navItems = [
  { name: 'Contest', icon: Trophy, href: '/admin/contest', color: 'text-black' },
  { name: 'Kontrolle', icon: Activity, href: '/admin/kontrolle', color: 'text-black' },
  { name: 'Filter', icon: Shield, href: '/admin/filters', color: 'text-red-600' },
  { name: 'Meldungen', icon: Flag, href: '/admin/reports', color: 'text-red-600' },
  { name: 'Media', icon: ImageIcon, href: '/admin/media', color: 'text-black' },
  { name: 'Logbuch', icon: Mail, href: '/admin/postamt', color: 'text-black' },
  { name: 'Terms', icon: Settings, href: '/admin/terms', color: 'text-black' },
  { name: 'Finanzen', icon: DollarSign, href: '/admin/finanzen', color: 'text-black' },
];

interface Badge {
  count: number
  type: 'success' | 'warning' | 'danger'
}

export default function AdminNav({ badges = {} }: { badges?: { [key: string]: Badge } }) {
  const pathname = usePathname();
  const [seenByPath, setSeenByPath] = useState<Record<string, number>>({})
  const SEEN_STORAGE_KEY = 'aivolution_admin_nav_seen_counts_v1'

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, number>
      if (parsed && typeof parsed === 'object') setSeenByPath(parsed)
    } catch {
      setSeenByPath({})
    }
  }, [])

  useEffect(() => {
    if (!pathname) return
    const currentBadge = badges[pathname]
    if (!currentBadge || currentBadge.count <= 0) return

    setSeenByPath((prev) => {
      const next = { ...prev, [pathname]: currentBadge.count }
      localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [pathname, badges])

  const displayBadges = useMemo(() => {
    const result: { [key: string]: Badge } = {}
    Object.entries(badges).forEach(([path, badge]) => {
      const seenCount = seenByPath[path] || 0
      const remaining = badge.count - seenCount
      if (remaining > 0) {
        result[path] = { ...badge, count: remaining }
      }
    })
    return result
  }, [badges, seenByPath])

  const getBadgeColor = (type: 'success' | 'warning' | 'danger') => {
    switch (type) {
      case 'success': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'danger': return 'bg-red-600'
    }
  }

  const getGlowColor = (type: 'success' | 'warning' | 'danger') => {
    switch (type) {
      case 'success': return 'bg-green-100 border-green-500'
      case 'warning': return 'bg-yellow-100 border-yellow-500'
      case 'danger': return 'bg-red-100 border-red-600'
    }
  }

  return (
    <nav className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 border-b-4 border-black bg-white sticky top-0 z-40">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const badge = displayBadges[item.href];
        return (
          <Link 
            key={item.name} 
            href={item.href}
            className={`
              flex flex-col items-center justify-center p-4 border-r border-black last:border-r-0 
              hover:bg-black hover:text-white transition-all group h-24 relative
              ${isActive ? 'bg-black text-white' : badge ? getGlowColor(badge.type) : 'bg-white text-black'}
            `}
          >
            {/* Badge */}
            {badge && (
              <div className={`absolute top-2 right-2 ${getBadgeColor(badge.type)} text-white text-[10px] font-black rounded-full w-6 h-6 flex items-center justify-center shadow-lg`}>
                {badge.count > 9 ? '9+' : badge.count}
              </div>
            )}

            <item.icon 
              size={24} 
              className={`mb-2 ${isActive ? 'text-red-600' : item.color} group-hover:text-red-600 transition-colors`} 
            />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">
              {item.name}
            </span>
            {isActive && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
