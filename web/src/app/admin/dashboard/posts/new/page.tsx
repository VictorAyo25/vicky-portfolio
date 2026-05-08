'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { fetchTaxonomy, addSubcategory, Taxonomy } from '@/lib/taxonomy';
import { useToast } from '@/context/ToastContext';
import { Loader2, Save, Image as ImageIcon, Link as LinkIcon, Plus, UploadCloud, Images, Tag, FileText, X } from 'lucide-react';
import RichTextEditor from '@/components/admin/RichTextEditor';
import ImagePickerModal from '@/components/admin/ImagePickerModal';
import ConfirmModal from '@/components/admin/ConfirmModal';

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

  // Category creation state
  const [isNewCategoryMode, setIsNewCategoryMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [submittingCategory, setSubmittingCategory] = useState(false);

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
      // Refresh taxonomy
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
    setLoading(true);
    try {
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
      router.push('/admin/dashboard');
      showToast('Post created successfully!', 'success');
    } catch (err) {
      console.error('Error creating post:', err);
      showToast('Failed to create post. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
      showToast('Google Doc imported successfully.', 'success');
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : 'Failed to import document.', 'error');
    } finally {
      setImportingDoc(false);
    }
  };

  const currentSubCategories = (category && taxonomy && taxonomy[category]) || [];

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif text-[#F3F4F6] mb-2">Create New Post</h1>
            <p className="text-gray-400 text-sm">Add new content to your portfolio.</p>
          </div>
        </header>

        <form onSubmit={handleCreatePost} className="space-y-8 bg-[#191614] p-8 rounded-2xl border border-[#2F2A26]">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Title <span className="text-red-400">*</span></label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter post title..." className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600" required />
          </div>

          {/* Short Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059] flex items-center gap-2">
              <FileText size={14} /> Short Description / Tagline
              <span className="text-gray-500 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief tagline or summary of this post..." rows={2} className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 resize-none" />
            <p className="text-xs text-gray-500">Used for SEO meta description and post card previews.</p>
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059] flex items-center gap-2">
              <Tag size={14} /> Keywords / Tags
              <span className="text-gray-500 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input type="text" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyDown={handleKeywordKeyDown} placeholder="Type a keyword and press Enter..." className="flex-1 bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600" />
              <button type="button" onClick={addKeyword} className="px-4 py-2.5 rounded-lg border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-black transition-colors text-sm font-bold">Add</button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059] flex justify-between">
                <span>Category <span className="text-red-400">*</span></span>
                <button type="button" onClick={() => setIsNewCategoryMode(!isNewCategoryMode)} className="text-[10px] text-gray-400 hover:text-[#C5A059] flex items-center gap-1 transition-colors">
                  <Plus size={12} /> {isNewCategoryMode ? 'Select Existing' : 'Create New'}
                </button>
              </label>
              {isNewCategoryMode ? (
                <div className="space-y-3">
                  <input type="text" value={newCategoryName} onChange={handleCategoryNameChange} placeholder="New category name..." className="w-full bg-[#0F0E0D] border border-[#C5A059] rounded-lg px-4 py-3 text-white focus:outline-none placeholder-gray-600" />
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
                <select value={category} onChange={(e) => { setCategory(e.target.value); setSubCategory(''); setIsNewSubCategoryMode(false); }} className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] outline-none appearance-none" required>
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
                <input type="text" value={newSubCategoryName} onChange={(e) => setNewSubCategoryName(e.target.value)} placeholder="Type new subcategory name..." className="w-full bg-[#0F0E0D] border border-[#C5A059] rounded-lg px-4 py-3 text-white focus:outline-none placeholder-gray-600" />
              ) : (
                <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] outline-none appearance-none disabled:opacity-50" disabled={!category || isNewCategoryMode}>
                  <option value="">Select Subcategory</option>
                  {currentSubCategories.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Google Docs Import */}
          <div className="space-y-3 border border-[#2F2A26] rounded-xl p-4 bg-[#171311]">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Import from Google Docs</label>
                <input type="url" value={googleDocUrl} onChange={(e) => setGoogleDocUrl(e.target.value)} placeholder="https://docs.google.com/document/d/..." className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600" />
                <p className="text-xs text-gray-500">Tip: set the Google Doc sharing to <span className="text-gray-300">Anyone with the link can view</span> before importing.</p>
              </div>
              <button type="button" onClick={handleImportFromGoogleDocs} disabled={importingDoc} className="px-5 py-3 rounded-lg border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-[#0F0E0D] transition-colors min-h-11 font-semibold text-sm disabled:opacity-50">
                {importingDoc ? 'Importing...' : 'Import Doc'}
              </button>
            </div>
          </div>

          <RichTextEditor label="Content" value={content} onChange={setContent} />

          {/* Media */}
          <div className="space-y-4 pt-4 border-t border-[#2F2A26]">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Media Attachment</label>
            <div className="flex flex-wrap gap-3 mb-4">
              <button type="button" onClick={() => setMediaType('url')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${mediaType === 'url' ? 'bg-[#C5A059] text-black font-bold' : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26]'}`}><LinkIcon size={16} />External URL</button>
              <button type="button" onClick={() => setMediaType('upload')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${mediaType === 'upload' ? 'bg-[#C5A059] text-black font-bold' : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26]'}`}><UploadCloud size={16} />Upload File</button>
              <button type="button" onClick={() => { setMediaType('library'); openMediaPicker('media'); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${mediaType === 'library' ? 'bg-[#C5A059] text-black font-bold' : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26]'}`}><Images size={16} />Pick from Library</button>
            </div>
            {mediaType === 'url' ? (<><input type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://..." className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] outline-none transition-all placeholder-gray-600" /><p className="text-xs text-gray-500">Paste a direct link to an image or PDF.</p></>) : mediaType === 'upload' ? (<div className="border border-dashed border-[#2F2A26] rounded-lg p-8 flex flex-col items-center justify-center bg-[#0F0E0D] text-gray-400">{mediaUploading ? (<div className="flex flex-col items-center"><Loader2 className="animate-spin text-[#C5A059] mb-2" size={24} /><span className="text-sm">Uploading to Cloudinary...</span></div>) : (<><UploadCloud size={32} className="mb-4 text-gray-500" /><label className="cursor-pointer bg-[#C5A059] text-black px-4 py-2 rounded font-bold text-sm hover:bg-[#d4b06a] transition-colors">Choose File<input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, false)} /></label><p className="text-xs text-gray-500 mt-3">Supports JPG, PNG, WEBP, PDF</p></>)}</div>) : (<div className="border border-[#2F2A26] rounded-lg p-4 bg-[#0F0E0D]">{mediaUrl ? (<div className="flex items-center gap-4"><div className="w-16 h-16 rounded-lg overflow-hidden bg-[#191614] flex-shrink-0"><img src={mediaUrl} alt="Selected" className="w-full h-full object-cover" /></div><div className="flex-1 min-w-0"><p className="text-sm text-white font-medium">Image selected from library</p><p className="text-xs text-gray-500 truncate">{mediaUrl}</p></div><button type="button" onClick={() => { setMediaUrl(''); setMediaType('url'); }} className="text-xs text-gray-400 hover:text-red-400 transition-colors">Remove</button></div>) : (<button type="button" onClick={() => openMediaPicker('media')} className="w-full py-3 text-sm text-gray-400 hover:text-[#C5A059] transition-colors flex items-center justify-center gap-2"><Images size={18} />Browse Media Library</button>)}</div>)}
          </div>

          {/* Cover Image */}
          <div className="space-y-4 pt-4 border-t border-[#2F2A26]">
            <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Cover Image (For Grid/Home)</label>
            <div className="flex flex-wrap gap-3 mb-4">
              <button type="button" onClick={() => setCoverImageType('url')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${coverImageType === 'url' ? 'bg-[#C5A059] text-black font-bold' : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26]'}`}><LinkIcon size={16} />External URL</button>
              <button type="button" onClick={() => setCoverImageType('upload')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${coverImageType === 'upload' ? 'bg-[#C5A059] text-black font-bold' : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26]'}`}><UploadCloud size={16} />Upload Image</button>
              <button type="button" onClick={() => { setCoverImageType('library'); openMediaPicker('cover'); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${coverImageType === 'library' ? 'bg-[#C5A059] text-black font-bold' : 'bg-[#0F0E0D] text-gray-400 border border-[#2F2A26]'}`}><Images size={16} />Pick from Library</button>
            </div>
            {coverImageType === 'url' ? (<><input type="url" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://images.unsplash.com/..." className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] outline-none transition-all placeholder-gray-600" /><p className="text-xs text-gray-500">Paste a direct link for the image to show on the category grids and hover states.</p></>) : coverImageType === 'upload' ? (<div className="border border-dashed border-[#2F2A26] rounded-lg p-8 flex flex-col items-center justify-center bg-[#0F0E0D] text-gray-400">{coverUploading ? (<div className="flex flex-col items-center"><Loader2 className="animate-spin text-[#C5A059] mb-2" size={24} /><span className="text-sm">Uploading Cover...</span></div>) : (<><ImageIcon size={32} className="mb-4 text-gray-500" /><label className="cursor-pointer bg-[#C5A059] text-black px-4 py-2 rounded font-bold text-sm hover:bg-[#d4b06a] transition-colors">Choose Image<input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, true)} /></label><p className="text-xs text-gray-500 mt-3">Supports JPG, PNG, WEBP</p></>)}</div>) : (<div className="border border-[#2F2A26] rounded-lg p-4 bg-[#0F0E0D]">{coverImage ? (<div className="flex items-center gap-4"><div className="w-16 h-16 rounded-lg overflow-hidden bg-[#191614] flex-shrink-0"><img src={coverImage} alt="Selected cover" className="w-full h-full object-cover" /></div><div className="flex-1 min-w-0"><p className="text-sm text-white font-medium">Cover image selected from library</p><p className="text-xs text-gray-500 truncate">{coverImage}</p></div><button type="button" onClick={() => { setCoverImage(''); setCoverImageType('url'); }} className="text-xs text-gray-400 hover:text-red-400 transition-colors">Remove</button></div>) : (<button type="button" onClick={() => openMediaPicker('cover')} className="w-full py-3 text-sm text-gray-400 hover:text-[#C5A059] transition-colors flex items-center justify-center gap-2"><Images size={18} />Browse Media Library</button>)}</div>)}
          </div>

          <div className="pt-6 border-t border-[#2F2A26] flex justify-end">
            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-[#C5A059] text-black px-8 py-3 rounded-lg font-bold uppercase tracking-widest hover:bg-[#d4b06a] transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
              {loading ? 'Publishing...' : 'Publish Post'}
            </button>
          </div>
        </form>
      </motion.div>

      <ImagePickerModal isOpen={showMediaPicker} onClose={() => setShowMediaPicker(false)} onSelect={handleMediaPickerSelect} title={mediaPickerTarget === 'cover' ? 'Select Cover Image' : 'Select Media'} />

      <ConfirmModal isOpen={importConfirm} title="Replace Content" message="This will replace the current editor content with the imported Google Doc content. Continue?" confirmLabel="Replace" variant="warning" onConfirm={doImportGoogleDocs} onCancel={() => setImportConfirm(false)} />
    </div>
  );
}
