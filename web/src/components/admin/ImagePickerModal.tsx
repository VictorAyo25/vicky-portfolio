'use client';

import { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Check, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getCloudinaryUrl } from '@/lib/cloudinary';

interface MediaItem {
  id: string;
  name: string;
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
}

export default function ImagePickerModal({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Image',
}: ImagePickerModalProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedId(null);
      return;
    }

    async function fetchMedia() {
      setLoading(true);
      try {
        const q = query(collection(db, 'media'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const mediaItems: MediaItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as MediaItem[];
        setItems(mediaItems);
      } catch (err) {
        console.error('Failed to fetch media:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMedia();
  }, [isOpen]);

  const handleConfirm = () => {
    const selected = items.find((item) => item.id === selectedId);
    if (selected) {
      onSelect(selected.url);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#191614] border border-[#2F2A26] rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2F2A26]">
          <h2 className="text-lg font-serif text-[#F3F4F6]">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2F2A26] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
              <p className="text-gray-400 text-sm">Loading media library...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <ImageIcon className="w-12 h-12 text-gray-600" />
              <p className="text-gray-400 text-sm">No images in library</p>
              <p className="text-gray-500 text-xs">
                Upload images in the Media Library first
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => {
                const isSelected = selectedId === item.id;
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(
                  (item.format || '').toLowerCase()
                );

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`relative group rounded-lg overflow-hidden aspect-square border-2 transition-all ${
                      isSelected
                        ? 'border-[#C5A059] ring-2 ring-[#C5A059]/30'
                        : 'border-[#2F2A26] hover:border-[#C5A059]/50'
                    }`}
                  >
                    {isImage && item.publicId ? (
                      <img
                        src={getCloudinaryUrl(item.publicId, {
                          width: 300,
                          height: 300,
                          crop: 'fill',
                          quality: 'auto',
                        })}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0F0E0D] flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-gray-600" />
                      </div>
                    )}

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#C5A059]/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-[#C5A059] flex items-center justify-center">
                          <Check size={18} className="text-black" />
                        </div>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-[10px] truncate">{item.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[#2F2A26]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-[#2F2A26] text-gray-300 hover:text-white hover:border-[#C5A059] transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="px-5 py-2.5 rounded-lg bg-[#C5A059] text-black font-bold text-sm hover:bg-[#D4AF37] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Select Image
          </button>
        </div>
      </div>
    </div>
  );
}
