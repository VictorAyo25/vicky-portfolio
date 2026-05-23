import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { textToStructuredHtml, deriveTitle } from '@/lib/textToHtml';

// ─── Cloudinary upload ───────────────────────────────────────────────────────

async function uploadImageToCloudinary(
  imageBytes: Uint8Array,
  contentType: string,
  filename: string,
): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || cloudName === 'your_cloud_name' || !uploadPreset || uploadPreset === 'unsigned_preset') {
    throw new Error('Cloudinary not configured');
  }

  const ext = contentType.includes('jpeg') || contentType.includes('jpg')
    ? '.jpg'
    : contentType.includes('png')
      ? '.png'
      : contentType.includes('gif')
        ? '.gif'
        : contentType.includes('webp')
          ? '.webp'
          : '.png';

  const blob = new Blob([imageBytes.buffer as ArrayBuffer], { type: contentType });
  const formData = new FormData();
  formData.append('file', blob, `${filename}${ext}`);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'imported-from-pdf');

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

// ─── Image extraction from PDF ───────────────────────────────────────────────

interface ExtractedImage {
  index: number;
  bytes: Uint8Array;
  contentType: string;
  pageNumber: number;
}

async function extractImagesFromPdf(pdfBytes: Uint8Array): Promise<ExtractedImage[]> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const extractedImages: ExtractedImage[] = [];
  let imageIndex = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocAny = pdfDoc as any;

  for (let pageIdx = 0; pageIdx < pdfDoc.getPageCount(); pageIdx++) {
    try {
      const page = pdfDoc.getPage(pageIdx);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pageAny = page as any;
      const pageNode = pageAny.node?.();
      if (!pageNode) continue;

      const resources = pageNode.Resources?.();
      if (!resources) continue;

      const xObjects = resources.XObject?.();
      if (!xObjects) continue;

      const xObjectKeys = Object.keys(xObjects);

      for (const key of xObjectKeys) {
        try {
          const xObject = xObjects[key];
          if (!xObject) continue;

          const xObjDict = xObject.dict || xObject;
          const subtype = xObjDict.Subtype?.() || xObjDict.Subtype;

          if (subtype && String(subtype) === 'Image') {
            let imageBytes: Uint8Array | null = null;
            let contentType = 'image/png';

            const filter = xObjDict.Filter?.() || xObjDict.Filter;
            const filterStr = filter ? String(filter) : '';

            if (filterStr.includes('DCT')) {
              contentType = 'image/jpeg';
              imageBytes = xObjDict.getContents?.() || null;
            } else if (filterStr.includes('FlateDecode') || !filterStr) {
              imageBytes = xObjDict.getContents?.() || null;
              contentType = 'image/png';
            } else {
              imageBytes = xObjDict.getContents?.() || null;
            }

            if (imageBytes && imageBytes.length > 100) {
              const isJpeg = imageBytes[0] === 0xFF && imageBytes[1] === 0xD8;
              const isPng = imageBytes[0] === 0x89 && imageBytes[1] === 0x50 &&
                            imageBytes[2] === 0x4E && imageBytes[3] === 0x47;

              if (isJpeg || isPng || imageBytes.length > 500) {
                extractedImages.push({
                  index: imageIndex++,
                  bytes: imageBytes,
                  contentType: isJpeg ? 'image/jpeg' : contentType,
                  pageNumber: pageIdx + 1,
                });
              }
            }
          }
        } catch {
          // Skip individual image extraction failures
        }
      }
    } catch {
      // Skip page if resources can't be read
    }
  }

  if (extractedImages.length === 0) {
    try {
      const catalog = pdfDocAny.catalog;
      if (catalog) {
        const pages = catalog.Pages?.();
        if (pages) {
          const pageCount = pages.Count?.() || pdfDoc.getPageCount();
          for (let i = 0; i < Math.min(pageCount, pdfDoc.getPageCount()); i++) {
            const page = pdfDoc.getPage(i);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pageAny = page as any;
            const annots = pageAny.node?.()?.Annots?.();
            if (annots) {
              const annotKeys = Object.keys(annots);
              for (const ak of annotKeys) {
                try {
                  const annot = annots[ak];
                  const ap = annot?.Appearance?.();
                  if (ap) {
                    const stream = ap?.getContents?.();
                    if (stream && stream.length > 100) {
                      const isJpeg = stream[0] === 0xFF && stream[1] === 0xD8;
                      const isPng = stream[0] === 0x89 && stream[1] === 0x50;
                      if (isJpeg || isPng) {
                        extractedImages.push({
                          index: imageIndex++,
                          bytes: stream,
                          contentType: isJpeg ? 'image/jpeg' : 'image/png',
                          pageNumber: i + 1,
                        });
                      }
                    }
                  }
                } catch {
                  // skip
                }
              }
            }
          }
        }
      }
    } catch {
      // Document-level extraction also failed — return empty
    }
  }

  return extractedImages;
}

// ─── Text-to-HTML conversion ─────────────────────────────────────────────────

// ─── Google Drive link resolution ────────────────────────────────────────────

function extractGoogleDriveFileId(input: string): string | null {
  try {
    const url = new URL(input);
    const match = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    const idParam = url.searchParams.get('id');
    if (idParam) return idParam;
    if (url.pathname === '/open') {
      const openId = url.searchParams.get('id');
      if (openId) return openId;
    }
    if (url.pathname === '/uc') {
      const ucId = url.searchParams.get('id');
      if (ucId) return ucId;
    }
  } catch {
    if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) return input.trim();
  }
  return null;
}

async function downloadFromGoogleDrive(fileId: string): Promise<Uint8Array> {
  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const response = await fetch(directUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to download from Google Drive: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    const confirmUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
    const confirmResponse = await fetch(confirmUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });
    if (!confirmResponse.ok) {
      throw new Error('Could not download PDF from Google Drive. Ensure the file is shared as "Anyone with the link".');
    }
    const arrayBuffer = await confirmResponse.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let pdfBytes: Uint8Array;
    let filename: string | undefined;
    let sourceType: 'upload' | 'gdrive' = 'upload';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No PDF file provided.' }, { status: 400 });
      }

      if (!file.name.toLowerCase().endsWith('.pdf') && !file.type.includes('pdf')) {
        return NextResponse.json({ error: 'File must be a PDF.' }, { status: 400 });
      }

      filename = file.name;
      const arrayBuffer = await file.arrayBuffer();
      pdfBytes = new Uint8Array(arrayBuffer);
    } else {
      const body = await req.json();
      const driveUrl = String(body?.url || '').trim();

      if (!driveUrl) {
        return NextResponse.json({ error: 'Google Drive URL is required.' }, { status: 400 });
      }

      const fileId = extractGoogleDriveFileId(driveUrl);
      if (!fileId) {
        return NextResponse.json(
          { error: 'Invalid Google Drive URL. Please paste a full Google Drive file link.' },
          { status: 400 },
        );
      }

      sourceType = 'gdrive';
      filename = `gdrive-${fileId}.pdf`;
      pdfBytes = await downloadFromGoogleDrive(fileId);
    }

    // ── Validate PDF header ──
    if (pdfBytes.length < 4) {
      return NextResponse.json({ error: 'The file appears to be empty or invalid.' }, { status: 400 });
    }

    const header = String.fromCharCode(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3], pdfBytes[4]);
    if (!header.startsWith('%PDF')) {
      return NextResponse.json({ error: 'The file does not appear to be a valid PDF.' }, { status: 400 });
    }

    // ── Strategy 1: Try native text extraction (fast, works for digital PDFs) ──
    let parsedText = '';
    let pageCount = 0;

    try {
      const pdfParse = (await import('pdf-parse')).default;
      const parseResult = await pdfParse(Buffer.from(pdfBytes));
      parsedText = (parseResult.text || '').trim();
      pageCount = parseResult.numpages || 0;
    } catch {
      // pdf-parse threw — file may be corrupted or unusual.
      // Fall through to return the PDF for client-side handling.
      console.warn('pdf-parse threw an error');
    }

    // ── If we got text, process normally on the server ──
    if (parsedText) {
      // Extract images
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      const cloudinaryConfigured = Boolean(
        cloudName && cloudName !== 'your_cloud_name' && uploadPreset && uploadPreset !== 'unsigned_preset',
      );

      const imagesByPage: Map<number, string[]> = new Map();
      let imagesProcessed = 0;
      let imagesFailed = 0;

      if (cloudinaryConfigured) {
        try {
          const extractedImages = await extractImagesFromPdf(pdfBytes);

          const uploadPromises = extractedImages.map(async (img) => {
            try {
              const cloudinaryUrl = await uploadImageToCloudinary(
                img.bytes,
                img.contentType,
                `pdf-page${img.pageNumber}-img${img.index}`,
              );
              return { pageNumber: img.pageNumber, url: cloudinaryUrl };
            } catch (err) {
              console.error(`Failed to upload PDF image ${img.index}:`, err);
              return null;
            }
          });

          const results = await Promise.all(uploadPromises);
          for (const res of results) {
            if (res) {
              const existing = imagesByPage.get(res.pageNumber) || [];
              existing.push(res.url);
              imagesByPage.set(res.pageNumber, existing);
              imagesProcessed++;
            } else {
              imagesFailed++;
            }
          }
        } catch (err) {
          console.error('PDF image extraction error:', err);
        }
      }

      const title = deriveTitle(parsedText, filename);
      let content = textToStructuredHtml(parsedText);

      // Append extracted images at the end of the content
      if (imagesByPage.size > 0) {
        const allImages: string[] = [];
        for (const [pageNum, urls] of imagesByPage) {
          for (const url of urls) {
            allImages.push(
              `<img src="${url}" alt="Image from page ${pageNum}" style="max-width:100%;height:auto;margin:1.5em auto;display:block;" />`,
            );
          }
        }
        content += '\n\n' + allImages.join('\n');
      }

      return NextResponse.json({
        title,
        content,
        source: sourceType,
        imagesProcessed,
        imagesFailed,
        pageCount,
        needsClientOcr: false,
      });
    }

    // ── Strategy 2: No text found — return PDF as base64 for client-side OCR ──
    // Server-side OCR (tesseract.js) is unreliable in serverless environments
    // because it needs to download large language model files. The browser is
    // the right place to do OCR.
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    return NextResponse.json({
      needsClientOcr: true,
      pdfBase64,
      filename: filename || 'document.pdf',
      pageCount,
      message: 'This PDF appears to be a scanned document or has no embedded text. Client-side OCR is required.',
    });
  } catch (err) {
    console.error('PDF import error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to import PDF right now. Please try again.' },
      { status: 500 },
    );
  }
}
