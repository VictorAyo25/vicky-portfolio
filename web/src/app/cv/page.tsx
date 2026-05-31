'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, FileText } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { trackEvent } from '@/lib/analytics';

const ABOUT_DOC_ID = 'page_about';

export default function CVPage() {
  const [cvUrl, setCvUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCvUrl() {
      try {
        const docRef = doc(db, 'pages', ABOUT_DOC_ID);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const url = data.cvUrl || '';
          if (url && url !== '/Victoria_Odueso_Resume.pdf') {
            setCvUrl(url);
            
            // Format URL to force attachment download if from Cloudinary
            const downloadUrl = url.includes('cloudinary.com') && url.includes('/upload/')
              ? url.replace('/upload/', '/upload/fl_attachment/')
              : url;
            
            // Auto trigger download
            trackEvent('cv_auto_download');
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'Victoria_Odueso_CV.pdf';
            a.target = '_blank';
            a.click();
          } else {
            setCvUrl('');
          }
        } else {
          setCvUrl('');
        }
      } catch (err) {
        console.error('Failed to load CV url:', err);
        setCvUrl('');
      } finally {
        setLoading(false);
      }
    }
    loadCvUrl();
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0E0D] text-white flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#141210]/90 backdrop-blur-md border-b border-[#2F2A26]/80 px-4 md:px-8 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-[#C5A059] transition-all text-xs font-bold uppercase tracking-[0.15em]"
          >
            <ArrowLeft size={16} />
            <span>Back to Site</span>
          </Link>
          
          <h1 className="font-serif text-sm tracking-[0.15em] text-[#F3F4F6] uppercase">
            Victoria Odueso
          </h1>
          
          <div className="w-[100px] md:w-[120px] text-right text-xs text-gray-500 font-medium tracking-wider hidden sm:block">
            Curriculum Vitae
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-7xl w-full mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
            <p className="text-gray-400 text-sm tracking-wide">Loading CV Document...</p>
          </div>
        ) : !cvUrl ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center max-w-md bg-[#141210] border border-[#2F2A26] rounded-2xl p-8 shadow-2xl">
            <FileText className="w-12 h-12 text-red-500/60 mx-auto" />
            <div className="space-y-1">
              <h2 className="font-serif text-lg text-white">Document Unavailable</h2>
              <p className="text-gray-400 text-sm">The CV document has not been uploaded yet or the link is invalid.</p>
            </div>
            <Link 
              href="/"
              className="inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.15em] border border-[#2F2A26] text-gray-300 hover:text-white px-6 py-2.5 rounded-full mt-2 hover:border-[#C5A059]/40 transition-all"
            >
              Return Home
            </Link>
          </div>
        ) : (
          <div className="max-w-md w-full bg-[#141210] border border-[#2F2A26] rounded-2xl p-8 md:p-10 shadow-2xl text-center flex flex-col items-center gap-6 my-auto">
            <div className="w-16 h-16 rounded-full bg-[#2F2A26]/40 flex items-center justify-center text-[#C5A059] border border-[#C5A059]/20">
              <FileText size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="font-serif text-2xl text-[#F3F4F6] tracking-wide">Curriculum Vitae</h2>
              <p className="text-gray-400 text-sm">Victoria Odueso — SEO Writer &amp; Content Strategist</p>
            </div>

            <div className="w-full h-[1px] bg-[#2F2A26]" />

            <p className="text-xs text-gray-400 leading-relaxed max-w-[300px]">
              Your download should start automatically. If it doesn't, please click the button below.
            </p>

            <div className="w-full flex flex-col gap-3">
              <a
                href={cvUrl.includes('cloudinary.com') && cvUrl.includes('/upload/')
                  ? cvUrl.replace('/upload/', '/upload/fl_attachment/')
                  : cvUrl}
                download="Victoria_Odueso_CV.pdf"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('cv_manual_download')}
                className="w-full flex items-center justify-center gap-2 bg-[#C5A059] text-[#0F0E0D] py-3.5 rounded-full font-bold tracking-[0.15em] text-xs uppercase hover:bg-[#d4b06a] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                <Download size={16} />
                <span>Download CV</span>
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
