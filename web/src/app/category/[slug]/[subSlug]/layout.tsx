import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebase-admin';
import {
  INITIAL_TAXONOMY,
  categorySlug,
  subCategorySlug,
  formatTaxonomyLabel,
  type Taxonomy,
} from '@/lib/taxonomy';

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

interface Aliases {
  categories?: Record<string, string>;
  subCategories?: Record<string, string>;
}

async function getAliases(): Promise<Aliases> {
  try {
    const snap = await adminDb.collection('taxonomy').doc('aliases').get();
    return snap.exists ? (snap.data() as Aliases) : {};
  } catch {
    return {};
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; subSlug: string }>;
}): Promise<Metadata> {
  const { slug, subSlug } = await params;
  const { taxonomy } = await getTaxonomy();

  const category = Object.keys(taxonomy).find((key) => categorySlug(key) === slug);
  const sub = (category ? taxonomy[category] ?? [] : []).find(
    (name) => subCategorySlug(name) === subSlug
  );

  const subLabel = sub ? formatTaxonomyLabel(sub) : subSlug.replace(/-/g, ' ');
  const categoryLabel = category ? formatTaxonomyLabel(category) : slug.replace(/-/g, ' ');
  const description = `${subLabel} writing samples in ${categoryLabel} by Victoria Odueso.`;

  return {
    title: subLabel,
    description,
    alternates: { canonical: `/category/${slug}/${subSlug}` },
    openGraph: {
      title: `${subLabel} | Victoria Odueso`,
      description,
      url: `/category/${slug}/${subSlug}`,
    },
  };
}

export default async function SubCategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; subSlug: string }>;
}) {
  const { slug, subSlug } = await params;
  const [{ taxonomy, reliable }, aliases] = await Promise.all([getTaxonomy(), getAliases()]);

  const category =
    Object.keys(taxonomy).find((key) => categorySlug(key) === slug) ??
    aliases.categories?.[slug];

  const subs = category ? taxonomy[category] ?? [] : [];
  const aliasedSub = aliases.subCategories?.[subSlug];
  // Renamed categories and sub-categories keep serving their old slugs via
  // aliases, so both are checked before 404ing.
  const exists =
    subs.some((name) => subCategorySlug(name) === subSlug) ||
    (!!aliasedSub && subs.includes(aliasedSub));

  if (reliable && !exists) notFound();

  return children;
}
