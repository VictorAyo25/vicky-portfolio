import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebase-admin';
import { INITIAL_TAXONOMY, categorySlug, formatTaxonomyLabel, type Taxonomy } from '@/lib/taxonomy';
import { SITE_NAME } from '@/lib/site';

/** `reliable: false` means the lookup failed, so callers must not 404 on a miss. */
async function getTaxonomy(): Promise<{ taxonomy: Taxonomy; reliable: boolean }> {
  try {
    const snap = await adminDb.collection('taxonomy').doc('structure').get();
    return snap.exists
      ? { taxonomy: snap.data() as Taxonomy, reliable: true }
      : { taxonomy: INITIAL_TAXONOMY, reliable: false };
  } catch {
    return { taxonomy: INITIAL_TAXONOMY, reliable: false };
  }
}

async function getAliases(): Promise<{ categories?: Record<string, string> }> {
  try {
    const snap = await adminDb.collection('taxonomy').doc('aliases').get();
    return snap.exists ? (snap.data() as { categories?: Record<string, string> }) : {};
  } catch {
    return {};
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { taxonomy } = await getTaxonomy();

  const match = Object.keys(taxonomy).find((key) => categorySlug(key) === slug);
  const label = match ? formatTaxonomyLabel(match) : slug.replace(/-/g, ' ');
  const description = `${label} — writing samples and published work by Victoria Odueso.`;

  return {
    // Object form so sub-category pages beneath this segment keep the suffix.
    title: { default: label, template: `%s | ${SITE_NAME}` },
    description,
    alternates: { canonical: `/category/${slug}` },
    openGraph: {
      title: `${label} | Victoria Odueso`,
      description,
      url: `/category/${slug}`,
    },
  };
}

export default async function CategorySlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ taxonomy, reliable }, aliases] = await Promise.all([getTaxonomy(), getAliases()]);

  const direct = Object.keys(taxonomy).some((key) => categorySlug(key) === slug);
  // A renamed category keeps serving its old slug via aliases, so check those
  // before 404ing or renames would break every previously shared link.
  const aliased = aliases.categories?.[slug];
  const exists = direct || (!!aliased && Object.prototype.hasOwnProperty.call(taxonomy, aliased));

  // Only 404 when the taxonomy was actually read, so an outage can't take
  // down live categories.
  if (reliable && !exists) notFound();

  return children;
}
