'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  fetchTaxonomy,
  addCategory,
  addSubcategory,
  renameCategory,
  renameSubcategory,
  deleteCategory,
  deleteSubcategory,
  categorySlug,
  subCategorySlug,
  orderedCategories,
  type Taxonomy,
} from '@/lib/taxonomy';
import { useToast } from '@/context/ToastContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  FolderTree,
  ExternalLink,
} from 'lucide-react';

type PendingDelete =
  | { kind: 'category'; category: string }
  | { kind: 'sub'; category: string; sub: string };

export default function CategoriesManagerPage() {
  const { showToast } = useToast();

  const [taxonomy, setTaxonomy] = useState<Taxonomy>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  // Includes trashed posts — deletion is blocked by those too, so the warning
  // must count them or it contradicts the guard in deleteCategory().
  const [totalCounts, setTotalCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Rename state — only one edit is open at a time.
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingSub, setEditingSub] = useState<{ category: string; sub: string } | null>(null);
  const [draftName, setDraftName] = useState('');

  // Creation state
  const [newCategory, setNewCategory] = useState('');
  const [newSubFor, setNewSubFor] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, snapshot] = await Promise.all([
        fetchTaxonomy(),
        getDocs(collection(db, 'posts')),
      ]);

      // Count posts per category and per category/sub pair in one pass, keeping
      // live and total (incl. trashed) tallies separate.
      const tally: Record<string, number> = {};
      const totals: Record<string, number> = {};
      snapshot.docs.forEach((d) => {
        const post = d.data() as { category?: string; subCategory?: string; deleted?: boolean };
        if (!post.category) return;

        const subKey = post.subCategory ? `${post.category}__${post.subCategory}` : null;

        totals[post.category] = (totals[post.category] ?? 0) + 1;
        if (subKey) totals[subKey] = (totals[subKey] ?? 0) + 1;

        if (post.deleted) return;
        tally[post.category] = (tally[post.category] ?? 0) + 1;
        if (subKey) tally[subKey] = (tally[subKey] ?? 0) + 1;
      });

      setTaxonomy(data);
      setCounts(tally);
      setTotalCounts(totals);
    } catch (err) {
      console.error(err);
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(() => orderedCategories(taxonomy), [taxonomy]);

  const resetEditing = () => {
    setEditingCategory(null);
    setEditingSub(null);
    setDraftName('');
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      showToast('That category already exists', 'error');
      return;
    }

    setBusy(true);
    try {
      await addCategory(name);
      setNewCategory('');
      await load();
      showToast(`Created "${name}"`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to create category', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAddSub = async (category: string) => {
    const name = newSubName.trim();
    if (!name) return;

    setBusy(true);
    try {
      await addSubcategory(category, name);
      setNewSubName('');
      setNewSubFor(null);
      await load();
      showToast(`Added "${name}"`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to add sub-category', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRenameCategory = async (oldName: string) => {
    const name = draftName.trim();
    if (!name || name === oldName) {
      resetEditing();
      return;
    }

    setBusy(true);
    try {
      const { postsUpdated } = await renameCategory(oldName, name);
      resetEditing();
      await load();
      showToast(
        postsUpdated > 0
          ? `Renamed to "${name}" and updated ${postsUpdated} post${postsUpdated === 1 ? '' : 's'}`
          : `Renamed to "${name}"`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Rename failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRenameSub = async (category: string, oldSub: string) => {
    const name = draftName.trim();
    if (!name || name === oldSub) {
      resetEditing();
      return;
    }

    setBusy(true);
    try {
      const { postsUpdated } = await renameSubcategory(category, oldSub, name);
      resetEditing();
      await load();
      showToast(
        postsUpdated > 0
          ? `Renamed to "${name}" and updated ${postsUpdated} post${postsUpdated === 1 ? '' : 's'}`
          : `Renamed to "${name}"`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Rename failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      if (pendingDelete.kind === 'category') {
        await deleteCategory(pendingDelete.category);
        showToast(`Deleted "${pendingDelete.category}"`, 'success');
      } else {
        await deleteSubcategory(pendingDelete.category, pendingDelete.sub);
        showToast(`Deleted "${pendingDelete.sub}"`, 'success');
      }
      await load();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  };

  const deleteMessage = () => {
    if (!pendingDelete) return '';
    if (pendingDelete.kind === 'category') {
      const n = totalCounts[pendingDelete.category] ?? 0;
      return n > 0
        ? `"${pendingDelete.category}" still has ${n} post${n === 1 ? '' : 's'} (including any in the trash). Move or delete them before removing this category.`
        : `Remove "${pendingDelete.category}" from the site navigation? This cannot be undone.`;
    }
    const n = totalCounts[`${pendingDelete.category}__${pendingDelete.sub}`] ?? 0;
    return n > 0
      ? `"${pendingDelete.sub}" still has ${n} post${n === 1 ? '' : 's'} (including any in the trash). Move or delete them before removing this sub-category.`
      : `Remove "${pendingDelete.sub}" from "${pendingDelete.category}"? This cannot be undone.`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-[#C5A059]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <header className="mb-6 rounded-2xl border border-[#2F2A26] bg-[#171311] px-6 py-6 lg:px-8 lg:py-7">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#C5A059] mb-2">Structure</p>
          <h1 className="text-2xl lg:text-3xl font-serif text-[#F3F4F6] mb-2">Categories</h1>
          <p className="text-gray-400 text-sm">
            Rename, add, or remove the sections that organise your work. Renaming updates every post
            in that section, and old links keep working.
          </p>
        </header>

        {/* Add category */}
        <div className="mb-6 rounded-2xl border border-[#2F2A26] bg-[#141210] p-4 flex flex-col sm:flex-row gap-3">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAddCategory();
            }}
            placeholder="New category name…"
            className="flex-1 bg-[#0F0E0D] border border-[#2F2A26] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] transition-all"
          />
          <button
            onClick={handleAddCategory}
            disabled={busy || !newCategory.trim()}
            className="bg-[#C5A059] text-black px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#d4b06a] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Category
          </button>
        </div>

        {/* Category list */}
        <div className="space-y-3">
          {categories.length === 0 && (
            <div className="p-8 text-center text-gray-500 italic rounded-2xl border border-[#2F2A26] bg-[#191614]">
              No categories yet.
            </div>
          )}

          {categories.map((category) => {
            const subs = taxonomy[category] ?? [];
            const isOpen = expanded === category;
            const postCount = counts[category] ?? 0;
            const isEditing = editingCategory === category;

            return (
              <div
                key={category}
                className="rounded-2xl border border-[#2F2A26] bg-[#191614] overflow-hidden"
              >
                <div className="px-4 py-4 sm:px-5 flex items-center gap-3">
                  {isEditing ? (
                    <div className="flex-1 flex flex-wrap items-center gap-2">
                      <input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleRenameCategory(category);
                          if (e.key === 'Escape') resetEditing();
                        }}
                        className="flex-1 min-w-[12rem] bg-[#0F0E0D] border border-[#C5A059] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                      />
                      <button
                        onClick={() => handleRenameCategory(category)}
                        disabled={busy}
                        className="p-2 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors disabled:opacity-40"
                        title="Save"
                      >
                        {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                      </button>
                      <button
                        onClick={resetEditing}
                        className="p-2 rounded-lg text-gray-400 hover:bg-[#2F2A26] transition-colors"
                        title="Cancel"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setExpanded(isOpen ? null : category)}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        <FolderTree size={16} className="text-[#C5A059] shrink-0" />
                        <span className="font-serif text-white text-lg truncate">{category}</span>
                        <span className="text-[10px] text-gray-500 bg-[#0F0E0D] px-2 py-0.5 rounded-full border border-[#2F2A26] shrink-0">
                          {postCount} post{postCount === 1 ? '' : 's'}
                        </span>
                        {subs.length > 0 && (
                          <ChevronDown
                            size={16}
                            className={`text-gray-500 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                          />
                        )}
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <Link
                          href={`/category/${categorySlug(category)}`}
                          target="_blank"
                          className="p-2 rounded-lg text-gray-500 hover:text-[#C5A059] hover:bg-[#2F2A26] transition-colors"
                          title="View on site"
                        >
                          <ExternalLink size={16} />
                        </Link>
                        <button
                          onClick={() => {
                            resetEditing();
                            setEditingCategory(category);
                            setDraftName(category);
                          }}
                          className="p-2 rounded-lg text-blue-400 hover:bg-blue-400/10 transition-colors"
                          title="Rename"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setPendingDelete({ kind: 'category', category })}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Sub-categories */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[#2F2A26] bg-[#151210] px-4 py-3 sm:px-5 space-y-2">
                        {subs.length === 0 && (
                          <p className="text-xs text-gray-500 italic py-1">
                            No sub-categories in this section.
                          </p>
                        )}

                        {subs.map((sub) => {
                          const subEditing =
                            editingSub?.category === category && editingSub?.sub === sub;
                          const subCount = counts[`${category}__${sub}`] ?? 0;

                          return (
                            <div key={sub} className="flex items-center gap-2">
                              {subEditing ? (
                                <>
                                  <input
                                    autoFocus
                                    value={draftName}
                                    onChange={(e) => setDraftName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') void handleRenameSub(category, sub);
                                      if (e.key === 'Escape') resetEditing();
                                    }}
                                    className="flex-1 bg-[#0F0E0D] border border-[#C5A059] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                                  />
                                  <button
                                    onClick={() => handleRenameSub(category, sub)}
                                    disabled={busy}
                                    className="p-2 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors disabled:opacity-40"
                                    title="Save"
                                  >
                                    {busy ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <Check size={16} />
                                    )}
                                  </button>
                                  <button
                                    onClick={resetEditing}
                                    className="p-2 rounded-lg text-gray-400 hover:bg-[#2F2A26] transition-colors"
                                    title="Cancel"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="flex-1 text-sm text-gray-300 truncate">
                                    {sub}
                                  </span>
                                  <span className="text-[10px] text-gray-600 shrink-0">
                                    {subCount} post{subCount === 1 ? '' : 's'}
                                  </span>
                                  <Link
                                    href={`/category/${categorySlug(category)}/${subCategorySlug(sub)}`}
                                    target="_blank"
                                    className="p-2 rounded-lg text-gray-600 hover:text-[#C5A059] hover:bg-[#2F2A26] transition-colors"
                                    title="View on site"
                                  >
                                    <ExternalLink size={14} />
                                  </Link>
                                  <button
                                    onClick={() => {
                                      resetEditing();
                                      setEditingSub({ category, sub });
                                      setDraftName(sub);
                                    }}
                                    className="p-2 rounded-lg text-blue-400 hover:bg-blue-400/10 transition-colors"
                                    title="Rename"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setPendingDelete({ kind: 'sub', category, sub })
                                    }
                                    className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })}

                        {/* Add sub-category */}
                        {newSubFor === category ? (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              autoFocus
                              value={newSubName}
                              onChange={(e) => setNewSubName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleAddSub(category);
                                if (e.key === 'Escape') {
                                  setNewSubFor(null);
                                  setNewSubName('');
                                }
                              }}
                              placeholder="Sub-category name…"
                              className="flex-1 bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                            />
                            <button
                              onClick={() => handleAddSub(category)}
                              disabled={busy || !newSubName.trim()}
                              className="p-2 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors disabled:opacity-40"
                              title="Add"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setNewSubFor(null);
                                setNewSubName('');
                              }}
                              className="p-2 rounded-lg text-gray-400 hover:bg-[#2F2A26] transition-colors"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setNewSubFor(category);
                              setNewSubName('');
                            }}
                            className="inline-flex items-center gap-1.5 text-xs text-[#C5A059] hover:text-[#d4b06a] transition-colors pt-1"
                          >
                            <Plus size={14} /> Add sub-category
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>

      <ConfirmModal
        isOpen={pendingDelete !== null}
        title={pendingDelete?.kind === 'category' ? 'Delete Category' : 'Delete Sub-category'}
        message={deleteMessage()}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
