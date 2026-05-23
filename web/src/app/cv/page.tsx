'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, FileText, ExternalLink } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const ABOUT_DOC_ID = 'page_about';
const DEFAULT_CV_URL = '';

export default function CVPage() {
  const [cvUrl, setCvUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    async function loadCvUrl() {
      try {
        const docRef = doc(db, 'pages', ABOUT_DOC_ID);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setCvUrl(data.cvUrl || DEFAULT_CV_URL);
        } else {
          setCvUrl(DEFAULT_CV_URL);
        }
      } catch (err) {
        console.error('Failed to load CV url:', err);
        setCvUrl(DEFAULT_CV_URL);
      } finally {
        setLoading(false);
      }
    }
    loadCvUrl();

    // Check if device is mobile
    const checkDevice = () => {
      setIsMobile(
        window.innerWidth < 768 || 
        /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      );
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const getAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${url}`;
    }
    return url;
  };

  const absoluteUrl = getAbsoluteUrl(cvUrl);
  
  // Use Google Docs Viewer for mobile device rendering to prevent direct download
  const viewerUrl = absoluteUrl 
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(absoluteUrl)}&embedded=true` 
    : '';

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
          
          <h1 className="hidden md:block font-serif text-sm tracking-[0.15em] text-[#F3F4F6] uppercase">
            Victoria Odueso — CV
          </h1>

          {!loading && cvUrl && (
            <a
              href={cvUrl}
              download="Victoria_Odueso_CV.pdf"
              className="flex items-center gap-2 bg-[#C5A059] text-[#0F0E0D] px-5 py-2.5 rounded-full font-bold tracking-[0.15em] text-[10px] uppercase hover:bg-[#d4b06a] active:scale-[0.97] transition-all duration-200"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </a>
          )}
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
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <FileText className="w-12 h-12 text-[#C5A059] opacity-50" />
            <p className="text-gray-400 text-sm">CV document is currently unavailable.</p>
          </div>
        ) : (
          <div className="w-full bg-[#141210] border border-[#2F2A26] rounded-2xl overflow-hidden shadow-2xl">
            
            {/* Helper Alert Banner */}
            <div className="bg-[#191614] border-b border-[#2F2A26] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-2">
                <FileText size={14} className="text-[#C5A059]" />
                Viewing document online. Use the button in the top right to download.
              </span>
              <a
                href={cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#C5A059] hover:underline flex items-center gap-1 font-medium"
              >
                Open Direct PDF Link <ExternalLink size={12} />
              </a>
            </div>

            {/* Document Frame */}
            <div className="w-full h-[76vh] md:h-[82vh] bg-[#191614] relative">
              {isMobile ? (
                // Google Docs Viewer for seamless mobile reading
                <iframe
                  src={viewerUrl}
                  className="w-full h-full border-none"
                  title="Victoria Odueso CV"
                />
              ) : (
                // Desktop native browser PDF renderer
                <object
                  data={cvUrl}
                  type="application/pdf"
                  className="w-full h-full border-none"
                >
                  <iframe
                    src={viewerUrl}
                    className="w-full h-full border-none"
                    title="Victoria Odueso CV"
                  />
                </object>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
