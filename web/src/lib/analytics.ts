'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Simple session-based dedup: don't fire twice for the same path in one navigation
let lastTrackedPath = '';

export function usePageTracking() {
  const pathname = usePathname();
  const hasTracked = useRef(false);

  useEffect(() => {
    // Skip admin pages
    if (pathname.startsWith('/admin')) return;

    // Skip if we already tracked this path (prevents double-fire from strict mode)
    if (pathname === lastTrackedPath && hasTracked.current) return;

    lastTrackedPath = pathname;
    hasTracked.current = true;

    // Fire-and-forget tracking call
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pathname }),
    }).catch(() => {
      // Silently fail — analytics should never break the site
    });
  }, [pathname]);
}
