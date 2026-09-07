'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Tracks the timestamp of the last fired tracking call per path.
// A 2-second window prevents React StrictMode double-fires without
// blocking legitimate repeat visits (e.g. navigating away and back).
const recentlyTracked = new Map<string, number>();
const DEDUP_WINDOW_MS = 2000;

function getVisitorId(): string {
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
  return visitorId;
}

function getVisitorName(): string {
  try {
    return localStorage.getItem('vicky_visitor_name') || '';
  } catch {
    return '';
  }
}

export function setVisitorName(name: string) {
  try {
    localStorage.setItem('vicky_visitor_name', name);
  } catch {
    // Fail silently
  }
}

export function trackEvent(eventName: string, metadata: Record<string, any> = {}) {
  try {
    const visitorId = getVisitorId();
    const visitorName = getVisitorName();
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: typeof window !== 'undefined' ? window.location.pathname : '',
        visitorId,
        visitorName,
        eventType: 'event',
        eventName,
        eventMetadata: metadata,
      }),
    }).catch(() => {});
  } catch {
    // Silently fail
  }
}

export function usePageTracking() {
  const pathname = usePathname();
  // Ref prevents the effect from closing over a stale fired state
  const firedForPath = useRef<string | null>(null);

  useEffect(() => {
    // Skip admin pages
    if (pathname.startsWith('/backoffice')) return;

    // Already fired for this path during this component mount cycle
    if (firedForPath.current === pathname) return;

    // Dedup within the 2-second window (catches StrictMode double-invoke)
    const lastTime = recentlyTracked.get(pathname);
    if (lastTime && Date.now() - lastTime < DEDUP_WINDOW_MS) return;

    firedForPath.current = pathname;
    recentlyTracked.set(pathname, Date.now());

    const visitorId = getVisitorId();

    // The public site is locked to the homepage. Any other path renders the
    // 404, so record it as a blocked page attempt instead of a real view.
    if (pathname !== '/') {
      const blockedName = getVisitorName();
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: pathname,
          visitorId,
          visitorName: blockedName,
          eventType: 'event',
          eventName: 'blocked_attempt',
          eventMetadata: { path: pathname },
        }),
      }).catch(() => {});
      return;
    }

    // Get referrer / source parameters
    let referrer = '';

    // 1. Try URL parameters first (important for WebView apps where referrer is stripped)
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const utmSource = urlParams.get('utm_source');
        const refParam = urlParams.get('ref');
        const sourceParam = urlParams.get('source');

        if (utmSource) {
          referrer = utmSource.charAt(0).toUpperCase() + utmSource.slice(1);
        } else if (refParam) {
          referrer = refParam.charAt(0).toUpperCase() + refParam.slice(1);
        } else if (sourceParam) {
          referrer = sourceParam.charAt(0).toUpperCase() + sourceParam.slice(1);
        }
      } catch {
        // Fall back
      }
    }

    // 2. Fall back to document.referrer
    if (!referrer && typeof document !== 'undefined' && document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.hostname !== window.location.hostname) {
          let host = refUrl.hostname.toLowerCase();
          if (host.startsWith('www.')) host = host.substring(4);

          if (host === 't.co' || host.includes('twitter.com') || host.includes('x.com')) {
            referrer = 'Twitter / X';
          } else if (host.includes('linkedin.com') || host === 'lnkd.in') {
            referrer = 'LinkedIn';
          } else if (host.includes('facebook.com')) {
            referrer = 'Facebook';
          } else if (host.includes('instagram.com')) {
            referrer = 'Instagram';
          } else if (host.includes('google.com')) {
            referrer = 'Google Search';
          } else if (host.includes('bing.com')) {
            referrer = 'Bing Search';
          } else if (host.includes('yahoo.com')) {
            referrer = 'Yahoo Search';
          } else if (host.includes('github.com')) {
            referrer = 'GitHub';
          } else {
            referrer = host.charAt(0).toUpperCase() + host.slice(1);
          }
        }
      } catch {
        referrer = document.referrer;
      }
    }

    // Fire-and-forget tracking call
    const visitorName = getVisitorName();
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: pathname,
        visitorId,
        visitorName,
        referrer,
        eventType: 'page_view',
      }),
    }).catch(() => {
      // Silently fail — analytics should never break the site
    });
  }, [pathname]);
}

