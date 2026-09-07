'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

/**
 * Public lockdown: on any non-backoffice page, a click on a link that would
 * navigate somewhere is cancelled — nothing opens — and logged as a
 * `blocked_link_click` so it shows up in the dashboard. Plain buttons (theme
 * toggle, menus) are untouched. Runs in the capture phase so it beats the
 * onClick that Next's <Link> uses for client-side navigation.
 */
export default function SiteLockdown() {
  const pathname = usePathname();

  useEffect(() => {
    // The owner's area keeps fully working links.
    if (pathname?.startsWith('/backoffice')) return;

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      // Let modified / non-left clicks alone (they don't do in-app nav anyway).
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return; // buttons and other controls still work

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return; // in-page anchors are fine

      let dest: URL;
      try {
        dest = new URL(href, window.location.href);
      } catch {
        return;
      }

      // A link that points at the current page changes nothing — leave it.
      if (dest.pathname === window.location.pathname && dest.search === window.location.search) return;

      // Block the navigation completely, then log what they tried to open.
      e.preventDefault();
      e.stopPropagation();
      trackEvent('blocked_link_click', {
        to: dest.origin === window.location.origin ? dest.pathname : href,
        label: (anchor.textContent || '').trim().slice(0, 120),
        external: dest.origin !== window.location.origin,
        from: window.location.pathname,
      });
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  return null;
}
