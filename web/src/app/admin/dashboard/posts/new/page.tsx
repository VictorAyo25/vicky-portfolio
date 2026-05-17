'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { fetchTaxonomy, addSubcategory, Taxonomy } from '@/lib/taxonomy';
import { useToast } from '@/context/ToastContext';
import { Loader2, Save, Image as ImageIcon, Link as LinkIcon, Plus, UploadCloud, Images, Tag, FileText, X, CloudOff, Cloud, FileUp, Upload } from 'lucide-react';
import RichTextEditor from '@/components/admin/RichTextEditor';
import ImagePickerModal from '@/components/admin/ImagePickerModal';
import ConfirmModal from '@/components/admin/ConfirmModal';
import PdfOcrProcessor, { type ExtractedLink } from '@/components/admin/PdfOcrProcessor';
import { textToStructuredHtml } from '@/lib/textToHtml';

const AUTOSAVE_DEBOUNCE_MS = 3000;
const SAVE_TIMEOUT_MS = 30000;
const LOCALSTORAGE_KEY = 'draft_new_post';

export default function CreatePost() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [content, setContent] = useState('');
  const [mediaType, setMediaType] = useState<'url' | 'upload' | 'library'>('url');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaUploading, setMediaUploading] = useState(false);
  const [coverImageType, setCoverImageType] = useState<'url' | 'upload' | 'library'>('url');
  const [coverImage, setCoverImage] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [isNewSubCategoryMode, setIsNewSubCategoryMode] = useState(false);
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const [importingDoc, setImportingDoc] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [importConfirm, setImportConfirm] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'media' | 'cover'>('media');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // PDF import state
  const [pdfSource, setPdfSource] = useState<'file' | 'gdrive'>('file');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDriveUrl, setPdfDriveUrl] = useState('');
  const [importingPdf, setImportingPdf] = useState(false);
  const [pdfImportConfirm, setPdfImportConfirm] = useState(false);
  const [ocrPdfData, setOcrPdfData] = useState<{ pdfBase64: string; filename: string } | null>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);

  // Category creation state
  const [isNewCategoryMode, setIsNewCategoryMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [submittingCategory, setSubmittingCategory] = useState(false);

  const isSavingRef = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedState = useRef<string>('');

  // Track unsaved changes
  const formStateKey = useMemo(() => {
    return JSON.stringify({ title, description, keywords, category, subCategory, content, mediaType, mediaUrl, coverImage });
  }, [title, description, keywords, category, subCategory, content, mediaType, mediaUrl, coverImage]);

  useEffect(() => {
    setHasUnsavedChanges(formStateKey !== lastSavedState.current);
  }, [formStateKey]);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem(LOCALSTORAGE_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        const draftAge = Date.now() - (parsed.timestamp || 0);
        if (draftAge < 24 * 60 * 60 * 1000) {
          const restoreDraft = window.confirm('You have an unsaved draft from a previous session. Restore it?');
          if (restoreDraft) {
            setTitle(parsed.title || '');
            setDescription(parsed.description || '');
            setKeywords(parsed.keywords || []);
            setCategory(parsed.category || '');
            setSubCategory(parsed.subCategory || '');
            setContent(parsed.content || '');
            setMediaUrl(parsed.mediaUrl || '');
            setCoverImage(parsed.coverImage || '');
            showToast('Draft restored from local storage', 'success');
          }
        }
        localStorage.removeItem(LOCALSTORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [showToast]);

  // Auto-save to localStorage
  const saveDraftLocal = useCallback(() => {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({
        title, description, keywords, category, subCategory, content, mediaType, mediaUrl, coverImage,
        timestamp: Date.now(),
      }));
    } catch {
      // Storage full
    }
  }, [title, description, keywords, category, subCategory, content, mediaType, mediaUrl, coverImage]);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveDraftLocal();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [formStateKey, saveDraftLocal]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (isCover) setCoverUploading(true);
      else setMediaUploading(true);
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
      if (isCover) setCoverUploading(false);
      else setMediaUploading(false);
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
    html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

  // Category creation
  const handleCategoryNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setNewCategoryName(name);
    setNewCategorySlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !newCategorySlug.trim()) {
      showToast('Category name is required', 'error');
      return;
    }
    setSubmittingCategory(true);
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCategoryName.trim(),
        slug: newCategorySlug.trim(),
        createdAt: serverTimestamp(),
      });
      showToast('Category created successfully', 'success');
      setNewCategoryName('');
      setNewCategorySlug('');
      setIsNewCategoryMode(false);
      const data = await fetchTaxonomy();
      setTaxonomy(data);
    } catch (err) {
      console.error('Error creating category:', err);
      showToast('Failed to create category', 'error');
    } finally {
      setSubmittingCategory(false);
    }
  };

  useEffect(() => {
    async function loadTaxonomy() {
      try {
        const data = await fetchTaxonomy();
        setTaxonomy(data);
      } catch (err) {
        console.error('Failed to load taxonomy', err);
      }
    }
    loadTaxonomy();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!getPlainText(content)) {
      showToast('Please add some content before publishing.', 'error');
      return;
    }
    if (isSavingRef.current) {
      showToast('Already saving, please wait...', 'error');
      return;
    }

    isSavingRef.current = true;
    setLoading(true);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Save timed out')), SAVE_TIMEOUT_MS)
    );

    try {
      const savePromise = (async () => {
        let finalSubCategory = subCategory;
        if (isNewSubCategoryMode && newSubCategoryName.trim()) {
          await addSubcategory(category, newSubCategoryName.trim());
          finalSubCategory = newSubCategoryName.trim();
          if (taxonomy) {
            setTaxonomy({
              ...taxonomy,
              [category]: [...(taxonomy[category] || []), finalSubCategory].sort(),
            });
          }
        }
        await addDoc(collection(db, 'posts'), {
          title,
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          description: description.trim(),
          keywords,
          category,
          subCategory: finalSubCategory,
          content,
          mediaType,
          mediaUrl,
          coverImage,
          published: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })();

      await Promise.race([savePromise, timeoutPromise]);

      // Clear draft on success
      localStorage.removeItem(LOCALSTORAGE_KEY);
      lastSavedState.current = formStateKey;

      showToast('Post created successfully!', 'success');
      router.push('/admin/dashboard');
    } catch (err) {
      console.error('Error creating post:', err);
      if (err instanceof Error && err.message === 'Save timed out') {
        showToast('Save is taking too long. Your draft is saved locally — try again shortly.', 'error');
      } else {
        showToast('Failed to create post. Your draft is saved locally — try again.', 'error');
      }
      saveDraftLocal();
    } finally {
      setLoading(false);
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
      setImportConfirm(true);
      return;
    }
    await doImportGoogleDocs();
  };

  const doImportGoogleDocs = async () => {
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
        // File upload via FormData
        const formData = new FormData();
        formData.append('file', pdfFile);
        response = await fetch('/api/import/pdf', {
          method: 'POST',
          body: formData,
        });
      } else {
        // Google Drive link via JSON
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

  const handleOcrExtracted = (text: string, links: ExtractedLink[]) => {
    if (!title.trim() && ocrPdfData) {
      // Derive title from first line
      const firstLine = text.split('\n').map(l => l.trim()).filter(Boolean)[0];
      if (firstLine && firstLine.length < 120) setTitle(firstLine);
    }
    // Convert raw OCR text to structured HTML (headings, paragraphs, lists)
    const html = textToStructuredHtml(text);
    setContent(html);
    setOcrPdfData(null);
    const linkMsg = links.length > 0 ? ` ${links.length} link(s) found — add them manually from the preview above.` : '';
    showToast(`Text extracted and loaded into editor.${linkMsg}`, 'success');
  };

  const handleOcrCancel = () => {
    setOcrPdfData(null);
  };

  const currentSubCategories = (category && taxonomy && taxonomy[category]) || [];

  return (
    <div className="p-4 sm:p-8 lg:p-12 max-w-5xl mx-auto pb-28 lg:pb-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <header className="mb-6 sm:mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-serif text-[#F3F4F6]">Create New Post</h1>
            <span className="inline-flex items-center gap-1.5 text-xs">
              {hasUnsavedChanges ? (
                <><CloudOff size={12} className="text-amber-400" /><span className="text-amber-400">Unsaved</span></>
              ) : (
                <><Cloud size={12} className="text-gray-500" /><span className="text-gray-500">Auto-saves locally</span></>
              )}
            </span>
          </div>
          <p className="text-gray-400 text-sm">Add new content to your portfolio.</p>
        </header>

        <form id="create-post-form" onSubmit={handleCreatePost} className="space-y-6 sm:space-y-8 bg-[#191614] p-4 sm:p-6 lg:p-8 rounded-2xl border border-[#2F2A26]">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Title <span className="text-red-400">*</span></label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter post title..." className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 text-base" required />
          </div>

          {/* Short Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059] flex items-center gap-2">
              <FileText size={14} /> Short Description / Tagline
              <span className="text-gray-500 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief tagline or summary of this post..." rows={2} className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 resize-none text-base" />
            <p className="text-xs text-gray-500">Used for SEO meta description and post card previews.</p>
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059] flex items-center gap-2">
              <Tag size={14} /> Keywords / Tags
              <span className="text-gray-500 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input type="text" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyDown={handleKeywordKeyDown} placeholder="Type a keyword and press Enter..." className="flex-1 bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 text-base" />
              <button type="button" onClick={addKeyword} className="px-4 py-2.5 rounded-lg border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-black transition-colors text-sm font-bold flex-shrink-0">Add</button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((kw, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] px-3 py-1 rounded-full text-xs font-medium">
                    {kw}
                    <button type="button" onClick={() => removeKeyword(i)} className="hover:text-red-400 transition-colors"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059] flex justify-between">
                <span>Category <span className="text-red-400">*</span></span>
                <button type="button" onClick={() => setIsNewCategoryMode(!isNewCategoryMode)} className="text-[10px] text-gray-400 hover:text-[#C5A059] flex items-center gap-1 transition-colors">
                  <Plus size={12} /> {isNewCategoryMode ? 'Select Existing' : 'Create New'}
                </button>
              </label>
              {isNewCategoryMode ? (
                <div className="space-y-3">
                  <input type="text" value={newCategoryName} onChange={handleCategoryNameChange} placeholder="New category name..." className="w-full bg-[#0F0E0D] border border-[#C5A059] rounded-lg px-4 py-3 text-white focus:outline-none placeholder-gray-600 text-base" />
                  {newCategorySlug && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Slug:</span>
                      <code className="text-xs text-[#C5A059] bg-[#0F0E0D] px-2 py-1 rounded">{newCategorySlug}</code>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={handleCreateCategory} disabled={submittingCategory || !newCategoryName.trim()} className="px-4 py-2 rounded-lg bg-[#C5A059] text-black font-bold text-sm hover:bg-[#D4AF37] transition-colors disabled:opacity-50">
                      {submittingCategory ? 'Creating...' : 'Create Category'}
                    </button>
                    <button type="button" onClick={() => { setIsNewCategoryMode(false); setNewCategoryName(''); setNewCategorySlug(''); }} className="px-4 py-2 rounded-lg border border-[#2F2A26] text-gray-400 text-sm hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <select value={category} onChange={(e) => { setCategory(e.target.value); setSubCategory(''); setIsNewSubCategoryMode(false); }} className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] outline-none appearance-none text-base" required>
                  <option value="">Select Category</option>
                  {taxonomy && Object.keys(taxonomy).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059] flex justify-between">
                <span>Subcategory</span>
                {category && !isNewCategoryMode && (
                  <button type="button" onClick={() => setIsNewSubCategoryMode(!isNewSubCategoryMode)} className="text-[10px] text-gray-400 hover:text-[#C5A059] flex items-center gap-1 transition-colors">
                    <Plus size={12} /> {isNewSubCategoryMode ? 'Select Existing' : 'Create New'}
                  </button>
                )}
              </label>
              {isNewSubCategoryMode ? (
                <input type="text" value={newSubCategoryName} onChange={(e) => setNewSubCategoryName(e.target.value)} placeholder="Type new subcategory name..." className="w-full bg-[#0F0E0D] border border-[#C5A059] rounded-lg px-4 py-3 text-white focus:outline-none placeholder-gray-600 text-base" />
              ) : (
                <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] outline-none appearance-none disabled:opacity-50 text-base" disabled={!category || isNewCategoryMode}>
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
                <input type="url" value={googleDocUrl} onChange={(e) => setGoogleDocUrl(e.target.value)} placeholder="https://docs.google.com/document/d/..." className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 text-base" />
                <p className="text-xs text-gray-500">Tip: set the Google Doc sharing to <span className="text-gray-300">Anyone with the link can view</span> before importing.</p>
              </div>
              <button type="button" onClick={handleImportFromGoogleDocs} disabled={importingDoc} className="px-5 py-3 rounded-lg border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-[#0F0E0D] transition-colors min-h-11 font-semibold text-sm disabled:opacity-50 flex-shrink-0">
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
            {mediaType === 'url' ? (<><input type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://..." className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] outline-none transition-all placeholder-gray-600 text-base" /><p className="text-xs text-gray-500">Paste a direct link to an image or PDF.</p></>) : mediaType === 'upload' ? (<div className="border border-dashed border-[#2F2A26] rounded-lg p-6 sm:p-8 flex flex-col items-center justify-center bg-[#0F0E0D] text-gray-400">{mediaUploading ? (<div className="flex flex-col items-center"><Loader2 className="animate-spin text-[#C5A059] mb-2" size={24} /><span className="text-sm">Uploading to Cloudinary...</span></div>) : (<><UploadCloud size={32} className="mb-4 text-gray-500" /><label className="cursor-pointer bg-[#C5A059] text-black px-4 py-2 rounded font-bold text-sm hover:bg-[#d4b06a] transition-colors">Choose File<input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, false)} /></label><p className="text-xs text-gray-500 mt-3">Supports JPG, PNG, WEBP, PDF</p></>)}</div>) : (<div className="border border-[#2F2A26] rounded-lg p-4 bg-[#0F0E0D]">{mediaUrl ? (<div className="flex items-center gap-4"><div className="w-16 h-16 rounded-lg overflow-hidden bg-[#191614] flex-shrink-0"><img src={mediaUrl} alt="Selected" className="w-full h-full object-cover" /></div><div className="flex-1 min-w-0"><p className="text-sm text-white font-medium">Image selected from library</p><p className="text-xs text-gray-500 truncate">{mediaUrl}</p></div><button type="button" onClick={() => { setMediaUrl(''); setMediaType('url'); }} className="text-xs text-gray-400 hover:text-red-400 transition-colors flex-shrink-0">Remove</button></div>) : (<button type="button" onClick={() => openMediaPicker('media')} className="w-full py-3 text-sm text-gray-400 hover:text-[#C5A059] transition-colors flex items-center justify-center gap-2"><Images size={16} /> Pick from Media Library</button>)}</div>)}
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

          {/* Desktop save */}
          <div className="pt-6 border-t border-[#2F2A26] flex justify-end">
            <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 bg-[#C5A059] text-black px-8 py-3 rounded-lg font-bold uppercase tracking-widest hover:bg-[#d4b06a] transition-colors disabled:opacity-50 min-h-[48px]">
              {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
              {loading ? 'Publishing...' : 'Publish Post'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Mobile sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-[#171311]/95 backdrop-blur-md border-t border-[#2F2A26] p-3 z-50">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <button type="button" onClick={() => router.push('/admin/dashboard')} className="px-4 py-3 rounded-lg border border-[#2F2A26] text-gray-300 text-sm font-medium flex-shrink-0">
            Cancel
          </button>
          <button type="submit" form="create-post-form" disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-[#C5A059] text-black px-6 py-3 rounded-lg font-bold uppercase tracking-widest hover:bg-[#d4b06a] transition-colors disabled:opacity-50 min-h-[48px] text-sm">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {loading ? 'Publishing...' : 'Publish Post'}
          </button>
        </div>
      </div>

      <ImagePickerModal isOpen={showMediaPicker} onClose={() => setShowMediaPicker(false)} onSelect={handleMediaPickerSelect} title={mediaPickerTarget === 'cover' ? 'Select Cover Image' : 'Select Media'} />

      <ConfirmModal isOpen={importConfirm} title="Replace Content" message="This will replace the current editor content with the imported Google Doc content. Continue?" confirmLabel="Replace" variant="warning" onConfirm={doImportGoogleDocs} onCancel={() => setImportConfirm(false)} />

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
