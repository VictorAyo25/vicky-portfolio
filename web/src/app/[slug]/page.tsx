'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Calendar, ArrowLeft, Tag, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { SinglePostSkeleton } from '@/components/Skeleton';

interface Post {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
  content: string;
  category: string;
  subCategory?: string;
  mediaType: 'url' | 'upload' | 'library';
  mediaUrl?: string;
  coverImage?: string;
  createdAt?: { seconds?: number; toMillis?: () => number };
  deleted?: boolean;
  published?: boolean;
  hasLargeContent?: boolean;
  contentChunks?: number;
  slug?: string;
}

export default function SinglePostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [fullContent, setFullContent] = useState<string>('');
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      try {
        const q = query(collection(db, 'posts'), where('slug', '==', slug), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docSnapshot = querySnapshot.docs[0];
          const data = docSnapshot.data() as Omit<Post, 'id'>;

          if (data.deleted || data.published === false) {
            router.push('/404');
            return;
          }

          const postData = { id: docSnapshot.id, ...data } as Post;
          setPost(postData);

          if (postData.hasLargeContent) {
            const chunksQuery = query(collection(db, 'posts', docSnapshot.id, 'content'), orderBy('index', 'asc'));
            const chunksSnapshot = await getDocs(chunksQuery);
            let content = '';
            chunksSnapshot.docs.forEach(chunkDoc => { content += chunkDoc.data().content; });
            setFullContent(content);
          } else {
            setFullContent(postData.content || '');
          }

          // Fetch related posts from same category
          const relatedQuery = query(
            collection(db, 'posts'),
            where('category', '==', postData.category),
            where('deleted', '==', false),
            orderBy('createdAt', 'desc'),
            limit(4)
          );
          const relatedSnapshot = await getDocs(relatedQuery);
          const related = relatedSnapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as Post))
            .filter(p => p.id !== postData.id)
            .slice(0, 3);
          setRelatedPosts(related);
        } else {
          router.push('/404');
        }
      } catch (err) {
        console.error("Failed to fetch post", err);
      } finally {
        setLoading(false);
      }
    }

    if (slug) fetchPost();
  }, [slug, router]);

  if (loading) {
    return <SinglePostSkeleton />;
  }

  if (!post) return null;

  const dateStr = post.createdAt?.seconds
    ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recently';

  const readTime = fullContent ? Math.max(1, Math.ceil(fullContent.replace(/<[^>]+>/g, '').split(/\s+/).length / 200)) : 1;

  return (
    <article className="min-h-screen bg-[#0F0E0D] text-[#F3F4F6]">
      {/* Cover Image */}
      {post.coverImage && (
        <div className="relative h-[40vh] md:h-[50vh] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${post.coverImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F0E0D] via-[#0F0E0D]/40 to-transparent" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 md:px-6 -mt-20 md:-mt-32 relative z-10">

        {/* Back Link */}
        <Link
          href={`/category/${post.category.toLowerCase().replace(/\s+/g, '-')}`}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-[#C5A059] mb-6 md:mb-8 transition-colors text-[11px] uppercase tracking-[0.15em] font-semibold font-sans"
        >
          <ArrowLeft size={14} />
          Back to {post.category}
        </Link>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 md:mb-12"
        >
          {/* Category */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-5">
            <span className="inline-flex items-center gap-1.5 bg-[#C5A059]/10 border border-[#C5A059]/20 px-3 py-1 rounded-full text-[10px] md:text-[11px] font-sans uppercase tracking-[0.15em] text-[#C5A059] font-semibold">
              <Tag size={11} />
              {post.category}
            </span>
            {post.subCategory && (
              <span className="text-[10px] md:text-[11px] font-sans uppercase tracking-[0.15em] text-gray-500">
                {post.subCategory}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-serif leading-[1.1] text-[#F3F4F6] mb-4 md:mb-5 tracking-tight">
            {post.title}
          </h1>

          {/* Description */}
          {post.description && (
            <p className="text-base md:text-lg text-gray-400 font-serif italic leading-relaxed mb-5 md:mb-6">
              {post.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-[11px] text-gray-500 font-sans">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-[#C5A059]/60" />
              {dateStr}
            </span>
            <span className="w-1 h-1 bg-[#2F2A26] rounded-full" />
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="text-[#C5A059]/60" />
              {readTime} min read
            </span>
          </div>

          {/* Keywords */}
          {post.keywords && post.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5 md:mt-6">
              {post.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-[#141210] border border-[#2F2A26]/60 px-2.5 py-1 rounded-full"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </motion.header>

        {/* Media */}
        {post.mediaUrl && !post.coverImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8 md:mb-10 rounded-2xl overflow-hidden border border-[#2F2A26]/60"
          >
            {post.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.mediaUrl} alt={post.title} className="w-full h-auto object-cover" />
            ) : (
              <div className="p-6 md:p-8 bg-[#141210] text-center">
                <a href={post.mediaUrl} target="_blank" rel="noreferrer" className="text-[#C5A059] underline hover:text-white transition-colors text-sm">
                  View Attached Media →
                </a>
              </div>
            )}
          </motion.div>
        )}

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="post-content pb-16 md:pb-24"
          dangerouslySetInnerHTML={{ __html: fullContent }}
        />

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="border-t border-[#2F2A26]/60 pt-10 md:pt-14 pb-16 md:pb-24"
          >
            <h2 className="text-lg md:text-xl font-serif text-[#F3F4F6] mb-6 md:mb-8">
              More in {post.category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/${rp.slug}`}
                  className="group flex flex-col bg-[#141210] border border-[#2F2A26]/60 rounded-xl overflow-hidden hover:border-[#C5A059]/40 transition-all duration-300"
                >
                  {rp.coverImage && (
                    <div className="aspect-[16/10] overflow-hidden">
                      <div
                        className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url(${rp.coverImage})` }}
                      />
                    </div>
                  )}
                  <div className="p-4 md:p-5 flex flex-col flex-1">
                    <span className="text-[9px] uppercase tracking-[0.15em] text-[#C5A059] font-sans mb-2">
                      {rp.subCategory || rp.category}
                    </span>
                    <h3 className="text-sm md:text-base font-serif text-[#F3F4F6] leading-tight mb-3 group-hover:text-[#C5A059] transition-colors line-clamp-2">
                      {rp.title}
                    </h3>
                    <div className="mt-auto flex items-center gap-1.5 text-[10px] text-gray-500 font-sans group-hover:text-[#C5A059] transition-colors">
                      Read more <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </article>
  );
}
