'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, ArrowRight } from 'lucide-react';
import { fetchTaxonomy, Taxonomy, INITIAL_TAXONOMY } from '@/lib/taxonomy';

export default function Navigation() {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Only run client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    async function loadData() {
      try {
        const data = await fetchTaxonomy();
        if (!cancelled) setTaxonomy(data);
      } catch {
        if (!cancelled) setTaxonomy(INITIAL_TAXONOMY);
      }
    }
    loadData();

    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      cancelled = true;
      window.removeEventListener('scroll', handleScroll);
    };
  }, [mounted]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setHoveredCategory(null);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen, mounted]);

  const navLinks = taxonomy ? Object.keys(taxonomy) : [];

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl md:text-2xl tracking-[0.15em] text-[#F3F4F6]">
            VICTORIA<span className="text-[#C5A059]">.</span>
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#0F0E0D]/90 backdrop-blur-xl border-b border-[#2F2A26]/60 shadow-[0_4px_30px_rgba(0,0,0,0.3)]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-xl md:text-2xl tracking-[0.15em] text-[#F3F4F6] hover:text-[#C5A059] transition-colors duration-300 relative group min-h-11 inline-flex items-center"
          >
            <span className="relative">
              VICTORIA
              <span className="text-[#C5A059] group-hover:text-[#F3F4F6] transition-colors duration-300">.</span>
              <span className="absolute -bottom-0.5 left-0 w-0 group-hover:w-full h-px bg-[#C5A059] transition-all duration-300" />
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-7 font-sans text-[11px] uppercase tracking-[0.15em] font-medium">
            <Link
              href="/about"
              className={`transition-colors duration-200 min-h-11 inline-flex items-center px-1 relative ${
                pathname === '/about' ? 'text-[#C5A059]' : 'text-gray-400 hover:text-[#F3F4F6]'
              }`}
            >
              About
              {pathname === '/about' && (
                <motion.span layoutId="nav-indicator" className="absolute -bottom-0.5 left-0 right-0 h-px bg-[#C5A059]" />
              )}
            </Link>

            {navLinks.map((category) => {
              const catSlug = category.toLowerCase().replace(/\s+/g, '-');
              const isActive = pathname.includes(catSlug);
              return (
                <div
                  key={category}
                  className="relative h-20 flex items-center"
                  onMouseEnter={() => setHoveredCategory(category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <Link
                    href={`/category/${catSlug}`}
                    className={`flex items-center gap-1.5 transition-colors duration-200 min-h-11 px-1 ${
                      isActive ? 'text-[#C5A059]' : 'text-gray-400 hover:text-[#F3F4F6]'
                    }`}
                  >
                    {category}
                    {taxonomy && taxonomy[category]?.length > 0 && (
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-300 ${hoveredCategory === category ? 'rotate-180' : ''}`}
                      />
                    )}
                  </Link>
                  {isActive && !hoveredCategory && (
                    <motion.span layoutId="nav-indicator" className="absolute -bottom-0.5 left-0 right-0 h-px bg-[#C5A059]" />
                  )}

                  <AnimatePresence>
                    {hoveredCategory === category && taxonomy && taxonomy[category]?.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 w-60 bg-[#141210]/95 backdrop-blur-xl border border-[#2F2A26]/80 rounded-xl shadow-2xl shadow-black/40 p-3 grid gap-1"
                      >
                        {taxonomy[category].map((sub) => (
                          <Link
                            key={sub}
                            href={`/category/${catSlug}/${sub.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                            className="block px-3 py-2 text-[11px] text-gray-400 hover:text-[#C5A059] hover:bg-[#C5A059]/5 rounded-lg transition-all duration-200 capitalize"
                          >
                            {sub}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            <Link
              href="/contact"
              className={`ml-2 px-5 py-2.5 min-h-10 border rounded-full font-bold inline-flex items-center justify-center transition-all duration-300 ${
                pathname === '/contact'
                  ? 'border-[#C5A059] bg-[#C5A059] text-[#0F0E0D]'
                  : 'border-[#C5A059]/60 text-[#C5A059] hover:bg-[#C5A059] hover:text-[#0F0E0D] hover:shadow-[0_0_20px_rgba(197,160,89,0.2)]'
              }`}
            >
              Contact
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-[#F3F4F6] hover:text-[#C5A059] transition-colors min-h-11 min-w-11 inline-flex items-center justify-center active:scale-90"
            onClick={toggleMobileMenu}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-[#0F0E0D]/98 backdrop-blur-2xl lg:hidden"
          >
            <div className="flex flex-col pt-24 px-6 md:px-10 h-full overflow-y-auto">
              <div className="flex flex-col gap-1">
                <Link
                  href="/about"
                  className={`flex items-center justify-between py-4 text-2xl font-serif border-b border-[#2F2A26]/50 transition-colors ${
                    pathname === '/about' ? 'text-[#C5A059]' : 'text-[#F3F4F6]'
                  }`}
                >
                  About
                </Link>

                {navLinks.map((category) => {
                  const catSlug = category.toLowerCase().replace(/\s+/g, '-');
                  const [expanded, setExpanded] = useState(false);
                  const hasSubs = taxonomy && taxonomy[category]?.length > 0;

                  return (
                    <div key={category} className="border-b border-[#2F2A26]/50">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/category/${catSlug}`}
                          className={`flex-1 py-4 text-2xl font-serif transition-colors ${
                            pathname.includes(catSlug) ? 'text-[#C5A059]' : 'text-[#F3F4F6]'
                          }`}
                        >
                          {category}
                        </Link>
                        {hasSubs && (
                          <button
                            onClick={() => setExpanded(!expanded)}
                            className="p-3 text-gray-500 active:scale-90 transition-transform"
                            aria-label={`Toggle ${category} submenu`}
                          >
                            <ChevronDown size={20} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                      <AnimatePresence>
                        {expanded && hasSubs && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden pl-4 pb-3"
                          >
                            <div className="flex flex-col gap-1 border-l border-[#2F2A26] pl-4">
                              {taxonomy![category].map((sub) => (
                                <Link
                                  key={sub}
                                  href={`/category/${catSlug}/${sub.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                                  className="py-2.5 text-sm font-sans text-gray-500 hover:text-[#C5A059] transition-colors capitalize"
                                >
                                  {sub}
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                <Link
                  href="/contact"
                  className="mt-6 mb-8 inline-flex items-center justify-center gap-2 bg-[#C5A059] text-[#0F0E0D] px-8 py-4 rounded-full font-bold text-xs uppercase tracking-[0.15em] active:scale-[0.97] transition-transform"
                >
                  Get in Touch
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
