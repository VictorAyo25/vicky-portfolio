import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Multimedia',
  description:
    'Video, audio, and multimedia work from Victoria Odueso — scripts, narration, and produced content.',
  alternates: { canonical: '/multimedia' },
  openGraph: {
    title: 'Multimedia | Victoria Odueso',
    description:
      'Video, audio, and multimedia work from Victoria Odueso — scripts, narration, and produced content.',
    url: '/multimedia',
  },
};

export default function MultimediaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
