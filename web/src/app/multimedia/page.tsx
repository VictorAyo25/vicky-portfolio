'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Play, Loader2, Eye } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  slug: string;
  category: string;
  subCategory?: string;
  coverImage?: string;
  deleted?: boolean;
}

const AUTO_DISMISS_MS = 4000;
const LONG_PRESS_MS = 500;

export default function MultimediaPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

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

    return () => {
      timers.current.forEach(t => clearTimeout(t));
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const dismissActive = useCallback(() => {
    setActiveId(null);
  }, []);

  const scheduleAutoDismiss = useCallback((postId: string) => {
    // Clear existing timer for this card
    const existing = timers.current.get(postId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      setActiveId(prev => prev === postId ? null : prev);
      timers.current.delete(postId);
    }, AUTO_DISMISS_MS);

    timers.current.set(postId, timer);
  }, []);

  const handleCardClick = useCallback((e: React.MouseEvent | React.TouchEvent, post: Post) => {
    e.stopPropagation();

    // If this was a long-press, ignore the click
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }

    if (activeId === post.id) {
      // Second tap/click: navigate
      window.location.href = `/${post.slug}`;
    } else {
      // First tap: reveal
      setActiveId(post.id);
      scheduleAutoDismiss(post.id);
    }
  }, [activeId, scheduleAutoDismiss]);

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
    }, LONG_PRESS_MS);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0E0D] flex items-center justify-center pt-20">
        <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
      </div>
    );
  }

  return (
    <main
      className="min-h-screen bg-[#0F0E0D] pt-20 pb-16"
      onClick={dismissActive}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-10 md:mb-14">
          <div className="flex items-center gap-3 mb-3">
            <Play size={14} className="text-[#C5A059] fill-[#C5A059]" />
            <span className="text-[10px] md:text-[11px] uppercase tracking-[0.25em] text-[#C5A059] font-sans font-semibold">
              Multimedia
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif text-[#F3F4F6] tracking-tight mb-3">
            Multimedia Content
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-2xl">
            A visual collection of my work across various niches and content types.
          </p>
        </div>

        {/* Grid */}
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 font-serif text-lg">No multimedia content yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {posts.map((post, i) => {
              const isActive = activeId === post.id;

              return (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer select-none"
                  onContextMenu={e => e.preventDefault()}
                  onClick={e => handleCardClick(e, post)}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Cover Image */}
                  <motion.div
                    className="absolute inset-0 bg-cover bg-center pointer-events-none"
                    style={{ backgroundImage: `url(${post.coverImage})` }}
                    animate={{ scale: isActive ? 1.05 : 1 }}
                    transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  />

                  {/* Dim overlay */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    animate={{ opacity: isActive ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)' }}
                  />
                  {/* Desktop hover overlay (CSS-only for instant response) */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 pointer-events-none hidden md:block" />

                  {/* Category pill — always visible */}
                  <div className="absolute top-3 left-3 z-10 pointer-events-none">
                    <span className="bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-sans uppercase tracking-[0.15em] text-[#C5A059] border border-[#C5A059]/15">
                      {post.subCategory || post.category}
                    </span>
                  </div>

                  {/* Mobile hint — "tap to view" indicator */}
                  <AnimatePresence>
                    {!isActive && (
                      <motion.div
                        className="absolute bottom-3 right-3 z-10 md:hidden pointer-events-none"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="bg-white/15 backdrop-blur-md rounded-full p-2 border border-white/10">
                          <Eye size={14} className="text-white/80" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Title + details overlay */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 flex flex-col items-center justify-end p-4 md:p-6 z-10 pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <motion.h3
                          className="text-sm md:text-base font-serif text-white text-center leading-tight drop-shadow-lg line-clamp-3 px-2 mb-2"
                          initial={{ y: 12, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 8, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.05 }}
                        >
                          {post.title}
                        </motion.h3>
                        <motion.p
                          className="text-[10px] md:text-[11px] text-white/60 font-sans tracking-wide"
                          initial={{ y: 8, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 4, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
                        >
                          Tap again to view
                        </motion.p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Desktop hover title (CSS group-hover for instant response) */}
                  <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6 z-10 pointer-events-none">
                    <h3 className="text-sm md:text-base font-serif text-white text-center leading-tight drop-shadow-lg line-clamp-3 px-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
                      {post.title}
                    </h3>
                  </div>

                  {/* Link overlay — only on desktop via CSS, or when active on second tap the click handler navigates */}
                  <Link
                    href={`/${post.slug}`}
                    className="absolute inset-0 z-20 hidden md:block"
                    aria-label={post.title}
                    tabIndex={-1}
                  />
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
