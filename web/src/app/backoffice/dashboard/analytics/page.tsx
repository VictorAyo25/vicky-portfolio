'use client';

import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Globe, MapPin, Users, TrendingUp, FileText, Eye, Share2, Laptop, CheckCircle, FileDown } from 'lucide-react';

interface VisitorRecord {
  id: string;
  city: string;
  country: string;
  region: string;
  page: string;
  timestamp: { seconds: number } | null;
  visitorId?: string;
  visitorName?: string;
  ip?: string;
  referrer?: string;
  eventType?: string;
  eventName?: string;
  eventMetadata?: any;
  userAgent?: string;
}

interface LocationCount {
  name: string;
  count: number;
  percentage: number;
}

export default function AnalyticsPage() {
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    async function fetchVisitors() {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);

        const q = query(
          collection(db, 'analytics_visitors'),
          where('timestamp', '>=', cutoffDate),
          orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);
        const records: VisitorRecord[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<VisitorRecord, 'id'>),
        }));
        setVisitors(records);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchVisitors();
  }, []);

  // Filter out records without valid geolocations first
  const geoFilteredVisitors = useMemo(() => {
    return visitors.filter(
      (v) => v.country && v.country !== 'Unknown' && v.city && v.city !== 'Unknown'
    );
  }, [visitors]);

  // Then filter by selected time range
  const filteredVisitors = useMemo(() => {
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 * 24 : 30 * 24;
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return geoFilteredVisitors.filter((v) => {
      const ts = v.timestamp?.seconds ? v.timestamp.seconds * 1000 : 0;
      return ts >= cutoff;
    });
  }, [geoFilteredVisitors, timeRange]);

  // Compute stats based on UNIQUE visitor sessions (visitorId || ip || id)
  const totalVisitors = useMemo(() => {
    // Only unique visitors for page views
    const pageViewsOnly = filteredVisitors.filter(v => !v.eventType || v.eventType === 'page_view');
    const uniqueIds = new Set(pageViewsOnly.map((v) => v.visitorId || v.ip || v.id));
    return uniqueIds.size;
  }, [filteredVisitors]);

  const countryStats = useMemo(() => {
    const pageViewsOnly = filteredVisitors.filter(v => !v.eventType || v.eventType === 'page_view');
    const map = new Map<string, Set<string>>();
    pageViewsOnly.forEach((v) => {
      const key = v.country || 'Unknown';
      const id = v.visitorId || v.ip || v.id;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(id);
    });
    const sorted = [...map.entries()].map(([name, idSet]) => ({
      name,
      count: idSet.size,
    })).sort((a, b) => b.count - a.count);
    
    return sorted.map((item) => ({
      ...item,
      percentage: totalVisitors > 0 ? Math.round((item.count / totalVisitors) * 100) : 0,
    }));
  }, [filteredVisitors, totalVisitors]);

  const cityStats = useMemo(() => {
    const pageViewsOnly = filteredVisitors.filter(v => !v.eventType || v.eventType === 'page_view');
    const map = new Map<string, Set<string>>();
    pageViewsOnly.forEach((v) => {
      const key = v.city && v.city !== 'Unknown' ? `${v.city}, ${v.country || 'Unknown'}` : 'Unknown';
      const id = v.visitorId || v.ip || v.id;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(id);
    });
    const sorted = [...map.entries()].map(([name, idSet]) => ({
      name,
      count: idSet.size,
    })).sort((a, b) => b.count - a.count);
    
    return sorted.slice(0, 20).map((item) => ({
      ...item,
      percentage: totalVisitors > 0 ? Math.round((item.count / totalVisitors) * 100) : 0,
    }));
  }, [filteredVisitors, totalVisitors]);

  const uniqueCountries = new Set(
    filteredVisitors
      .filter(v => !v.eventType || v.eventType === 'page_view')
      .map((v) => v.country)
      .filter(Boolean)
  ).size;

  const uniqueCities = new Set(
    filteredVisitors
      .filter(v => !v.eventType || v.eventType === 'page_view')
      .map((v) => v.city)
      .filter(Boolean)
      .filter((c) => c !== 'Unknown')
  ).size;

  // Recent visitors (last 24h based on unique visitor sessions)
  const last24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const activeIn24h = geoFilteredVisitors.filter((v) => {
      if (v.eventType && v.eventType !== 'page_view') return false;
      const ts = v.timestamp?.seconds ? v.timestamp.seconds * 1000 : 0;
      return ts >= cutoff;
    });
    return new Set(activeIn24h.map((v) => v.visitorId || v.ip || v.id)).size;
  }, [geoFilteredVisitors]);

  // Feed of recent visitor documents (unlimited)
  const recentVisits = useMemo(() => {
    return [...filteredVisitors]
      .filter(v => !v.eventType || v.eventType === 'page_view')
      .sort((a, b) => {
        const tsA = a.timestamp?.seconds || 0;
        const tsB = b.timestamp?.seconds || 0;
        return tsB - tsA;
      });
  }, [filteredVisitors]);

  // Compute page view statistics
  const pageViewStats = useMemo(() => {
    const pageViewsOnly = filteredVisitors.filter(v => !v.eventType || v.eventType === 'page_view');
    const map = new Map<string, number>();
    pageViewsOnly.forEach((v) => {
      const key = v.page || '/';
      map.set(key, (map.get(key) || 0) + 1);
    });
    const sorted = [...map.entries()].map(([name, count]) => ({
      name,
      count,
    })).sort((a, b) => b.count - a.count);

    const totalViews = pageViewsOnly.length;

    return sorted.slice(0, 10).map((item) => ({
      ...item,
      percentage: totalViews > 0 ? Math.round((item.count / totalViews) * 100) : 0,
    }));
  }, [filteredVisitors]);

  // Compute Traffic Trend data (SVG Line Chart)
  const trendData = useMemo(() => {
    const buckets: { label: string; dateKey: string; count: number }[] = [];
    const now = new Date();
    const pageViewsOnly = filteredVisitors.filter(v => !v.eventType || v.eventType === 'page_view');

    if (timeRange === '24h') {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
        buckets.push({ label, dateKey, count: 0 });
      }

      pageViewsOnly.forEach((v) => {
        if (!v.timestamp?.seconds) return;
        const d = new Date(v.timestamp.seconds * 1000);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
        const bucket = buckets.find(b => b.dateKey === key);
        if (bucket) bucket.count++;
      });
    } else {
      const days = timeRange === '7d' ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const dateKey = d.toISOString().split('T')[0];
        buckets.push({ label, dateKey, count: 0 });
      }

      pageViewsOnly.forEach((v) => {
        if (!v.timestamp?.seconds) return;
        const d = new Date(v.timestamp.seconds * 1000);
        const key = d.toISOString().split('T')[0];
        const bucket = buckets.find(b => b.dateKey === key);
        if (bucket) bucket.count++;
      });
    }

    return buckets;
  }, [filteredVisitors, timeRange]);

  // Compute Referrers (Traffic Sources)
  const referrerStats = useMemo(() => {
    const pageViewsOnly = filteredVisitors.filter(v => !v.eventType || v.eventType === 'page_view');
    const map = new Map<string, number>();

    pageViewsOnly.forEach((v) => {
      const ref = v.referrer || 'Direct / Bookmark';
      map.set(ref, (map.get(ref) || 0) + 1);
    });

    const sorted = [...map.entries()].map(([name, count]) => ({
      name,
      count,
    })).sort((a, b) => b.count - a.count);

    const totalViews = pageViewsOnly.length;

    return sorted.slice(0, 10).map((item) => ({
      ...item,
      percentage: totalViews > 0 ? Math.round((item.count / totalViews) * 100) : 0,
    }));
  }, [filteredVisitors]);

  // Client-side user agent parser
  const parseUA = (uaString: string) => {
    if (!uaString) return { device: 'Desktop', browser: 'Other' };
    const ua = uaString.toLowerCase();
    
    let device = 'Desktop';
    if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipod')) {
      device = 'Mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad') || ua.includes('playbook') || ua.includes('silk')) {
      device = 'Tablet';
    }
    
    let browser = 'Other';
    if (ua.includes('edg/')) {
      browser = 'Edge';
    } else if (ua.includes('chrome') || ua.includes('chromium')) {
      browser = 'Chrome';
    } else if (ua.includes('safari')) {
      browser = 'Safari';
    } else if (ua.includes('firefox')) {
      browser = 'Firefox';
    }
    
    return { device, browser };
  };

  // Compute Devices
  const deviceStats = useMemo(() => {
    const pageViewsOnly = filteredVisitors.filter(v => !v.eventType || v.eventType === 'page_view');
    const map = new Map<string, number>();

    pageViewsOnly.forEach((v) => {
      const { device } = parseUA(v.userAgent || '');
      map.set(device, (map.get(device) || 0) + 1);
    });

    const totalViews = pageViewsOnly.length;

    return [...map.entries()].map(([name, count]) => ({
      name,
      count,
      percentage: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [filteredVisitors]);

  // Compute Browsers
  const browserStats = useMemo(() => {
    const pageViewsOnly = filteredVisitors.filter(v => !v.eventType || v.eventType === 'page_view');
    const map = new Map<string, number>();

    pageViewsOnly.forEach((v) => {
      const { browser } = parseUA(v.userAgent || '');
      map.set(browser, (map.get(browser) || 0) + 1);
    });

    const totalViews = pageViewsOnly.length;

    return [...map.entries()].map(([name, count]) => ({
      name,
      count,
      percentage: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [filteredVisitors]);

  // Compute Conversions
  const conversionStats = useMemo(() => {
    const events = filteredVisitors.filter(v => v.eventType === 'event');
    return {
      cvDownloads: events.filter(e => e.eventName?.startsWith('cv_')).length,
      contactFormSubmissions: events.filter(e => e.eventName === 'contact_form_submit').length,
      totalEvents: events.length,
    };
  }, [filteredVisitors]);

  // Secret corner-dot clicks — logged from the little gold dot in the corner.
  // Uses the raw visitor list (not the geo-filtered one) so a click still
  // shows up even when the location came back as Unknown, and applies only
  // the selected time range.
  const dotClicks = useMemo(() => {
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 * 24 : 30 * 24;
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return visitors
      .filter((v) => v.eventType === 'event' && v.eventName === 'corner_dot_click')
      .filter((v) => (v.timestamp?.seconds ? v.timestamp.seconds * 1000 : 0) >= cutoff)
      .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
  }, [visitors, timeRange]);

  const dotClickUniqueVisitors = useMemo(
    () => new Set(dotClicks.map((v) => v.visitorId || v.ip || v.id)).size,
    [dotClicks]
  );

  if (loading) {
    return (
      <div className="p-6 lg:p-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-[#2F2A26] rounded" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-[#191614] rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      {/* Global CSS overrides for clean print output */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Page size and layout reset */
          @page {
            size: letter portrait;
            margin: 15mm;
          }
          
          /* Canvas & Containers Reset */
          html, body, .admin-layout-wrapper {
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #111111 !important;
          }
          
          /* Hide non-print frames, layout scrollbars & navigation controls */
          aside,
          .no-print,
          nav,
          .md\\:hidden,
          button,
          .print-hidden {
            display: none !important;
          }
          
          /* Main container page expand */
          main {
            overflow: visible !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: #ffffff !important;
          }

          /* Force high contrast & light modes on all analytics sections */
          [class*="bg-[#191614]"],
          [class*="bg-[#171311]"],
          [class*="bg-[#1D1917]"] {
            background: #ffffff !important;
            border: 1px solid #e5e7eb !important;
            color: #111111 !important;
            box-shadow: none !important;
            margin-bottom: 24px !important;
            padding: 20px !important;
            page-break-inside: avoid !important;
          }

          /* Text light overrides */
          .text-gray-400,
          .text-gray-500,
          .text-gray-600 {
            color: #4b5563 !important;
          }
          
          .text-\\[\\#F3F4F6\\],
          .text-white,
          .text-foreground,
          h1, h2, h3 {
            color: #111111 !important;
          }
          
          /* Accentuate dashboard gold with high-contrast print gold */
          .text-\\[\\#C5A059\\],
          text.text-\\[\\#C5A059\\] {
            color: #b45309 !important;
          }

          .border-\\[\\#2F2A26\\] {
            border-color: #e5e7eb !important;
          }
          
          th {
            border-bottom: 2px solid #e5e7eb !important;
            color: #111111 !important;
            font-weight: bold !important;
          }
          
          td {
            border-bottom: 1px solid #f3f4f6 !important;
            color: #374151 !important;
          }

          /* Trend Chart print optimization */
          #chartGradient stop {
            stop-color: #b45309 !important;
          }
          svg path {
            stroke: #b45309 !important;
            stroke-width: 2px !important;
          }
          svg line {
            stroke: #e5e7eb !important;
          }
          svg text {
            fill: #4b5563 !important;
            font-size: 10px !important;
          }
          
          /* Stack layout columns cleanly */
          .grid {
            display: block !important;
          }
          
          .grid > div {
            width: 100% !important;
            margin-bottom: 24px !important;
            page-break-inside: avoid !important;
          }

          /* Exact background fills for print progress-bars */
          [class*="bg-[#C5A059]"] {
            background-color: #b45309 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          [class*="bg-[#2F2A26]"] {
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Auto table scrolling expand */
          .overflow-auto {
            overflow: visible !important;
            max-height: none !important;
          }
        }
      ` }} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Print-Only Detailed Header */}
        <div className="hidden print:block mb-8 border-b-2 border-gray-200 pb-5">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">Victoria Odueso</h1>
              <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">SEO Writer &amp; Content Strategist Portfolio</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-gray-800">Portfolio Analytics Report</h2>
              <p className="text-xs text-gray-600 mt-1">Reporting Period: {timeRange === '24h' ? 'Last 24 Hours' : timeRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'}</p>
              <p className="text-xs text-gray-500">Generated: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        <header className="mb-10 rounded-2xl border border-[#2F2A26] bg-[#171311] px-6 py-6 lg:px-8 lg:py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 no-print">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#C5A059] mb-2">Analytics</p>
            <h1 className="text-3xl lg:text-4xl font-serif text-[#F3F4F6] tracking-tight mb-2">
              Visitor Insights
            </h1>
            <p className="text-gray-400 font-sans">
              See where your audience is viewing from — city and country breakdown.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-center shrink-0">
            {/* Export PDF Button */}
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 text-xs font-sans font-semibold rounded-xl border border-[#C5A059]/40 text-[#C5A059] hover:bg-[#C5A059]/10 hover:text-white transition-all duration-200 flex items-center gap-2 cursor-pointer"
            >
              <FileDown size={14} />
              Export PDF
            </button>

            {/* Time range toggle */}
            <div className="flex items-center gap-1 bg-[#191614] border border-[#2F2A26] p-1 rounded-xl">
              {(['24h', '7d', '30d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 text-xs font-sans rounded-lg transition-all duration-200 ${
                    timeRange === range
                      ? 'bg-[#C5A059] text-[#171311] font-semibold shadow-md'
                      : 'text-gray-400 hover:text-[#F3F4F6] hover:bg-[#201C1A]'
                  }`}
                >
                  {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Total Visitors" value={totalVisitors} />
          <StatCard icon={Globe} label="Countries" value={uniqueCountries} />
          <StatCard icon={MapPin} label="Cities" value={uniqueCities} />
          <StatCard icon={TrendingUp} label="Last 24 Hours" value={last24h} />
        </div>

        {totalVisitors === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#2F2A26] rounded-2xl">
            <Globe size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-500 font-serif text-xl italic">No visitor data yet.</p>
            <p className="text-gray-600 text-sm mt-2">Data will appear as visitors browse your site.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* SVG Trend Chart */}
            <TrendChart data={trendData} />

            {/* Countries and Cities Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Countries */}
              <div className="bg-[#191614] border border-[#2F2A26] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                    <Globe size={20} className="text-[#C5A059]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif text-[#F3F4F6]">Visitors by Country</h2>
                    <p className="text-xs text-gray-500">{uniqueCountries} countries reached</p>
                  </div>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {countryStats.map((item, i) => (
                    <LocationRow key={item.name} item={item} index={i} />
                  ))}
                </div>
              </div>

              {/* Cities */}
              <div className="bg-[#191614] border border-[#2F2A26] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                    <MapPin size={20} className="text-[#C5A059]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif text-[#F3F4F6]">Visitors by City</h2>
                    <p className="text-xs text-gray-500">Top {Math.min(cityStats.length, 20)} cities</p>
                  </div>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {cityStats.map((item, i) => (
                    <LocationRow key={item.name} item={item} index={i} />
                  ))}
                  {cityStats.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-8">No city data available yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Pages and Referrers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Most Viewed Pages */}
              <div className="bg-[#191614] border border-[#2F2A26] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                    <Eye size={20} className="text-[#C5A059]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif text-[#F3F4F6]">Most Viewed Pages</h2>
                    <p className="text-xs text-gray-500">Top {Math.min(pageViewStats.length, 10)} pages by pageviews</p>
                  </div>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {pageViewStats.map((item, i) => (
                    <PageRow key={item.name} item={item} index={i} />
                  ))}
                  {pageViewStats.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-8">No pageview data available yet.</p>
                  )}
                </div>
              </div>

              {/* Traffic Sources (Referrers) */}
              <div className="bg-[#191614] border border-[#2F2A26] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                    <Share2 size={20} className="text-[#C5A059]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif text-[#F3F4F6]">Traffic Sources</h2>
                    <p className="text-xs text-gray-500">Where your visitors find you</p>
                  </div>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {referrerStats.map((item, i) => (
                    <SimpleProgressRow key={item.name} name={item.name} count={item.count} percentage={item.percentage} index={i} icon={Share2} />
                  ))}
                  {referrerStats.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-8">No referrer data available yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Secret Corner-Dot Clicks */}
            <div className="bg-[#191614] border border-[#C5A059]/40 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                    <Eye size={20} className="text-[#C5A059]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif text-[#F3F4F6]">Secret Dot</h2>
                    <p className="text-xs text-gray-500 font-sans">Who tapped the little corner dot — and from where</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-serif text-[#C5A059] leading-none">{dotClicks.length}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">Total Clicks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-serif text-[#C5A059] leading-none">{dotClickUniqueVisitors}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">People</p>
                  </div>
                </div>
              </div>
              {dotClicks.length === 0 ? (
                <p className="text-sm text-gray-500 font-sans py-6 text-center">
                  No one has clicked the dot in this time range yet.
                </p>
              ) : (
                <div className="overflow-auto max-h-[360px] pr-2">
                  <table className="w-full text-left border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-[#2F2A26] text-xs uppercase tracking-widest text-gray-500">
                        <th className="py-3 px-4 font-semibold">Time</th>
                        <th className="py-3 px-4 font-semibold">Location</th>
                        <th className="py-3 px-4 font-semibold">Device</th>
                        <th className="py-3 px-4 font-semibold">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2F2A26]/50">
                      {dotClicks.map((v) => {
                        const flag = getFlagForName(v.country);
                        const timeStr = formatVisitTime(v.timestamp);
                        const { device, browser } = parseUA(v.userAgent || '');
                        return (
                          <tr key={v.id} className="text-sm hover:bg-[#201C1A]/50 transition-colors">
                            <td className="py-3.5 px-4 text-gray-400 font-mono whitespace-nowrap">{timeStr}</td>
                            <td className="py-3.5 px-4 text-gray-300">
                              <span className="text-base mr-2 select-none" role="img">{flag}</span>
                              <span className="inline-flex flex-col">
                                {v.visitorName && (
                                  <span className="font-semibold text-[#C5A059] text-xs">{v.visitorName}</span>
                                )}
                                <span className={v.visitorName ? 'text-[10px] text-gray-500' : 'text-sm text-gray-300'}>
                                  {v.city && v.city !== 'Unknown' ? `${v.city}, ${v.country}` : v.country}
                                </span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap">{device} · {browser}</td>
                            <td className="py-3.5 px-4 text-gray-500 font-mono whitespace-nowrap">{v.ip || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Conversions, User Agents and Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Panel: Conversions & Technology Stacked */}
              <div className="space-y-6 flex flex-col justify-between">
                {/* Conversions Card */}
                <div className="bg-[#191614] border border-[#2F2A26] rounded-2xl p-6 flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                      <CheckCircle size={20} className="text-[#C5A059]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-serif text-[#F3F4F6]">Goal Conversions</h2>
                      <p className="text-xs text-gray-500">Visitor actions and goal completions</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#1D1917] border border-[#2F2A26] rounded-xl p-4 text-center">
                      <p className="text-2xl font-serif text-[#C5A059] mb-1">{conversionStats.cvDownloads}</p>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">CV Downloads</p>
                    </div>
                    <div className="bg-[#1D1917] border border-[#2F2A26] rounded-xl p-4 text-center">
                      <p className="text-2xl font-serif text-[#C5A059] mb-1">{conversionStats.contactFormSubmissions}</p>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Contact Forms</p>
                    </div>
                  </div>
                </div>

                {/* Device & Browser Breakdowns */}
                <div className="bg-[#191614] border border-[#2F2A26] rounded-2xl p-6 flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                      <Laptop size={20} className="text-[#C5A059]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-serif text-[#F3F4F6]">Devices &amp; Technology</h2>
                      <p className="text-xs text-gray-500">System setups used to view your site</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Device Distribution</p>
                      <div className="space-y-2">
                        {deviceStats.map((item, i) => (
                          <SimpleProgressRow key={item.name} name={item.name} count={item.count} percentage={item.percentage} index={i} icon={Laptop} showPercentOnly={true} />
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#2F2A26]/50">
                      <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Top Browsers</p>
                      <div className="space-y-2">
                        {browserStats.map((item, i) => (
                          <SimpleProgressRow key={item.name} name={item.name} count={item.count} percentage={item.percentage} index={i} icon={Laptop} showPercentOnly={true} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Feed */}
              <div className="bg-[#191614] border border-[#2F2A26] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                    <TrendingUp size={20} className="text-[#C5A059]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif text-[#F3F4F6]">Recent Activity</h2>
                    <p className="text-xs text-gray-500 font-sans">Real-time log of the latest visits</p>
                  </div>
                </div>
                <div className="overflow-auto max-h-[500px] pr-2">
                  <table className="w-full text-left border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-[#2F2A26] text-xs uppercase tracking-widest text-gray-500">
                        <th className="py-3 px-4 font-semibold">Time</th>
                        <th className="py-3 px-4 font-semibold">Location</th>
                        <th className="py-3 px-4 font-semibold">Page Path</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2F2A26]/50">
                      {recentVisits.map((v) => {
                        const flag = getFlagForName(v.country);
                        const timeStr = formatVisitTime(v.timestamp);
                        return (
                          <tr key={v.id} className="text-sm hover:bg-[#201C1A]/50 transition-colors">
                            <td className="py-3.5 px-4 text-gray-400 font-mono whitespace-nowrap">{timeStr}</td>
                            <td className="py-3.5 px-4 text-gray-300">
                              <span className="text-base mr-2 select-none" role="img">
                                {flag}
                              </span>
                              <span className="inline-flex flex-col">
                                {v.visitorName && (
                                  <span className="font-semibold text-[#C5A059] text-xs">
                                    {v.visitorName}
                                  </span>
                                )}
                                <span className={v.visitorName ? 'text-[10px] text-gray-500' : 'text-sm text-gray-300'}>
                                  {v.city && v.city !== 'Unknown' ? `${v.city}, ${v.country}` : v.country}
                                </span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[#C5A059] font-mono">{v.page}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="p-5 bg-[#191614] border border-[#2F2A26] rounded-2xl hover:border-[#C5A059]/50 transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
          <Icon size={18} className="text-[#C5A059]" />
        </div>
        <span className="text-xs text-gray-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-3xl font-serif text-[#C5A059]">{value.toLocaleString()}</div>
    </motion.div>
  );
}

function TrendChart({ data }: { data: { label: string; count: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.count), 2);
  const width = 1000;
  const height = 200;
  const paddingX = 40;
  const paddingY = 20;
  
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - (d.count / maxVal) * chartHeight;
    return { x, y, label: d.label, count: d.count };
  });
  
  const pathD = points.length > 0 
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';
    
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  return (
    <div className="bg-[#191614] border border-[#2F2A26] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-serif text-[#F3F4F6]">Traffic Trend</h2>
          <p className="text-xs text-gray-500">Visitor activity over time</p>
        </div>
      </div>
      
      <div className="w-full overflow-x-auto select-none">
        <div className="min-w-[700px] h-[200px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C5A059" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#C5A059" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            
            {/* Grid horizontal lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = paddingY + chartHeight * ratio;
              const labelValue = Math.round(maxVal * (1 - ratio));
              return (
                <g key={ratio} className="opacity-30">
                  <line 
                    x1={paddingX} 
                    y1={y} 
                    x2={width - paddingX} 
                    y2={y} 
                    stroke="#2F2A26" 
                    strokeDasharray="4 4" 
                  />
                  <text 
                    x={paddingX - 10} 
                    y={y + 4} 
                    fill="#9CA3AF" 
                    fontSize="9" 
                    textAnchor="end"
                    className="font-mono"
                  >
                    {labelValue}
                  </text>
                </g>
              );
            })}
            
            {/* Trend Area */}
            {points.length > 0 && (
              <path d={areaD} fill="url(#chartGradient)" />
            )}
            
            {/* Trend Line */}
            {points.length > 0 && (
              <path 
                d={pathD} 
                fill="none" 
                stroke="#C5A059" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            )}
            
            {/* Data Nodes */}
            {points.map((p, i) => {
              if (data.length > 15 && p.count === 0) return null;
              return (
                <g key={i} className="group cursor-pointer">
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r="3.5" 
                    fill="#191614" 
                    stroke="#C5A059" 
                    strokeWidth="1.5" 
                  />
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r="10" 
                    fill="transparent" 
                    className="hover:fill-[#C5A059]/10 transition-colors"
                  />
                  <title>{`${p.label}: ${p.count} views`}</title>
                </g>
              );
            })}
            
            {/* X Axis Labels */}
            {points.map((p, i) => {
              if (data.length > 15 && i % 4 !== 0 && i !== data.length - 1) return null;
              if (data.length > 7 && data.length <= 15 && i % 2 !== 0 && i !== data.length - 1) return null;
              
              return (
                <text 
                  key={i} 
                  x={p.x} 
                  y={height - paddingY + 16} 
                  fill="#9CA3AF" 
                  fontSize="9" 
                  textAnchor="middle"
                  className="opacity-75 font-sans"
                >
                  {p.label}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

const countryToCodeMap: { [key: string]: string } = {
  'Afghanistan': 'AF',
  'Albania': 'AL',
  'Algeria': 'DZ',
  'Andorra': 'AD',
  'Angola': 'AO',
  'Argentina': 'AR',
  'Armenia': 'AM',
  'Australia': 'AU',
  'Austria': 'AT',
  'Azerbaijan': 'AZ',
  'Bahamas': 'BS',
  'Bahrain': 'BH',
  'Bangladesh': 'BD',
  'Barbados': 'BB',
  'Belarus': 'BY',
  'Belgium': 'BE',
  'Belize': 'BZ',
  'Benin': 'BJ',
  'Bhutan': 'BT',
  'Bolivia': 'BO',
  'Bosnia and Herzegovina': 'BA',
  'Botswana': 'BW',
  'Brazil': 'BR',
  'Brunei': 'BN',
  'Bulgaria': 'BG',
  'Burkina Faso': 'BF',
  'Burundi': 'BI',
  'Cambodia': 'KH',
  'Cameroon': 'CM',
  'Canada': 'CA',
  'Cape Verde': 'CV',
  'Central African Republic': 'CF',
  'Chad': 'TD',
  'Chile': 'CL',
  'China': 'CN',
  'Colombia': 'CO',
  'Comoros': 'KM',
  'Congo': 'CG',
  'Costa Rica': 'CR',
  'Croatia': 'HR',
  'Cuba': 'CU',
  'Cyprus': 'CY',
  'Czech Republic': 'CZ',
  'Denmark': 'DK',
  'Djibouti': 'DJ',
  'Dominica': 'DM',
  'Dominican Republic': 'DO',
  'Ecuador': 'EC',
  'Egypt': 'EG',
  'El Salvador': 'SV',
  'Equatorial Guinea': 'GQ',
  'Eritrea': 'ER',
  'Estonia': 'EE',
  'Eswatini': 'SZ',
  'Ethiopia': 'ET',
  'Fiji': 'FJ',
  'Finland': 'FI',
  'France': 'FR',
  'Gabon': 'GA',
  'Gambia': 'GM',
  'Georgia': 'GE',
  'Germany': 'DE',
  'Ghana': 'GH',
  'Greece': 'GR',
  'Grenada': 'GD',
  'Guatemala': 'GT',
  'Guinea': 'GN',
  'Guinea-Bissau': 'GW',
  'Guyana': 'GY',
  'Haiti': 'HT',
  'Honduras': 'HN',
  'Hungary': 'HU',
  'Iceland': 'IS',
  'India': 'IN',
  'Indonesia': 'ID',
  'Iran': 'IR',
  'Iraq': 'IQ',
  'Ireland': 'IE',
  'Israel': 'IL',
  'Italy': 'IT',
  'Jamaica': 'JM',
  'Japan': 'JP',
  'Jordan': 'JO',
  'Kazakhstan': 'KZ',
  'Kenya': 'KE',
  'Kiribati': 'KI',
  'North Korea': 'KP',
  'South Korea': 'KR',
  'Kuwait': 'KW',
  'Kyrgyzstan': 'KG',
  'Laos': 'LA',
  'Latvia': 'LV',
  'Lebanon': 'LB',
  'Lesotho': 'LS',
  'Liberia': 'LR',
  'Libya': 'LY',
  'Liechtenstein': 'LI',
  'Lithuania': 'LT',
  'Luxembourg': 'LU',
  'Madagascar': 'MG',
  'Malawi': 'MW',
  'Malaysia': 'MY',
  'Maldives': 'MV',
  'Mali': 'ML',
  'Malta': 'MT',
  'Marshall Islands': 'MH',
  'Mauritania': 'MR',
  'Mauritius': 'MU',
  'Mexico': 'MX',
  'Micronesia': 'FM',
  'Moldova': 'MD',
  'Monaco': 'MC',
  'Mongolia': 'MN',
  'Montenegro': 'ME',
  'Morocco': 'MA',
  'Mozambique': 'MZ',
  'Myanmar': 'MM',
  'Namibia': 'NA',
  'Nauru': 'NR',
  'Nepal': 'NP',
  'Netherlands': 'NL',
  'New Zealand': 'NZ',
  'Nicaragua': 'NI',
  'Niger': 'NE',
  'Nigeria': 'NG',
  'North Macedonia': 'MK',
  'Norway': 'NO',
  'Oman': 'OM',
  'Pakistan': 'PK',
  'Palau': 'PW',
  'Panama': 'PA',
  'Papua New Guinea': 'PG',
  'Paraguay': 'PY',
  'Peru': 'PE',
  'Philippines': 'PH',
  'Poland': 'PL',
  'Portugal': 'PT',
  'Qatar': 'QA',
  'Romania': 'RO',
  'Russia': 'RU',
  'Rwanda': 'RW',
  'Saint Kitts and Nevis': 'KN',
  'Saint Lucia': 'LC',
  'Saint Vincent and the Grenadines': 'VC',
  'Samoa': 'WS',
  'San Marino': 'SM',
  'Sao Tome and Principe': 'ST',
  'Saudi Arabia': 'SA',
  'Senegal': 'SN',
  'Serbia': 'RS',
  'Seychelles': 'SC',
  'Sierra Leone': 'SL',
  'Singapore': 'SG',
  'Slovakia': 'SK',
  'Slovenia': 'SI',
  'Solomon Islands': 'SB',
  'Somalia': 'SO',
  'South Africa': 'ZA',
  'Spain': 'ES',
  'Sri Lanka': 'LK',
  'Sudan': 'SD',
  'Suriname': 'SR',
  'Sweden': 'SE',
  'Switzerland': 'CH',
  'Syria': 'SY',
  'Tajikistan': 'TJ',
  'Tanzania': 'TZ',
  'Thailand': 'TH',
  'Timor-Leste': 'TL',
  'Togo': 'TG',
  'Tonga': 'TO',
  'Trinidad and Tobago': 'TT',
  'Tunisia': 'TN',
  'Turkey': 'TR',
  'Turkmenistan': 'TM',
  'Tuvalu': 'TV',
  'Uganda': 'UG',
  'Ukraine': 'UA',
  'United Arab Emirates': 'AE',
  'United Kingdom': 'GB',
  'United States': 'US',
  'United States of America': 'US',
  'USA': 'US',
  'UK': 'GB',
  'Great Britain': 'GB',
  'Hong Kong': 'HK',
  'Taiwan': 'TW',
  'Palestine': 'PS',
  'Puerto Rico': 'PR',
  'Uruguay': 'UY',
  'Uzbekistan': 'UZ',
  'Vanuatu': 'VU',
  'Venezuela': 'VE',
  'Vietnam': 'VN',
  'Yemen': 'YE',
  'Zambia': 'ZM',
  'Zimbabwe': 'ZW'
};

function getFlagEmoji(countryName: string): string {
  if (!countryName || countryName === 'Unknown') return '🌐';
  const code = countryToCodeMap[countryName] || countryToCodeMap[countryName.trim()];
  if (!code) return '🌐';

  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getFlagForName(name: string): string {
  if (!name || name === 'Unknown') return '🌐';
  const parts = name.split(', ');
  const countryName = parts.length > 1 ? parts[parts.length - 1] : name;
  return getFlagEmoji(countryName.trim());
}

function formatVisitTime(timestamp: { seconds: number } | null): string {
  if (!timestamp || !timestamp.seconds) return 'Just now';
  const ms = timestamp.seconds * 1000;
  const diff = Date.now() - ms;
  
  if (diff < 60000) return 'Just now';
  
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const date = new Date(ms);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function LocationRow({ item, index }: { item: LocationCount; index: number }) {
  const flag = getFlagForName(item.name);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-6 text-right shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0 select-none" role="img" aria-label={item.name}>
              {flag}
            </span>
            <span className="text-sm text-gray-300 truncate">{item.name}</span>
          </div>
          <span className="text-xs text-[#C5A059] font-mono ml-2 shrink-0">{item.count}</span>
        </div>
        <div className="h-1.5 bg-[#2F2A26] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${item.percentage}%` }}
            transition={{ duration: 0.6, delay: index * 0.05 }}
            className="h-full bg-[#C5A059] rounded-full"
          />
        </div>
      </div>
      <span className="text-xs text-gray-500 w-10 text-right shrink-0">{item.percentage}%</span>
    </div>
  );
}

function PageRow({ item, index }: { item: { name: string; count: number; percentage: number }; index: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-6 text-right shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={14} className="text-gray-500 shrink-0" />
            <span className="text-sm text-gray-300 truncate font-mono">{item.name}</span>
          </div>
          <span className="text-xs text-[#C5A059] font-mono ml-2 shrink-0">
            {item.count} {item.count === 1 ? 'view' : 'views'}
          </span>
        </div>
        <div className="h-1.5 bg-[#2F2A26] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${item.percentage}%` }}
            transition={{ duration: 0.6, delay: index * 0.05 }}
            className="h-full bg-[#C5A059] rounded-full"
          />
        </div>
      </div>
      <span className="text-xs text-gray-500 w-10 text-right shrink-0">{item.percentage}%</span>
    </div>
  );
}

function SimpleProgressRow({ 
  name, 
  count, 
  percentage, 
  index, 
  icon: Icon,
  showPercentOnly = false
}: { 
  name: string; 
  count: number; 
  percentage: number; 
  index: number;
  icon: React.ElementType;
  showPercentOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-6 text-right shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <Icon size={13} className="text-gray-500 shrink-0" />
            <span className="text-sm text-gray-300 truncate">{name}</span>
          </div>
          <span className="text-xs text-[#C5A059] font-mono ml-2 shrink-0">
            {showPercentOnly ? `${percentage}%` : `${count} ${count === 1 ? 'visit' : 'visits'}`}
          </span>
        </div>
        <div className="h-1.5 bg-[#2F2A26] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.6, delay: index * 0.05 }}
            className="h-full bg-[#C5A059] rounded-full"
          />
        </div>
      </div>
      {!showPercentOnly && <span className="text-xs text-gray-500 w-10 text-right shrink-0">{percentage}%</span>}
    </div>
  );
}
