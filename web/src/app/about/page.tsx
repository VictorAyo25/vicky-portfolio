'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Users, Edit3, Mic, Book, Clapperboard, Download, Eye, Loader2, ArrowUpRight } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

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
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C5A059]/[0.02] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#C5A059]/[0.015] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">

        {/* Hero */}
        <section className="pt-28 md:pt-36 pb-12 md:pb-20 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-[#C5A059] leading-[0.95] tracking-tight mb-1"
            >
              VICTORIA
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-gray-500/30 leading-[0.95] tracking-tight mb-8"
            >
              ODUESO
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-lg sm:text-xl md:text-2xl font-serif text-gray-300 italic leading-relaxed mb-10 max-w-2xl mx-auto"
            >
              {content.subheading}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <a
                href="/Victoria_Odueso_CV.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#C5A059] text-[#0F0E0D] px-7 py-3.5 rounded-full font-bold tracking-[0.15em] text-[11px] uppercase hover:bg-[#d4b06a] active:scale-[0.97] transition-all duration-200"
              >
                <Eye size={15} />
                View CV
              </a>
              <a
                href="/Victoria_Odueso_CV.pdf"
                download="Victoria_Odueso_CV.pdf"
                className="w-full sm:w-auto flex items-center justify-center gap-2 border border-[#C5A059]/40 text-[#C5A059] px-7 py-3.5 rounded-full font-bold tracking-[0.15em] text-[11px] uppercase hover:border-[#C5A059] hover:bg-[#C5A059]/10 active:scale-[0.97] transition-all duration-200"
              >
                <Download size={15} />
                Download CV
              </a>
            </motion.div>
          </div>
        </section>

        {/* Portfolio Categories */}
        <section className="py-10 md:py-14 px-4 md:px-8 border-t border-[#2F2A26]/40">
          <div className="max-w-5xl mx-auto">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-[10px] uppercase tracking-[0.3em] text-gray-500 text-center mb-6 font-sans"
            >
              Portfolio
            </motion.p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {portfolioLinks.map((link, idx) => {
                const Icon = link.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.06 }}
                  >
                    <Link
                      href={link.href}
                      className="group flex flex-col items-center justify-center gap-3 bg-[#141210] border border-[#2F2A26]/60 hover:border-[#C5A059]/60 px-4 py-6 rounded-xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.97]"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center group-hover:bg-[#C5A059]/20 transition-colors">
                        <Icon className="text-[#C5A059] w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="font-sans text-[10px] md:text-[11px] font-semibold tracking-[0.1em] text-center text-gray-400 group-hover:text-[#C5A059] transition-colors leading-tight uppercase">
                        {link.title}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Introduction */}
        <section className="py-12 md:py-20 px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-[#141210]/80 backdrop-blur-sm border border-[#2F2A26]/60 rounded-2xl p-6 sm:p-8 md:p-12"
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#C5A059] mb-6 md:mb-8 italic text-center leading-snug">
                {content.introTitle}
              </h2>

              <div className="post-content" dangerouslySetInnerHTML={{ __html: content.content }} />

              <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/contact"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#C5A059] text-[#0F0E0D] px-7 py-3.5 rounded-full font-bold tracking-[0.15em] text-[11px] uppercase hover:bg-[#d4b06a] active:scale-[0.97] transition-all duration-200 group"
                >
                  {content.ctaText}
                  <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
                <a
                  href="/Victoria_Odueso_CV.pdf"
                  download="Victoria_Odueso_CV.pdf"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-[#2F2A26] text-gray-400 px-7 py-3.5 rounded-full font-bold tracking-[0.15em] text-[11px] uppercase hover:border-[#C5A059] hover:text-[#C5A059] active:scale-[0.97] transition-all duration-200"
                >
                  <Download size={14} />
                  Download CV
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}
