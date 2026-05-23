import { uploadToCloudinary } from './cloudinary';

/**
 * Parses the HTML content, finds all <img> tags with inline base64 data URIs,
 * uploads them in parallel to Cloudinary, and replaces their src attributes
 * with permanent Cloudinary URLs. This keeps the document size small
 * and prevents Firestore payload size limits (1MB) from being exceeded.
 *
 * @param content The raw HTML string from the rich text editor.
 * @param showToast Callback to display toast notifications to the user.
 * @returns The updated HTML string.
 */
export async function processBase64Images(
  content: string,
  showToast: (msg: string, type: 'success' | 'error') => void
): Promise<string> {
  if (typeof window === 'undefined') return content;
  if (!content || !content.includes('data:image/')) return content;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const imgs = doc.querySelectorAll('img');
    const base64Imgs: { element: HTMLImageElement; src: string }[] = [];

    imgs.forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (src.startsWith('data:image/')) {
        base64Imgs.push({ element: img, src });
      }
    });

    if (base64Imgs.length === 0) return content;

    showToast(`Uploading ${base64Imgs.length} pasted/inserted image(s) to Cloudinary...`, 'success');

    const uploadPromises = base64Imgs.map(async (imgInfo, index) => {
      try {
        const src = imgInfo.src;
        // Convert base64 data URI to Blob
        const response = await fetch(src);
        if (!response.ok) throw new Error('Failed to fetch base64 data');
        const blob = await response.blob();
        
        // Derive mime type and file extension
        const mime = src.split(';')[0].split(':')[1] || 'image/png';
        const ext = mime.split('/')[1] || 'png';
        
        const file = new File([blob], `pasted-image-${Date.now()}-${index}.${ext}`, { type: mime });
        
        // Upload to Cloudinary
        const result = await uploadToCloudinary(file);
        
        // Replace inline base64 src with Cloudinary URL
        imgInfo.element.setAttribute('src', result.url);
        return true;
      } catch (err) {
        console.error('Failed to upload inline image:', err);
        return false;
      }
    });

    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      showToast(`Successfully uploaded ${successCount} image(s) to Cloudinary.`, 'success');
      return doc.body.innerHTML;
    }
  } catch (err) {
    console.error('Error processing base64 images:', err);
    showToast('Failed to process one or more pasted images.', 'error');
  }

  return content;
}
