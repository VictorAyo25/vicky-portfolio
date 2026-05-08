'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown } from 'lucide-react';
import { fetchTaxonomy, Taxonomy } from '@/lib/taxonomy';

export default function Navigation() {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const pathname = usePathname();

  // Load taxonomy on mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchTaxonomy();
        setTaxonomy(data);
      } catch (err) {
        console.error("Nav taxonomy load failed", err);
      }
    }
    loadData();

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = taxonomy ? Object.keys(taxonomy) : [];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#0F0E0D]/80 backdrop-blur-md border-b border-[#2F2A26]' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="font-serif text-2xl tracking-widest text-[#F3F4F6] hover:text-[#C5A059] transition-colors relative group min-h-11 inline-flex items-center touch-manipulation">
            VICTORIA
            <span className="text-[#C5A059] group-hover:text-[#F3F4F6] transition-colors">.</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 font-sans text-sm uppercase tracking-wider">
            <Link 
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`transition-colors min-h-11 inline-flex items-center px-1 touch-manipulation ${pathname === '/about' ? 'text-[#C5A059]' : 'text-gray-400 hover:text-[#F3F4F6]'}`}
            >
              About
            </Link>
            {navLinks.map((category) => (
              <div
                key={category}
                className="relative group h-20 flex items-center"
                onMouseEnter={() => setHoveredCategory(category)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <Link
                  href={`/category/${category.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-1 transition-colors min-h-11 px-1 touch-manipulation ${
                    pathname.includes(category.toLowerCase().replace(/\s+/g, '-')) 
                      ? 'text-[#C5A059]' 
                      : 'text-gray-400 group-hover:text-[#F3F4F6]'
                  }`}
                >
                  {category}
                  {taxonomy && taxonomy[category]?.length > 0 && (
                    <ChevronDown size={14} className={`transition-transform duration-300 ${hoveredCategory === category ? 'rotate-180' : ''}`} />
                  )}
                </Link>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {hoveredCategory === category && taxonomy && taxonomy[category]?.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 w-64 bg-[#191614] border border-[#2F2A26] rounded-xl shadow-2xl p-4 grid gap-2"
                    >
                      {taxonomy[category].map((sub) => (
                        <Link
                          key={sub}
                          href={`/category/${category.toLowerCase().replace(/\s+/g, '-')}/${sub.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-4 py-2 text-xs text-gray-400 hover:text-[#C5A059] hover:bg-[#2F2A26]/30 rounded-lg transition-colors capitalize break-words"
                        >
                          {sub}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            
            {/* CTA Button */}
            <Link 
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="ml-4 px-6 py-3 min-h-11 border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-[#0F0E0D] active:scale-[0.98] transition-all rounded-full text-xs font-bold inline-flex items-center justify-center touch-manipulation"
            >
              Contact
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-[#F3F4F6] hover:text-[#C5A059] transition-colors min-h-11 min-w-11 inline-flex items-center justify-center active:scale-[0.96] touch-manipulation"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-40 bg-[#0F0E0D] pt-24 px-8 overflow-y-auto md:hidden"
          >
            <div className="flex flex-col gap-6 font-serif text-2xl">
              <div className="border-b border-[#2F2A26] pb-4">
                <Link
                  href="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block mb-4 min-h-11 py-2 ${pathname === '/about' ? 'text-[#C5A059]' : 'text-[#F3F4F6] hover:text-[#C5A059]'}`}
                >
                  About
                </Link>
              </div>
              {navLinks.map((category) => (
                <div key={category} className="border-b border-[#2F2A26] pb-4">
                  <Link 
                    href={`/category/${category.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-[#F3F4F6] mb-4 min-h-11 py-2 hover:text-[#C5A059]"
                  >
                    {category}
                  </Link>
                  {taxonomy && taxonomy[category]?.length > 0 && (
                    <div className="pl-4 space-y-3 border-l border-[#2F2A26]">
                      {taxonomy[category].map((sub) => (
                        <Link
                          key={sub}
                          href={`/category/${category.toLowerCase().replace(/\s+/g, '-')}/${sub.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block text-sm font-sans text-gray-500 min-h-10 py-2 hover:text-[#C5A059]"
                        >
                          {sub}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="text-[#C5A059] font-bold mt-4 min-h-11 py-2 inline-flex items-center">
                Get in Touch →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
