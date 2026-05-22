'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, FileText, Eye, Link as LinkIcon, Images } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import RichTextEditor from '@/components/admin/RichTextEditor';
import ImagePickerModal from '@/components/admin/ImagePickerModal';

const ABOUT_DOC_ID = 'page_about';

interface AboutContent {
  heading: string;
  subheading: string;
  introTitle:  string;
  content: string;
  ctaText: string;
  heroImage?: string;
}

const defaultContent: AboutContent = {
  heading: 'About Me',
  subheading: 'SEO Content Writer & Strategist',
  introTitle: 'Crafting high-quality, engaging narratives that convert readers into loyal clients.',
  content: `<p>I am Victoria Odueso, a professional SEO content writer and strategist dedicated to elevating your brand's digital presence. My goal goes beyond merely putting words on a page; I focus on the science and psychology behind the text to create compelling narratives that drive organic traffic and generate meaningful leads.</p>
<p>With extensive experience spanning keyword research, on-page optimization, and editorial planning, I have a proven track record of helping businesses achieve up to 25% growth in organic traffic and a remarkable 50% increase in content-generated leads.</p>
<p>If you require an authoritative blog piece, magnetic website copy, or a tightly woven editorial strategy, I am here to translate your vision into clear, results-driven content that ranks high and resonates deeply with your audience.</p>`,
  ctaText: "Let's Work Together",
  heroImage: '/images/vickyimg1.jpg',
};

export default function AboutPageEditor() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<AboutContent>(defaultContent);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [mediaSourceType, setMediaSourceType] = useState<'url' | 'library'>('url');

  useEffect(() => {
    async function loadContent() {
      try {
        const docRef = doc(db, 'pages', ABOUT_DOC_ID);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as AboutContent;
          setContent({ ...defaultContent, ...data });
          if (data.heroImage && !data.heroImage.startsWith('/images/')) {
            setMediaSourceType('library');
          }
        }
      } catch (err) {
        console.error('Failed to load about page content:', err);
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
      const docRef = doc(db, 'pages', ABOUT_DOC_ID);
      await setDoc(docRef, content);
      
      // Update local storage so updates are instantly visible on reload
      localStorage.setItem('vicky_about_content', JSON.stringify(content));
      
      showToast('About page updated successfully', 'success');
    } catch (err) {
      console.error('Failed to save about page:', err);
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
    <div className="p-8 lg:p-12 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <header className="mb-8 rounded-2xl border border-[#2F2A26] bg-[#171311] px-6 py-6 lg:px-8 lg:py-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#C5A059] mb-2">Page Editor</p>
            <h1 className="text-2xl lg:text-3xl font-serif text-[#F3F4F6] mb-1">About Page</h1>
            <p className="text-gray-400 text-sm">Edit the content that appears on your about page.</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/about"
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

        <div className="space-y-8 bg-[#191614] p-8 rounded-2xl border border-[#2F2A26]">
          {/* Heading */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Page Heading</label>
            <input
              type="text"
              value={content.heading}
              onChange={(e) => setContent({ ...content, heading: e.target.value })}
              placeholder="e.g. About Me"
              className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600"
            />
          </div>

          {/* Subheading / Tagline */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Subheading / Tagline</label>
            <input
              type="text"
              value={content.subheading}
              onChange={(e) => setContent({ ...content, subheading: e.target.value })}
              placeholder="e.g. SEO Content Writer & Strategist"
              className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600"
            />
          </div>

          {/* Intro Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Intro Title</label>
            <textarea
              value={content.introTitle}
              onChange={(e) => setContent({ ...content, introTitle: e.target.value })}
              placeholder="A brief introductory statement..."
              rows={2}
              className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 resize-none"
            />
          </div>

          {/* Main Content */}
          <RichTextEditor
            label="Main Content"
            value={content.content}
            onChange={(html) => setContent({ ...content, content: html })}
            minHeightClassName="min-h-[300px]"
          />

          {/* CTA Button Text */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Call-to-Action Text</label>
            <input
              type="text"
              value={content.ctaText}
              onChange={(e) => setContent({ ...content, ctaText: e.target.value })}
              placeholder="e.g. Let's Work Together"
              className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600"
            />
          </div>

          {/* Hero Image Selection */}
          <div className="space-y-4 pt-4 border-t border-[#2F2A26]">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059] block">
              About Portrait Image
            </label>
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                type="button"
                onClick={() => setMediaSourceType('url')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  mediaSourceType === 'url'
                    ? 'bg-[#C5A059] text-black font-bold'
                    : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26]'
                }`}
              >
                <LinkIcon size={16} />
                External URL
              </button>
              <button
                type="button"
                onClick={() => {
                  setMediaSourceType('library');
                  setShowImagePicker(true);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  mediaSourceType === 'library'
                    ? 'bg-[#C5A059] text-black font-bold'
                    : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26]'
                }`}
              >
                <Images size={16} />
                Pick from Library
              </button>
            </div>

            {mediaSourceType === 'url' ? (
              <div className="space-y-2">
                <input
                  type="url"
                  value={content.heroImage || ''}
                  onChange={(e) => setContent({ ...content, heroImage: e.target.value })}
                  placeholder="e.g. /images/vickyimg1.jpg"
                  className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600"
                />
                <p className="text-xs text-gray-500">
                  Provide a relative URL like <code>/images/vickyimg1.jpg</code> or an external image link.
                </p>
              </div>
            ) : (
              <div className="border border-[#2F2A26] rounded-lg p-4 bg-[#0F0E0D]">
                {content.heroImage ? (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#191614] flex-shrink-0">
                      <img
                        src={content.heroImage}
                        alt="Selected portrait"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/vickyimg1.jpg';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">Selected image</p>
                      <p className="text-xs text-gray-500 truncate">{content.heroImage}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setContent({ ...content, heroImage: '' });
                        setMediaSourceType('url');
                      }}
                      className="text-xs text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowImagePicker(true)}
                    className="w-full py-3 text-sm text-gray-400 hover:text-[#C5A059] transition-colors flex items-center justify-center gap-2"
                  >
                    <Images size={16} /> Pick from Media Library
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <ImagePickerModal
        isOpen={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onSelect={(url) => setContent({ ...content, heroImage: url })}
        title="Select Portrait Image"
      />
    </div>
  );
}
