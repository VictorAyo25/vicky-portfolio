'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Calendar, Tag } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  slug: string;
  description?: string;
  keywords?: string[];
  category: string;
  subCategory?: string;
  content?: string;
  coverImage?: string;
  createdAt?: {
    seconds?: number;
    toMillis?: () => number;
  };
}

export default function PostCard({ post, index }: { post: Post; index: number }) {
  // Use description as excerpt, fall back to content snippet
  const getExcerpt = () => {
    const MAX_LEN = 150;
    if (post.description) return post.description;
    if (post.content) {
      const text = post.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length <= MAX_LEN) return text;
      // Truncate at word boundary
      const truncated = text.substring(0, MAX_LEN);
      const lastSpace = truncated.lastIndexOf(' ');
      return (lastSpace > 80 ? truncated.substring(0, lastSpace) : truncated) + '…';
    }
    return '';
  };
  
  const dateStr = post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Recently';

  if (post.coverImage) {
    return (
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="group relative flex flex-col h-[400px] rounded-xl overflow-hidden cursor-pointer border border-[#2F2A26] hover:border-[#C5A059] transition-colors bg-[#110F0E]"
      >
        <Link href={`/${post.slug}`} className="absolute inset-0 z-20 focus:outline-none" aria-label={post.title} />

        <div className="absolute inset-0 overflow-hidden">
          <img
            src={post.coverImage}
            alt={post.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500 ease-in-out z-10" />

        <div className="absolute top-4 left-4 z-10">
          <span className="bg-[#0F0E0D]/90 backdrop-blur-md border border-[#2F2A26] px-3 py-1 rounded-full text-xs font-sans uppercase tracking-widest text-[#C5A059] shadow-lg">
            {post.subCategory || post.category}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-6 z-10 flex flex-col justify-end h-full">
          <div className="translate-y-8 group-hover:translate-y-0 transition-transform duration-500 ease-out">
            <div className="flex items-center gap-2 text-xs text-gray-300 font-sans uppercase tracking-widest mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
              <Calendar size={14} className="text-[#C5A059]" />
              {dateStr}
            </div>
            
            <h3 className="text-2xl font-serif text-white leading-tight mb-3 drop-shadow-md">
              {post.title}
            </h3>

            <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-out">
              <div className="overflow-hidden">
                {getExcerpt() && (
                  <p className="text-sm text-gray-300 line-clamp-3 font-sans pb-4">
                    {getExcerpt()}
                  </p>
                )}
                
                <div className="pt-4 border-t border-white/20 flex justify-between items-center text-white">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Read Article</span>
                  <ArrowUpRight size={18} className="text-[#C5A059]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.article>
    );
  }

  // Fallback for posts without images
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative flex flex-col h-[400px] bg-[#191614] border border-[#2F2A26] hover:border-[#C5A059] transition-colors rounded-xl overflow-hidden"
    >
      <Link href={`/${post.slug}`} className="absolute inset-0 z-20 focus:outline-none" aria-label={post.title} />
      
      <div className="p-8 flex flex-col h-full z-10 pointer-events-none">
        <div className="flex items-center gap-4 text-xs font-sans uppercase tracking-widest text-gray-500 mb-6">
          <span className="text-[#C5A059]">{post.category}</span>
          {post.subCategory && (
            <>
              <span className="w-1 h-1 bg-gray-600 rounded-full" />
              <span>{post.subCategory}</span>
            </>
          )}
        </div>

        <h3 className="text-2xl font-serif text-[#F3F4F6] mb-4 leading-tight group-hover:text-[#C5A059] transition-colors">
          {post.title}
        </h3>

        {getExcerpt() && (
          <p className="text-sm text-gray-400 line-clamp-3 mb-6 flex-1">
            {getExcerpt()}
          </p>
        )}

        {/* Keywords */}
        {post.keywords && post.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {post.keywords.slice(0, 3).map((kw, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-[#0F0E0D] border border-[#2F2A26] px-2 py-0.5 rounded-full">
                <Tag size={8} />
                {kw}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-6 border-t border-[#2F2A26] flex justify-between items-center text-gray-500">
          <div className="flex items-center gap-2 text-xs">
            <Calendar size={14} />
            {dateStr}
          </div>
          <ArrowUpRight size={18} className="text-[#C5A059] opacity-0 -translate-y-2 translate-x-2 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-300" />
        </div>
      </div>
    </motion.article>
  );
}
