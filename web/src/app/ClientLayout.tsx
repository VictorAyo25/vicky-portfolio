'use client';

import PageTransition from '@/components/PageTransition';
import { usePageTracking } from '@/lib/analytics';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  usePageTracking();
  return <PageTransition>{children}</PageTransition>;
}
