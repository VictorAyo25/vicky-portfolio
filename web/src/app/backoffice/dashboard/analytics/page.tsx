'use client';

import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Globe, MapPin, Users, TrendingUp, FileText, Eye, Share2, Laptop, CheckCircle, FileDown, ShieldAlert, CalendarRange } from 'lucide-react';

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

type PresetRange = '1h' | '3h' | '6h' | '12h' | '24h' | '7d' | '30d';
type TimeRange = PresetRange | 'custom';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MINUTES = 24 * 60;

// Preset windows, how far back each reaches, and how finely the trend chart
// buckets it.
const PRESET_RANGES: { key: PresetRange; button: string; label: string; hours: number; bucketMinutes: number }[] = [
  { key: '1h', button: '1H', label: 'Last 1 Hour', hours: 1, bucketMinutes: 5 },
  { key: '3h', button: '3H', label: 'Last 3 Hours', hours: 3, bucketMinutes: 15 },
  { key: '6h', button: '6H', label: 'Last 6 Hours', hours: 6, bucketMinutes: 30 },
  { key: '12h', button: '12H', label: 'Last 12 Hours', hours: 12, bucketMinutes: 60 },
  { key: '24h', button: '24H', label: 'Last 24 Hours', hours: 24, bucketMinutes: 60 },
  { key: '7d', button: '7D', label: 'Last 7 Days', hours: 7 * 24, bucketMinutes: DAY_MINUTES },
  { key: '30d', button: '30D', label: 'Last 30 Days', hours: 30 * 24, bucketMinutes: DAY_MINUTES },
];

const tsOf = (v: VisitorRecord) => (v.timestamp?.seconds ? v.timestamp.seconds * 1000 : 0);

// Local "YYYY-MM-DDTHH:mm", the format a datetime-local input reads and writes.
function toInputValue(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const formatRangeEdge = (ms: number) =>
  new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Page views per slot for the trend chart, aligned to local clock time:
// N-minute slots for short windows, local calendar days for long ones.
function buildTrendBuckets(views: VisitorRecord[], start: number, end: number, bucketMinutes: number) {
  const daily = bucketMinutes >= DAY_MINUTES;
  const floor = (ts: number) => {
    const d = new Date(ts);
    if (daily) return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    d.setSeconds(0, 0);
    d.setMinutes(Math.floor(d.getMinutes() / bucketMinutes) * bucketMinutes);
    return d.getTime();
  };
  const next = (ts: number) => {
    if (!daily) return ts + bucketMinutes * 60 * 1000;
    const d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  };
  const spansDays = end - start > 24 * HOUR_MS;

  const buckets = new Map<number, { label: string; count: number }>();
  for (let t = floor(start); t <= end; t = next(t)) {
    const d = new Date(t);
    const label = daily
      ? d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      : spansDays
        ? d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    buckets.set(t, { label, count: 0 });
  }
  views.forEach((v) => {
    const bucket = buckets.get(floor(tsOf(v)));
    if (bucket) bucket.count++;
  });
  return [...buckets.values()];
}

export default function AnalyticsPage() {
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  // The applied custom window, and the picker values being edited before Apply.
  const [customRange, setCustomRange] = useState<{ start: number; end: number } | null>(null);
  const [customDraft, setCustomDraft] = useState({ from: '', to: '' });
  const [showCustom, setShowCustom] = useState(false);
  // Earliest moment loaded from Firestore. A custom range reaching further
  // back moves it and triggers a reload.
  const [loadedFrom, setLoadedFrom] = useState(() => Date.now() - 30 * 24 * HOUR_MS);

  useEffect(() => {
    async function fetchVisitors() {
      try {
        const q = query(
          collection(db, 'analytics_visitors'),
          where('timestamp', '>=', new Date(loadedFrom)),
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
  }, [loadedFrom]);

  // The selected window in ms. Presets end at the moment they were picked.
  const range = useMemo(() => {
    if (timeRange === 'custom' && customRange) return customRange;
    const preset = PRESET_RANGES.find((p) => p.key === timeRange) ?? PRESET_RANGES[5];
    const end = Date.now();
    return { start: end - preset.hours * HOUR_MS, end };
  }, [timeRange, customRange]);

  const periodLabel =
    timeRange === 'custom' && customRange
      ? `${formatRangeEdge(customRange.start)} – ${formatRangeEdge(customRange.end)}`
      : PRESET_RANGES.find((p) => p.key === timeRange)?.label ?? '';

  const customValid =
    !!customDraft.from && !!customDraft.to && new Date(customDraft.from).getTime() < new Date(customDraft.to).getTime();

  function openCustom() {
    // Start the pickers on whatever window is showing now.
    setCustomDraft({ from: toInputValue(range.start), to: toInputValue(range.end) });
    setShowCustom(true);
  }

  function applyCustomRange() {
    if (!customValid) return;
    const start = new Date(customDraft.from).getTime();
    const end = new Date(customDraft.to).getTime();
    setCustomRange({ start, end });
    setTimeRange('custom');
    setShowCustom(false);
    if (start < loadedFrom) {
      setLoading(true);
      setLoadedFrom(start);
    }
  }

  // Filter out records without valid geolocations first
  const geoFilteredVisitors = useMemo(() => {
    return visitors.filter(
      (v) => v.country && v.country !== 'Unknown' && v.city && v.city !== 'Unknown'
    );
  }, [visitors]);

  // Then filter by selected time range
  const filteredVisitors = useMemo(() => {
    return geoFilteredVisitors.filter((v) => {
      const ts = tsOf(v);
      return ts >= range.start && ts <= range.end;
    });
  }, [geoFilteredVisitors, range]);

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
    const pageViewsOnly = filteredVisitors.filter(v => !v.eventType || v.eventType === 'page_view');
    const preset = PRESET_RANGES.find((p) => p.key === timeRange);
    // Custom windows: hourly up to two days, daily beyond that.
    const bucketMinutes = preset ? preset.bucketMinutes : range.end - range.start <= 48 * HOUR_MS ? 60 : DAY_MINUTES;
    return buildTrendBuckets(pageViewsOnly, range.start, range.end, bucketMinutes);
  }, [filteredVisitors, timeRange, range]);

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
    return visitors
      .filter((v) => v.eventType === 'event' && v.eventName === 'corner_dot_click')
      .filter((v) => tsOf(v) >= range.start && tsOf(v) <= range.end)
      .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
  }, [visitors, range]);

  const dotClickUniqueVisitors = useMemo(
    () => new Set(dotClicks.map((v) => v.visitorId || v.ip || v.id)).size,
    [dotClicks]
  );

  // Admin access — signed-out visits to /backoffice, guessed admin URLs
  // (/admin, /wp-admin, ...), corner-dot clicks (the dot used to be the way
  // in), and every sign-in, failed or not. Uses the raw visitor list (not the
  // geo-filtered one) so attempts still show when the location comes back
  // Unknown.
  const adminAccess = useMemo(() => {
    return visitors
      .filter((v) => v.eventType === 'event' && (v.eventName === 'admin_access' || v.eventName === 'corner_dot_click'))
      .filter((v) => tsOf(v) >= range.start && tsOf(v) <= range.end)
      .map((v) =>
        v.eventName === 'corner_dot_click'
          ? { ...v, eventMetadata: { ...v.eventMetadata, kind: 'dot', path: v.page } }
          : v
      )
      .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
  }, [visitors, range]);

  const adminAccessStats = useMemo(() => {
    const ofKind = (...kinds: string[]) => adminAccess.filter((v) => kinds.includes(v.eventMetadata?.kind));
    const strangers = adminAccess.filter((v) => !v.eventMetadata?.ownerDevice);
    return {
      attempts: ofKind('visit', 'probe', 'dot').length,
      failed: ofKind('login_failed', 'not_admin').length,
      signIns: ofKind('login').length,
      people: new Set(strangers.map((v) => v.visitorId || v.ip || v.id)).size,
    };
  }, [adminAccess]);

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
              <p className="text-xs text-gray-600 mt-1">Reporting Period: {periodLabel}</p>
              <p className="text-xs text-gray-500">Generated: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        <header className="mb-10 rounded-2xl border border-[#2F2A26] bg-[#171311] px-6 py-6 lg:px-8 lg:py-7 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 no-print">
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
          <div className="flex flex-col items-start xl:items-end gap-3 self-start xl:self-center">
            <div className="flex flex-wrap items-center gap-3">
              {/* Export PDF Button */}
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 text-xs font-sans font-semibold rounded-xl border border-[#C5A059]/40 text-[#C5A059] hover:bg-[#C5A059]/10 hover:text-white transition-all duration-200 flex items-center gap-2 cursor-pointer"
              >
                <FileDown size={14} />
                Export PDF
              </button>

              {/* Time range toggle */}
              <div className="flex flex-wrap items-center gap-1 bg-[#191614] border border-[#2F2A26] p-1 rounded-xl">
                {PRESET_RANGES.map((preset) => (
                  <button
                    key={preset.key}
                    title={preset.label}
                    onClick={() => {
                      setTimeRange(preset.key);
                      setShowCustom(false);
                    }}
                    className={`px-3 py-2 text-xs font-sans rounded-lg transition-all duration-200 ${
                      timeRange === preset.key && !showCustom
                        ? 'bg-[#C5A059] text-[#171311] font-semibold shadow-md'
                        : 'text-gray-400 hover:text-[#F3F4F6] hover:bg-[#201C1A]'
                    }`}
                  >
                    {preset.button}
                  </button>
                ))}
                <button
                  onClick={openCustom}
                  className={`px-3 py-2 text-xs font-sans rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                    timeRange === 'custom' || showCustom
                      ? 'bg-[#C5A059] text-[#171311] font-semibold shadow-md'
                      : 'text-gray-400 hover:text-[#F3F4F6] hover:bg-[#201C1A]'
                  }`}
                >
                  <CalendarRange size={13} />
                  Custom
                </button>
              </div>
            </div>

            {showCustom ? (
              <div className="flex flex-wrap items-end gap-2 bg-[#191614] border border-[#2F2A26] p-3 rounded-xl">
                <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-gray-500 font-sans">
                  From
                  <input
                    type="datetime-local"
                    value={customDraft.from}
                    max={customDraft.to || undefined}
                    onChange={(e) => setCustomDraft((d) => ({ ...d, from: e.target.value }))}
                    className="bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-3 py-2 text-xs text-gray-200 normal-case tracking-normal focus:outline-none focus:border-[#C5A059] [color-scheme:dark]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-gray-500 font-sans">
                  To
                  <input
                    type="datetime-local"
                    value={customDraft.to}
                    min={customDraft.from || undefined}
                    onChange={(e) => setCustomDraft((d) => ({ ...d, to: e.target.value }))}
                    className="bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-3 py-2 text-xs text-gray-200 normal-case tracking-normal focus:outline-none focus:border-[#C5A059] [color-scheme:dark]"
                  />
                </label>
                <button
                  onClick={applyCustomRange}
                  disabled={!customValid}
                  className="px-4 py-2 text-xs font-sans font-semibold rounded-lg bg-[#C5A059] text-[#171311] hover:bg-[#d4b06a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
                <button
                  onClick={() => setShowCustom(false)}
                  className="px-3 py-2 text-xs font-sans rounded-lg text-gray-400 hover:text-[#F3F4F6] hover:bg-[#201C1A] transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              timeRange === 'custom' && <p className="text-[11px] text-gray-500 font-sans">{periodLabel}</p>
            )}
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

            {/* Admin Access — anyone trying to get into the backoffice */}
            <div className="bg-[#191614] border border-[#C5A059]/40 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                    <ShieldAlert size={20} className="text-[#C5A059]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif text-[#F3F4F6]">Admin Access</h2>
                    <p className="text-xs text-gray-500 font-sans">Visits to the backoffice, guessed admin URLs, corner-dot clicks, and every sign-in</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-serif text-[#C5A059] leading-none">{adminAccessStats.attempts}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">Attempts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-serif text-[#C5A059] leading-none">{adminAccessStats.failed}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">Failed Sign-ins</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-serif text-[#C5A059] leading-none">{adminAccessStats.signIns}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">Sign-ins</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-serif text-[#C5A059] leading-none">{adminAccessStats.people}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">People</p>
                  </div>
                </div>
              </div>
              {adminAccess.length === 0 ? (
                <p className="text-sm text-gray-500 font-sans py-6 text-center">
                  No one has tried the admin side in this time range.
                </p>
              ) : (
                <div className="overflow-auto max-h-[360px] pr-2">
                  <table className="w-full text-left border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-[#2F2A26] text-xs uppercase tracking-widest text-gray-500">
                        <th className="py-3 px-3 font-semibold">Time</th>
                        <th className="py-3 px-3 font-semibold">What happened</th>
                        <th className="py-3 px-3 font-semibold">Location</th>
                        <th className="py-3 px-3 font-semibold">Device</th>
                        <th className="py-3 px-3 font-semibold">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2F2A26]/50">
                      {adminAccess.map((v) => {
                        const flag = getFlagForName(v.country);
                        const timeStr = formatVisitTime(v.timestamp);
                        const { device, browser } = parseUA(v.userAgent || '');
                        const meta = v.eventMetadata || {};
                        const { label, tone } = ADMIN_ACCESS_LABELS[meta.kind] || { label: 'Admin access', tone: 'text-[#C5A059]' };
                        const detail = meta.email || meta.path || v.page || '';
                        return (
                          <tr key={v.id} className="text-sm align-top hover:bg-[#201C1A]/50 transition-colors">
                            <td className="py-3 px-3 text-gray-400 font-mono whitespace-nowrap">{timeStr}</td>
                            <td className="py-3 px-3">
                              <span className="inline-flex flex-col">
                                <span className={`text-xs ${tone}`}>
                                  {label}
                                  {meta.ownerDevice && <span className="ml-2 text-[10px] text-gray-500">(your device)</span>}
                                </span>
                                <span className="text-[11px] text-gray-500 font-mono break-all">{detail}</span>
                              </span>
                            </td>
                            <td className="py-3 px-3 text-gray-300 whitespace-nowrap">
                              <span className="text-base mr-1.5 select-none" role="img">{flag}</span>
                              {v.city && v.city !== 'Unknown' ? `${v.city}, ${v.country}` : v.country}
                            </td>
                            <td className="py-3 px-3 text-gray-300 whitespace-nowrap">{device} · {browser}</td>
                            <td className="py-3 px-3 text-gray-500 font-mono whitespace-nowrap">{v.ip || '—'}</td>
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
    const x = data.length === 1 ? width / 2 : paddingX + (i / (data.length - 1)) * chartWidth;
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
              // Keep the axis readable on long ranges: about a dozen labels at
              // most, always including the last.
              const labelStep = data.length <= 7 ? 1 : data.length <= 15 ? 2 : Math.max(4, Math.ceil(data.length / 12));
              if (i % labelStep !== 0 && i !== data.length - 1) return null;
              
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

const ADMIN_ACCESS_LABELS: Record<string, { label: string; tone: string }> = {
  probe: { label: 'Guessed an admin URL', tone: 'text-[#C5A059]' },
  dot: { label: 'Clicked the corner dot', tone: 'text-[#C5A059]' },
  visit: { label: 'Opened the backoffice signed out', tone: 'text-[#C5A059]' },
  login_failed: { label: 'Failed sign-in', tone: 'text-red-400' },
  not_admin: { label: 'Signed in but not the owner — refused', tone: 'text-red-400' },
  login: { label: 'Signed in', tone: 'text-green-400' },
};

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
