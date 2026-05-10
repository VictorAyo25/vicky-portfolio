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
  createdAt?: { seconds?: number };
  deleted?: boolean;
}

const GRID_SIZE = 6;
const ROTATE_INTERVAL = 5000;

export default function FeaturedPosts() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceId = useRef(0);

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

  const getVisiblePosts = useCallback(() => {
    if (allPosts.length === 0) return [];
    const posts: Post[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      posts.push(allPosts[(currentIndex + i) % allPosts.length]);
    }
    return posts;
  }, [allPosts, currentIndex]);

  useEffect(() => {
    if (allPosts.length <= GRID_SIZE || isPaused) return;
    const timer = setInterval(() => {
      setDirection(1);
      instanceId.current += 1;
      setCurrentIndex(prev => (prev + GRID_SIZE) % allPosts.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [allPosts.length, isPaused]);

  const handleNext = useCallback(() => {
    if (allPosts.length <= GRID_SIZE) return;
    setDirection(1);
    instanceId.current += 1;
    setCurrentIndex(prev => (prev + GRID_SIZE) % allPosts.length);
  }, [allPosts.length]);

  const handlePrev = useCallback(() => {
    if (allPosts.length <= GRID_SIZE) return;
    setDirection(-1);
    instanceId.current += 1;
    setCurrentIndex(prev => {
      const next = prev - GRID_SIZE;
      return next < 0 ? allPosts.length + next : next;
    });
  }, [allPosts.length]);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      handleNext();
    } else if (info.offset.x > threshold) {
      handlePrev();
    }
  }, [handleNext, handlePrev]);

  if (loading) {
    return (
      <section className="py-20 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {Array.from({ length: GRID_SIZE }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl bg-[#191614] border border-[#2F2A26] animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (allPosts.length === 0) return null;

  const visiblePosts = getVisiblePosts();
  const canNavigate = allPosts.length > GRID_SIZE;
  const slideKey = `slide-${currentIndex}-${instanceId.current}`;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <section className="py-16 md:py-24 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#C5A059] mb-2 font-sans">Featured Work</p>
            <h2 className="text-3xl md:text-4xl font-serif text-[#F3F4F6] tracking-tight">
              Visual Stories
            </h2>
          </div>
          {canNavigate && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-[#2F2A26] flex items-center justify-center text-gray-400 hover:text-[#C5A059] hover:border-[#C5A059] transition-all active:scale-95"
                aria-label="Previous"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNext}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-[#2F2A26] flex items-center justify-center text-gray-400 hover:text-[#C5A059] hover:border-[#C5A059] transition-all active:scale-95"
                aria-label="Next"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Carousel Grid */}
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-2xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slideKey}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              drag={canNavigate ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              style={{ x }}
              className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 touch-pan-y"
            >
              {visiblePosts.map((post, i) => (
                <GridCard key={`${post.id}-${slideKey}-${i}`} post={post} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        {canNavigate && (
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {Array.from({ length: Math.ceil(allPosts.length / GRID_SIZE) }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > Math.floor(currentIndex / GRID_SIZE) ? 1 : -1);
                  instanceId.current += 1;
                  setCurrentIndex(i * GRID_SIZE);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === Math.floor(currentIndex / GRID_SIZE)
                    ? 'w-6 bg-[#C5A059]'
                    : 'w-1.5 bg-[#2F2A26] hover:bg-[#59514A]'
                }`}
                aria-label={`Go to set ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function GridCard({ post, index }: { post: Post; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer"
    >
      <Link href={`/${post.slug}`} className="absolute inset-0 z-20" aria-label={post.title} />

      {/* Cover Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
        style={{ backgroundImage: `url(${post.coverImage})` }}
      />

      {/* Default overlay — subtle dark */}
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/70 transition-all duration-500 ease-out" />

      {/* Category badge — always visible */}
      <div className="absolute top-3 left-3 z-10">
        <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-sans uppercase tracking-widest text-[#C5A059] border border-[#C5A059]/20">
          {post.subCategory || post.category}
        </span>
      </div>

      {/* Title overlay — shows on hover/touch */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10">
        <div className="text-center">
          <h3 className="text-lg md:text-xl font-serif text-white leading-tight opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out drop-shadow-lg">
            {post.title}
          </h3>
          <div className="mt-3 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-100 ease-out">
            <span className="text-xs font-sans uppercase tracking-widest text-[#C5A059] border-b border-[#C5A059]/40 pb-0.5">
              Read Article
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
