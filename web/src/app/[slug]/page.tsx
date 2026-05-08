'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Loader2, Calendar, ArrowLeft, Tag } from 'lucide-react';
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
  createdAt?: {
    seconds?: number;
    toMillis?: () => number;
  };
  deleted?: boolean;
  published?: boolean;
  hasLargeContent?: boolean;
  contentChunks?: number;
  contentPreview?: string;
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
        const q = query(
          collection(db, 'posts'),
          where('slug', '==', slug),
          limit(1)
        );
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
            console.log(`Fetching ${postData.contentChunks} content chunks...`);
            const chunksQuery = query(
              collection(db, 'posts', docSnapshot.id, 'content'),
              orderBy('index', 'asc')
            );
            const chunksSnapshot = await getDocs(chunksQuery);
            let content = '';
            chunksSnapshot.docs.forEach(chunkDoc => {
              content += chunkDoc.data().content;
            });
            setFullContent(content);
            console.log(`Loaded ${content.length} bytes of content`);
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
      <div className="min-h-screen bg-[#110F0E] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
      </div>
    );
  }

  if (!post) return null;

  return (
    <article className="min-h-screen bg-[#110F0E] text-[#F3F4F6] pt-32 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        
        {/* Back Link */}
        <Link 
            href={`/category/${post.category.toLowerCase().replace(/\s+/g, '-')}`} 
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#C5A059] mb-12 transition-colors text-xs uppercase tracking-widest font-bold"
        >
            <ArrowLeft size={14} />
            Back to {post.category}
        </Link>
        
        {/* Header */}
        <motion.header 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 border-b border-[#2E2925] pb-12"
        >
            <div className="flex flex-wrap gap-4 items-center mb-6 text-xs font-sans uppercase tracking-widest text-[#C5A059]">
                <span className="flex items-center gap-2">
                    <Tag size={14} />
                    {post.category}
                </span>
                {post.subCategory && (
                    <>
                        <span className="w-1 h-1 bg-gray-600 rounded-full" />
                        <span>{post.subCategory}</span>
                    </>
                )}
                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                <span className="flex items-center gap-2 text-gray-500">
                    <Calendar size={14} />
                    {post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}
                </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif leading-tight text-[#F3F4F6] mb-6">
                {post.title}
            </h1>

            {/* Description */}
            {post.description && (
                <p className="text-lg text-gray-400 font-serif italic leading-relaxed mb-6">
                    {post.description}
                </p>
            )}

            {/* Keywords */}
            {post.keywords && post.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {post.keywords.map((kw, i) => (
                        <span
                            key={i}
                            className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-[#191614] border border-[#2F2A26] px-3 py-1 rounded-full"
                        >
                            <Tag size={10} className="text-[#C5A059]" />
                            {kw}
                        </span>
                    ))}
                </div>
            )}
        </motion.header>

        {/* Media */}
        {post.mediaUrl && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-12 rounded-2xl overflow-hidden border border-[#2E2925]"
            >
                {post.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
          // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.mediaUrl} alt={post.title} className="w-full h-auto object-cover" />
                ) : (
                    <div className="p-8 bg-[#1C1917] text-center">
                        <a href={post.mediaUrl} target="_blank" rel="noreferrer" className="text-[#C5A059] underline hover:text-white transition-colors">
                            View Attached Media
                        </a>
                    </div>
                )}
            </motion.div>
        )}

        {/* Content */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="post-content"
            dangerouslySetInnerHTML={{ __html: fullContent }}
        />

      </div>
    </article>
  );
}
