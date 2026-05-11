'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { motion, AnimatePresence, useMotionValue, PanInfo } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  slug: string;
  category: string;
  subCategory?: string;
  coverImage?: string;
  deleted?: boolean;
}

const ROTATE_INTERVAL = 7000;

export default function FeaturedPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const x = useMotionValue(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Post))
          .filter(p => p.coverImage && !p.deleted);
        setPosts(fetched);
      } catch (err) {
        console.error('Failed to fetch multimedia content:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  const totalPages = Math.max(1, posts.length);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (posts.length <= 1 || isPaused) return;
    timerRef.current = setInterval(() => {
      setDirection(1);
      setActiveIndex(prev => (prev + 1) % totalPages);
      setShowTitle(false);
    }, ROTATE_INTERVAL);
  }, [posts.length, isPaused, totalPages]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const goNext = useCallback(() => {
    if (posts.length <= 1) return;
    setDirection(1);
    setActiveIndex(prev => (prev + 1) % totalPages);
    setShowTitle(false);
    resetTimer();
  }, [posts.length, totalPages, resetTimer]);

  const goPrev = useCallback(() => {
    if (posts.length <= 1) return;
    setDirection(-1);
    setActiveIndex(prev => (prev - 1 + totalPages) % totalPages);
    setShowTitle(false);
    resetTimer();
  }, [posts.length, totalPages, resetTimer]);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -40) goNext();
    else if (info.offset.x > 40) goPrev();
  }, [goNext, goPrev]);

  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
    setShowTitle(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
    setShowTitle(false);
  }, []);

  if (loading) {
    return (
      <section className="pt-6 pb-10 md:pt-8 md:pb-14 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="aspect-[16/9] md:aspect-[21/9] rounded-2xl bg-[#191614] border border-[#2F2A26] animate-pulse" />
        </div>
      </section>
    );
  }

  if (posts.length === 0) return null;

  const canNavigate = posts.length > 1;
  const activePost = posts[activeIndex];

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <section className="pt-6 pb-10 md:pt-8 md:pb-14 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-3">
            <Play size={12} className="text-[#C5A059] fill-[#C5A059]" />
            <span className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-[#C5A059] font-sans font-semibold">
              Multimedia Content
            </span>
          </div>
          {canNavigate && (
            <div className="hidden md:flex items-center gap-1.5">
              <button
                onClick={goPrev}
                className="w-8 h-8 rounded-full border border-[#2F2A26] flex items-center justify-center text-gray-500 hover:text-[#C5A059] hover:border-[#C5A059] transition-all duration-200 active:scale-90"
                aria-label="Previous"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={goNext}
                className="w-8 h-8 rounded-full border border-[#2F2A26] flex items-center justify-center text-gray-500 hover:text-[#C5A059] hover:border-[#C5A059] transition-all duration-200 active:scale-90"
                aria-label="Next"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Carousel */}
        <div
          className="relative overflow-hidden rounded-xl md:rounded-2xl group"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
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
                transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                drag={canNavigate ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={handleDragEnd}
                style={{ x }}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
                onTouchStart={() => setShowTitle(true)}
                onTouchEnd={() => setTimeout(() => setShowTitle(false), 2000)}
              >
                {/* Cover Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${activePost.coverImage})` }}
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />

                {/* Content — title shows on hover (desktop) or touch (mobile) */}
                <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-8 lg:p-10">
                  <div className="max-w-2xl">
                    <span className="inline-block bg-[#C5A059]/20 backdrop-blur-md border border-[#C5A059]/30 px-3 py-1 rounded-full text-[10px] md:text-[11px] font-sans uppercase tracking-[0.2em] text-[#C5A059] mb-2 md:mb-3">
                      {activePost.subCategory || activePost.category}
                    </span>

                    <motion.h3
                      className="text-lg md:text-2xl lg:text-3xl font-serif text-white leading-tight mb-2 md:mb-3 drop-shadow-lg"
                      animate={{ opacity: showTitle ? 1 : 0, y: showTitle ? 0 : 12 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                      {activePost.title}
                    </motion.h3>

                    <motion.div
                      animate={{ opacity: showTitle ? 1 : 0, y: showTitle ? 0 : 8 }}
                      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
                    >
                      <Link
                        href={`/${activePost.slug}`}
                        className="inline-flex items-center gap-2 bg-[#C5A059] text-[#0F0E0D] px-4 py-2 md:px-5 md:py-2.5 rounded-full font-bold text-[10px] md:text-[11px] uppercase tracking-widest hover:bg-[#d4b06a] active:scale-[0.97] transition-all duration-200"
                        onClick={e => e.stopPropagation()}
                      >
                        Read Article
                        <ChevronRight size={14} />
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Mobile Navigation Arrows */}
            {canNavigate && (
              <>
                <button
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 md:hidden w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/80 active:scale-90 transition-transform z-10"
                  aria-label="Previous"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 md:hidden w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/80 active:scale-90 transition-transform z-10"
                  aria-label="Next"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          {/* Progress Bar */}
          {canNavigate && (
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

        {/* Dots */}
        {canNavigate && totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3 md:mt-4">
            {Array.from({ length: Math.min(totalPages, 12) }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > activeIndex ? 1 : -1);
                  setActiveIndex(i);
                  setShowTitle(false);
                  resetTimer();
                }}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'w-5 bg-[#C5A059]' : 'w-1 bg-[#2F2A26] hover:bg-[#59514A]'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
