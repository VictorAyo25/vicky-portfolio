'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Tracks the timestamp of the last fired tracking call per path.
// A 2-second window prevents React StrictMode double-fires without
// blocking legitimate repeat visits (e.g. navigating away and back).
const recentlyTracked = new Map<string, number>();
const DEDUP_WINDOW_MS = 2000;

export function usePageTracking() {
  const pathname = usePathname();
  // Ref prevents the effect from closing over a stale fired state
  const firedForPath = useRef<string | null>(null);

  useEffect(() => {
    // Skip admin pages
    if (pathname.startsWith('/admin')) return;

    // Already fired for this path during this component mount cycle
    if (firedForPath.current === pathname) return;

    // Dedup within the 2-second window (catches StrictMode double-invoke)
    const lastTime = recentlyTracked.get(pathname);
    if (lastTime && Date.now() - lastTime < DEDUP_WINDOW_MS) return;

    firedForPath.current = pathname;
    recentlyTracked.set(pathname, Date.now());

    // Get or generate a persistent visitor ID for deduplication
    let visitorId = '';
    try {
      visitorId = localStorage.getItem('vicky_visitor_id') || '';
      if (!visitorId) {
        visitorId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('vicky_visitor_id', visitorId);
      }
    } catch {
      // LocalStorage might be disabled in private browsing
    }

    // Fire-and-forget tracking call
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pathname, visitorId }),
    }).catch(() => {
      // Silently fail — analytics should never break the site
    });
  }, [pathname]);
}
