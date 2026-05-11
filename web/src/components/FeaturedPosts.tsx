'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { motion, AnimatePresence, useMotionValue, PanInfo } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  slug: string;
  category: string;
  subCategory?: string;
  coverImage?: string;
  deleted?: boolean;
}

const VISIBLE = 3;
const ROTATE_INTERVAL = 5000;

export default function FeaturedPosts() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
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

  // Determine visible count: never show more cards than we have posts
  const visibleCount = Math.min(VISIBLE, allPosts.length);
  // Total pages: if posts <= visibleCount, just 1 page. Otherwise shift-by-1 for seamless loop.
  const totalPages = allPosts.length <= visibleCount ? 1 : allPosts.length;

  const getPagePosts = useCallback((p: number) => {
    const posts: Post[] = [];
    for (let i = 0; i < visibleCount; i++) {
      posts.push(allPosts[(p + i) % allPosts.length]);
    }
    return posts;
  }, [allPosts, visibleCount]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (totalPages <= 1 || isPaused) return;
    timerRef.current = setInterval(() => {
      setDirection(1);
      setPage(prev => (prev + 1) % totalPages);
    }, ROTATE_INTERVAL);
  }, [totalPages, isPaused]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const goNext = useCallback(() => {
    if (totalPages <= 1) return;
    setDirection(1);
    setPage(prev => (prev + 1) % totalPages);
    resetTimer();
  }, [totalPages, resetTimer]);

  const goPrev = useCallback(() => {
    if (totalPages <= 1) return;
    setDirection(-1);
    setPage(prev => (prev - 1 + totalPages) % totalPages);
    resetTimer();
  }, [totalPages, resetTimer]);

  const goTo = useCallback((idx: number) => {
    if (totalPages <= 1) return;
    setDirection(idx > page ? 1 : -1);
    setPage(idx);
    resetTimer();
  }, [totalPages, page, resetTimer]);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -50) goNext();
    else if (info.offset.x > 50) goPrev();
  }, [goNext, goPrev]);

  if (loading) {
    return (
      <section className="pt-6 pb-12 md:pt-8 md:pb-16 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {Array.from({ length: VISIBLE }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl bg-[#191614] border border-[#2F2A26] animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (allPosts.length === 0) return null;

  const canNavigate = totalPages > 1;
  const pageKey = `page-${page}`;
  const gridCols = visibleCount === 1 ? 'grid-cols-1' : visibleCount === 2 ? 'grid-cols-2' : 'grid-cols-3';

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '25%' : '-25%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-25%' : '25%', opacity: 0 }),
  };

  return (
    <section className="pt-6 pb-12 md:pt-8 md:pb-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-[#C5A059] font-sans font-semibold">
              Featured
            </span>
            {canNavigate && (
              <span className="text-[10px] text-gray-600 font-mono">
                {String(page + 1).padStart(2, '0')}/{String(totalPages).padStart(2, '0')}
              </span>
            )}
          </div>
          {canNavigate && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={goPrev}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full border border-[#2F2A26] flex items-center justify-center text-gray-500 hover:text-[#C5A059] hover:border-[#C5A059] transition-all duration-200 active:scale-90"
                aria-label="Previous"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={goNext}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full border border-[#2F2A26] flex items-center justify-center text-gray-500 hover:text-[#C5A059] hover:border-[#C5A059] transition-all duration-200 active:scale-90"
                aria-label="Next"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Grid Carousel */}
        <div
          className="relative overflow-hidden rounded-xl md:rounded-2xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.div
              key={pageKey}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              drag={canNavigate ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={handleDragEnd}
              style={{ x }}
              className={`grid ${gridCols} gap-2 md:gap-3 touch-pan-y`}
            >
              {getPagePosts(page).map((post, i) => (
                <GridCard key={`${post.id}-${page}-${i}`} post={post} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        {canNavigate && totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {Array.from({ length: Math.min(totalPages, 10) }).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === page ? 'w-5 bg-[#C5A059]' : 'w-1 bg-[#2F2A26] hover:bg-[#59514A]'
                }`}
                aria-label={`Go to page ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function GridCard({ post, index }: { post: Post; index: number }) {
  const [touched, setTouched] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      className="group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer"
      onTouchStart={() => setTouched(true)}
      onTouchEnd={() => setTimeout(() => setTouched(false), 2500)}
    >
      <Link href={`/${post.slug}`} className="absolute inset-0 z-20" aria-label={post.title} />

      {/* Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105"
        style={{ backgroundImage: `url(${post.coverImage})` }}
      />

      {/* Overlay */}
      <div className={`absolute inset-0 transition-all duration-400 ${
        touched ? 'bg-black/60' : 'bg-black/20 group-hover:bg-black/60'
      }`} />

      {/* Category pill */}
      <div className="absolute top-2 left-2 z-10">
        <span className="bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-sans uppercase tracking-[0.15em] text-[#C5A059] border border-[#C5A059]/15">
          {post.subCategory || post.category}
        </span>
      </div>

      {/* Title — centered, shows on hover (desktop) OR touch (mobile) */}
      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-4 z-10">
        <h3 className={`text-sm md:text-base font-serif text-white text-center leading-tight transition-all duration-400 drop-shadow-lg px-2 ${
          touched
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'
        }`}>
          {post.title}
        </h3>
      </div>
    </motion.div>
  );
}
