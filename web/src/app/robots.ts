import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The admin area and internal APIs have no business in search results.
      disallow: ['/backoffice', '/backoffice/', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
