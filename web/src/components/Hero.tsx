'use client';

import Link from "next/link";
import { ArrowRight, Download, Eye } from "lucide-react";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1612] via-[#0F0E0D] to-[#0F0E0D]" />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(197,160,89,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(197,160,89,0.3) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      {/* Decorative orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C5A059]/[0.03] rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#C5A059]/[0.02] rounded-full blur-3xl" />

      {/* Top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C5A059]/20 to-transparent" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-5xl px-6 md:px-8">
        {/* Overline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-6 md:mb-8"
        >
          <span className="text-[#C5A059] text-[11px] md:text-xs font-sans tracking-[0.3em] uppercase font-semibold border border-[#C5A059]/20 px-4 py-1.5 rounded-full">
            Victoria Odueso
          </span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-serif text-[#F3F4F6] leading-[1.05] tracking-tight mb-4 md:mb-6"
        >
          Exceptional Writer
          <br />
          <span className="text-gray-500/50 italic">& Content Strategist</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-gray-400 text-base md:text-lg lg:text-xl font-sans max-w-2xl mx-auto leading-relaxed mb-8 md:mb-10"
        >
          Crafting high-converting narratives for SaaS, FinTech, and modern brands.
          Where timeless quality meets data-driven performance.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-8"
        >
          <Link
            href="/category"
            className="group relative w-full sm:w-auto px-7 py-3.5 md:px-8 md:py-4 min-h-12 bg-[#C5A059] text-[#0F0E0D] font-bold uppercase tracking-[0.15em] text-[11px] md:text-xs rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(197,160,89,0.3)] active:scale-[0.97] inline-flex items-center justify-center gap-2.5"
          >
            <span className="relative z-10 flex items-center gap-2.5">
              Explore Work
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </Link>

          <Link
            href="/about"
            className="w-full sm:w-auto px-7 py-3.5 md:px-8 md:py-4 min-h-12 border border-[#2F2A26] text-gray-400 font-bold uppercase tracking-[0.15em] text-[11px] md:text-xs rounded-full hover:border-[#C5A059]/60 hover:text-[#C5A059] active:scale-[0.97] transition-all duration-300 inline-flex items-center justify-center gap-2"
          >
            About Me
          </Link>
        </motion.div>

        {/* CV Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="flex items-center justify-center gap-4 md:gap-6"
        >
          <a
            href="/Victoria_Odueso_CV.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-gray-500 hover:text-[#C5A059] transition-colors duration-300 text-[11px] md:text-xs font-sans tracking-wide"
          >
            <Eye size={14} className="group-hover:scale-110 transition-transform" />
            <span>View CV</span>
          </a>
          <span className="w-1 h-1 bg-[#2F2A26] rounded-full" />
          <a
            href="/Victoria_Odueso_CV.pdf"
            download="Victoria_Odueso_CV.pdf"
            className="group flex items-center gap-2 text-gray-500 hover:text-[#C5A059] transition-colors duration-300 text-[11px] md:text-xs font-sans tracking-wide"
          >
            <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
            <span>Download CV</span>
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[9px] text-gray-600 uppercase tracking-[0.3em] font-sans">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-[#C5A059]/50 to-transparent animate-pulse" />
      </motion.div>
    </section>
  );
}
