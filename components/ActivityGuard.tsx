'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function ActivityGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const INACTIVITY_LIMIT = 15 * 60 * 1000;

  const handleLogout = async () => {
    if (pathname === '/login') return;

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log("System: Logout wegen Inaktivität.");
      await supabase.auth.signOut();
      router.push('/login?reason=timeout');
      router.refresh();
    }
  };

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(handleLogout, INACTIVITY_LIMIT);
  };

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    resetTimer();
    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [pathname]);

  return null;
}