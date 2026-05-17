'use client';

import { useState, useCallback } from 'react';
import { Loader2, FileText, AlertCircle, CheckCircle, Link, Image } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface PdfOcrProcessorProps {
  pdfBase64: string;
  filename: string;
  onExtracted: (text: string, links: ExtractedLink[], imageUrls: string[]) => void;
  onCancel: () => void;
}

export interface ExtractedLink {
  url: string;
  page: number;
}

/**
 * Extract text from a PDF page using pdfjs-dist's getTextContent.
 * Items are returned in reading order by pdfjs-dist.
 * We detect line breaks by tracking Y-position changes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractTextFromPage(page: any): Promise<string> {
  const textContent = await page.getTextContent();
  const items = textContent.items as Array<{
    str: string;
    transform: number[];
    hasEOL: boolean;
  }>;

  if (items.length === 0) return '';

  // pdfjs-dist returns items in reading order.
  // We detect line breaks by checking Y-position (transform[5]) changes.
  const lines: string[] = [];
  let currentLine = '';
  let lastY: number | null = null;
  const lineBreakThreshold = 5; // pixels

  for (const item of items) {
    const str = item.str;
    if (!str) continue;

    // transform[5] is the Y position
    const y = item.transform?.[5] ?? 0;

    // Detect new line: Y position changed significantly
    if (lastY !== null && Math.abs(y - lastY) > lineBreakThreshold) {
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      currentLine = '';
    }

    // Add space between items on same line if there's a gap
    if (currentLine && !currentLine.endsWith(' ') && !str.startsWith(' ')) {
      const x = item.transform?.[4] ?? 0;
      const prevItem = items[items.indexOf(item) - 1];
      if (prevItem) {
        const prevX = prevItem.transform?.[4] ?? 0;
        const prevWidth = (prevItem.str?.length ?? 0) * 6; // rough estimate
        if (x - (prevX + prevWidth) > 3) {
          currentLine += ' ';
        }
      }
    }

    currentLine += str;
    lastY = y;
  }

  // Don't forget the last line
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines.join('\n');
}

/**
 * Extract link annotations from a PDF page.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractLinksFromPage(page: any, pageNum: number): Promise<ExtractedLink[]> {
  try {
    const annots = await page.getAnnotations();
    const links: ExtractedLink[] = [];

    for (const annot of annots) {
      if (annot.subtype === 'Link' && annot.url) {
        links.push({ url: annot.url, page: pageNum });
      }
    }

    return links;
  } catch {
    return [];
  }
}

/**
 * Run Tesseract OCR on a page image as fallback for scanned pages.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ocrPage(worker: any, page: any, scale: number): Promise<string> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  await page.render({ canvasContext: ctx, viewport }).promise;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return '';

  const result = await worker.recognize(blob);
  return result.data.text?.trim() || '';
}

export default function PdfOcrProcessor({ pdfBase64, filename, onExtracted, onCancel }: PdfOcrProcessorProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'extracting' | 'ocr-fallback' | 'uploading-images' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [extractedLinks, setExtractedLinks] = useState<ExtractedLink[]>([]);
  const [extractedImages, setExtractedImages] = useState<string[]>([]);
  const [pagesWithText, setPagesWithText] = useState(0);
  const [pagesWithOcr, setPagesWithOcr] = useState(0);

  const runExtraction = useCallback(async () => {
    setStatus('loading');
    setErrorMsg('');

    try {
      const pdfjsLib = await import('pdfjs-dist');
      const { createWorker } = await import('tesseract.js');

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

      // Decode base64
      const binaryString = atob(pdfBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      const pagesToProcess = Math.min(totalPages, 15);

      setProgress({ current: 0, total: pagesToProcess });
      setStatus('extracting');

      let fullText = '';
      const allLinks: ExtractedLink[] = [];
      let textPageCount = 0;
      let ocrPageCount = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let worker: any = null;

      for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
        setProgress({ current: pageNum, total: pagesToProcess });

        try {
          const page = await pdf.getPage(pageNum);

          // Extract links first (works regardless of text layer)
          const links = await extractLinksFromPage(page, pageNum);
          allLinks.push(...links);

          // Strategy 1: Try getTextContent (works for PDFs with any text layer)
          const text = await extractTextFromPage(page);

          if (text.trim()) {
            if (fullText) fullText += '\n\n';
            fullText += text;
            textPageCount++;
            continue;
          }

          // Strategy 2: Fallback to Tesseract OCR for fully scanned pages
          if (!worker) {
            worker = await createWorker('eng');
            setStatus('ocr-fallback');
          }

          const ocrText = await ocrPage(worker, page, 2);
          if (ocrText) {
            if (fullText) fullText += '\n\n';
            fullText += ocrText;
            ocrPageCount++;
          }
        } catch (pageErr) {
          console.error(`Failed to process page ${pageNum}:`, pageErr);
        }
      }

      if (worker) {
        await worker.terminate();
      }

      if (!fullText.trim()) {
        setStatus('error');
        setErrorMsg('Could not extract any text from this PDF. The file may be corrupted, password-protected, or contain only images with no recognizable text.');
        return;
      }

      setExtractedText(fullText);
      setExtractedLinks(allLinks);
      setPagesWithText(textPageCount);
      setPagesWithOcr(ocrPageCount);

      // ── Extract page images and upload to Cloudinary ──
      setStatus('uploading-images');
      const imageUrls: string[] = [];

      try {
        for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
          try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            await page.render({ canvasContext: ctx, viewport }).promise;

            // Convert canvas to blob, then to File for upload
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
            if (!blob) continue;

            const file = new File([blob], `pdf-page-${pageNum}.jpg`, { type: 'image/jpeg' });
            const result = await uploadToCloudinary(file);
            imageUrls.push(result.url);
          } catch (imgErr) {
            console.error(`Failed to extract image from page ${pageNum}:`, imgErr);
          }
        }
      } catch (cloudErr) {
        console.error('Image upload failed:', cloudErr);
        // Continue without images — text is still usable
      }

      setExtractedImages(imageUrls);
      setStatus('done');
    } catch (err) {
      console.error('PDF extraction error:', err);
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process PDF.');
    }
  }, [pdfBase64]);

  const handleUseText = () => {
    onExtracted(extractedText, extractedLinks, extractedImages);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-500 shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Scanned PDF Detected
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{filename}</p>
          </div>
        </div>

        {status === 'idle' && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This PDF has no embedded text layer. We'll extract the text using your browser.
              Hyperlinks found in the PDF will be listed separately so you can add them manually.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Processing happens locally. Large documents may take a minute.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={runExtraction}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Extract Text
              </button>
            </div>
          </>
        )}

        {(status === 'loading' || status === 'extracting' || status === 'ocr-fallback' || status === 'uploading-images') && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {status === 'loading' && 'Loading PDF in browser...'}
                {status === 'extracting' && `Extracting text... Page ${progress.current} of ${progress.total}`}
                {status === 'ocr-fallback' && `Running OCR for scanned pages... Page ${progress.current} of ${progress.total}`}
                {status === 'uploading-images' && `Extracting page images & uploading to Cloudinary...`}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Please don't close this window.
            </p>
          </div>
        )}

        {status === 'done' && (
          <>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Text extracted from {progress.total} page(s).
                  {pagesWithText > 0 && ` ${pagesWithText} with text layer.`}
                  {pagesWithOcr > 0 && ` ${pagesWithOcr} via OCR.`}
                </p>
              </div>
              {extractedLinks.length > 0 && (
                <div className="flex items-start gap-2">
                  <Link className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {extractedLinks.length} hyperlink(s) found:
                    </p>
                    <ul className="mt-1 space-y-1 max-h-24 overflow-y-auto">
                      {extractedLinks.slice(0, 10).map((link, i) => (
                        <li key={i} className="text-xs text-blue-600 dark:text-blue-400 truncate">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="underline">
                            {link.url}
                          </a>
                          <span className="text-gray-400 ml-1">(p.{link.page})</span>
                        </li>
                      ))}
                      {extractedLinks.length > 10 && (
                        <li className="text-xs text-gray-400">...and {extractedLinks.length - 10} more</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
              {extractedImages.length > 0 && (
                <div className="flex items-start gap-2">
                  <Image className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      {extractedImages.length} page image(s) extracted & uploaded to Cloudinary.
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
                      {extractedImages.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={url.replace('/upload/', '/upload/w_150,h_150,c_fill/')}
                            alt={`Page ${i + 1}`}
                            className="w-full h-16 object-cover rounded border border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Extracted text preview:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {extractedText.slice(0, 500)}{extractedText.length > 500 ? '...' : ''}
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUseText}
                className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                Use This Text
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Extraction Failed</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errorMsg}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { setStatus('idle'); setErrorMsg(''); }}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
