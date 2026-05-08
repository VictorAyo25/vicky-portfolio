const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  originalFilename: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Upload a file to Cloudinary using unsigned upload (no server-side signing needed).
 * Requires an "unsigned" upload preset configured in your Cloudinary dashboard.
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME || CLOUD_NAME === 'your_cloud_name') {
    throw new Error(
      'Cloudinary cloud name not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in .env.local'
    );
  }
  if (!UPLOAD_PRESET || UPLOAD_PRESET === 'unsigned_preset') {
    throw new Error(
      'Cloudinary upload preset not configured. Set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({
            url: data.secure_url,
            publicId: data.public_id,
            originalFilename: data.original_filename,
            format: data.format,
            width: data.width,
            height: data.height,
            bytes: data.bytes,
          });
        } catch {
          reject(new Error('Failed to parse Cloudinary response'));
        }
      } else {
        let message = 'Upload failed';
        try {
          const err = JSON.parse(xhr.responseText);
          message = err.error?.message || message;
        } catch {
          // ignore parse error
        }
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));

    xhr.send(formData);
  });
}

/**
 * Get a Cloudinary image URL with optional transformations.
 * Useful for resizing/optimizing images on the fly.
 */
export function getCloudinaryUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  } = {}
): string {
  const { width, height, crop = 'fill', quality = 'auto', format = 'auto' } = options;
  const transforms: string[] = [];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (crop) transforms.push(`c_${crop}`);
  if (quality) transforms.push(`q_${quality}`);
  if (format) transforms.push(`f_${format}`);

  const transformStr = transforms.length > 0 ? `${transforms.join(',')}/` : '';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformStr}${publicId}`;
}
