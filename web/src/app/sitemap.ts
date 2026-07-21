import type { MetadataRoute } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { SITE_URL } from '@/lib/site';
import { INITIAL_TAXONOMY, categorySlug, subCategorySlug, type Taxonomy } from '@/lib/taxonomy';

// Rebuilt hourly so posts published between deploys still get indexed.
export const revalidate = 3600;

interface PostDoc {
  slug?: string;
  published?: boolean;
  deleted?: boolean;
  updatedAt?: { seconds?: number };
  createdAt?: { seconds?: number };
}

const toDate = (post: PostDoc): Date => {
  const seconds = post.updatedAt?.seconds ?? post.createdAt?.seconds;
  return seconds ? new Date(seconds * 1000) : new Date();
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/category`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/multimedia`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.6 },
    { url: `${SITE_URL}/cv`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  try {
    const [postsSnap, taxonomySnap] = await Promise.all([
      adminDb.collection('posts').where('published', '==', true).get(),
      adminDb.collection('taxonomy').doc('structure').get(),
    ]);

    const postRoutes: MetadataRoute.Sitemap = (postsSnap.docs ?? [])
      .map((d: { data: () => PostDoc }) => d.data())
      .filter((post: PostDoc) => post.slug && !post.deleted)
      .map((post: PostDoc) => ({
        url: `${SITE_URL}/${post.slug}`,
        lastModified: toDate(post),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      }));

    const taxonomy: Taxonomy = taxonomySnap.exists
      ? (taxonomySnap.data() as Taxonomy)
      : INITIAL_TAXONOMY;

    const categoryRoutes: MetadataRoute.Sitemap = Object.entries(taxonomy).flatMap(
      ([category, subs]) => [
        {
          url: `${SITE_URL}/category/${categorySlug(category)}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        },
        ...(subs ?? []).map((sub) => ({
          url: `${SITE_URL}/category/${categorySlug(category)}/${subCategorySlug(sub)}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })),
      ]
    );

    return [...staticRoutes, ...categoryRoutes, ...postRoutes];
  } catch (error) {
    // Never fail the build/route over sitemap data — serve what we know.
    console.error('sitemap: falling back to static routes only:', error);
    return staticRoutes;
  }
}
