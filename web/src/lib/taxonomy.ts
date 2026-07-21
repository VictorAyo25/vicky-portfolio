import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteField,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Taxonomy {
  [category: string]: string[];
}

export const INITIAL_TAXONOMY: Taxonomy = {
  "Blog Articles": [
    "Blogging - SaaS",
    "Consumer Electronics - Travel Gear - E-commerce",
    "Digital Marketing - SEO",
    "Ecommerce - Online Business",
    "EdTech (Educational Technology)",
    "Education",
    "Email Marketing",
    "Fashion & Lifestyle",
    "Habits & Productivity",
    "Health",
    "Mental Health & Wellness",
    "Personal Care & Hygiene",
    "Public Health",
    "Relationships & Dating",
    "Skincare - Beauty",
    "Software & Tech Reviews",
    "Technology - Social Media",
    "WordPress - Website Management"
  ],
  "Guest Posts": [
    "Automotive - Car Maintenance - Vehicle Services",
    "Baby Care - Parenting",
    "Business",
    "Driver Education - Road Safety",
    "Health & Wellness",
    "Home Appliances - Electronics - Consumer Goods",
    "Legal Services",
    "Real Estate",
    "Travel & Tourism",
    "Veterinary - Pet Health - Animal Care"
  ],
  "Niche Edits": [
    "Gardening & Landscaping",
    "Graphic Design - Visual Marketing",
    "Health & Wellness",
    "Home Improvement"
  ],
  "Press Releases": [
    "Arts & Entertainment",
    "Sports & Martial Arts - Fitness Education"
  ],
  "E-book": [],
  "Scripts": [],
  "Digital PR": []
};

export const TAXONOMY_DOC_ID = 'structure';
export const TAXONOMY_COLLECTION = 'taxonomy';
export const ALIASES_DOC_ID = 'aliases';
export const ORDER_DOC_ID = 'order';

/** Firestore caps a batch at 500 writes; stay under it with headroom. */
const BATCH_LIMIT = 450;

/**
 * Old slugs kept alive after a rename so existing links and search results
 * keep resolving. Values are the *current* names they point at.
 */
export interface TaxonomyAliases {
  categories?: Record<string, string>;
  subCategories?: Record<string, string>;
}

/**
 * Categories in a stable, intentional order.
 *
 * Firestore returns map keys in an arbitrary order, so reading the live
 * taxonomy directly scrambles the menu. Precedence:
 *   1. the order saved from the admin, when present
 *   2. the curated order defined in INITIAL_TAXONOMY
 *   3. alphabetical, so the result is always deterministic
 */
export function orderedCategories(taxonomy: Taxonomy, savedOrder?: string[]): string[] {
  const curated = Object.keys(INITIAL_TAXONOMY);

  const rankIn = (list: string[], name: string) => {
    const index = list.indexOf(name);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  return Object.keys(taxonomy).sort((a, b) => {
    if (savedOrder?.length) {
      const savedDiff = rankIn(savedOrder, a) - rankIn(savedOrder, b);
      if (savedDiff !== 0) return savedDiff;
    }
    const curatedDiff = rankIn(curated, a) - rankIn(curated, b);
    return curatedDiff !== 0 ? curatedDiff : a.localeCompare(b);
  });
}

export async function fetchCategoryOrder(): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, TAXONOMY_COLLECTION, ORDER_DOC_ID));
    const value = snap.exists() ? (snap.data() as { categories?: string[] }).categories : undefined;
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error('Error fetching category order:', error);
    return [];
  }
}

export async function saveCategoryOrder(order: string[]): Promise<void> {
  await setDoc(doc(db, TAXONOMY_COLLECTION, ORDER_DOC_ID), { categories: order });
}

/**
 * Display label for a category or sub-category.
 *
 * Names are free text typed in the admin, so an ALL-CAPS entry would shout
 * next to title-cased neighbours. Only multi-word all-caps names are
 * normalised — single words are left alone so acronyms (SEO, SaaS) and
 * deliberate casing (E-book, EdTech, WordPress) survive untouched.
 */
export function formatTaxonomyLabel(name: string): string {
  const isShouty = name === name.toUpperCase() && /[A-Z]/.test(name) && /\s/.test(name);
  if (!isShouty) return name;

  return name
    .toLowerCase()
    .replace(/(^|[\s\-/&(])([a-z])/g, (_match, prefix, letter) => prefix + letter.toUpperCase());
}

export function categorySlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export function subCategorySlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export async function fetchTaxonomy(): Promise<Taxonomy> {
  try {
    const docRef = doc(db, TAXONOMY_COLLECTION, TAXONOMY_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as Taxonomy;
    } else {
      // If it doesn't exist, we can't save it as a public user due to permissions
      return INITIAL_TAXONOMY;
    }
  } catch (error) {
    console.error("Error fetching taxonomy:", error);
    return INITIAL_TAXONOMY; // Fallback so the site doesn't crash
  }
}

export async function fetchAliases(): Promise<TaxonomyAliases> {
  try {
    const snap = await getDoc(doc(db, TAXONOMY_COLLECTION, ALIASES_DOC_ID));
    return snap.exists() ? (snap.data() as TaxonomyAliases) : {};
  } catch (error) {
    console.error('Error fetching taxonomy aliases:', error);
    return {};
  }
}

/** Resolve a category slug against the taxonomy, falling back to rename aliases. */
export function findCategoryBySlug(taxonomy: Taxonomy, slug: string): string | null {
  return Object.keys(taxonomy).find((key) => categorySlug(key) === slug) ?? null;
}

export async function resolveCategoryBySlug(taxonomy: Taxonomy, slug: string): Promise<string | null> {
  const direct = findCategoryBySlug(taxonomy, slug);
  if (direct) return direct;

  const aliases = await fetchAliases();
  const aliased = aliases.categories?.[slug];
  return aliased && Object.prototype.hasOwnProperty.call(taxonomy, aliased) ? aliased : null;
}

export function findSubCategoryBySlug(subCategories: string[], slug: string): string | null {
  return subCategories.find((sub) => subCategorySlug(sub) === slug) ?? null;
}

export async function resolveSubCategoryBySlug(
  subCategories: string[],
  slug: string
): Promise<string | null> {
  const direct = findSubCategoryBySlug(subCategories, slug);
  if (direct) return direct;

  const aliases = await fetchAliases();
  const aliased = aliases.subCategories?.[slug];
  // Only honour the alias if it actually belongs to this category, so that
  // sub-names shared across categories can't leak into the wrong one.
  return aliased && subCategories.includes(aliased) ? aliased : null;
}

export async function addCategory(category: string) {
  const trimmed = category.trim();
  if (!trimmed) return;

  const docRef = doc(db, TAXONOMY_COLLECTION, TAXONOMY_DOC_ID);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data() as Taxonomy;
    if (Object.prototype.hasOwnProperty.call(data, trimmed)) return;
    await updateDoc(docRef, {
      [trimmed]: []
    });
  } else {
    // Seed the doc from the initial taxonomy plus the new category.
    await setDoc(docRef, { ...INITIAL_TAXONOMY, [trimmed]: [] });
  }
}

export async function addSubcategory(category: string, subCategory: string) {
  const trimmed = subCategory.trim();
  if (!trimmed) return;

  const docRef = doc(db, TAXONOMY_COLLECTION, TAXONOMY_DOC_ID);
  const docSnap = await getDoc(docRef);

  const data = docSnap.exists() ? (docSnap.data() as Taxonomy) : { ...INITIAL_TAXONOMY };
  const currentSubs = data[category] || [];
  if (currentSubs.includes(trimmed)) return;

  const updatedSubs = [...currentSubs, trimmed].sort();

  if (docSnap.exists()) {
    await updateDoc(docRef, { [category]: updatedSubs });
  } else {
    await setDoc(docRef, { ...data, [category]: updatedSubs });
  }
}

/**
 * Rewrite a field across every matching post, chunked to respect the batch cap.
 * Returns how many posts were changed.
 */
async function rewritePostField(
  field: 'category' | 'subCategory',
  oldValue: string,
  newValue: string,
  scopeCategory?: string
): Promise<number> {
  const constraints = [where(field, '==', oldValue)];
  if (field === 'subCategory' && scopeCategory) {
    constraints.push(where('category', '==', scopeCategory));
  }

  const snapshot = await getDocs(query(collection(db, 'posts'), ...constraints));
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.update(d.ref, { [field]: newValue }));
    await batch.commit();
  }

  return docs.length;
}

async function countPosts(category: string, subCategory?: string): Promise<number> {
  const constraints = [where('category', '==', category)];
  if (subCategory) constraints.push(where('subCategory', '==', subCategory));
  const snapshot = await getDocs(query(collection(db, 'posts'), ...constraints));
  return snapshot.size;
}

async function writeAliases(next: TaxonomyAliases) {
  // Written whole rather than merged, so keys we intentionally drop disappear.
  await setDoc(doc(db, TAXONOMY_COLLECTION, ALIASES_DOC_ID), next);
}

/**
 * Rename a category and migrate every post that references it.
 *
 * Posts are migrated *before* the taxonomy is rewritten: if the bulk update
 * fails partway, the taxonomy still holds the old name and re-running the same
 * rename picks up where it left off.
 */
export async function renameCategory(
  oldName: string,
  newName: string
): Promise<{ postsUpdated: number }> {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error('Category name cannot be empty.');
  if (trimmed === oldName) return { postsUpdated: 0 };

  const docRef = doc(db, TAXONOMY_COLLECTION, TAXONOMY_DOC_ID);
  const snap = await getDoc(docRef);
  const data = snap.exists() ? (snap.data() as Taxonomy) : { ...INITIAL_TAXONOMY };

  if (!Object.prototype.hasOwnProperty.call(data, oldName)) {
    throw new Error(`Category "${oldName}" no longer exists.`);
  }
  if (Object.prototype.hasOwnProperty.call(data, trimmed)) {
    throw new Error(`A category named "${trimmed}" already exists.`);
  }

  const postsUpdated = await rewritePostField('category', oldName, trimmed);

  // Rebuild the whole doc so the old key is dropped and ordering is preserved.
  const rebuilt: Taxonomy = {};
  for (const [key, subs] of Object.entries(data)) {
    rebuilt[key === oldName ? trimmed : key] = subs;
  }
  await setDoc(docRef, rebuilt);

  const aliases = await fetchAliases();
  const categories = { ...(aliases.categories ?? {}) };
  // Re-point earlier aliases so a chain of renames keeps resolving.
  for (const key of Object.keys(categories)) {
    if (categories[key] === oldName) categories[key] = trimmed;
  }
  categories[categorySlug(oldName)] = trimmed;
  // The new name's own slug is a live route, not an alias.
  delete categories[categorySlug(trimmed)];
  await writeAliases({ ...aliases, categories });

  return { postsUpdated };
}

export async function renameSubcategory(
  category: string,
  oldSub: string,
  newSub: string
): Promise<{ postsUpdated: number }> {
  const trimmed = newSub.trim();
  if (!trimmed) throw new Error('Sub-category name cannot be empty.');
  if (trimmed === oldSub) return { postsUpdated: 0 };

  const docRef = doc(db, TAXONOMY_COLLECTION, TAXONOMY_DOC_ID);
  const snap = await getDoc(docRef);
  const data = snap.exists() ? (snap.data() as Taxonomy) : { ...INITIAL_TAXONOMY };
  const subs = data[category] ?? [];

  if (!subs.includes(oldSub)) {
    throw new Error(`Sub-category "${oldSub}" no longer exists.`);
  }
  if (subs.includes(trimmed)) {
    throw new Error(`A sub-category named "${trimmed}" already exists here.`);
  }

  const postsUpdated = await rewritePostField('subCategory', oldSub, trimmed, category);

  const updatedSubs = subs.map((sub) => (sub === oldSub ? trimmed : sub)).sort();
  if (snap.exists()) {
    await updateDoc(docRef, { [category]: updatedSubs });
  } else {
    await setDoc(docRef, { ...data, [category]: updatedSubs });
  }

  const aliases = await fetchAliases();
  const subCategories = { ...(aliases.subCategories ?? {}) };
  for (const key of Object.keys(subCategories)) {
    if (subCategories[key] === oldSub) subCategories[key] = trimmed;
  }
  subCategories[subCategorySlug(oldSub)] = trimmed;
  delete subCategories[subCategorySlug(trimmed)];
  await writeAliases({ ...aliases, subCategories });

  return { postsUpdated };
}

/** Delete a category. Refuses while posts still reference it. */
export async function deleteCategory(category: string): Promise<void> {
  const remaining = await countPosts(category);
  if (remaining > 0) {
    throw new Error(
      `"${category}" still has ${remaining} post${remaining === 1 ? '' : 's'}. Move or delete them first.`
    );
  }

  const docRef = doc(db, TAXONOMY_COLLECTION, TAXONOMY_DOC_ID);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;

  const data = snap.data() as Taxonomy;
  const ownSubs = data[category] ?? [];

  await updateDoc(docRef, { [category]: deleteField() });

  // Drop aliases that pointed at the deleted category, plus sub-category
  // aliases left orphaned by it — but keep any sub name still used elsewhere.
  const survivingSubs = new Set(
    Object.entries(data)
      .filter(([key]) => key !== category)
      .flatMap(([, subs]) => subs)
  );

  const aliases = await fetchAliases();
  const categories = { ...(aliases.categories ?? {}) };
  const subCategories = { ...(aliases.subCategories ?? {}) };
  let changed = false;

  for (const key of Object.keys(categories)) {
    if (categories[key] === category) {
      delete categories[key];
      changed = true;
    }
  }
  for (const key of Object.keys(subCategories)) {
    const value = subCategories[key];
    if (ownSubs.includes(value) && !survivingSubs.has(value)) {
      delete subCategories[key];
      changed = true;
    }
  }

  if (changed) await writeAliases({ ...aliases, categories, subCategories });
}

/** Delete a sub-category. Refuses while posts still reference it. */
export async function deleteSubcategory(category: string, subCategory: string): Promise<void> {
  const remaining = await countPosts(category, subCategory);
  if (remaining > 0) {
    throw new Error(
      `"${subCategory}" still has ${remaining} post${remaining === 1 ? '' : 's'}. Move or delete them first.`
    );
  }

  const docRef = doc(db, TAXONOMY_COLLECTION, TAXONOMY_DOC_ID);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;

  const data = snap.data() as Taxonomy;
  const updatedSubs = (data[category] ?? []).filter((sub) => sub !== subCategory);
  await updateDoc(docRef, { [category]: updatedSubs });

  const aliases = await fetchAliases();
  const subCategories = { ...(aliases.subCategories ?? {}) };
  let changed = false;
  for (const key of Object.keys(subCategories)) {
    if (subCategories[key] === subCategory) {
      delete subCategories[key];
      changed = true;
    }
  }
  if (changed) await writeAliases({ ...aliases, subCategories });
}
