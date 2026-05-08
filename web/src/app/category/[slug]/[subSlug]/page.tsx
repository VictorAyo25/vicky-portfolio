'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { fetchTaxonomy } from '@/lib/taxonomy';
import PostCard from '@/components/PostCard';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
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

export default function SubCategoryPage() {
  const params = useParams();
  const categorySlug = params.slug as string;
  const subCategorySlug = params.subSlug as string;

  const [posts, setPosts] = useState<CategoryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string>('');
  const [subCategoryName, setSubCategoryName] = useState<string>('');

  useEffect(() => {
    async function fetchPosts() {
      if (!categorySlug || !subCategorySlug) return;

      try {
        const taxonomy = await fetchTaxonomy();
        
        // 1. Resolve Category
        const taxonomyKeys = Object.keys(taxonomy);
        const categoryKey = taxonomyKeys.find(key => 
          key.toLowerCase().replace(/\s+/g, '-') === categorySlug
        );

        if (!categoryKey) {
          setLoading(false);
          return; 
        }
        setCategoryName(categoryKey);

        // 2. Resolve SubCategory from the matched Category's array
        const subCategories = taxonomy[categoryKey] || [];
        const subCategoryKey = subCategories.find(sub => 
          sub.toLowerCase().replace(/[^a-z0-9]+/g, '-') === subCategorySlug
        );

        if (!subCategoryKey) {
          setLoading(false);
          return;
        }
        setSubCategoryName(subCategoryKey);

        // 3. Query Firestore
        const q = query(
          collection(db, 'posts'),
          where('category', '==', categoryKey),
          where('subCategory', '==', subCategoryKey),
          where('published', '==', true)
        );

        const querySnapshot = await getDocs(q);
        let fetchedPosts: CategoryPost[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<CategoryPost, 'id'>)
        }));
        
        // Client-side sort and limit to bypass Firestore composite index requirements
        fetchedPosts = fetchedPosts
          .sort((a, b) => {
            const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return dateB - dateA;
          })
          .slice(0, 20);

        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Error fetching subcategory posts:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [categorySlug, subCategorySlug]);

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
        
        {/* Back Button */}
        <Link href={`/category/${categorySlug}`} className="inline-flex items-center gap-2 text-gray-500 hover:text-[#C5A059] mb-8 transition-colors text-sm uppercase tracking-widest font-bold">
            <ArrowLeft size={16} />
            Back to {categoryName}
        </Link>
        
        {/* Header */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16 border-b border-[#2E2925] pb-10"
        >
            <p className="text-xs uppercase tracking-widest text-[#C5A059] mb-2 font-bold">{categoryName}</p>
            <h1 className="text-4xl md:text-6xl font-serif text-[#F3F4F6]">{subCategoryName}</h1>
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
                    <p className="text-gray-500 font-serif text-xl italic">No posts found in this subcategory yet.</p>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </main>
  );
}
