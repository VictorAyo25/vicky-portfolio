import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CV',
  description: 'Curriculum vitae of Victoria Odueso — SEO writer and content strategist.',
  alternates: { canonical: '/cv' },
  openGraph: {
    title: 'CV | Victoria Odueso',
    description: 'Curriculum vitae of Victoria Odueso — SEO writer and content strategist.',
    url: '/cv',
  },
};

export default function CvLayout({ children }: { children: React.ReactNode }) {
  return children;
}
