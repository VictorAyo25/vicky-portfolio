import { NextRequest, NextResponse } from 'next/server';

function extractGoogleDocId(input: string): string | null {
  try {
    const url = new URL(input);
    const match = url.pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    return match?.[1] || null;
  } catch {
    const match = input.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    return match?.[1] || null;
  }
}

function deriveTitleFromHtml(html: string): string {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch?.[1]) return titleMatch[1].trim();

  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match?.[1]) {
    return h1Match[1].replace(/<[^>]*>/g, '').trim();
  }

  return 'Imported Google Doc';
}

function extractBodyHtml(fullHtml: string): string {
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (bodyMatch?.[1] || fullHtml).trim();
}

/**
 * Upload an image URL to Cloudinary by downloading it server-side,
 * converting to a Blob, and POSTing as FormData.
 */
async function uploadImageToCloudinary(
  imageUrl: string,
  cloudName: string,
  uploadPreset: string,
): Promise<string> {
  // Download the image
  const imageResponse = await fetch(imageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store',
  });

  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }

  const contentType = imageResponse.headers.get('content-type') || 'image/png';
  const arrayBuffer = await imageResponse.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: contentType });

  // Build FormData for Cloudinary upload
  const formData = new FormData();
  // Extract a filename from the URL or use a default
  const urlPath = new URL(imageUrl).pathname;
  const filename = urlPath.split('/').pop() || 'image';
  const ext = contentType.includes('jpeg') || contentType.includes('jpg')
    ? '.jpg'
    : contentType.includes('png')
      ? '.png'
      : contentType.includes('gif')
        ? '.gif'
        : contentType.includes('webp')
          ? '.webp'
          : '.png';

  formData.append('file', blob, `${filename}${ext}`);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'imported-from-gdocs');

  // Upload to Cloudinary
  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData },
  );

  if (!uploadResponse.ok) {
    const errText = await uploadResponse.text();
    throw new Error(`Cloudinary upload failed: ${errText}`);
  }

  const data = await uploadResponse.json();
  return data.secure_url;
}

/**
 * Process HTML content: find all <img> tags, download each image,
 * upload to Cloudinary, and replace src URLs with permanent Cloudinary URLs.
 * Preserves all original positioning, alignment, and sizing attributes.
 */
async function processImagesInHtml(html: string): Promise<{ html: string; imageCount: number; failedCount: number }> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || cloudName === 'your_cloud_name' || !uploadPreset || uploadPreset === 'unsigned_preset') {
    // Cloudinary not configured — return HTML as-is
    return { html, imageCount: 0, failedCount: 0 };
  }

  // Find all img src attributes — handle both single and double quotes
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const matches = [...html.matchAll(imgRegex)];

  if (matches.length === 0) {
    return { html, imageCount: 0, failedCount: 0 };
  }

  let processedHtml = html;
  let failedCount = 0;

  // Process images sequentially to avoid rate limits
  for (const match of matches) {
    const originalTag = match[0];
    const originalSrc = match[1];

    // Skip data URIs and already-Cloudinary URLs
    if (originalSrc.startsWith('data:') || originalSrc.includes('cloudinary.com')) {
      continue;
    }

    try {
      const cloudinaryUrl = await uploadImageToCloudinary(originalSrc, cloudName, uploadPreset);

      // Replace only the src attribute, preserving everything else (width, height, style, class, alt, etc.)
      const updatedTag = originalTag.replace(
        srcRegex(originalSrc),
        `src="${cloudinaryUrl}"`,
      );
      processedHtml = processedHtml.replace(originalTag, updatedTag);
    } catch (err) {
      console.error(`Failed to re-upload image ${originalSrc}:`, err);
      failedCount++;
      // Keep the original Google URL as fallback — image may still work short-term
    }
  }

  return { html: processedHtml, imageCount: matches.length, failedCount };
}

/**
 * Build a regex that matches the exact src value in an img tag,
 * handling both quote styles.
 */
function srcRegex(src: string): RegExp {
  const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`src=["']${escaped}["']`, 'i');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sourceUrl = String(body?.url || '').trim();

    if (!sourceUrl) {
      return NextResponse.json({ error: 'Google Docs URL is required.' }, { status: 400 });
    }

    const docId = extractGoogleDocId(sourceUrl);
    if (!docId) {
      return NextResponse.json(
        { error: 'Invalid Google Docs URL. Please paste a full Google Docs link.' },
        { status: 400 },
      );
    }

    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;

    const response = await fetch(exportUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            'Could not fetch document. Ensure the doc is shared as "Anyone with the link can view".',
        },
        { status: 400 },
      );
    }

    const rawHtml = await response.text();
    const title = deriveTitleFromHtml(rawHtml);
    let content = extractBodyHtml(rawHtml);

    if (!content) {
      return NextResponse.json(
        { error: 'The document appears empty or could not be parsed.' },
        { status: 400 },
      );
    }

    // Strip Google's inline <style> blocks (they contain doc-specific CSS that conflicts)
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Process images: download from Google and re-upload to Cloudinary
    const { html: processedContent, imageCount, failedCount } = await processImagesInHtml(content);
    content = processedContent;

    return NextResponse.json({
      title,
      content,
      imagesProcessed: imageCount,
      imagesFailed: failedCount,
    });
  } catch {
    return NextResponse.json(
      { error: 'Unable to import from Google Docs right now. Please try again.' },
      { status: 500 },
    );
  }
}
