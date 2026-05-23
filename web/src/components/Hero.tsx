'use client';

import { useEffect, useState } from 'react';
import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface HomeContent {
  heroName: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  ctaPrimaryText: string;
  ctaSecondaryText: string;
}

const defaultContent: HomeContent = {
  heroName: 'Victoria Odueso',
  heroTitle: 'SEO Writer',
  heroSubtitle: '& Content Strategist',
  heroDescription: 'Creating high-quality, engaging narratives that convert readers into loyal clients.',
  ctaPrimaryText: 'Explore My Work',
  ctaSecondaryText: 'About Me',
};

export default function Hero() {
  const [content, setContent] = useState<HomeContent>(defaultContent);

  useEffect(() => {
    // Sync with localStorage instantly on mount to prevent stale flash
    const cachedHome = localStorage.getItem('vicky_home_content');
    if (cachedHome) {
      try {
        setContent(JSON.parse(cachedHome));
      } catch (err) {
        console.error('Failed to parse cached home content:', err);
      }
    }

    async function loadContent() {
      try {
        const [homeSnap, aboutSnap] = await Promise.all([
          getDoc(doc(db, 'pages', 'page_home')),
          getDoc(doc(db, 'pages', 'page_about'))
        ]);
        if (homeSnap.exists()) {
          const freshData = { ...defaultContent, ...homeSnap.data() } as HomeContent;
          setContent(freshData);
          localStorage.setItem('vicky_home_content', JSON.stringify(freshData));
        }
        if (aboutSnap.exists()) {
          const aboutData = aboutSnap.data();
          localStorage.setItem('vicky_about_content', JSON.stringify(aboutData));
        }
      } catch (err) {
        console.error('Failed to fetch home/about dynamic data:', err);
      }
    }
    loadContent();
  }, []);

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--hero-gradient-from)] via-[var(--hero-gradient-via)] to-[var(--hero-gradient-to)]" />
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(197,160,89,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(197,160,89,0.3) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold/3 rounded-full blur-3xl" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-5xl px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-6 md:mb-8"
        >
          <span className="text-gold text-[11px] md:text-xs font-sans tracking-[0.3em] uppercase font-semibold border border-gold/20 px-4 py-1.5 rounded-full">
            {content.heroName}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-serif text-foreground leading-[1.05] tracking-tight mb-4 md:mb-6"
        >
          {content.heroTitle}
          <br />
          <span className="text-gray-500/55 italic">{content.heroSubtitle}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-gray-400 text-base md:text-lg lg:text-xl font-sans max-w-2xl mx-auto leading-relaxed mb-8 md:mb-10"
        >
          {content.heroDescription}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-8"
        >
          <Link
            href="/category"
            className="group relative w-full sm:w-auto px-7 py-3.5 md:px-8 md:py-4 min-h-12 bg-gold text-onyx font-bold uppercase tracking-[0.15em] text-[11px] md:text-xs rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(197,160,89,0.3)] active:scale-[0.97] inline-flex items-center justify-center gap-2.5"
          >
            <span className="relative z-10 flex items-center gap-2.5">
              {content.ctaPrimaryText}
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </Link>

          <Link
            href="/about"
            className="w-full sm:w-auto px-7 py-3.5 md:px-8 md:py-4 min-h-12 border border-border text-gray-400 font-bold uppercase tracking-[0.15em] text-[11px] md:text-xs rounded-full hover:border-gold/60 hover:text-gold active:scale-[0.97] transition-all duration-300 inline-flex items-center justify-center gap-2"
          >
            {content.ctaSecondaryText}
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="flex items-center justify-center"
        >
          <a
            href="/cv"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-gray-500 hover:text-gold transition-colors duration-300 text-[11px] md:text-xs font-sans tracking-wide"
          >
            <Eye size={14} className="group-hover:scale-110 transition-transform duration-300" />
            <span>View CV</span>
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
      >
        <span className="text-[8px] text-gray-600 uppercase tracking-[0.3em] font-sans">Scroll</span>
        <div className="w-px h-5 bg-gradient-to-b from-gold/40 to-transparent animate-pulse" />
      </motion.div>
    </section>
  );
}
