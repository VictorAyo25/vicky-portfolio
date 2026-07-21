import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebase-admin';
import { SITE_URL, SITE_NAME } from '@/lib/site';

interface PostDoc {
  title?: string;
  description?: string;
  keywords?: string[];
  category?: string;
  coverImage?: string;
  published?: boolean;
  deleted?: boolean;
  content?: string;
  createdAt?: { seconds?: number };
  updatedAt?: { seconds?: number };
}

/** Strip HTML and clamp, so a post without an explicit description still gets one. */
function excerpt(html: string | undefined, max = 160): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * "missing" and "error" are kept distinct on purpose: a lookup failure must
 * never 404 a real post, so callers fail open and let the client render.
 */
type PostLookup =
  | { status: 'ok'; post: PostDoc }
  | { status: 'missing' }
  | { status: 'error' };

async function getPost(slug: string): Promise<PostLookup> {
  try {
    const snap = await adminDb.collection('posts').where('slug', '==', slug).limit(1).get();
    if (!snap.docs?.length) return { status: 'missing' };
    const post = snap.docs[0].data() as PostDoc;
    if (post.deleted || post.published === false) return { status: 'missing' };
    return { status: 'ok', post };
  } catch (error) {
    console.error('post lookup failed, falling back to client render:', error);
    return { status: 'error' };
  }
}

const iso = (seconds?: number) => (seconds ? new Date(seconds * 1000).toISOString() : undefined);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lookup = await getPost(slug);

  if (lookup.status !== 'ok' || !lookup.post.title) {
    return { title: 'Post Not Found', robots: { index: false, follow: false } };
  }

  const post = lookup.post;

  const description = post.description || excerpt(post.content) || undefined;
  const images = post.coverImage ? [{ url: post.coverImage }] : undefined;

  return {
    title: post.title,
    description,
    keywords: post.keywords?.length ? post.keywords : undefined,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title: post.title,
      description,
      url: `/${slug}`,
      type: 'article',
      images,
      publishedTime: iso(post.createdAt?.seconds),
      modifiedTime: iso(post.updatedAt?.seconds),
      authors: [SITE_NAME],
      section: post.category,
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title: post.title,
      description,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function PostLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lookup = await getPost(slug);

  // Answer with a real 404 status rather than a soft 404, so search engines
  // don't index pages that don't exist. Only on a confirmed miss — a lookup
  // error falls through and lets the client render.
  if (lookup.status === 'missing') notFound();

  const post = lookup.status === 'ok' ? lookup.post : null;

  // Structured data helps search engines treat these as articles rather than
  // loose pages. Rendered server-side so crawlers see it without running JS.
  const jsonLd = post?.title
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.description || excerpt(post.content),
        image: post.coverImage ? [post.coverImage] : undefined,
        datePublished: iso(post.createdAt?.seconds),
        dateModified: iso(post.updatedAt?.seconds) ?? iso(post.createdAt?.seconds),
        articleSection: post.category,
        author: { '@type': 'Person', name: SITE_NAME, url: SITE_URL },
        publisher: { '@type': 'Person', name: SITE_NAME, url: SITE_URL },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/${slug}` },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
