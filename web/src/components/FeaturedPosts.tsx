'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { motion, AnimatePresence, useMotionValue, PanInfo } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  slug: string;
  category: string;
  subCategory?: string;
  coverImage?: string;
  description?: string;
  createdAt?: { seconds?: number };
  deleted?: boolean;
}

const ROTATE_INTERVAL = 6000;

export default function FeaturedPosts() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const x = useMotionValue(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const posts = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Post))
          .filter(p => p.coverImage && !p.deleted);
        setAllPosts(posts);
      } catch (err) {
        console.error('Failed to fetch featured posts:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (allPosts.length <= 1 || isPaused) return;
    timerRef.current = setInterval(() => {
      setDirection(1);
      setActiveIndex(prev => (prev + 1) % allPosts.length);
    }, ROTATE_INTERVAL);
  }, [allPosts.length, isPaused]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const goNext = useCallback(() => {
    setDirection(1);
    setActiveIndex(prev => (prev + 1) % allPosts.length);
    resetTimer();
  }, [allPosts.length, resetTimer]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setActiveIndex(prev => (prev - 1 + allPosts.length) % allPosts.length);
    resetTimer();
  }, [allPosts.length, resetTimer]);

  const goTo = useCallback((idx: number) => {
    setDirection(idx > activeIndex ? 1 : -1);
    setActiveIndex(idx);
    resetTimer();
  }, [activeIndex, resetTimer]);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -60) goNext();
    else if (info.offset.x > 60) goPrev();
  }, [goNext, goPrev]);

  if (loading) {
    return (
      <section className="py-20 md:py-28 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="aspect-[16/9] md:aspect-[21/9] rounded-2xl bg-[#191614] border border-[#2F2A26] animate-pulse" />
        </div>
      </section>
    );
  }

  if (allPosts.length === 0) return null;

  const activePost = allPosts[activeIndex];
  const hasMultiple = allPosts.length > 1;

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <section className="py-16 md:py-28 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-8 md:mb-10">
          <div>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-[10px] md:text-[11px] uppercase tracking-[0.25em] text-[#C5A059] mb-2 font-sans font-semibold"
            >
              Featured Work
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-2xl md:text-3xl lg:text-4xl font-serif text-[#F3F4F6] tracking-tight"
            >
              Visual Stories
            </motion.h2>
          </div>
          {hasMultiple && (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={goPrev}
                className="w-11 h-11 rounded-full border border-[#2F2A26] flex items-center justify-center text-gray-400 hover:text-[#C5A059] hover:border-[#C5A059] transition-all duration-200 active:scale-90"
                aria-label="Previous slide"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goNext}
                className="w-11 h-11 rounded-full border border-[#2F2A26] flex items-center justify-center text-gray-400 hover:text-[#C5A059] hover:border-[#C5A059] transition-all duration-200 active:scale-90"
                aria-label="Next slide"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Main Carousel */}
        <div
          className="relative rounded-2xl md:rounded-3xl overflow-hidden bg-[#191614] border border-[#2F2A26]/60"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="aspect-[16/9] md:aspect-[21/9] relative">
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={activePost.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                drag={hasMultiple ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={handleDragEnd}
                style={{ x }}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
              >
                {/* Cover Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${activePost.coverImage})` }}
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-8 lg:p-12">
                  <div className="max-w-2xl">
                    {/* Category */}
                    <motion.span
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="inline-block bg-[#C5A059]/20 backdrop-blur-md border border-[#C5A059]/30 px-3 py-1 rounded-full text-[10px] md:text-[11px] font-sans uppercase tracking-[0.2em] text-[#C5A059] mb-3 md:mb-4"
                    >
                      {activePost.subCategory || activePost.category}
                    </motion.span>

                    {/* Title */}
                    <motion.h3
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-xl md:text-3xl lg:text-4xl font-serif text-white leading-tight mb-2 md:mb-3 drop-shadow-lg"
                    >
                      {activePost.title}
                    </motion.h3>

                    {/* Description */}
                    {activePost.description && (
                      <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-xs md:text-sm text-gray-300 line-clamp-2 mb-3 md:mb-4 max-w-lg hidden sm:block"
                      >
                        {activePost.description}
                      </motion.p>
                    )}

                    {/* CTA */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                    >
                      <Link
                        href={`/${activePost.slug}`}
                        className="inline-flex items-center gap-2 bg-[#C5A059] text-[#0F0E0D] px-5 py-2.5 md:px-6 md:py-3 rounded-full font-bold text-[11px] md:text-xs uppercase tracking-widest hover:bg-[#d4b06a] active:scale-[0.97] transition-all duration-200 group/btn"
                      >
                        Read Article
                        <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Mobile Navigation Arrows (overlay on image) */}
            {hasMultiple && (
              <>
                <button
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 md:hidden w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/80 active:scale-90 transition-transform"
                  aria-label="Previous"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 md:hidden w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/80 active:scale-90 transition-transform"
                  aria-label="Next"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          {/* Progress Bar */}
          {hasMultiple && (
            <div className="h-1 bg-[#191614]">
              <motion.div
                key={activeIndex}
                initial={{ width: '0%' }}
                animate={{ width: isPaused ? '0%' : '100%' }}
                transition={{ duration: isPaused ? 0 : ROTATE_INTERVAL / 1000, ease: 'linear' }}
                className="h-full bg-[#C5A059]"
              />
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {hasMultiple && (
          <div className="mt-4 md:mt-5 flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {allPosts.map((post, i) => (
              <button
                key={post.id}
                onClick={() => goTo(i)}
                className={`relative flex-shrink-0 w-16 h-12 md:w-24 md:h-16 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                  i === activeIndex
                    ? 'border-[#C5A059] shadow-[0_0_12px_rgba(197,160,89,0.3)] scale-105'
                    : 'border-[#2F2A26] opacity-50 hover:opacity-80 hover:border-[#59514A]'
                }`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${post.coverImage})` }}
                />
                {i === activeIndex && (
                  <div className="absolute inset-0 bg-[#C5A059]/10" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Counter */}
        {hasMultiple && (
          <div className="flex items-center justify-between mt-4 md:mt-5">
            <span className="text-[11px] text-gray-500 font-mono tracking-wider">
              {String(activeIndex + 1).padStart(2, '0')} / {String(allPosts.length).padStart(2, '0')}
            </span>
            <div className="flex gap-1">
              {allPosts.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    i === activeIndex ? 'bg-[#C5A059] w-4' : 'bg-[#2F2A26] hover:bg-[#59514A]'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
