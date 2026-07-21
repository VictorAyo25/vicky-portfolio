'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown, ArrowRight, Play, Sun, Moon, Download } from 'lucide-react';
import {
  INITIAL_TAXONOMY,
  fetchTaxonomy,
  fetchCategoryOrder,
  formatTaxonomyLabel,
  orderedCategories,
  type Taxonomy,
} from '@/lib/taxonomy';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [workMenuOpen, setWorkMenuOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  // Seeded with the static taxonomy so the nav renders immediately, then
  // replaced with the live one so categories created in the admin show up
  // without a redeploy.
  const [taxonomy, setTaxonomy] = useState<Taxonomy>(INITIAL_TAXONOMY);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const navLinks = orderedCategories(taxonomy, categoryOrder);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTaxonomy(), fetchCategoryOrder()])
      .then(([data, order]) => {
        if (cancelled) return;
        setTaxonomy(data);
        setCategoryOrder(order);
      })
      .catch((err) => console.error('Failed to load taxonomy for navigation:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setWorkMenuOpen(false);
    setExpandedMobileCategory(null);
  }, [pathname]);

  useEffect(() => {
    if (!workMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setWorkMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [workMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  return (
    <>
      <nav
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
              className={`transition-colors duration-200 min-h-11 inline-flex items-center px-1 ${
                pathname === '/about' ? 'text-[#C5A059]' : 'text-gray-400 hover:text-[#F3F4F6]'
              }`}
            >
              About
            </Link>

            <Link
              href="/multimedia"
              className={`flex items-center gap-1.5 transition-colors duration-200 min-h-11 inline-flex px-1 ${
                pathname === '/multimedia' ? 'text-[#C5A059]' : 'text-gray-400 hover:text-[#F3F4F6]'
              }`}
            >
              <Play size={10} className="fill-current" />
              Multimedia
            </Link>

            {/* All categories live behind one trigger, so the bar keeps a fixed
                width no matter how many categories exist. */}
            <div
              className="relative h-20 flex items-center"
              onMouseEnter={() => setWorkMenuOpen(true)}
              onMouseLeave={() => setWorkMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => setWorkMenuOpen((open) => !open)}
                aria-expanded={workMenuOpen}
                aria-haspopup="true"
                className={`flex items-center gap-1.5 uppercase tracking-[0.15em] transition-colors duration-200 min-h-11 px-1 cursor-pointer ${
                  pathname.startsWith('/category') ? 'text-[#C5A059]' : 'text-gray-400 hover:text-[#F3F4F6]'
                }`}
              >
                Work
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-300 ${workMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {workMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute top-full right-0 w-[min(46rem,calc(100vw-3rem))] max-h-[min(70vh,32rem)] overflow-y-auto bg-[#141210]/97 backdrop-blur-xl border border-[#2F2A26]/80 rounded-2xl shadow-2xl shadow-black/50 p-5 z-50"
                  >
                    {/* Multi-column flow rather than a grid: grid rows stretch every
                        cell to the tallest one, which left categories with no
                        sub-categories sitting in a huge blank box. */}
                    <div className="columns-2 xl:columns-3 gap-6">
                      {navLinks.map((category) => {
                        const catSlug = category.toLowerCase().replace(/\s+/g, '-');
                        const isActive = pathname.includes(catSlug);
                        const subs = taxonomy[category] ?? [];

                        return (
                          <div key={category} className="min-w-0 break-inside-avoid mb-5">
                            <Link
                              href={`/category/${catSlug}`}
                              className={`block text-[11px] font-semibold tracking-[0.12em] pb-1.5 mb-2 border-b border-[#2F2A26]/70 transition-colors ${
                                isActive ? 'text-[#C5A059]' : 'text-[#F3F4F6] hover:text-[#C5A059]'
                              }`}
                            >
                              {formatTaxonomyLabel(category)}
                            </Link>

                            {subs.length > 0 ? (
                              <div className="flex flex-col gap-1.5">
                                {subs.map((sub) => (
                                  <Link
                                    key={sub}
                                    href={`/category/${catSlug}/${sub.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                                    className="block text-[11px] normal-case tracking-normal leading-snug text-gray-400 hover:text-[#C5A059] transition-colors"
                                  >
                                    {formatTaxonomyLabel(sub)}
                                  </Link>
                                ))}
                              </div>
                            ) : (
                              // Categories that hold posts directly would otherwise
                              // render as a bare heading and read as broken.
                              <Link
                                href={`/category/${catSlug}`}
                                className="inline-flex items-center gap-1 text-[11px] normal-case tracking-normal text-gray-500 hover:text-[#C5A059] transition-colors"
                              >
                                View all posts
                                <ArrowRight size={11} />
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-[#C5A059] transition-colors focus:outline-none min-h-10 min-w-10 flex items-center justify-center active:scale-95 cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

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

          {/* Mobile Menu Actions */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              onClick={toggleTheme}
              className="p-2.5 text-gray-400 hover:text-[#C5A059] transition-colors focus:outline-none min-h-11 min-w-11 flex items-center justify-center active:scale-90"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button
              className="text-[#F3F4F6] hover:text-[#C5A059] transition-colors min-h-11 min-w-11 inline-flex items-center justify-center active:scale-90"
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed inset-0 z-40 bg-[#0F0E0D]/98 backdrop-blur-2xl lg:hidden flex flex-col"
            onClick={() => setMobileMenuOpen(false)}
          >
            {/* Header placeholder in overlay for layout continuity */}
            <div className="h-16 md:h-20 px-4 md:px-8 flex items-center justify-between border-b border-[#2F2A26]/40 flex-shrink-0">
              <span className="font-serif text-xl tracking-[0.15em] text-[#F3F4F6]">
                VICTORIA<span className="text-[#C5A059]">.</span>
              </span>
              <button
                className="text-[#F3F4F6] hover:text-[#C5A059] transition-colors min-h-11 min-w-11 inline-flex items-center justify-center active:scale-90"
                onClick={toggleMobileMenu}
                aria-label="Close menu"
              >
                <X size={26} />
              </button>
            </div>

            <div
              className="flex-1 overflow-y-auto px-6 py-8 flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#C5A059]/70 font-sans font-semibold mb-1">
                  Menu
                </p>

                <Link
                  href="/about"
                  className={`flex items-center justify-between py-3.5 text-xl font-serif border-b border-[#2F2A26]/30 transition-colors ${
                    pathname === '/about' ? 'text-[#C5A059]' : 'text-[#F3F4F6] hover:text-[#C5A059]'
                  }`}
                >
                  <span>About</span>
                  {pathname === '/about' && <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />}
                </Link>

                <Link
                  href="/multimedia"
                  className={`flex items-center justify-between py-3.5 text-xl font-serif border-b border-[#2F2A26]/30 transition-colors ${
                    pathname === '/multimedia' ? 'text-[#C5A059]' : 'text-[#F3F4F6] hover:text-[#C5A059]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Play size={14} className={pathname === '/multimedia' ? 'text-[#C5A059] fill-[#C5A059]' : 'text-gray-400 fill-gray-400'} />
                    Multimedia
                  </span>
                  {pathname === '/multimedia' && <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />}
                </Link>

                <p className="text-[10px] uppercase tracking-[0.25em] text-[#C5A059]/70 font-sans font-semibold mt-8 mb-1">
                  Explore Work
                </p>

                {navLinks.map((category) => {
                  const catSlug = category.toLowerCase().replace(/\s+/g, '-');
                  const hasSubs = (taxonomy[category]?.length ?? 0) > 0;
                  const isExpanded = expandedMobileCategory === category;
                  const isActive = pathname.includes(catSlug);

                  return (
                    <div key={category} className="border-b border-[#2F2A26]/30">
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          href={`/category/${catSlug}`}
                          className={`flex-1 min-w-0 py-3.5 text-lg font-serif leading-snug transition-colors ${
                            isActive ? 'text-[#C5A059]' : 'text-[#F3F4F6] hover:text-[#C5A059]'
                          }`}
                        >
                          {formatTaxonomyLabel(category)}
                        </Link>
                        {hasSubs ? (
                          <button
                            onClick={() => setExpandedMobileCategory(isExpanded ? null : category)}
                            className={`shrink-0 w-9 h-9 rounded-full border inline-flex items-center justify-center active:scale-90 transition-all ${
                              isExpanded
                                ? 'border-[#C5A059] text-[#C5A059] bg-[#C5A059]/10'
                                : 'border-[#3A332E] text-gray-500 hover:text-[#C5A059] hover:border-[#C5A059]/60'
                            }`}
                            aria-label={`Toggle ${formatTaxonomyLabel(category)} submenu`}
                            aria-expanded={isExpanded}
                          >
                            <ChevronDown size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        ) : (
                          // Decorative: the row itself is the link. Without this the
                          // row looks unfinished next to expandable siblings.
                          <span
                            aria-hidden="true"
                            className="shrink-0 w-9 h-9 inline-flex items-center justify-center text-gray-600"
                          >
                            <ArrowRight size={15} />
                          </span>
                        )}
                      </div>
                      <AnimatePresence initial={false}>
                        {isExpanded && hasSubs && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="pb-4 pt-1 flex flex-wrap gap-2">
                              {(taxonomy[category] ?? []).map((sub) => {
                                const subSlug = sub.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                const isSubActive = pathname.includes(subSlug);
                                return (
                                  <Link
                                    key={sub}
                                    href={`/category/${catSlug}/${subSlug}`}
                                    className={`px-3 py-1.5 rounded-full text-xs font-sans border transition-all ${
                                      isSubActive
                                        ? 'border-[#C5A059] bg-[#C5A059] text-[#0F0E0D] font-semibold'
                                        : 'border-[#3A332E] text-gray-400 hover:text-[#C5A059] hover:border-[#C5A059]/60'
                                    }`}
                                  >
                                    {formatTaxonomyLabel(sub)}
                                  </Link>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                <Link
                  href="/cv"
                  target="_blank"
                  className="flex items-center justify-between py-4 text-xl font-serif border-b border-[#2F2A26]/30 text-[#F3F4F6] hover:text-[#C5A059] transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Download size={16} className="text-gray-400" />
                    Download CV
                  </span>
                </Link>
              </div>

              <div className="mt-8 mb-4">
                <Link
                  href="/contact"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#C5A059] text-[#0F0E0D] py-3.5 rounded-full font-bold text-xs uppercase tracking-[0.15em] active:scale-[0.97] transition-all hover:bg-[#d4b06a]"
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
