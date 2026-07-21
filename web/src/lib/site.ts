/**
 * Canonical origin for absolute URLs (metadata, sitemap, robots).
 * Override with NEXT_PUBLIC_SITE_URL when a custom domain is attached.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://victoriaodueso.vercel.app'
).replace(/\/$/, '');

export const SITE_NAME = 'Victoria Odueso';
export const SITE_TAGLINE = 'SEO Writer & Content Strategist';
export const SITE_DESCRIPTION =
  'Portfolio of Victoria Odueso — SEO writer and content strategist creating high-quality, engaging narratives across SaaS, digital marketing, health, and lifestyle.';
