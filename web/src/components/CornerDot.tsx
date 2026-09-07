'use client';

import { trackEvent } from '@/lib/analytics';

/**
 * Small gold dot in the bottom-right corner. It no longer links anywhere
 * (the management area moved off any public link), but a click is logged as
 * an analytics event so it shows up in the dashboard's "Secret Dot" card
 * with the usual location / device / time the pipeline records.
 */
export default function CornerDot() {
  return (
    <button
      type="button"
      aria-label="•"
      onClick={() => trackEvent('corner_dot_click', { source: 'corner_dot' })}
      className="fixed bottom-4 right-4 z-50 w-3 h-3 p-0 border-0 rounded-full bg-gold/25 hover:bg-gold/70 transition-colors duration-300 cursor-pointer"
    />
  );
}
