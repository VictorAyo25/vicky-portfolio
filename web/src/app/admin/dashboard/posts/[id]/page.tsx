'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc, collection, query, getDocs, orderBy, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { fetchTaxonomy, Taxonomy, addSubcategory } from '@/lib/taxonomy';
import { useToast } from '@/context/ToastContext';
import { Loader2, Save, Image as ImageIcon, Link as LinkIcon, Plus, ArrowLeft, UploadCloud, Images, Tag, FileText, X, CloudOff, Cloud, FileUp, Upload } from 'lucide-react';
import Link from 'next/link';
import RichTextEditor from '@/components/admin/RichTextEditor';
import ImagePickerModal from '@/components/admin/ImagePickerModal';
import ConfirmModal from '@/components/admin/ConfirmModal';
import PdfOcrProcessor from '@/components/admin/PdfOcrProcessor';

type MediaType = 'url' | 'upload' | 'library';

interface EditablePost {
  title: string;
  description?: string;
  keywords?: string[];
  category: string;
  subCategory?: string;
  content: string;
  mediaType?: MediaType;
  mediaUrl?: string;
  coverImage?: string;
  published?: boolean;
  hasLargeContent?: boolean;
  contentChunks?: number;
}

const AUTOSAVE_DEBOUNCE_MS = 3000;
const SAVE_TIMEOUT_MS = 30000;
const LOCALSTORAGE_KEY_PREFIX = 'draft_post_';

// Module-level store for draft data passed between effects (avoids window casting)
let draftDataStore: Record<string, unknown> | null = null;

export default function EditPostPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [content, setContent] = useState('');
  const [hasLargeContent, setHasLargeContent] = useState(false);
  
  const [mediaType, setMediaType] = useState<MediaType>('url');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaUploading, setMediaUploading] = useState(false);

  const [coverImageType, setCoverImageType] = useState<MediaType>('url');
  const [coverImage, setCoverImage] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);

  const [isNewSubCategoryMode, setIsNewSubCategoryMode] = useState(false);
  const [isNewCategoryMode, setIsNewCategoryMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const [importingDoc, setImportingDoc] = useState(false);

  // PDF import state
  const [pdfSource, setPdfSource] = useState<'file' | 'gdrive'>('file');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDriveUrl, setPdfDriveUrl] = useState('');
  const [importingPdf, setImportingPdf] = useState(false);
  const [pdfImportConfirm, setPdfImportConfirm] = useState(false);
  const [ocrPdfData, setOcrPdfData] = useState<{ pdfBase64: string; filename: string } | null>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);

  // Image picker modal state
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [importConfirm, setImportConfirm] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'media' | 'cover'>('media');

  // Auto-save refs
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedState = useRef<string>('');
  const isSavingRef = useRef(false);

  // Track if form has changes
  const formStateKey = useMemo(() => {
    return JSON.stringify({ title, description, keywords, category, subCategory, content, mediaType, mediaUrl, coverImage });
  }, [title, description, keywords, category, subCategory, content, mediaType, mediaUrl, coverImage]);

  useEffect(() => {
    const saved = lastSavedState.current;
    setHasUnsavedChanges(formStateKey !== saved);
  }, [formStateKey]);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (!id) return;
    try {
      const draftKey = `${LOCALSTORAGE_KEY_PREFIX}${id}`;
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        const parsed = JSON.parse(draft);
        const draftAge = Date.now() - (parsed.timestamp || 0);
        // Only restore drafts less than 24 hours old
        if (draftAge < 24 * 60 * 60 * 1000) {
          // We'll apply draft data after the initial load
          draftDataStore = parsed;
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [id]);

  // Auto-save to localStorage
  const saveDraftLocal = useCallback(() => {
    if (!id) return;
    try {
      const draftKey = `${LOCALSTORAGE_KEY_PREFIX}${id}`;
      localStorage.setItem(draftKey, JSON.stringify({
        title, description, keywords, category, subCategory, content, mediaType, mediaUrl, coverImage,
        timestamp: Date.now(),
      }));
    } catch {
      // Storage full or unavailable
    }
  }, [id, title, description, keywords, category, subCategory, content, mediaType, mediaUrl, coverImage]);

  // Debounced auto-save
  useEffect(() => {
    if (initialLoading) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveDraftLocal();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [formStateKey, initialLoading, saveDraftLocal]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keywords handlers
  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword();
    }
  };

  const handleCategoryNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setNewCategoryName(name);
    setNewCategorySlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) { showToast('Category name is required', 'error'); return; }
    setSubmittingCategory(true);
    try {
      await addDoc(collection(db, 'categories'), { name: newCategoryName.trim(), slug: newCategorySlug.trim(), createdAt: serverTimestamp() });
      showToast('Category created successfully', 'success');
      setNewCategoryName(''); setNewCategorySlug(''); setIsNewCategoryMode(false);
      const data = await fetchTaxonomy(); setTaxonomy(data);
    } catch (err) { console.error(err); showToast('Failed to create category', 'error'); }
    finally { setSubmittingCategory(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (isCover) {
        setCoverUploading(true);
      } else {
        setMediaUploading(true);
      }

      const result = await uploadToCloudinary(file);

      if (isCover) {
        setCoverImage(result.url);
        showToast('Cover image uploaded successfully', 'success');
      } else {
        setMediaUrl(result.url);
        showToast('Media uploaded successfully', 'success');
      }
    } catch (err) {
      console.error('Upload Error:', err);
      showToast(err instanceof Error ? err.message : 'Failed to upload file. Please try again.', 'error');
    } finally {
      if (isCover) {
        setCoverUploading(false);
      } else {
        setMediaUploading(false);
      }
    }
  };

  const openMediaPicker = (target: 'media' | 'cover') => {
    setMediaPickerTarget(target);
    setShowMediaPicker(true);
  };

  const handleMediaPickerSelect = (url: string) => {
    if (mediaPickerTarget === 'cover') {
      setCoverImage(url);
      setCoverImageType('library');
    } else {
      setMediaUrl(url);
      setMediaType('library');
    }
  };

  const getPlainText = (html: string) =>
    html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  useEffect(() => {
    async function loadData() {
      try {
        const [taxonomyData, postSnap] = await Promise.all([
          fetchTaxonomy(),
          getDoc(doc(db, 'posts', id)),
        ]);

        setTaxonomy(taxonomyData);

        if (!postSnap.exists()) {
          showToast('Post not found', 'error');
          router.push('/admin/dashboard/posts');
          return;
        }

        const post = postSnap.data() as EditablePost;
        setTitle(post.title || '');
        setDescription(post.description || '');
        setKeywords(post.keywords || []);
        setCategory(post.category || '');
        setSubCategory(post.subCategory || '');
        setMediaType(post.mediaType === 'upload' ? 'upload' : 'url');
        setMediaUrl(post.mediaUrl || '');
        setCoverImage(post.coverImage || '');
        setHasLargeContent(post.hasLargeContent || false);
        
        if (post.hasLargeContent) {
          console.log(`Fetching ${post.contentChunks} content chunks for editing...`);
          const chunksQuery = query(
            collection(db, 'posts', id, 'content'),
            orderBy('index', 'asc')
          );
          const chunksSnapshot = await getDocs(chunksQuery);
          let fullContent = '';
          chunksSnapshot.docs.forEach(chunkDoc => {
            fullContent += chunkDoc.data().content;
          });
          setContent(fullContent);
          console.log(`Loaded ${fullContent.length} bytes of content for editing`);
        } else {
          setContent(post.content || '');
        }

        // Check for draft data
        const draftData = draftDataStore as {
          title: string; content: string; description: string; keywords: string[];
          category: string; subCategory: string; mediaType: string; mediaUrl: string; coverImage: string;
        } | undefined;
        if (draftData) {
          // Ask user if they want to restore draft
          const restoreDraft = window.confirm('You have unsaved changes from a previous session. Restore them?');
          if (restoreDraft) {
            setTitle(draftData.title || post.title || '');
            setContent(draftData.content || post.content || '');
            setDescription(draftData.description || post.description || '');
            setKeywords(draftData.keywords || post.keywords || []);
            setCategory(draftData.category || post.category || '');
            setSubCategory(draftData.subCategory || post.subCategory || '');
            setMediaUrl(draftData.mediaUrl || post.mediaUrl || '');
            setCoverImage(draftData.coverImage || post.coverImage || '');
            showToast('Draft restored from local storage', 'success');
          }
          draftDataStore = null;
          // Clear the draft either way
          localStorage.removeItem(`${LOCALSTORAGE_KEY_PREFIX}${id}`);
        }

        // Mark initial state as saved
        const initialState = JSON.stringify({
          title: post.title || '', description: post.description || '', keywords: post.keywords || [],
          category: post.category || '', subCategory: post.subCategory || '',
          content: post.content || '', mediaType: post.mediaType === 'upload' ? 'upload' : 'url',
          mediaUrl: post.mediaUrl || '', coverImage: post.coverImage || '',
        });
        lastSavedState.current = initialState;
      } catch (error) {
        console.error(error);
        showToast('Failed to load post', 'error');
      } finally {
        setInitialLoading(false);
      }
    }

    if (id) void loadData();
  }, [id, router, showToast]);

  const currentSubCategories = useMemo(
    () => (category && taxonomy && taxonomy[category]) || [],
    [category, taxonomy]
  );

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!getPlainText(content)) {
      showToast('Please add some content before saving.', 'error');
      return;
    }

    if (isSavingRef.current) {
      showToast('Already saving, please wait...', 'error');
      return;
    }

    isSavingRef.current = true;
    setSaving(true);

    // Create a timeout promise that rejects after SAVE_TIMEOUT_MS
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Save timed out')), SAVE_TIMEOUT_MS)
    );

    try {
      const savePromise = (async () => {
        let finalSubCategory = subCategory;

        if (isNewSubCategoryMode && newSubCategoryName.trim()) {
          await addSubcategory(category, newSubCategoryName.trim());
          finalSubCategory = newSubCategoryName.trim();
        }

        const contentSize = Buffer.byteLength(content, 'utf8');
        const MAX_CONTENT_SIZE = 900000;
        
        if (contentSize > MAX_CONTENT_SIZE) {
          console.log(`Content is ${contentSize} bytes, splitting into chunks...`);
          
          const chunks = [];
          let remaining = content;
          
          while (remaining.length > 0) {
            const chunkSize = Math.min(MAX_CONTENT_SIZE, remaining.length);
            let breakPoint = chunkSize;
            
            if (chunkSize < remaining.length) {
              const lastPara = remaining.lastIndexOf('</p>', chunkSize);
              if (lastPara > chunkSize * 0.5) {
                breakPoint = lastPara + 4;
              } else {
                const lastBr = remaining.lastIndexOf('<br />', chunkSize);
                if (lastBr > chunkSize * 0.5) {
                  breakPoint = lastBr + 6;
                } else {
                  const lastPeriod = remaining.lastIndexOf('. ', chunkSize);
                  if (lastPeriod > chunkSize * 0.5) {
                    breakPoint = lastPeriod + 2;
                  }
                }
              }
            }
            
            chunks.push(remaining.substring(0, breakPoint));
            remaining = remaining.substring(breakPoint);
          }
          
          await updateDoc(doc(db, 'posts', id), {
            title,
            description: description.trim(),
            keywords,
            category,
            subCategory: finalSubCategory,
            mediaType,
            mediaUrl,
            coverImage,
            updatedAt: new Date(),
            hasLargeContent: true,
            contentChunks: chunks.length,
            contentPreview: content.substring(0, 500) + '...',
          });
          
          const oldChunksSnapshot = await getDocs(collection(db, 'posts', id, 'content'));
          const batch = writeBatch(db);
          oldChunksSnapshot.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
          
          for (let i = 0; i < chunks.length; i++) {
            await setDoc(doc(db, 'posts', id, 'content', `chunk_${i}`), {
              index: i,
              content: chunks[i]
            });
          }
          
          console.log(`Saved ${chunks.length} content chunks`);
        } else {
          await updateDoc(doc(db, 'posts', id), {
            title,
            description: description.trim(),
            keywords,
            category,
            subCategory: finalSubCategory,
            content,
            mediaType,
            mediaUrl,
            coverImage,
            updatedAt: new Date(),
            hasLargeContent: false,
            contentChunks: 0,
            contentPreview: '',
          });
          
          if (hasLargeContent) {
            const oldChunksSnapshot = await getDocs(collection(db, 'posts', id, 'content'));
            const batch = writeBatch(db);
            oldChunksSnapshot.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }
      })();

      // Race save against timeout
      await Promise.race([savePromise, timeoutPromise]);

      // Success — update saved state
      lastSavedState.current = formStateKey;
      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      // Clear draft
      if (id) localStorage.removeItem(`${LOCALSTORAGE_KEY_PREFIX}${id}`);

      showToast('Post updated successfully', 'success');
      router.push('/admin/dashboard/posts');
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message === 'Save timed out') {
        showToast('Save is taking too long. Your draft is saved locally — try again shortly.', 'error');
      } else {
        showToast('Failed to update post. Your draft is saved locally — try again.', 'error');
      }
      // Ensure local draft is saved on error
      saveDraftLocal();
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  };

  // ─── Google Docs Import ──────────────────────────────────────────────────

  const handleImportFromGoogleDocs = async () => {
    if (!googleDocUrl.trim()) {
      showToast('Please paste a Google Docs URL first.', 'error');
      return;
    }

    const hasExistingContent = getPlainText(content).length > 0;
    if (hasExistingContent) {
      const confirmed = window.confirm(
        'This will replace the current editor content with the imported Google Doc content. Continue?'
      );
      if (!confirmed) return;
    }

    setImportingDoc(true);
    try {
      const response = await fetch('/api/import/google-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: googleDocUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Import failed');
      }

      if (!title.trim() && data.title) {
        setTitle(data.title);
      }
      setContent(data.content || '');
      const imgMsg = data.imagesProcessed
        ? ` (${data.imagesProcessed} image${data.imagesProcessed > 1 ? 's' : ''} uploaded to Cloudinary${data.imagesFailed ? `, ${data.imagesFailed} failed` : ''})`
        : '';
      showToast(`Google Doc imported successfully.${imgMsg}`, 'success');
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : 'Failed to import document.', 'error');
    } finally {
      setImportingDoc(false);
    }
  };

  const doImport = async () => {
    setImportConfirm(false);
    setImportingDoc(true);
    try {
      const response = await fetch('/api/import/google-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: googleDocUrl.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Import failed');
      if (!title.trim() && data.title) setTitle(data.title);
      setContent(data.content || '');
      const imgMsg2 = data.imagesProcessed
        ? ` (${data.imagesProcessed} image${data.imagesProcessed > 1 ? 's' : ''} uploaded to Cloudinary${data.imagesFailed ? `, ${data.imagesFailed} failed` : ''})`
        : '';
      showToast(`Google Doc imported successfully.${imgMsg2}`, 'success');
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : 'Failed to import document.', 'error');
    } finally {
      setImportingDoc(false);
    }
  };

  // ─── PDF Import ──────────────────────────────────────────────────────────

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
    }
  };

  const handleImportPdf = async () => {
    if (pdfSource === 'file' && !pdfFile) {
      showToast('Please select a PDF file first.', 'error');
      return;
    }
    if (pdfSource === 'gdrive' && !pdfDriveUrl.trim()) {
      showToast('Please paste a Google Drive link first.', 'error');
      return;
    }
    const hasExistingContent = getPlainText(content).length > 0;
    if (hasExistingContent) {
      setPdfImportConfirm(true);
      return;
    }
    await doImportPdf();
  };

  const doImportPdf = async () => {
    setPdfImportConfirm(false);
    setImportingPdf(true);
    try {
      let response: Response;

      if (pdfSource === 'file' && pdfFile) {
        const formData = new FormData();
        formData.append('file', pdfFile);
        response = await fetch('/api/import/pdf', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/import/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: pdfDriveUrl.trim() }),
        });
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Import failed');

      // If the PDF needs client-side OCR, show the OCR modal
      if (data.needsClientOcr) {
        setOcrPdfData({
          pdfBase64: data.pdfBase64,
          filename: data.filename || 'document.pdf',
        });
        setImportingPdf(false);
        return;
      }

      if (!title.trim() && data.title) setTitle(data.title);
      setContent(data.content || '');

      const parts: string[] = ['PDF imported successfully'];
      if (data.imagesProcessed) {
        parts.push(`${data.imagesProcessed} image${data.imagesProcessed > 1 ? 's' : ''} extracted & uploaded to Cloudinary`);
      }
      if (data.imagesFailed) {
        parts.push(`${data.imagesFailed} image${data.imagesFailed > 1 ? 's' : ''} failed`);
      }
      if (data.pageCount) {
        parts.push(`(${data.pageCount} page${data.pageCount > 1 ? 's' : ''})`);
      }
      showToast(parts.join(' — '), 'success');

      // Reset PDF state
      setPdfFile(null);
      setPdfDriveUrl('');
      if (pdfFileInputRef.current) pdfFileInputRef.current.value = '';
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : 'Failed to import PDF.', 'error');
    } finally {
      setImportingPdf(false);
    }
  };

  const handleOcrExtracted = (text: string) => {
    if (!title.trim() && ocrPdfData) {
      const firstLine = text.split('\n').map(l => l.trim()).filter(Boolean)[0];
      if (firstLine && firstLine.length < 120) setTitle(firstLine);
    }
    setContent(text);
    setOcrPdfData(null);
    showToast('OCR text extracted and loaded into editor.', 'success');
  };

  const handleOcrCancel = () => {
    setOcrPdfData(null);
  };

  if (initialLoading) {
    return (
      <div className="p-8 lg:p-12 max-w-5xl mx-auto flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-[#C5A059]" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto pb-28 lg:pb-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <header className="mb-6 sm:mb-8 rounded-2xl border border-[#2F2A26] bg-[#171311] px-4 sm:px-6 py-4 sm:py-6 lg:px-8 lg:py-7">
          <div>
            <Link href="/admin/dashboard/posts" className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-[#C5A059] mb-3 sm:mb-4 uppercase tracking-widest">
              <ArrowLeft size={14} />
              Back to Manage Content
            </Link>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#C5A059] mb-1 sm:mb-2">Editor</p>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif text-[#F3F4F6] mb-1 sm:mb-2">Edit Post</h1>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-gray-400 text-sm">Update post details and content.</p>
              {/* Save status indicator */}
              <span className="inline-flex items-center gap-1.5 text-xs">
                {hasUnsavedChanges ? (
                  <><CloudOff size={12} className="text-amber-400" /><span className="text-amber-400">Unsaved changes</span></>
                ) : lastSaved ? (
                  <><Cloud size={12} className="text-emerald-400" /><span className="text-emerald-400">Saved {lastSaved.toLocaleTimeString()}</span></>
                ) : (
                  <><Cloud size={12} className="text-gray-500" /><span className="text-gray-500">Auto-saves locally</span></>
                )}
              </span>
            </div>
          </div>
        </header>

        <form onSubmit={handleUpdatePost} className="space-y-6 sm:space-y-8 bg-[#191614] p-4 sm:p-6 lg:p-8 rounded-2xl border border-[#2F2A26]">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Title <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title..."
              className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 text-base"
              required
            />
          </div>

          {/* Short Description (Tagline) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059] flex items-center gap-2">
              <FileText size={14} />
              Short Description / Tagline
              <span className="text-gray-500 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief tagline or summary of this post (shown on cards and SEO)..."
              rows={2}
              className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 resize-none text-base"
            />
            <p className="text-xs text-gray-500">A short 1-2 sentence description. Used for SEO meta description and post card previews.</p>
          </div>

          {/* Keywords / Tags */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059] flex items-center gap-2">
              <Tag size={14} />
              Keywords / Tags
              <span className="text-gray-500 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                placeholder="Type a keyword and press Enter..."
                className="flex-1 bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 text-base"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="px-4 py-2.5 rounded-lg border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-black transition-colors text-sm font-bold flex-shrink-0"
              >
                Add
              </button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] px-3 py-1 rounded-full text-xs font-medium"
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeKeyword(i)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">Press Enter or comma to add. Used for SEO and content discovery.</p>
          </div>

          {/* Taxonomy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Category <span className="text-red-400">*</span></label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubCategory('');
                  setIsNewSubCategoryMode(false);
                }}
                className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] outline-none appearance-none text-base"
                required
              >
                <option value="">Select Category</option>
                {taxonomy && Object.keys(taxonomy).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059] flex justify-between">
                <span>Subcategory</span>
                {category && (
                  <button
                    type="button"
                    onClick={() => setIsNewSubCategoryMode(!isNewSubCategoryMode)}
                    className="text-[10px] text-gray-400 hover:text-[#C5A059] flex items-center gap-1 transition-colors"
                  >
                    <Plus size={12} />
                    {isNewSubCategoryMode ? 'Select Existing' : 'Create New'}
                  </button>
                )}
              </label>

              {isNewSubCategoryMode ? (
                <input
                  type="text"
                  value={newSubCategoryName}
                  onChange={(e) => setNewSubCategoryName(e.target.value)}
                  placeholder="Type new subcategory name..."
                  className="w-full bg-[#0F0E0D] border border-[#C5A059] rounded-lg px-4 py-3 text-white focus:outline-none placeholder-gray-600 text-base"
                />
              ) : (
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] outline-none appearance-none disabled:opacity-50 text-base"
                  disabled={!category}
                >
                  <option value="">Select Subcategory</option>
                  {currentSubCategories.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Google Docs Import */}
          <div className="space-y-3 border border-[#2F2A26] rounded-xl p-3 sm:p-4 bg-[#171311]">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Import from Google Docs</label>
                <input
                  type="url"
                  value={googleDocUrl}
                  onChange={(e) => setGoogleDocUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 text-base"
                />
                <p className="text-xs text-gray-500">
                  Tip: set the Google Doc sharing to <span className="text-gray-300">Anyone with the link can view</span> before importing.
                </p>
              </div>
              <button
                type="button"
                onClick={handleImportFromGoogleDocs}
                disabled={importingDoc}
                className="px-5 py-3 rounded-lg border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-[#0F0E0D] transition-colors min-h-11 font-semibold text-sm disabled:opacity-50 flex-shrink-0"
              >
                {importingDoc ? 'Importing...' : 'Import Doc'}
              </button>
            </div>
          </div>

          {/* PDF Import */}
          <div className="space-y-3 border border-[#2F2A26] rounded-xl p-3 sm:p-4 bg-[#171311]">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059] flex items-center gap-2">
              <FileUp size={14} /> Import from PDF
            </label>

            {/* Source toggle */}
            <div className="flex gap-2 mb-1">
              <button
                type="button"
                onClick={() => setPdfSource('file')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${pdfSource === 'file' ? 'bg-[#C5A059] text-black' : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26] hover:text-[#C5A059]'}`}
              >
                <Upload size={12} /> Upload PDF
              </button>
              <button
                type="button"
                onClick={() => setPdfSource('gdrive')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${pdfSource === 'gdrive' ? 'bg-[#C5A059] text-black' : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26] hover:text-[#C5A059]'}`}
              >
                <LinkIcon size={12} /> Google Drive Link
              </button>
            </div>

            {pdfSource === 'file' ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <div className="border border-dashed border-[#2F2A26] rounded-lg p-4 sm:p-5 flex flex-col items-center justify-center bg-[#0F0E0D] text-gray-400">
                    {pdfFile ? (
                      <div className="flex items-center gap-3 w-full">
                        <FileUp size={20} className="text-[#C5A059] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{pdfFile.name}</p>
                          <p className="text-xs text-gray-500">{(pdfFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setPdfFile(null); if (pdfFileInputRef.current) pdfFileInputRef.current.value = ''; }}
                          className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <FileUp size={24} className="mb-2 text-gray-500" />
                        <label className="cursor-pointer bg-[#C5A059] text-black px-4 py-2 rounded font-bold text-sm hover:bg-[#d4b06a] transition-colors">
                          Choose PDF File
                          <input ref={pdfFileInputRef} type="file" className="hidden" accept=".pdf,application/pdf" onChange={handlePdfFileSelect} />
                        </label>
                        <p className="text-xs text-gray-500 mt-2">Supports PDF files up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleImportPdf}
                  disabled={importingPdf || !pdfFile}
                  className="px-5 py-3 rounded-lg border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-[#0F0E0D] transition-colors min-h-11 font-semibold text-sm disabled:opacity-50 flex-shrink-0"
                >
                  {importingPdf ? 'Importing...' : 'Import PDF'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <input
                    type="url"
                    value={pdfDriveUrl}
                    onChange={(e) => setPdfDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 text-base"
                  />
                  <p className="text-xs text-gray-500">Tip: set the Google Drive file sharing to <span className="text-gray-300">Anyone with the link can view</span> before importing.</p>
                </div>
                <button
                  type="button"
                  onClick={handleImportPdf}
                  disabled={importingPdf || !pdfDriveUrl.trim()}
                  className="px-5 py-3 rounded-lg border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-[#0F0E0D] transition-colors min-h-11 font-semibold text-sm disabled:opacity-50 flex-shrink-0"
                >
                  {importingPdf ? 'Importing...' : 'Import PDF'}
                </button>
              </div>
            )}
          </div>

          <RichTextEditor label="Content" value={content} onChange={setContent} />

          {/* Media */}
          <div className="space-y-4 pt-4 border-t border-[#2F2A26]">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Media Attachment</label>
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
              <button type="button" onClick={() => setMediaType('url')} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors ${mediaType === 'url' ? 'bg-[#C5A059] text-black font-bold' : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26]'}`}><LinkIcon size={16} />External URL</button>
              <button type="button" onClick={() => setMediaType('upload')} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors ${mediaType === 'upload' ? 'bg-[#C5A059] text-black font-bold' : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26]'}`}><UploadCloud size={16} />Upload File</button>
              <button type="button" onClick={() => { setMediaType('library'); openMediaPicker('media'); }} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors ${mediaType === 'library' ? 'bg-[#C5A059] text-black font-bold' : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26]'}`}><Images size={16} />Pick from Library</button>
            </div>
            {mediaType === 'url' ? (<><input type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://..." className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] outline-none transition-all placeholder-gray-600 text-base" /><p className="text-xs text-gray-500">Paste a direct link to an image or PDF hosted elsewhere.</p></>) : mediaType === 'upload' ? (<div className="border border-dashed border-[#2F2A26] rounded-lg p-6 sm:p-8 flex flex-col items-center justify-center bg-[#0F0E0D] text-gray-400">{mediaUploading ? (<div className="flex flex-col items-center"><Loader2 className="animate-spin text-[#C5A059] mb-2" size={24} /><span className="text-sm">Uploading to Cloudinary...</span></div>) : (<><UploadCloud size={32} className="mb-4 text-gray-500" /><label className="cursor-pointer bg-[#C5A059] text-black px-4 py-2 rounded font-bold text-sm hover:bg-[#d4b06a] transition-colors">Choose File<input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, false)} /></label><p className="text-xs text-gray-500 mt-3">Supports JPG, PNG, WEBP, PDF</p></>)}</div>) : (<div className="border border-[#2F2A26] rounded-lg p-4 bg-[#0F0E0D]">{mediaUrl ? (<div className="flex items-center gap-4"><div className="w-16 h-16 rounded-lg overflow-hidden bg-[#191614] flex-shrink-0"><img src={mediaUrl} alt="Selected" className="w-full h-full object-cover" /></div><div className="flex-1 min-w-0"><p className="text-sm text-white font-medium">Image selected from library</p><p className="text-xs text-gray-500 truncate">{mediaUrl}</p></div><button type="button" onClick={() => { setMediaUrl(''); setMediaType('url'); }} className="text-xs text-gray-400 hover:text-red-400 transition-colors flex-shrink-0">Remove</button></div>) : (<button type="button" onClick={() => openMediaPicker('media')} className="w-full py-3 text-sm text-gray-400 hover:text-[#C5A059] transition-colors flex items-center justify-center gap-2"><Images size={16} /> Pick from Media Library</button>)}</div>)}
          </div>

          {/* Cover Image */}
          <div className="space-y-4 pt-4 border-t border-[#2F2A26]">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Cover Image (For Grid/Home)</label>
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
              <button type="button" onClick={() => setCoverImageType('url')} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors ${coverImageType === 'url' ? 'bg-[#C5A059] text-black font-bold' : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26]'}`}><LinkIcon size={16} />External URL</button>
              <button type="button" onClick={() => setCoverImageType('upload')} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors ${coverImageType === 'upload' ? 'bg-[#C5A059] text-black font-bold' : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26]'}`}><UploadCloud size={16} />Upload Image</button>
              <button type="button" onClick={() => { setCoverImageType('library'); openMediaPicker('cover'); }} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors ${coverImageType === 'library' ? 'bg-[#C5A059] text-black font-bold' : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26]'}`}><Images size={16} />Pick from Library</button>
            </div>
            {coverImageType === 'url' ? (<><input type="url" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://images.unsplash.com/..." className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] outline-none transition-all placeholder-gray-600 text-base" /><p className="text-xs text-gray-500">Paste a direct link for the image to show on the category grids and hover states.</p></>) : coverImageType === 'upload' ? (<div className="border border-dashed border-[#2F2A26] rounded-lg p-6 sm:p-8 flex flex-col items-center justify-center bg-[#0F0E0D] text-gray-400">{coverUploading ? (<div className="flex flex-col items-center"><Loader2 className="animate-spin text-[#C5A059] mb-2" size={24} /><span className="text-sm">Uploading Cover...</span></div>) : (<><ImageIcon size={32} className="mb-4 text-gray-500" /><label className="cursor-pointer bg-[#C5A059] text-black px-4 py-2 rounded font-bold text-sm hover:bg-[#d4b06a] transition-colors">Choose Image<input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, true)} /></label><p className="text-xs text-gray-500 mt-3">Supports JPG, PNG, WEBP</p></>)}</div>) : (<div className="border border-[#2F2A26] rounded-lg p-4 bg-[#0F0E0D]">{coverImage ? (<div className="flex items-center gap-4"><div className="w-16 h-16 rounded-lg overflow-hidden bg-[#191614] flex-shrink-0"><img src={coverImage} alt="Selected cover" className="w-full h-full object-cover" /></div><div className="flex-1 min-w-0"><p className="text-sm text-white font-medium">Cover image selected from library</p><p className="text-xs text-gray-500 truncate">{coverImage}</p></div><button type="button" onClick={() => { setCoverImage(''); setCoverImageType('url'); }} className="text-xs text-gray-400 hover:text-red-400 transition-colors flex-shrink-0">Remove</button></div>) : (<button type="button" onClick={() => openMediaPicker('cover')} className="w-full py-3 text-sm text-gray-400 hover:text-[#C5A059] transition-colors flex items-center justify-center gap-2"><Images size={16} /> Pick from Media Library</button>)}</div>)}
          </div>

          {/* Desktop save bar */}
          <div className="pt-6 border-t border-[#2F2A26] flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
            <Link href="/admin/dashboard/posts" className="px-6 py-3 rounded-lg border border-[#2F2A26] text-gray-300 hover:text-white hover:border-[#C5A059] transition-colors text-center">Cancel</Link>
            <button type="submit" disabled={saving} className="flex items-center justify-center gap-2 bg-[#C5A059] text-black px-8 py-3 rounded-lg font-bold uppercase tracking-widest hover:bg-[#d4b06a] transition-colors disabled:opacity-50 min-h-[48px]">
              {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Mobile sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-[#171311]/95 backdrop-blur-md border-t border-[#2F2A26] p-3 z-50 safe-area-bottom">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <Link href="/admin/dashboard/posts" className="px-4 py-3 rounded-lg border border-[#2F2A26] text-gray-300 text-sm font-medium flex-shrink-0">
            Cancel
          </Link>
          <button type="submit" form="edit-post-form" disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-[#C5A059] text-black px-6 py-3 rounded-lg font-bold uppercase tracking-widest hover:bg-[#d4b06a] transition-colors disabled:opacity-50 min-h-[48px] text-sm">
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <ImagePickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaPickerSelect}
        title={mediaPickerTarget === 'cover' ? 'Select Cover Image' : 'Select Media'}
      />

      <ConfirmModal isOpen={importConfirm} title="Replace Content" message="This will replace the current editor content with the imported Google Doc content. Continue?" confirmLabel="Replace" variant="warning" onConfirm={doImport} onCancel={() => setImportConfirm(false)} />

      <ConfirmModal isOpen={pdfImportConfirm} title="Replace Content" message="This will replace the current editor content with the imported PDF content. Continue?" confirmLabel="Replace" variant="warning" onConfirm={doImportPdf} onCancel={() => setPdfImportConfirm(false)} />

      {ocrPdfData && (
        <PdfOcrProcessor
          pdfBase64={ocrPdfData.pdfBase64}
          filename={ocrPdfData.filename}
          onExtracted={handleOcrExtracted}
          onCancel={handleOcrCancel}
        />
      )}
    </div>
  );
}
