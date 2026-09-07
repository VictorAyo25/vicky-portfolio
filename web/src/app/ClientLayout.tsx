'use client';

import PageTransition from '@/components/PageTransition';
import SiteLockdown from '@/components/SiteLockdown';
import { usePageTracking } from '@/lib/analytics';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  usePageTracking();
  return (
    <>
      <SiteLockdown />
      <PageTransition>{children}</PageTransition>
    </>
  );
}
