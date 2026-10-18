import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * The public site is switched off: every page, the homepage included, renders
 * the bare 404. Only the owner's /backoffice area (behind its own login) stays
 * reachable.
 *
 * Filtering happens in code rather than in a `matcher` regex so there are no
 * path-to-regexp surprises: framework internals, API routes (the backoffice
 * and analytics tracking need them) and files with an extension (images,
 * favicon, robots.txt) pass straight through. The sitemap is the exception —
 * it would only advertise pages that 404.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAllowed =
    pathname === '/backoffice' ||
    pathname.startsWith('/backoffice/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    (/\.[a-zA-Z0-9]+$/.test(pathname) && pathname !== '/sitemap.xml');

  if (isAllowed) return NextResponse.next();

  // Rewrite to a two-segment path no route matches (a single segment would be
  // caught by the [slug] post route), so Next renders not-found with a real
  // 404 status while the address bar keeps the URL the visitor tried.
  const url = request.nextUrl.clone();
  url.pathname = '/_locked/_';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: '/:path*',
};
