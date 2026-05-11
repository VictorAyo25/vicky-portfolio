'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, Eye, Home } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const HOME_DOC_ID = 'page_home';

interface HomeContent {
  heroName: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  ctaPrimaryText: string;
  ctaSecondaryText: string;
}

const defaultContent: HomeContent = {
  heroName: 'Victoria Odueso',
  heroTitle: 'Exceptional Writer',
  heroSubtitle: '& Content Strategist',
  heroDescription: 'Crafting high-converting narratives for SaaS, FinTech, and modern brands. Where timeless quality meets data-driven performance.',
  ctaPrimaryText: 'Explore Work',
  ctaSecondaryText: 'About Me',
};

export default function HomePageEditor() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<HomeContent>(defaultContent);

  useEffect(() => {
    async function loadContent() {
      try {
        const docRef = doc(db, 'pages', HOME_DOC_ID);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setContent({ ...defaultContent, ...snap.data() } as HomeContent);
        }
      } catch (err) {
        console.error('Failed to load home page content:', err);
        showToast('Failed to load content', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [showToast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'pages', HOME_DOC_ID);
      await setDoc(docRef, content);
      showToast('Home page updated successfully', 'success');
    } catch (err) {
      console.error('Failed to save home page:', err);
      showToast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 lg:p-12 max-w-5xl mx-auto flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-[#C5A059]" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <header className="mb-8 rounded-2xl border border-[#2F2A26] bg-[#171311] px-6 py-6 lg:px-8 lg:py-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#C5A059] mb-2">Page Editor</p>
            <h1 className="text-2xl lg:text-3xl font-serif text-[#F3F4F6] mb-1">Home Page</h1>
            <p className="text-gray-400 text-sm">Edit the hero section and content that appears on your homepage.</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#2F2A26] text-gray-400 hover:text-white hover:border-[#C5A059] transition-colors text-sm"
            >
              <Eye size={16} />
              Preview
            </a>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[#C5A059] text-black px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-[#d4b06a] transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </header>

        <div className="space-y-6 bg-[#191614] p-6 md:p-8 rounded-2xl border border-[#2F2A26]">
          {/* Hero Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Hero Name</label>
            <input
              type="text"
              value={content.heroName}
              onChange={(e) => setContent({ ...content, heroName: e.target.value })}
              placeholder="e.g. Victoria Odueso"
              className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600"
            />
          </div>

          {/* Hero Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Hero Title</label>
            <input
              type="text"
              value={content.heroTitle}
              onChange={(e) => setContent({ ...content, heroTitle: e.target.value })}
              placeholder="e.g. Exceptional Writer"
              className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600"
            />
          </div>

          {/* Hero Subtitle */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Hero Subtitle</label>
            <input
              type="text"
              value={content.heroSubtitle}
              onChange={(e) => setContent({ ...content, heroSubtitle: e.target.value })}
              placeholder="e.g. & Content Strategist"
              className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600"
            />
          </div>

          {/* Hero Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Hero Description</label>
            <textarea
              value={content.heroDescription}
              onChange={(e) => setContent({ ...content, heroDescription: e.target.value })}
              placeholder="A brief description for the hero section..."
              rows={3}
              className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 resize-none"
            />
          </div>

          {/* CTA Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Primary Button Text</label>
              <input
                type="text"
                value={content.ctaPrimaryText}
                onChange={(e) => setContent({ ...content, ctaPrimaryText: e.target.value })}
                placeholder="e.g. Explore Work"
                className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Secondary Button Text</label>
              <input
                type="text"
                value={content.ctaSecondaryText}
                onChange={(e) => setContent({ ...content, ctaSecondaryText: e.target.value })}
                placeholder="e.g. About Me"
                className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
