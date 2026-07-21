import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description:
    'About Victoria Odueso — SEO writer and content strategist specialising in SaaS, digital marketing, health, and lifestyle content.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About | Victoria Odueso',
    description:
      'About Victoria Odueso — SEO writer and content strategist specialising in SaaS, digital marketing, health, and lifestyle content.',
    url: '/about',
    type: 'profile',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
