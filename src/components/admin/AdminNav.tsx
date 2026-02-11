'use client';

import { 
  Trophy, 
  AlertTriangle, 
  Mail, 
  Image as ImageIcon, 
  User, 
  CheckCircle, 
  Settings, 
  DollarSign 
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: 'Contest', icon: Trophy, href: '/admin/contest', color: 'text-black' },
  { name: 'Alarm', icon: AlertTriangle, href: '/admin/alarm', color: 'text-red-600' },
  { name: 'Postamt', icon: Mail, href: '/admin/postamt', color: 'text-black' },
  { name: 'Media', icon: ImageIcon, href: '/admin/media', color: 'text-black' },
  { name: 'Profil', icon: User, href: '/admin/profil', color: 'text-black' },
  { name: 'Kuration', icon: CheckCircle, href: '/admin/applications', color: 'text-black' },
  { name: 'Funktion', icon: Settings, href: '/admin/funktion', color: 'text-black' },
  { name: 'Finanzen', icon: DollarSign, href: '/admin/finanzen', color: 'text-black' },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 border-b-4 border-black bg-white sticky top-0 z-40">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link 
            key={item.name} 
            href={item.href}
            className={`
              flex flex-col items-center justify-center p-4 border-r border-black last:border-r-0 
              hover:bg-black hover:text-white transition-all group h-24 relative
              ${isActive ? 'bg-black text-white' : 'bg-white text-black'}
            `}
          >
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
