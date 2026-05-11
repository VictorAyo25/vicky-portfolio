'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Loader2, Calendar, ArrowLeft, Tag, Clock } from 'lucide-react';
import Link from 'next/link';

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
}

export default function SinglePostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [fullContent, setFullContent] = useState<string>('');
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
    return (
      <div className="min-h-screen bg-[#0F0E0D] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
      </div>
    );
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
      </div>
    </article>
  );
}
