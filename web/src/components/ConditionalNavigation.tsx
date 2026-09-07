'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();

  if (pathname?.startsWith('/backoffice') || pathname === '/cv') {
    return null;
  }

  return <Navigation />;
}
