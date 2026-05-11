'use client';

import { useAuth } from '@/context/AuthContext';
import { LogOut, FileText, LayoutDashboard, Trash, Home, Image as ImageIcon, Settings, ChevronRight, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const pathname = usePathname();
  const [postsOpen, setPostsOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { href: '/admin/dashboard/home', icon: Home, label: 'Home Page' },
    { href: '/admin/dashboard/posts', icon: FileText, label: 'Posts Manager', isParent: true },
    { href: '/admin/dashboard/posts/new', icon: FileText, label: 'Add New', indent: true },
    { href: '/admin/dashboard/about', icon: FileText, label: 'About Page' },
    { href: '/admin/dashboard/media', icon: ImageIcon, label: 'Media Library' },
    { href: '/admin/dashboard/settings', icon: Settings, label: 'Settings' },
    { href: '/admin/dashboard/trash', icon: Trash, label: 'Trash', danger: true },
  ];

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#0F0E0D] text-[#F3F4F6] font-sans">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 border-r border-[#2F2A26] flex flex-col bg-[#141210] transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="px-6 py-5 bg-[#0F0E0D] border-b border-[#2F2A26] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#C5A059] flex items-center justify-center text-black font-serif text-xl font-bold">V</div>
            <div>
              <h1 className="text-sm font-bold text-[#F3F4F6] tracking-wide uppercase">Victoria</h1>
              <p className="text-[10px] text-gray-500 tracking-wider">Admin</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <Link href="/" onClick={handleNavClick} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-[#C5A059] hover:bg-[#2F2A26]/30 transition-colors mb-4">
            <Home size={18} />
            Visit Site
          </Link>

          <div className="text-[10px] uppercase font-bold text-gray-600 tracking-widest px-3 mb-2">Dashboard</div>
          <Link href="/admin/dashboard" onClick={handleNavClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/admin/dashboard') ? 'bg-[#C5A059] text-black font-semibold' : 'text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/30'}`}>
            <LayoutDashboard size={18} /> Overview
          </Link>

          <div className="mt-4 mb-2 text-[10px] uppercase font-bold text-gray-600 tracking-widest px-3 pt-3 border-t border-[#2F2A26]">Content</div>

          <Link href="/admin/dashboard/home" onClick={handleNavClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/admin/dashboard/home') ? 'bg-[#C5A059] text-black font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#2F2A26]/30'}`}>
            <Home size={18} /> Home Page
          </Link>

          <button onClick={() => setPostsOpen(!postsOpen)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname.includes('/posts') && !isActive('/admin/dashboard') ? 'text-[#C5A059] font-medium' : 'text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/30'}`}>
            <div className="flex items-center gap-3"><FileText size={18} />Posts Manager</div>
            <ChevronRight size={16} className={`transition-transform duration-200 ${postsOpen ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {postsOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pl-9 space-y-1 overflow-hidden">
                <Link href="/admin/dashboard/posts" onClick={handleNavClick} className={`block px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/admin/dashboard/posts') ? 'text-[#C5A059] bg-[#C5A059]/10 font-medium' : 'text-gray-400 hover:text-white hover:bg-[#2F2A26]/30'}`}>All Posts</Link>
                <Link href="/admin/dashboard/posts/new" onClick={handleNavClick} className={`block px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/admin/dashboard/posts/new') ? 'text-[#C5A059] bg-[#C5A059]/10 font-medium' : 'text-gray-400 hover:text-white hover:bg-[#2F2A26]/30'}`}>Add New</Link>
              </motion.div>
            )}
          </AnimatePresence>

          <Link href="/admin/dashboard/about" onClick={handleNavClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/admin/dashboard/about') ? 'bg-[#C5A059] text-black font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#2F2A26]/30'}`}>
            <FileText size={18} /> About Page
          </Link>
          <Link href="/admin/dashboard/media" onClick={handleNavClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/admin/dashboard/media') ? 'bg-[#C5A059] text-black font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#2F2A26]/30'}`}>
            <ImageIcon size={18} /> Media Library
          </Link>

          <div className="mt-4 mb-2 text-[10px] uppercase font-bold text-gray-600 tracking-widest px-3 pt-3 border-t border-[#2F2A26]">System</div>
          <Link href="/admin/dashboard/settings" onClick={handleNavClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/admin/dashboard/settings') ? 'bg-[#C5A059] text-black font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#2F2A26]/30'}`}>
            <Settings size={18} /> Settings
          </Link>
          <Link href="/admin/dashboard/trash" onClick={handleNavClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/admin/dashboard/trash') ? 'bg-red-500/10 text-red-500 font-medium' : 'text-gray-400 hover:text-red-400 hover:bg-red-400/10'}`}>
            <Trash size={18} /> Trash
          </Link>
        </nav>

        <div className="p-4 border-t border-[#2F2A26] bg-[#0F0E0D] shrink-0">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-[#2F2A26] flex items-center justify-center text-xs font-bold text-[#C5A059]">VO</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.email}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Administrator</p>
            </div>
          </div>
          <button onClick={signOut} className="flex w-full items-center justify-center gap-2 px-4 py-2 rounded border border-[#2F2A26] text-xs font-bold uppercase tracking-wide text-gray-400 hover:text-white hover:bg-[#2F2A26] transition-colors">
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto w-full bg-[#110F0E]">
        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-30 bg-[#141210] border-b border-[#2F2A26] px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
            <Menu size={22} />
          </button>
          <span className="font-serif text-lg text-[#C5A059] tracking-wide">Victoria</span>
        </div>
        <div className="min-h-[calc(100vh-52px)] md:min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
