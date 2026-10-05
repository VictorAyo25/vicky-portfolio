'use client';

import { usePathname } from 'next/navigation';
import { isOwnerDevice, trackEvent } from '@/lib/analytics';

/**
 * Small gold dot in the bottom-right corner of the public site. It no longer
 * links anywhere (the management area moved off any public link), but a click
 * is logged as an analytics event so it shows up in the dashboard's
 * "Secret Dot" and "Admin Access" cards with the usual location / device /
 * time the pipeline records. Hidden inside the backoffice itself.
 */
export default function CornerDot() {
  const pathname = usePathname();
  if (pathname?.startsWith('/backoffice')) return null;

  return (
    <button
      type="button"
      aria-label="•"
      onClick={() => trackEvent('corner_dot_click', { source: 'corner_dot', ownerDevice: isOwnerDevice() })}
      className="fixed bottom-4 right-4 z-50 w-3 h-3 p-0 border-0 rounded-full bg-gold/25 hover:bg-gold/70 transition-colors duration-300 cursor-pointer"
    />
  );
}
