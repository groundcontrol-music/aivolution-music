'use client';

import { 
  Trophy, 
  AlertTriangle, 
  Mail, 
  Image as ImageIcon, 
  User, 
  CheckCircle, 
  Settings, 
  DollarSign,
  Shield,
  Flag
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: 'Contest', icon: Trophy, href: '/admin/contest', color: 'text-black' },
  { name: 'Kuration', icon: CheckCircle, href: '/admin/applications', color: 'text-black' },
  { name: 'Filter', icon: Shield, href: '/admin/filters', color: 'text-red-600' },
  { name: 'Meldungen', icon: Flag, href: '/admin/reports', color: 'text-red-600' },
  { name: 'Media', icon: ImageIcon, href: '/admin/media', color: 'text-black' },
  { name: 'Postamt', icon: Mail, href: '/admin/postamt', color: 'text-black' },
  { name: 'Terms', icon: Settings, href: '/admin/terms', color: 'text-black' },
  { name: 'Finanzen', icon: DollarSign, href: '/admin/finanzen', color: 'text-black' },
];

interface Badge {
  count: number
  type: 'success' | 'warning' | 'danger'
}

export default function AdminNav({ badges = {} }: { badges?: { [key: string]: Badge } }) {
  const pathname = usePathname();

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
        const badge = badges[item.href];
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
