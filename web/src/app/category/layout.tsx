import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site';

const DESCRIPTION =
  "Browse Victoria Odueso's writing portfolio by category — blog articles, guest posts, niche edits, press releases, digital PR, and more.";

export const metadata: Metadata = {
  // Re-declares the template so nested category pages keep the site suffix;
  // a plain string here would leave children with a bare title.
  title: {
    default: 'Explore Work',
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  alternates: { canonical: '/category' },
  openGraph: {
    title: 'Explore Work | Victoria Odueso',
    description: DESCRIPTION,
    url: '/category',
  },
};

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
