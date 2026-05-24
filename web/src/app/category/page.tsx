'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, ChevronDown, Compass } from 'lucide-react';
import { fetchTaxonomy, Taxonomy } from '@/lib/taxonomy';

export default function CategoriesIndexPage() {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    async function loadTaxonomy() {
      try {
        const data = await fetchTaxonomy();
        setTaxonomy(data);
      } catch (error) {
        console.error('Failed to load categories:', error);
      } finally {
        setLoading(false);
      }
    }

    void loadTaxonomy();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#110F0E] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
      </div>
    );
  }

  const categories = taxonomy ? Object.keys(taxonomy) : [];

  return (
    <main className="min-h-screen bg-[#0F0E0D] px-6 py-24 pb-32">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 border-b border-[#2E2925] pb-10"
        >
          <p className="text-xs uppercase tracking-widest text-[#C5A059] mb-2 font-bold">Explore Portfolio</p>
          <h1 className="text-5xl md:text-7xl font-serif text-[#F3F4F6]">Explore Work</h1>
          <p className="text-gray-400 mt-5 max-w-2xl font-sans">
            Choose a section to view Victoria&apos;s work by niche and content type.
          </p>
        </motion.div>

        {categories.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-[#2E2925] rounded-2xl">
            <p className="text-gray-500 font-serif text-xl italic">No sections available yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {categories.map((category, i) => {
              const slug = category.toLowerCase().replace(/\s+/g, '-');
              const subSections = taxonomy?.[category] ?? [];
              const isExpanded = expandedCategory === category;
              const hasSubSections = subSections.length > 0;

              return (
                <motion.section
                  key={category}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`rounded-2xl border bg-[#191614] overflow-hidden transition-all duration-300 ${
                    isExpanded && hasSubSections ? 'border-[#C5A059] shadow-[0_0_0_1px_rgba(197,160,89,0.2)]' : 'border-[#2F2A26] hover:border-[#C5A059]/50'
                  }`}
                >
                  {hasSubSections ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setExpandedCategory(isExpanded ? null : category)}
                        className="w-full px-6 py-5 md:px-7 md:py-6 text-left flex items-center justify-between gap-4 hover:bg-[#211c18] transition-colors"
                        aria-expanded={isExpanded}
                        aria-controls={`section-${slug}`}
                      >
                        <h2 className="text-2xl md:text-3xl font-serif text-[#F3F4F6] leading-snug">{category}</h2>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="hidden sm:inline text-xs uppercase tracking-wider text-gray-400">
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </span>
                          <span className="w-10 h-10 rounded-full border border-[#3A332E] bg-[#110F0E] inline-flex items-center justify-center">
                            <ChevronDown
                              size={18}
                              className={`text-[#C5A059] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </span>
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            id={`section-${slug}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6 md:px-7 md:pb-7 border-t border-[#2F2A26] bg-gradient-to-b from-[#1c1714] to-[#171310]">
                              <div className="flex items-center gap-2 text-[#C5A059] text-xs uppercase tracking-widest mt-4 mb-4">
                                <Compass size={13} />
                                Explore this category
                              </div>

                              <div className="flex flex-wrap gap-2.5">
                                {subSections.map((sub) => (
                                  <Link
                                    key={sub}
                                    href={`/category/${slug}/${sub.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                                    className="px-4 py-2 rounded-full text-sm border border-[#3A332E] text-gray-300 hover:text-[#0F0E0D] hover:bg-[#C5A059] hover:border-[#C5A059] transition-all"
                                  >
                                    {sub}
                                  </Link>
                                ))}
                              </div>

                              <div className="mt-6">
                                <Link
                                  href={`/category/${slug}`}
                                  className="inline-flex items-center gap-2 text-[#C5A059] hover:text-[#d4b06a] text-sm uppercase tracking-wider font-semibold"
                                >
                                  View all posts <ArrowRight size={15} />
                                </Link>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <Link
                      href={`/category/${slug}`}
                      className="group w-full px-6 py-5 md:px-7 md:py-6 flex items-center justify-between gap-4 block hover:bg-[#211c18] transition-colors"
                    >
                      <h2 className="text-2xl md:text-3xl font-serif text-[#F3F4F6] leading-snug">{category}</h2>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="hidden sm:inline text-xs uppercase tracking-wider text-gray-400 group-hover:text-[#C5A059] transition-colors">
                          View Posts
                        </span>
                        <span className="w-10 h-10 rounded-full border border-[#3A332E] bg-[#110F0E] inline-flex items-center justify-center group-hover:border-[#C5A059] transition-colors">
                          <ArrowRight
                            size={18}
                            className="text-[#C5A059] transition-transform duration-300 group-hover:translate-x-0.5"
                          />
                        </span>
                      </div>
                    </Link>
                  )}
                </motion.section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
