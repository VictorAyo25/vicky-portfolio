'use client';

import { useAuth } from '@/context/AuthContext';
import { LogOut, FileText, LayoutDashboard, Trash, Home, Image as ImageIcon, Settings, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const pathname = usePathname();
  const [postsOpen, setPostsOpen] = useState(true);

  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex h-screen bg-[#0F0E0D] text-[#F3F4F6] font-sans">
      <aside className="w-64 border-r border-[#2F2A26] hidden md:flex flex-col bg-[#141210] overflow-y-auto custom-scrollbar">
        <div className="px-6 py-6 bg-[#0F0E0D] border-b border-[#2F2A26] flex items-center gap-3 shrink-0 sticky top-0 z-10">
          <div className="w-8 h-8 rounded bg-[#C5A059] flex items-center justify-center text-black font-serif text-xl font-bold">V</div>
          <div>
            <h1 className="text-sm font-bold text-[#F3F4F6] tracking-wide uppercase">Victoria</h1>
            <p className="text-[10px] text-gray-500 truncate mt-0.5 tracking-wider">Admin Area</p>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 tracking-wide">
          <div className="mb-6">
            <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-[#C5A059] hover:bg-[#2F2A26]/30 transition-colors">
              <Home size={18} />
              Visit Site
            </Link>
          </div>

          <div className="text-[10px] uppercase font-bold text-gray-600 tracking-widest px-3 mb-2 pt-2">Dashboard</div>
          
          <Link href="/admin/dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/admin/dashboard') ? 'bg-[#C5A059] text-black font-semibold' : 'text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/30'}`}>
            <LayoutDashboard size={18} />
            Overview
          </Link>

          <div className="mt-6 mb-2 text-[10px] uppercase font-bold text-gray-600 tracking-widest px-3 pt-4 border-t border-[#2F2A26]">Content</div>
          
          <div className="space-y-1 block">
            <button onClick={() => setPostsOpen(!postsOpen)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname.includes('/posts') && !isActive('/admin/dashboard') ? 'text-[#C5A059] font-medium' : 'text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/30'}`}>
              <div className="flex items-center gap-3">
                <FileText size={18} />
                Posts Manager
              </div>
              <ChevronRight size={16} className={`transition-transform duration-200 ${postsOpen ? 'rotate-90' : ''}`} />
            </button>
            
            <AnimatePresence>
              {postsOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pl-9 space-y-1 overflow-hidden">
                  <Link href="/admin/dashboard/posts" className={`block px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/admin/dashboard/posts') ? 'text-[#C5A059] bg-[#C5A059]/10 font-medium' : 'text-gray-400 hover:text-white hover:bg-[#2F2A26]/30'}`}>All Posts</Link>
                  <Link href="/admin/dashboard/posts/new" className={`block px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/admin/dashboard/posts/new') ? 'text-[#C5A059] bg-[#C5A059]/10 font-medium' : 'text-gray-400 hover:text-white hover:bg-[#2F2A26]/30'}`}>Add New</Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link href="/admin/dashboard/about" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/admin/dashboard/about') ? 'bg-[#C5A059] text-black font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#2F2A26]/30'}`}>
            <FileText size={18} />
            About Page
          </Link>

          <Link href="/admin/dashboard/media" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/admin/dashboard/media') ? 'bg-[#C5A059] text-black font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#2F2A26]/30'}`}>
            <ImageIcon size={18} />
            Media Library
          </Link>

          <div className="mt-6 mb-2 text-[10px] uppercase font-bold text-gray-600 tracking-widest px-3 pt-4 border-t border-[#2F2A26]">System</div>

          <Link href="/admin/dashboard/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/admin/dashboard/settings') ? 'bg-[#C5A059] text-black font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#2F2A26]/30'}`}>
            <Settings size={18} />
            Settings
          </Link>

          <Link href="/admin/dashboard/trash" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/admin/dashboard/trash') ? 'bg-red-500/10 text-red-500 font-medium' : 'text-gray-400 hover:text-red-400 hover:bg-red-400/10'}`}>
            <Trash size={18} />
            Trash
          </Link>
        </nav>

        <div className="p-4 border-t border-[#2F2A26] bg-[#0F0E0D]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-[#2F2A26] flex items-center justify-center text-xs font-bold text-[#C5A059]">VO</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.email}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Administrator</p>
            </div>
          </div>
          <button onClick={signOut} className="flex w-full items-center justify-center gap-2 px-4 py-2 rounded border border-[#2F2A26] text-xs font-bold uppercase tracking-wide text-gray-400 hover:text-white hover:bg-[#2F2A26] transition-colors">
            <LogOut size={14} />
            Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto w-full bg-[#110F0E]">
        {children}
      </main>
    </div>
  );
}
