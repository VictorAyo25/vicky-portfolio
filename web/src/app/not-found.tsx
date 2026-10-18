import type { Metadata } from 'next';
import { headers } from 'next/headers';
import OfflineScreen, { offlineVariantFromUserAgent } from '@/components/OfflineScreen';
import { SITE_URL } from '@/lib/site';

async function variant() {
  return offlineVariantFromUserAgent((await headers()).get('user-agent') || '');
}

// Browsers title their own error pages: Chrome with the bare host, Safari
// with "Failed to open page".
export async function generateMetadata(): Promise<Metadata> {
  const { browser } = await variant();
  return {
    title: { absolute: browser === 'safari' ? 'Failed to open page' : new URL(SITE_URL).host },
    robots: { index: false, follow: false },
  };
}

export default async function NotFound() {
  return <OfflineScreen variant={await variant()} />;
}
