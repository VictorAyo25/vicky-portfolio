'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Users, Edit3, Mic, Book, Clapperboard, Download, Eye, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AboutContent {
  heading: string;
  subheading: string;
  introTitle: string;
  content: string;
  ctaText: string;
}

const defaultContent: AboutContent = {
  heading: 'About Me',
  subheading: 'SEO Content Writer & Strategist',
  introTitle: 'Crafting high-quality, engaging narratives that convert readers into loyal clients.',
  content: `<p>I am Victoria Odueso, a professional SEO content writer and strategist dedicated to elevating your brand's digital presence. My goal goes beyond merely putting words on a page; I focus on the science and psychology behind the text to create compelling narratives that drive organic traffic and generate meaningful leads.</p>
<p>With extensive experience spanning keyword research, on-page optimization, and editorial planning, I have a proven track record of helping businesses achieve up to 25% growth in organic traffic and a remarkable 50% increase in content-generated leads. Whether navigating the nuances of global health tech or mapping search intent for dynamic SaaS platforms, I meticulously tailor every article, landing page, and social campaign to align with your conversion goals.</p>
<p>If you require an authoritative blog piece, magnetic website copy, or a tightly woven editorial strategy, I am here to translate your vision into clear, results-driven content that ranks high and resonates deeply with your audience.</p>`,
  ctaText: "Let's Work Together",
};

const portfolioLinks = [
  { title: 'Blog Articles', href: '/category/blog-articles', icon: BookOpen },
  { title: 'Guest Posts', href: '/category/guest-posts', icon: Users },
  { title: 'Niche Edits', href: '/category/niche-edits', icon: Edit3 },
  { title: 'Press Releases', href: '/category/press-releases', icon: Mic },
  { title: 'E-Book', href: '/category/e-book', icon: Book },
  { title: 'Scripts', href: '/category/scripts', icon: Clapperboard },
];

export default function AboutPage() {
  const [content, setContent] = useState<AboutContent>(defaultContent);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        const snap = await getDoc(doc(db, 'pages', 'page_about'));
        if (snap.exists()) {
          setContent({ ...defaultContent, ...snap.data() } as AboutContent);
        }
      } catch (err) {
        console.error('Failed to load about page:', err);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0E0D] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0E0D] text-[#F3F4F6] relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-[#C5A059]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-[#C5A059]"></div>
      </div>

      <div className="relative z-10">

        {/* ===== Hero Section ===== */}
        <section className="pt-28 pb-16 md:pt-36 md:pb-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Name */}
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-[#C5A059] leading-[0.95] tracking-tight mb-2">
              VICTORIA
            </h1>
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-gray-500/40 leading-[0.95] tracking-tight mb-8">
              ODUESO
            </h1>

            {/* Tagline */}
            <p className="text-lg sm:text-xl md:text-2xl font-serif text-gray-300 italic leading-relaxed mb-10 max-w-2xl mx-auto">
              {content.subheading}
            </p>

            {/* CV Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <a
                href="/Victoria_Odueso_CV.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#C5A059] text-[#0F0E0D] px-8 py-3.5 rounded-full font-bold tracking-widest text-xs uppercase hover:bg-[#d4b06a] active:scale-[0.98] transition-all"
              >
                <Eye size={16} />
                View CV
              </a>
              <a
                href="/Victoria_Odueso_CV.pdf"
                download="Victoria_Odueso_CV.pdf"
                className="w-full sm:w-auto flex items-center justify-center gap-2 border border-[#C5A059]/50 text-[#C5A059] px-8 py-3.5 rounded-full font-bold tracking-widest text-xs uppercase hover:border-[#C5A059] hover:bg-[#C5A059]/10 active:scale-[0.98] transition-all"
              >
                <Download size={16} />
                Download CV
              </a>
            </div>
          </div>
        </section>

        {/* ===== Portfolio Categories ===== */}
        <section className="py-12 md:py-16 px-4 border-t border-[#2F2A26]/50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-gray-500 text-center mb-8">Portfolio</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {portfolioLinks.map((link, idx) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={idx}
                    href={link.href}
                    className="group flex flex-col items-center justify-center gap-3 bg-[#191614] border border-[#2F2A26] hover:border-[#C5A059] px-4 py-6 rounded-xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.98]"
                  >
                    <Icon className="text-[#C5A059] w-6 h-6 md:w-7 md:h-7 opacity-70 group-hover:opacity-100 transition-opacity" />
                    <span className="font-sans text-[10px] md:text-xs font-bold tracking-wider text-center text-gray-400 group-hover:text-[#C5A059] transition-colors leading-tight">
                      {link.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== Introduction Section ===== */}
        <section className="py-12 md:py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#191614]/80 backdrop-blur-xl border border-[#2F2A26] rounded-2xl p-6 sm:p-8 md:p-12 lg:p-16 shadow-2xl">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#C5A059] mb-6 md:mb-8 italic text-center leading-snug">
                {content.introTitle}
              </h2>

              <div className="post-content" dangerouslySetInnerHTML={{ __html: content.content }} />

              <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Link
                  href="/contact"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#C5A059] text-[#0F0E0D] px-8 py-3.5 rounded-full font-bold tracking-widest text-xs uppercase hover:bg-[#d4b06a] active:scale-[0.98] transition-all"
                >
                  {content.ctaText}
                </Link>
                <a
                  href="/Victoria_Odueso_CV.pdf"
                  download="Victoria_Odueso_CV.pdf"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-[#2F2A26] text-gray-400 px-8 py-3.5 rounded-full font-bold tracking-widest text-xs uppercase hover:border-[#C5A059] hover:text-[#C5A059] active:scale-[0.98] transition-all"
                >
                  <Download size={14} />
                  Download CV
                </a>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
