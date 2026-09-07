import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * The public site is intentionally locked to the homepage. The owner's
 * /backoffice area stays reachable (it has its own login). Every other page
 * is rewritten to the app's not-found boundary, which renders the bare 404.
 *
 * Filtering happens in code rather than in a `matcher` regex so there are no
 * path-to-regexp surprises: framework internals, API routes and any file with
 * an extension (images, robots.txt, sitemap.xml, favicon) pass straight
 * through, which keeps the homepage and the analytics tracking working.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isInternal =
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_locked') ||
    /\.[a-zA-Z0-9]+$/.test(pathname);

  if (isInternal) return NextResponse.next();

  const isAllowed =
    pathname === '/' ||
    pathname === '/backoffice' ||
    pathname.startsWith('/backoffice/');

  if (isAllowed) return NextResponse.next();

  // Rewrite to a route that doesn't exist so Next renders not-found with a
  // real 404 status, while the address bar keeps the URL the visitor tried.
  const url = request.nextUrl.clone();
  url.pathname = '/_locked';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: '/:path*',
};
