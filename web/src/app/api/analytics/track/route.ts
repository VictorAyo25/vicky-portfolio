import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Returns true for loopback/private IPs that can't be geolocated
function isPrivateIp(ip: string): boolean {
  return (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.') ||
    ip === 'localhost'
  );
}

// Detect bots, crawlers, and other non-human automated traffic
function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  const botKeywords = [
    'bot',
    'spider',
    'crawler',
    'crawling',
    'lighthouse',
    'google-read-aloud',
    'google-weblight',
    'headless',
    'inspect',
    'prerender',
    'axios',
    'node-fetch',
    'got',
    'python-requests',
    'curl',
    'wget',
    'http-client',
  ];
  return botKeywords.some((keyword) => ua.includes(keyword));
}

export async function POST(req: NextRequest) {
  try {
    const userAgent = req.headers.get('user-agent') || '';
    if (isBot(userAgent)) {
      return NextResponse.json({ success: true, message: 'Ignored automated traffic' });
    }

    const body = await req.json();
    const { page, visitorId } = body;

    // Get visitor IP from headers (works behind proxies/CDN)
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    // 1. Try Vercel Edge Geolocation headers first (extremely fast, zero-rate-limits, 100% accurate in production)
    let city = 'Unknown';
    let country = 'Unknown';
    let region = 'Unknown';

    const vercelCity = req.headers.get('x-vercel-ip-city');
    const vercelCountryCode = req.headers.get('x-vercel-ip-country');
    const vercelRegion = req.headers.get('x-vercel-ip-country-region');

    if (vercelCountryCode) {
      try {
        const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
        country = regionNames.of(vercelCountryCode) || vercelCountryCode;
      } catch {
        country = vercelCountryCode;
      }
    }

    if (vercelCity) {
      try {
        city = decodeURIComponent(vercelCity);
      } catch {
        city = vercelCity;
      }
    }

    if (vercelRegion) {
      region = vercelRegion;
    }

    // 2. Fallback to ipapi.co if Vercel headers are missing (e.g. local development)
    if ((country === 'Unknown' || city === 'Unknown') && ip && ip !== 'unknown' && !isPrivateIp(ip)) {
      try {
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
          signal: AbortSignal.timeout(3000),
        });
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (!geo.error) {
            city = geo.city || city;
            country = geo.country_name || country;
            region = geo.region || region;
          }
        }
      } catch {
        // Silently fail — geolocation is best-effort
      }
    }

    // Always create a new document to preserve all history, exact times, and paths
    await adminDb.collection('analytics_visitors').add({
      visitorId: visitorId || '',
      ip,
      city,
      country,
      region,
      page: page || '/',
      userAgent: req.headers.get('user-agent') || '',
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics track error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
