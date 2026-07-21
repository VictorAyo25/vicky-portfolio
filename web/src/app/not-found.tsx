import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';

export const metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist or has been moved.',
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0F0E0D] flex items-center justify-center px-6 py-24">
      <div className="max-w-xl w-full text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-[#C5A059] mb-4 font-bold">
          Error 404
        </p>

        <h1 className="text-6xl md:text-8xl font-serif text-[#F3F4F6] mb-6">
          Not Found<span className="text-[#C5A059]">.</span>
        </h1>

        <p className="text-gray-400 font-sans leading-relaxed mb-10">
          This page doesn&apos;t exist, or it may have been moved or renamed. The work is still
          here — try exploring by category instead.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/category"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#C5A059] text-[#0F0E0D] px-6 py-3 rounded-full font-bold text-xs uppercase tracking-[0.15em] hover:bg-[#d4b06a] active:scale-[0.98] transition-all"
          >
            <Compass size={15} />
            Explore Work
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-[#C5A059]/60 text-[#C5A059] px-6 py-3 rounded-full font-bold text-xs uppercase tracking-[0.15em] hover:bg-[#C5A059] hover:text-[#0F0E0D] active:scale-[0.98] transition-all"
          >
            Back Home
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </main>
  );
}
