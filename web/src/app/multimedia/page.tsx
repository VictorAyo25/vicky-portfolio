'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Play, Loader2 } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  slug: string;
  category: string;
  subCategory?: string;
  coverImage?: string;
  deleted?: boolean;
}

export default function MultimediaPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const handleOutsideTap = useCallback(() => {
    setActiveId(null);
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
      onClick={handleOutsideTap}
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
                  onClick={e => {
                    e.stopPropagation();
                    if (isActive) {
                      // Second tap: navigate
                      window.location.href = `/${post.slug}`;
                    } else {
                      // First tap: reveal title
                      setActiveId(post.id);
                    }
                  }}
                >
                  {/* Cover Image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105 pointer-events-none"
                    style={{ backgroundImage: `url(${post.coverImage})` }}
                  />

                  {/* Dim overlay — visible on hover (desktop) or when active (tap) */}
                  <div
                    className={`absolute inset-0 transition-colors duration-400 ease-out pointer-events-none ${
                      isActive
                        ? 'bg-black/60'
                        : 'bg-black/0 group-hover:bg-black/60'
                    }`}
                  />

                  {/* Category pill — always visible */}
                  <div className="absolute top-3 left-3 z-10 pointer-events-none">
                    <span className="bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-sans uppercase tracking-[0.15em] text-[#C5A059] border border-[#C5A059]/15">
                      {post.subCategory || post.category}
                    </span>
                  </div>

                  {/* Title — centered, reveals on hover (desktop) or when active (tap) */}
                  <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6 z-10 pointer-events-none">
                    <h3
                      className={`text-sm md:text-base font-serif text-white text-center leading-tight drop-shadow-lg line-clamp-3 px-2 transition-all duration-400 ${
                        isActive
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                      }`}
                    >
                      {post.title}
                    </h3>
                  </div>

                  {/* Invisible link overlay for SEO/accessibility — only when not active (prevents context menu on first tap) */}
                  {!isActive && (
                    <Link
                      href={`/${post.slug}`}
                      className="absolute inset-0 z-20"
                      aria-label={post.title}
                      tabIndex={-1}
                    />
                  )}
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
