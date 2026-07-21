'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { fetchTaxonomy, resolveCategoryBySlug } from '@/lib/taxonomy';
import PostCard from '@/components/PostCard';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CategoryPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  subCategory?: string;
  coverImage?: string;
  content?: string;
  createdAt?: {
    seconds?: number;
    toMillis?: () => number;
  };
}

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [posts, setPosts] = useState<CategoryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string>('');
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    async function fetchPosts() {
      try {
        // 1. Resolve Category Name from Slug (falling back to rename aliases,
        //    so links shared before a rename still land on the right page)
        const taxonomy = await fetchTaxonomy();
        const foundKey = await resolveCategoryBySlug(taxonomy, slug);

        if (!foundKey) {
          // Previously rendered an empty page titled after the raw slug,
          // which looked like a real (but empty) category.
          setMissing(true);
          setLoading(false);
          return;
        }

        setCategoryName(foundKey);

        // 2. Query Firestore
        const q = query(
          collection(db, 'posts'),
          where('category', '==', foundKey),
          where('published', '==', true)
        );

        const querySnapshot = await getDocs(q);
        let fetchedPosts: CategoryPost[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<CategoryPost, 'id'>)
        }));
        
        // Client-side sort: posts with images first, then by date
        fetchedPosts = fetchedPosts
          .sort((a, b) => {
            const hasImageA = !!a.coverImage;
            const hasImageB = !!b.coverImage;
            if (hasImageA && !hasImageB) return -1;
            if (!hasImageA && hasImageB) return 1;
            const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return dateB - dateA;
          });
        
        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Error fetching posts or taxonomy:", error);
      } finally {
        setLoading(false);
      }
    }

    if (slug) fetchPosts();
  }, [slug]);

  if (missing) notFound();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#110F0E] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#110F0E] px-6 py-24 pb-32">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16 border-b border-[#2E2925] pb-10"
        >
            <p className="text-xs uppercase tracking-widest text-[#C5A059] mb-2 font-bold">Category</p>
            <h1 className="text-5xl md:text-7xl font-serif text-[#F3F4F6] capitalize">{categoryName}</h1>
        </motion.div>

        {/* Content Grid */}
        <AnimatePresence>
            {posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-fr">
                    {posts.map((post, i) => (
                        <PostCard key={post.id} post={post} index={i} />
                    ))}
                </div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="text-center py-24 border border-dashed border-[#2E2925] rounded-2xl"
                >
                    <p className="text-gray-500 font-serif text-xl italic">No posts found in this category yet.</p>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </main>
  );
}
