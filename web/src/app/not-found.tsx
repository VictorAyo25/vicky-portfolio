import type { Metadata } from 'next';
import { headers } from 'next/headers';
import OfflineScreen, { platformFromUserAgent } from '@/components/OfflineScreen';
import { SITE_URL } from '@/lib/site';

// Chrome titles its error pages with the bare host, not the site name.
export const metadata: Metadata = {
  title: { absolute: new URL(SITE_URL).host },
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const userAgent = (await headers()).get('user-agent') || '';
  return <OfflineScreen platform={platformFromUserAgent(userAgent)} />;
}
