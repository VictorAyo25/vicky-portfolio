'use client';
import { Image as ImageIcon, Upload, Trash2, Copy, FileText, AlertTriangle, Settings } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, orderBy, query } from 'firebase/firestore';
import { uploadToCloudinary, getCloudinaryUrl, CloudinaryUploadResult } from '@/lib/cloudinary';
import ConfirmModal from '@/components/admin/ConfirmModal';

interface MediaItem {
  id: string;
  name: string;
  url: string;
  publicId: string;
  size: number;
  width: number;
  height: number;
  format: string;
  createdAt: string;
}

function isCloudinaryConfigured(): boolean {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  return !!(cloudName && cloudName !== 'your_cloud_name' && preset && preset !== 'unsigned_preset');
}

export default function MediaLibraryPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    setConfigured(isCloudinaryConfigured());
  }, []);

  const fetchMedia = useCallback(async () => {
    if (!configured) { setLoading(false); return; }
    try {
      setError(null);
      const q = query(collection(db, 'media'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const items: MediaItem[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as MediaItem[];
      setMediaItems(items);
    } catch (err) {
      console.error('Error fetching media:', err);
      setError('Failed to load media library from database.');
    } finally {
      setLoading(false);
    }
  }, [configured]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleUploadMedia = () => { fileInputRef.current?.click(); };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadToCloudinary(file, (p) => setUploadProgress(p));
      const mediaId = `${result.publicId.replace(/\//g, '_')}_${Date.now()}`;
      await setDoc(doc(db, 'media', mediaId), { name: result.originalFilename, url: result.url, publicId: result.publicId, size: result.bytes, width: result.width, height: result.height, format: result.format, createdAt: new Date().toISOString() });
      showToast('Media uploaded successfully', 'success');
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchMedia();
    } catch (err) {
      console.error('Upload error:', err);
      showToast(err instanceof Error ? err.message : 'Failed to upload file', 'error');
      setUploading(false);
    }
  };

  const handleDeleteMedia = (item: MediaItem) => { setDeleteTarget(item); };

  const confirmDeleteMedia = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'media', deleteTarget.id));
      showToast('Media deleted from library', 'success');
      fetchMedia();
    } catch (err) {
      console.error('Error deleting media:', err);
      showToast('Failed to delete media', 'error');
    } finally { setDeleteTarget(null); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => showToast('Link copied to clipboard', 'info')).catch(() => showToast('Failed to copy link', 'error'));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!configured) {
    return (
      <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-serif text-[#C5A059] mb-2 tracking-wide">Media Library</h1>
          <p className="text-gray-400 font-sans tracking-wide">Manage all your uploaded images and files.</p>
        </div>
        <div className="bg-[#141210] border border-[#2F2A26] rounded-xl p-8 min-h-[400px] flex flex-col items-center justify-center space-y-4">
          <Settings className="h-12 w-12 text-amber-500" />
          <h3 className="text-xl font-serif text-white">Cloudinary Not Configured</h3>
          <p className="text-gray-400 text-center max-w-lg text-sm">To use the media library, set up a free Cloudinary account.</p>
          <div className="mt-4 p-4 bg-[#191614] border border-[#2F2A26] rounded-lg max-w-lg w-full">
            <h4 className="text-white font-semibold mb-2 text-sm">Setup steps:</h4>
            <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
              <li>Sign up at <a href="https://cloudinary.com/users/register/free" target="_blank" rel="noopener noreferrer" className="text-[#C5A059] hover:underline">cloudinary.com</a></li>
              <li>Go to <strong className="text-white">Settings → Upload</strong></li>
              <li>Create an upload preset with <strong className="text-white">Signing Mode: Unsigned</strong></li>
              <li>Copy your <strong className="text-white">Cloud Name</strong> and <strong className="text-white">Upload Preset</strong></li>
              <li>Add them to <code className="text-[#C5A059]">.env.local</code> and restart</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-serif text-[#C5A059] mb-1 tracking-wide">Media Library</h1>
          <p className="text-gray-400 text-sm font-sans">Manage all your uploaded images and files.</p>
        </div>
        <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/*,application/pdf" />
        <button onClick={handleUploadMedia} disabled={uploading} className="bg-[#C5A059] text-black px-5 py-2.5 rounded-lg hover:bg-[#D4AF37] transition-all font-bold uppercase tracking-wider text-xs flex items-center gap-2 disabled:opacity-50">
          <Upload size={16} />
          {uploading ? `Uploading (${Math.round(uploadProgress)}%)` : 'Upload Media'}
        </button>
      </div>

      <div className="bg-[#141210] border border-[#2F2A26] rounded-xl p-6 min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin"></div></div>
        ) : error ? (
          <div className="text-center py-16"><AlertTriangle className="mx-auto h-10 w-10 text-amber-500 mb-3" /><p className="text-gray-400">{error}</p></div>
        ) : mediaItems.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="mx-auto h-10 w-10 text-[#C5A059] mb-3 opacity-50" />
            <h3 className="text-lg font-serif text-white mb-2">Media Library is Empty</h3>
            <p className="text-gray-500 text-sm mb-4">Upload images to use them in your posts.</p>
            <button onClick={handleUploadMedia} className="mx-auto border border-[#C5A059] text-[#C5A059] px-5 py-2 rounded-lg hover:bg-[#C5A059] hover:text-black transition-all text-xs font-bold uppercase tracking-wider">Upload First File</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mediaItems.map((item) => (
              <div key={item.id} className="group relative bg-[#191614] border border-[#2F2A26] rounded-lg overflow-hidden aspect-square flex flex-col justify-between hover:border-[#C5A059] transition-all">
                <div className="flex-1 flex items-center justify-center bg-[#0F0E0D] overflow-hidden p-2">
                  {item.format && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(item.format.toLowerCase()) ? (
                    <img src={getCloudinaryUrl(item.publicId, { width: 300, height: 300, crop: 'fill', quality: 'auto' })} alt={item.name} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <FileText className="w-12 h-12 text-gray-600" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => copyToClipboard(item.url)} className="p-2 bg-[#2F2A26] rounded text-white hover:bg-[#C5A059] hover:text-black transition-colors" title="Copy Link"><Copy size={16} /></button>
                  <button onClick={() => handleDeleteMedia(item)} className="p-2 bg-[#2F2A26] rounded text-white hover:bg-red-500 transition-colors" title="Delete"><Trash2 size={16} /></button>
                </div>
                <div className="p-2 border-t border-[#2F2A26] bg-[#191614] truncate">
                  <p className="text-white text-[10px] font-medium truncate">{item.name}</p>
                  <p className="text-gray-600 text-[9px]">{formatSize(item.size)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal isOpen={!!deleteTarget} title="Delete Media" message={deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.` : ''} confirmLabel="Delete" variant="danger" onConfirm={confirmDeleteMedia} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
