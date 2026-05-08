'use client';

import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverview() {
  const [stats, setStats] = useState({ postsCount: 0, withImage: 0, withoutImage: 0 });
  const [categoryStats, setCategoryStats] = useState<{ [key: string]: { count: number, lastUpdated: Date | null } }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const postsCol = collection(db, 'posts');
        const postsSnapshot = await getDocs(postsCol);

        let total = 0;
        const catStats: { [key: string]: { count: number, lastUpdated: Date | null } } = {};
        let totalHasImage = 0;
        
        postsSnapshot.forEach((doc) => {
          total++;
          const data = doc.data();
          const cat = data.category || 'Uncategorized';

          // Handle createdAt: Firestore Timestamp, plain object {seconds, nanoseconds}, or missing
          let createdAt: Date | null = null;
          if (data.createdAt) {
            if (typeof data.createdAt.toDate === 'function') {
              createdAt = data.createdAt.toDate();
            } else if (data.createdAt.seconds != null) {
              createdAt = new Date(data.createdAt.seconds * 1000);
            }
          }

          if (!catStats[cat]) {
            catStats[cat] = { count: 0, lastUpdated: null };
          }

          catStats[cat].count++;

          if (createdAt) {
            if (!catStats[cat].lastUpdated || createdAt > catStats[cat].lastUpdated!) {
              catStats[cat].lastUpdated = createdAt;
            }
          }

          // Image stats
          if (data.coverImage) {
            totalHasImage++;
          }
        });

        setStats({ postsCount: total, withImage: totalHasImage, withoutImage: total - totalHasImage });
        setCategoryStats(catStats);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch stats', err);
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="p-6 lg:p-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className="mb-10 rounded-2xl border border-[#2F2A26] bg-[#171311] px-6 py-6 lg:px-8 lg:py-7">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#C5A059] mb-2">Overview</p>
          <h1 className="text-3xl lg:text-4xl font-serif text-[#F3F4F6] tracking-tight mb-2">
            Welcome back, Victoria.
          </h1>
          <p className="text-gray-400 font-sans">
            Here is what&apos;s happening in your portfolio today.
          </p>
        </header>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <motion.div 
            whileHover={{ y: -5 }}
            className="p-6 bg-[#191614] border border-[#2F2A26] rounded-2xl relative overflow-hidden group hover:border-[#C5A059] transition-all duration-300"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileText size={64} className="text-[#C5A059]" />
            </div>
            
            <h3 className="text-sm font-semibold tracking-widest text-gray-500 uppercase mb-4">Total Content</h3>
            <div className="text-5xl font-serif text-[#C5A059]">
              {loading ? '-' : stats.postsCount}
            </div>
          </motion.div>
          
          <Link href="/admin/dashboard/posts/new">
             <motion.div
              whileHover={{ y: -5 }}
              className="p-6 h-full flex flex-col justify-center items-center bg-[#0F0E0D] border border-dashed border-[#59514A] hover:border-[#C5A059] rounded-2xl text-gray-400 hover:text-[#C5A059] cursor-pointer transition-all duration-300 group"
            >
              <Plus size={32} className="mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-sans text-sm tracking-widest uppercase font-semibold">Create New Post</span>
            </motion.div>
          </Link>

        </div>

        {/* Categories Breakdown */}
  <div className="mt-12 mb-6 border-t border-[#2F2A26] pt-10">
          <h2 className="text-2xl font-serif text-[#F3F4F6] tracking-tight mb-6">
            Content Sections Overview
          </h2>
          {loading ? (
            <div className="text-gray-500 font-sans animate-pulse">Loading sections...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.keys(categoryStats).length === 0 ? (
                <p className="text-gray-500 font-sans">No content sections yet.</p>
              ) : (
                Object.entries(categoryStats).map(([cat, info]) => (
                  <Link
                    key={cat}
                    href={`/admin/dashboard/posts?category=${encodeURIComponent(cat)}`}
                    className="block"
                    title={`Manage ${cat} posts`}
                  >
                    <motion.div
                      whileHover={{ y: -5 }}
                      className="p-6 bg-[#191614] border border-[#2F2A26] rounded-2xl relative overflow-hidden group hover:border-[#C5A059] transition-all duration-300 cursor-pointer min-h-36"
                    >
                      <h3 className="text-lg font-serif text-[#F3F4F6] tracking-wide mb-2 line-clamp-1" title={cat}>
                        {cat}
                      </h3>
                      <div className="flex items-end gap-3 mb-4">
                        <div className="text-4xl font-sans font-light text-[#C5A059]">
                          {info.count}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1.5">
                          Items
                        </div>
                      </div>
                      {info.lastUpdated && (
                        <div className="text-xs text-gray-400 font-mono mb-3">
                          Last Upd: {info.lastUpdated.toLocaleDateString()}
                        </div>
                      )}
                      <div className="text-xs font-sans tracking-wider uppercase text-[#C5A059] opacity-80 group-hover:opacity-100">
                        Manage Section →
                      </div>
                    </motion.div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
