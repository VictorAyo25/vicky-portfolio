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

    if (ip && ip !== 'unknown' && !isPrivateIp(ip)) {
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

    // Log to Firestore using Admin SDK
    await adminDb.collection('analytics_visitors').add({
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
