import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { page } = body;

    // Get visitor IP from headers (works behind proxies/CDN)
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    // Resolve geolocation from IP using ipapi.co (free, no key, 45 req/min)
    let city = 'Unknown';
    let country = 'Unknown';
    let region = 'Unknown';

    if (ip && ip !== 'unknown') {
      try {
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
          signal: AbortSignal.timeout(3000),
        });
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (!geo.error) {
            city = geo.city || 'Unknown';
            country = geo.country_name || 'Unknown';
            region = geo.region || 'Unknown';
          }
        }
      } catch {
        // Silently fail — geolocation is best-effort
      }
    }

    // Log to Firestore
    await addDoc(collection(db, 'analytics_visitors'), {
      ip,
      city,
      country,
      region,
      page: page || '/',
      userAgent: req.headers.get('user-agent') || '',
      timestamp: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics track error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
