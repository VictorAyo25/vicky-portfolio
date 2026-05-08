'use client';

import Link from "next/link";
import { ArrowRight, Download, Eye } from "lucide-react";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center p-8 lg:p-24 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#191614] via-[#0F0E0D] to-[#0F0E0D] -z-10" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2F2A26] to-transparent opacity-50" />

      {/* Hero Content */}
      <div className="text-center max-w-5xl z-10 space-y-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-[#C5A059] text-sm md:text-base font-sans tracking-[0.2em] uppercase font-bold"
        >
          Victoria Odueso
        </motion.h2>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-5xl md:text-7xl lg:text-9xl font-serif text-[#F3F4F6] leading-[1.1] tracking-tight"
        >
          Exceptional Writer <br />
          <span className="text-gray-500 italic">& Content Strategist</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-gray-400 text-lg md:text-xl font-sans max-w-2xl mx-auto leading-relaxed"
        >
          Crafting high-converting narratives for SaaS, FinTech, and modern brands.
          Where timeless quality meets data-driven performance.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 pt-8 w-full max-w-lg md:max-w-none mx-auto"
        >
          <Link
            href="/category"
            className="group relative w-full md:w-auto px-8 py-4 min-h-12 bg-[#C5A059] text-[#0F0E0D] font-bold uppercase tracking-widest text-sm rounded-full overflow-hidden transition-all hover:bg-[#d4b06a] active:scale-[0.98] md:hover:scale-105 inline-flex items-center justify-center touch-manipulation"
          >
            <span className="relative z-10 flex items-center gap-2">
              Explore Work <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          <Link
            href="/about"
            className="w-full md:w-auto px-8 py-4 min-h-12 border border-[#2F2A26] text-gray-400 font-bold uppercase tracking-widest text-sm rounded-full hover:border-[#C5A059] hover:text-[#C5A059] active:scale-[0.98] transition-all inline-flex items-center justify-center touch-manipulation"
          >
            About Me
          </Link>
        </motion.div>

        {/* CV Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="flex items-center justify-center gap-3 pt-4"
        >
          <a
            href="/Victoria_Odueso_CV.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-gray-500 hover:text-[#C5A059] transition-colors text-sm font-sans tracking-wide"
          >
            <Eye size={16} className="group-hover:scale-110 transition-transform" />
            <span>View CV</span>
          </a>
          <span className="text-gray-700">•</span>
          <a
            href="/Victoria_Odueso_CV.pdf"
            download="Victoria_Odueso_CV.pdf"
            className="group flex items-center gap-2 text-gray-500 hover:text-[#C5A059] transition-colors text-sm font-sans tracking-wide"
          >
            <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
            <span>Download CV</span>
          </a>
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] text-gray-500 uppercase tracking-widest">Scroll</span>
        <div className="w-px h-12 bg-gradient-to-b from-[#C5A059] to-transparent animate-pulse" />
      </motion.div>
    </section>
  );
}
