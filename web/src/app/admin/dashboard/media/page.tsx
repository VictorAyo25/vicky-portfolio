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

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const isCloudinaryConfigured =
  CLOUD_NAME &&
  CLOUD_NAME !== 'your_cloud_name' &&
  UPLOAD_PRESET &&
  UPLOAD_PRESET !== 'unsigned_preset';

export default function MediaLibraryPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);

  const fetchMedia = useCallback(async () => {
    if (!isCloudinaryConfigured) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const q = query(collection(db, 'media'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const items: MediaItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MediaItem[];
      setMediaItems(items);
    } catch (err) {
      console.error('Error fetching media:', err);
      setError('Failed to load media library from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleUploadMedia = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadToCloudinary(file, (progress) => {
        setUploadProgress(progress);
      });
      const mediaId = `${result.publicId.replace(/\//g, '_')}_${Date.now()}`;
      await setDoc(doc(db, 'media', mediaId), {
        name: result.originalFilename,
        url: result.url,
        publicId: result.publicId,
        size: result.bytes,
        width: result.width,
        height: result.height,
        format: result.format,
        createdAt: new Date().toISOString(),
      });
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

  const handleDeleteMedia = (item: MediaItem) => {
    setDeleteTarget(item);
  };

  const confirmDeleteMedia = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'media', deleteTarget.id));
      showToast('Media deleted from library', 'success');
      fetchMedia();
    } catch (err) {
      console.error('Error deleting media:', err);
      showToast('Failed to delete media', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Link copied to clipboard', 'info');
    }).catch(() => {
      showToast('Failed to copy link', 'error');
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isCloudinaryConfigured) {
    return (
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-4xl font-serif text-[#C5A059] mb-2 tracking-wide">Media Library</h1>
          <p className="text-gray-400 max-w-2xl font-sans tracking-wide">
            Manage all your uploaded images and files in one place.
          </p>
        </div>
        <div className="bg-[#141210] border border-[#2F2A26] rounded-xl p-8 min-h-[400px]">
          <div className="flex flex-col items-center justify-center h-full space-y-4 pt-8">
            <Settings className="mx-auto h-12 w-12 text-amber-500 mb-2" />
            <h3 className="text-xl font-serif text-white mb-2">Cloudinary Not Configured</h3>
            <p className="text-gray-400 font-sans tracking-wide text-center max-w-lg">
              To use the media library, you need to set up a free Cloudinary account. This takes about 2 minutes.
            </p>
            <div className="mt-4 p-4 bg-[#191614] border border-[#2F2A26] rounded-lg max-w-lg">
              <h4 className="text-white font-semibold mb-2 text-sm">Setup steps:</h4>
              <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
                <li>Sign up for free at <a href="https://cloudinary.com/users/register/free" target="_blank" rel="noopener noreferrer" className="text-[#C5A059] hover:underline">cloudinary.com</a></li>
                <li>Go to <strong className="text-white">Settings → Upload</strong> in the Cloudinary dashboard</li>
                <li>Click <strong className="text-white">"Add upload preset"</strong>, name it anything, and set <strong className="text-white">Signing Mode</strong> to <strong className="text-white">"Unsigned"</strong></li>
                <li>Copy your <strong className="text-white">Cloud Name</strong> and the <strong className="text-white">Upload Preset</strong> name</li>
                <li>Paste them into <code className="text-[#C5A059]">.env.local</code>:
                  <pre className="mt-1 p-2 bg-[#0F0E0D] rounded text-xs text-gray-300 overflow-x-auto">
{`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset_name`}
                  </pre>
                </li>
                <li>Restart the dev server</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-serif text-[#C5A059] mb-2 tracking-wide">Media Library</h1>
          <p className="text-gray-400 max-w-2xl font-sans tracking-wide">
            Manage all your uploaded images and files in one place.
          </p>
        </div>
        <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/*,application/pdf" />
        <button onClick={handleUploadMedia} disabled={uploading} className="bg-[#C5A059] text-black px-6 py-2.5 rounded hover:bg-[#D4AF37] transition-all font-sans font-bold uppercase tracking-wider text-sm flex items-center gap-2 disabled:opacity-50">
          <Upload size={18} />
          {uploading ? `Uploading (${Math.round(uploadProgress)}%)` : 'Upload Media'}
        </button>
      </div>

      <div className="bg-[#141210] border border-[#2F2A26] rounded-xl p-8 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 pt-16">
            <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400">Loading library...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 pt-16">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-2" />
            <h3 className="text-xl font-serif text-white mb-2">Error</h3>
            <p className="text-gray-400 font-sans tracking-wide text-center max-w-md">{error}</p>
            <button onClick={fetchMedia} className="mt-4 border border-[#C5A059] text-[#C5A059] px-6 py-2 rounded hover:bg-[#C5A059] hover:text-black transition-all font-sans font-bold uppercase tracking-wider text-sm">Try Again</button>
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="text-center pt-8">
            <ImageIcon className="mx-auto h-12 w-12 text-[#C5A059] mb-4 opacity-50" />
            <h3 className="text-xl font-serif text-white mb-2">Media Library is Empty</h3>
            <p className="text-gray-400 font-sans tracking-wide mb-6">Upload images to use them in your blog posts and across your site.</p>
            <button onClick={handleUploadMedia} className="mx-auto border border-[#C5A059] text-[#C5A059] px-6 py-2 rounded hover:bg-[#C5A059] hover:text-black transition-all font-sans font-bold uppercase tracking-wider text-sm">Upload First File</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {mediaItems.map((item) => (
              <div key={item.id} className="group relative bg-[#191614] border border-[#2F2A26] rounded-lg overflow-hidden aspect-square flex flex-col justify-between hover:border-[#C5A059] transition-all">
                <div className="flex-1 flex items-center justify-center bg-[#0F0E0D] overflow-hidden p-2">
                  {item.format && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(item.format.toLowerCase()) ? (
                    <img src={getCloudinaryUrl(item.publicId, { width: 400, height: 400, crop: 'fill', quality: 'auto' })} alt={item.name} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <FileText className="w-16 h-16 text-gray-500" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <button onClick={() => copyToClipboard(item.url)} className="p-2 bg-[#2F2A26] rounded text-white hover:bg-[#C5A059] hover:text-black transition-colors" title="Copy Link"><Copy size={18} /></button>
                  <button onClick={() => handleDeleteMedia(item)} className="p-2 bg-[#2F2A26] rounded text-white hover:bg-red-500 transition-colors" title="Delete File"><Trash2 size={18} /></button>
                </div>
                <div className="p-3 border-t border-[#2F2A26] bg-[#191614] z-10 truncate">
                  <p className="text-white text-xs font-medium truncate" title={item.name}>{item.name}</p>
                  <p className="text-gray-500 text-[10px] mt-1">{formatSize(item.size)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Media"
        message={deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteMedia}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
