import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with Victoria Odueso for SEO writing, guest posts, press releases, and content strategy work.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact | Victoria Odueso',
    description:
      'Get in touch with Victoria Odueso for SEO writing, guest posts, press releases, and content strategy work.',
    url: '/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
