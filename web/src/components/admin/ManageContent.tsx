'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc, deleteDoc, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Trash2, Edit, RotateCcw, AlertOctagon, ChevronDown, Filter, Search, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Post {
  id: string;
  title: string;
  category: string;
  subCategory?: string;
  status: 'published' | 'draft';
  coverImage?: string;
  createdAt?: {
    seconds?: number;
    toMillis?: () => number;
  };
  updatedAt?: {
    seconds?: number;
    toMillis?: () => number;
  };
  deleted?: boolean;
}

export default function ManageContent({
    isTrash = false
}: {
    isTrash?: boolean
}) {
    const searchParams = useSearchParams();
    const activeCategoryFilter = searchParams.get('category');
    const activeSubCategoryFilter = searchParams.get('subCategory');
    const [sortMode, setSortMode] = useState<'posted_desc' | 'posted_asc' | 'edited_desc' | 'edited_asc'>('edited_desc');
    const [imageFilter, setImageFilter] = useState<'all' | 'no_image' | 'has_image'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const [trashConfirmId, setTrashConfirmId] = useState<string | null>(null);
    const [expandedCardIds, setExpandedCardIds] = useState<string[]>([]);
    const expansionStorageKey = useMemo(
        () => `admin:expandedCards:${isTrash ? 'trash' : 'posts'}:${activeCategoryFilter || 'all'}`,
        [isTrash, activeCategoryFilter]
    );

    const sortStorageKey = useMemo(
        () => `admin:sortMode:${isTrash ? 'trash' : 'posts'}:${activeCategoryFilter || 'all'}:${activeSubCategoryFilter || 'all'}`,
        [isTrash, activeCategoryFilter, activeSubCategoryFilter]
    );

    // Get unique categories from posts
    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        posts.forEach(p => { if (p.category) cats.add(p.category); });
        return Array.from(cats).sort();
    }, [posts]);

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'posts'));
            const fetched = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as Post))
                .filter((post) => Boolean(post.deleted) === isTrash)
                .filter((post) => {
                    if (!activeCategoryFilter || isTrash) return true;
                    const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
                    return normalize(post.category || '') === normalize(activeCategoryFilter);
                })
                .filter((post) => {
                    if (!activeSubCategoryFilter || isTrash) return true;
                    const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
                    return normalize(post.subCategory || '') === normalize(activeSubCategoryFilter);
                });
            setPosts(fetched);
        } catch (err) {
            console.error(err);
            showToast('Error loading post list. Please retry.', 'error');
        } finally {
            setLoading(false);
        }
    }, [activeCategoryFilter, activeSubCategoryFilter, isTrash, showToast]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    useEffect(() => {
        setExpandedCardIds((prev) => prev.filter((id) => posts.some((post) => post.id === id)));
    }, [posts]);

    useEffect(() => {
        const saved = window.localStorage.getItem(sortStorageKey);
        if (!saved) return;
        if (saved === 'posted_desc' || saved === 'posted_asc' || saved === 'edited_desc' || saved === 'edited_asc') {
            setSortMode(saved);
        }
    }, [sortStorageKey]);

    useEffect(() => {
        window.localStorage.setItem(sortStorageKey, sortMode);
    }, [sortMode, sortStorageKey]);

    // Apply category filter on client side
    const filteredPosts = useMemo(() => {
        if (categoryFilter === 'all') return posts;
        return posts.filter(p => p.category === categoryFilter);
    }, [posts, categoryFilter]);

    const sortedPosts = useMemo(() => {
        const getPostedMs = (post: Post) => (post.createdAt?.seconds ? post.createdAt.seconds * 1000 : 0);
        const getEditedMs = (post: Post) => {
            if (post.updatedAt?.seconds) return post.updatedAt.seconds * 1000;
            return getPostedMs(post);
        };

        return [...filteredPosts]
            .filter((post) => {
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    return (
                        post.title?.toLowerCase().includes(q) ||
                        post.category?.toLowerCase().includes(q) ||
                        post.subCategory?.toLowerCase().includes(q)
                    );
                }
                return true;
            })
            .filter((post) => {
                if (imageFilter === 'has_image') return !!post.coverImage;
                if (imageFilter === 'no_image') return !post.coverImage;
                return true;
            })
            .filter((post) => {
                if (statusFilter === 'all') return true;
                return post.status === statusFilter;
            })
            .sort((a, b) => {
                if (sortMode === 'posted_desc') return getPostedMs(b) - getPostedMs(a);
                if (sortMode === 'posted_asc') return getPostedMs(a) - getPostedMs(b);
                if (sortMode === 'edited_asc') return getEditedMs(a) - getEditedMs(b);
                return getEditedMs(b) - getEditedMs(a);
            });
    }, [filteredPosts, sortMode, imageFilter, statusFilter, searchQuery]);

    const handleResetFilters = () => {
        setSearchQuery('');
        setCategoryFilter('all');
        setImageFilter('all');
        setStatusFilter('all');
    };

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem(expansionStorageKey);
            if (!saved) {
                setExpandedCardIds([]);
                return;
            }
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                setExpandedCardIds(parsed.filter((value): value is string => typeof value === 'string'));
            } else {
                setExpandedCardIds([]);
            }
        } catch {
            setExpandedCardIds([]);
        }
    }, [expansionStorageKey]);

    useEffect(() => {
        try {
            window.localStorage.setItem(expansionStorageKey, JSON.stringify(expandedCardIds));
        } catch {
            // Ignore storage write failures
        }
    }, [expandedCardIds, expansionStorageKey]);

    const [deleteId, setDeleteId] = useState<string | null>(null);

    const toggleExpandedCard = (id: string) => {
        setExpandedCardIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const expandAllCards = () => {
        setExpandedCardIds(filteredPosts.map((post) => post.id));
    };

    const collapseAllCards = () => {
        setExpandedCardIds([]);
    };

    const moveToTrash = async (id: string) => {
        try {
            await updateDoc(doc(db, 'posts', id), {
                deleted: true,
                published: false,
                updatedAt: serverTimestamp(),
            });
            setPosts(prev => prev.filter(p => p.id !== id));
            showToast('Post moved to trash', 'success');
        } catch {
            showToast('Operation failed', 'error');
        }
    };

    const confirmMoveToTrash = async () => {
        if (!trashConfirmId) return;
        await moveToTrash(trashConfirmId);
        setTrashConfirmId(null);
    };

    const handlePermanentDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const confirmPermanentDelete = async () => {
        if (!deleteId) return;
        try {
            // Retrieve post metadata to check if it has chunked content
            const postSnap = await getDoc(doc(db, 'posts', deleteId));
            if (postSnap.exists()) {
                const postData = postSnap.data();
                if (postData.hasLargeContent) {
                    console.log(`Deleting content chunks for post ${deleteId}...`);
                    const chunksSnapshot = await getDocs(collection(db, 'posts', deleteId, 'content'));
                    if (!chunksSnapshot.empty) {
                        const batch = writeBatch(db);
                        chunksSnapshot.docs.forEach(d => batch.delete(d.ref));
                        await batch.commit();
                        console.log(`Deleted ${chunksSnapshot.size} chunks.`);
                    }
                }
            }
            await deleteDoc(doc(db, 'posts', deleteId));
            setPosts(prev => prev.filter(p => p.id !== deleteId));
            showToast('Post permanently deleted', 'success');
        } catch (err) {
            console.error('Delete Error:', err);
            showToast('Operation failed', 'error');
        } finally {
            setDeleteId(null);
        }
    };

    const restoreFromTrash = async (id: string) => {
        try {
            await updateDoc(doc(db, 'posts', id), {
                deleted: false,
                published: true,
                updatedAt: serverTimestamp(),
            });
            setPosts(prev => prev.filter(p => p.id !== id));
            showToast('Post restored successfully', 'success');
        } catch {
            showToast('Operation failed', 'error');
        }
    };

    const getLastEditedDateTime = (post: Post) => {
        const source = post.updatedAt?.seconds ? post.updatedAt : post.createdAt;
        if (!source?.seconds) return 'Not available';
        const dt = new Date(source.seconds * 1000);
        const date = dt.toLocaleDateString();
        const time = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${date} • ${time}`;
    };

    const renderActions = (post: Post, compact = false) => (
        <div className={`flex ${compact ? 'flex-wrap' : ''} justify-end gap-2`}>
            {isTrash ? (
                <>
                    <button
                        onClick={() => restoreFromTrash(post.id)}
                        className="px-3 py-3 text-green-400 hover:bg-green-400/10 active:scale-[0.97] rounded-lg transition-all min-h-11 min-w-11 inline-flex items-center justify-center gap-2"
                        title="Restore"
                    >
                        <RotateCcw size={18} />
                        <span className="text-xs font-semibold tracking-wide">Restore</span>
                    </button>
                    <button
                        onClick={() => handlePermanentDeleteClick(post.id)}
                        className="px-3 py-3 text-red-500 hover:bg-red-500/10 active:scale-[0.97] rounded-lg transition-all min-h-11 min-w-11 inline-flex items-center justify-center gap-2"
                        title="Delete Forever"
                    >
                        <AlertOctagon size={18} />
                        <span className="text-xs font-semibold tracking-wide">Delete</span>
                    </button>
                </>
            ) : (
                <>
                    <Link
                        href={`/admin/dashboard/posts/${post.id}`}
                        className="px-3 py-3 text-blue-400 hover:bg-blue-400/10 active:scale-[0.97] rounded-lg transition-all min-h-11 min-w-11 inline-flex items-center justify-center gap-2"
                        title="Edit Post"
                    >
                        <Edit size={18} />
                        <span className="text-xs font-semibold tracking-wide">Edit</span>
                    </Link>
                    <button
                        onClick={() => setTrashConfirmId(post.id)}
                        className="px-3 py-3 text-red-400 hover:bg-red-400/10 active:scale-[0.97] rounded-lg transition-all min-h-11 min-w-11 inline-flex items-center justify-center gap-2"
                        title="Move to Trash"
                    >
                        <Trash2 size={18} />
                        <span className="text-xs font-semibold tracking-wide">Trash</span>
                    </button>
                </>
            )}
        </div>
    );

    return (
        <div className="p-6 lg:p-10 max-w-6xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <header className="mb-6 rounded-2xl border border-[#2F2A26] bg-[#171311] px-6 py-6 lg:px-8 lg:py-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[#C5A059] mb-2">
                            {isTrash ? 'Archive' : 'Content'}
                        </p>
                        <h1 className="text-2xl lg:text-3xl font-serif text-[#F3F4F6] mb-2">
                            {isTrash ? 'Trash Bin' : 'Manage Content'}
                        </h1>
                        <p className="text-gray-400 text-sm">
                            {isTrash ? 'Recover or permanently remove items.' : 'Edit, remove, or organize your posts.'}
                        </p>
                        {!isTrash && activeCategoryFilter && (
                            <div className="mt-3 flex items-center gap-3">
                                <span className="inline-flex items-center rounded-full border border-[#C5A059]/40 bg-[#191614] px-3 py-1 text-xs tracking-wide text-[#C5A059]">
                                    Section: {activeCategoryFilter}
                                </span>
                                {activeSubCategoryFilter && (
                                    <span className="inline-flex items-center rounded-full border border-[#C5A059]/40 bg-[#191614] px-3 py-1 text-xs tracking-wide text-[#C5A059]">
                                        Sub-section: {activeSubCategoryFilter}
                                    </span>
                                )}
                                <Link
                                    href="/admin/dashboard/posts"
                                    className="text-xs text-gray-400 hover:text-[#F3F4F6] underline underline-offset-4"
                                >
                                    Clear filter
                                </Link>
                            </div>
                        )}
                    </div>
                    {!isTrash && (
                        <Link
                            href="/admin/dashboard/posts/new"
                            className="bg-[#C5A059] text-black px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-[#d4b06a] active:scale-[0.98] transition-all min-h-11 inline-flex items-center justify-center self-start lg:self-auto"
                        >
                            Create New
                        </Link>
                    )}
                </header>

                {/* Search & Filters Toolbar */}
                <div className="mb-6 rounded-2xl border border-[#2F2A26] bg-[#141210] p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md w-full">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search posts by title, category..."
                            className="bg-[#0F0E0D] border border-[#2F2A26] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] transition-all w-full"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="flex items-center flex-wrap gap-2.5">
                        {/* Category Filter */}
                        {!isTrash && availableCategories.length > 0 && (
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-3 py-2.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#C5A059] hover:border-gray-700 transition-colors"
                                aria-label="Filter by category"
                            >
                                <option value="all">All Categories</option>
                                {availableCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        )}

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
                            className="bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-3 py-2.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#C5A059] hover:border-gray-700 transition-colors"
                            aria-label="Filter by status"
                        >
                            <option value="all">Status: All</option>
                            <option value="published">Published Only</option>
                            <option value="draft">Drafts Only</option>
                        </select>

                        {/* Image Filter */}
                        <select
                            value={imageFilter}
                            onChange={(e) => setImageFilter(e.target.value as 'all' | 'no_image' | 'has_image')}
                            className="bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-3 py-2.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#C5A059] hover:border-gray-700 transition-colors"
                            aria-label="Filter by image"
                        >
                            <option value="all">Image: All</option>
                            <option value="no_image">Needs Cover Image</option>
                            <option value="has_image">Has Cover Image</option>
                        </select>

                        {/* Sort Mode */}
                        <select
                            value={sortMode}
                            onChange={(e) => setSortMode(e.target.value as 'posted_desc' | 'posted_asc' | 'edited_desc' | 'edited_asc')}
                            className="bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-3 py-2.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#C5A059] hover:border-gray-700 transition-colors"
                            aria-label="Sort posts"
                        >
                            <option value="edited_desc">Edited: Newest first</option>
                            <option value="edited_asc">Edited: Oldest first</option>
                            <option value="posted_desc">Posted: Newest first</option>
                            <option value="posted_asc">Posted: Oldest first</option>
                        </select>

                        {/* Reset Filters */}
                        {(searchQuery !== '' || categoryFilter !== 'all' || imageFilter !== 'all' || statusFilter !== 'all') && (
                            <button
                                onClick={handleResetFilters}
                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all border border-red-500/20 cursor-pointer"
                            >
                                <X size={14} />
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C5A059]" /></div>
                ) : (
                    <>
                    <div className="lg:hidden space-y-3">
                        {sortedPosts.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 italic rounded-2xl border border-[#2F2A26] bg-[#191614]">
                                No posts found here.
                            </div>
                        ) : (
                            <>
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={expandAllCards}
                                    className="px-3 py-2 rounded-lg text-xs font-semibold tracking-wide border border-[#2F2A26] text-gray-300 hover:text-white hover:border-[#C5A059] transition-colors"
                                >
                                    Expand all
                                </button>
                                <button
                                    type="button"
                                    onClick={collapseAllCards}
                                    className="px-3 py-2 rounded-lg text-xs font-semibold tracking-wide border border-[#2F2A26] text-gray-300 hover:text-white hover:border-[#C5A059] transition-colors"
                                >
                                    Collapse all
                                </button>
                            </div>

                            {sortedPosts.map((post) => (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="rounded-2xl border border-[#2F2A26] bg-[#191614]"
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleExpandedCard(post.id)}
                                        className="w-full p-4 flex items-start justify-between gap-3 text-left"
                                        aria-expanded={expandedCardIds.includes(post.id)}
                                    >
                                        <div className="min-w-0">
                                            <p className="font-serif text-white text-lg leading-snug line-clamp-2">{post.title}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[10px] text-gray-500 bg-[#0F0E0D] px-2 py-0.5 rounded-full border border-[#2F2A26]">
                                                    {post.category}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronDown
                                            size={18}
                                            className={`mt-1 shrink-0 text-gray-400 transition-transform duration-200 ${expandedCardIds.includes(post.id) ? 'rotate-180 text-[#C5A059]' : ''}`}
                                        />
                                    </button>

                                    <AnimatePresence initial={false}>
                                        {expandedCardIds.includes(post.id) && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-4 pb-4 border-t border-[#2F2A26]">
                                                    <div className="flex flex-wrap items-center gap-2 mt-3 mb-4 text-xs text-gray-400">
                                                        <span className="bg-[#0F0E0D] px-3 py-1 rounded-full border border-[#2F2A26] text-gray-300">
                                                            {post.category}
                                                        </span>
                                                        <span>Last edited: {getLastEditedDateTime(post)}</span>
                                                    </div>
                                                    {renderActions(post, true)}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                            </>
                        )}
                    </div>

                    <div className="hidden lg:block bg-[#191614] border border-[#2F2A26] rounded-2xl overflow-auto max-h-[72vh]">
                        <table className="w-full text-left border-collapse table-fixed min-w-[920px]">
                            <thead>
                                <tr className="sticky top-0 z-10 border-b border-[#2F2A26] text-xs uppercase tracking-widest text-[#C5A059] bg-[#151210]/95 backdrop-blur supports-[backdrop-filter]:bg-[#151210]/90">
                                    <th className="px-6 py-4 font-bold w-[46%]">Title</th>
                                    <th className="px-6 py-4 font-bold w-[14%]">Category</th>
                                    <th className="px-6 py-4 font-bold w-[12%]">Image</th>
                                    <th className="px-6 py-4 font-bold w-[14%]">Last Edited</th>
                                    <th className="px-6 py-4 font-bold text-right w-[14%]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-gray-300">
                                <AnimatePresence>
                                    {sortedPosts.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                                                No posts found here.
                                            </td>
                                        </tr>
                                    )}
                                    {sortedPosts.map((post) => (
                                        <motion.tr
                                            key={post.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="border-b border-[#2F2A26] last:border-0 hover:bg-[#2F2A26]/30 transition-colors align-top"
                                        >
                                            <td className="px-6 py-4">
                                                <p className="font-serif text-white text-[1.05rem] leading-snug truncate" title={post.title}>
                                                    {post.title}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="bg-[#0F0E0D] px-3 py-1 rounded-full text-xs border border-[#2F2A26]">
                                                    {post.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {post.coverImage ? (
                                                    <span className="text-green-400 text-xs">✓ Has image</span>
                                                ) : (
                                                    <span className="text-gray-600 text-xs">No image</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                                {getLastEditedDateTime(post)}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                {renderActions(post)}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                    </>
                )}
            </motion.div>

            <AnimatePresence>
                {trashConfirmId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setTrashConfirmId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-[#191614] border border-[#C5A059]/30 p-6 rounded-2xl max-w-md w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-serif text-white mb-2 flex items-center gap-2">
                                <Trash2 className="text-red-400" />
                                Move to Trash
                            </h3>
                            <p className="text-gray-400 mb-6">
                                Are you sure you want to move this post to trash?
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setTrashConfirmId(null)}
                                    className="px-4 py-3 text-gray-300 hover:text-white active:scale-[0.98] transition-all rounded-lg min-h-11"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmMoveToTrash}
                                    className="bg-[#C5A059] hover:bg-[#d4b06a] text-[#0F0E0D] px-4 py-3 rounded-lg font-bold active:scale-[0.98] transition-all min-h-11"
                                >
                                    Yes, Move to Trash
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {deleteId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setDeleteId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-[#191614] border border-red-500/30 p-6 rounded-2xl max-w-md w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-serif text-white mb-2 flex items-center gap-2">
                                <AlertOctagon className="text-red-500" />
                                Permanent Deletion
                            </h3>
                            <p className="text-gray-400 mb-6">
                                Are you sure you want to delete this post forever? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="px-4 py-3 text-gray-300 hover:text-white active:scale-[0.98] transition-all rounded-lg min-h-11"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmPermanentDelete}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-bold active:scale-[0.98] transition-all min-h-11"
                                >
                                    Delete Forever
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
