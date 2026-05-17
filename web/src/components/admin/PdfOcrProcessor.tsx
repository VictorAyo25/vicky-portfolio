'use client';

import { useState, useCallback } from 'react';
import { Loader2, FileText, AlertCircle, CheckCircle, Link, Image } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
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

interface EmbeddedImage {
  bytes: Uint8Array;
  contentType: string;
  pageNumber: number;
}

async function extractEmbeddedImages(pdfBytes: Uint8Array): Promise<EmbeddedImage[]> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const extracted: EmbeddedImage[] = [];
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

      for (const key of Object.keys(xObjects)) {
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
            if (filterStr.includes('DCT')) { contentType = 'image/jpeg'; imageBytes = xObjDict.getContents?.() || null; }
            else if (filterStr.includes('FlateDecode') || !filterStr) { imageBytes = xObjDict.getContents?.() || null; }
            else { imageBytes = xObjDict.getContents?.() || null; }
            if (imageBytes && imageBytes.length > 100) {
              const isJpeg = imageBytes[0] === 0xFF && imageBytes[1] === 0xD8;
              const isPng = imageBytes[0] === 0x89 && imageBytes[1] === 0x50 && imageBytes[2] === 0x4E && imageBytes[3] === 0x47;
              if (isJpeg || isPng || imageBytes.length > 500) {
                extracted.push({ bytes: imageBytes, contentType: isJpeg ? 'image/jpeg' : contentType, pageNumber: pageIdx + 1 });
              }
            }
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  if (extracted.length === 0) {
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
              for (const ak of Object.keys(annots)) {
                try {
                  const stream = annots[ak]?.Appearance?.()?.getContents?.();
                  if (stream && stream.length > 100) {
                    const isJpeg = stream[0] === 0xFF && stream[1] === 0xD8;
                    const isPng = stream[0] === 0x89 && stream[1] === 0x50;
                    if (isJpeg || isPng) extracted.push({ bytes: stream, contentType: isJpeg ? 'image/jpeg' : 'image/png', pageNumber: i + 1 });
                  }
                } catch { /* skip */ }
              }
            }
          }
        }
      }
    } catch { /* skip */ }
  }

  return extracted;
}

function detectFormatting(fontName: string): { bold: boolean; italic: boolean } {
  const f = (fontName || '').toLowerCase();
  return {
    bold: /bold|heavy|black|demi|extrabold|semibold/.test(f),
    italic: /italic|oblique|slanted/.test(f),
  };
}

/**
 * Extract text with bold/italic formatting detection from font names.
 * Outputs markdown markers: **bold**, *italic*, ***bold+italic***
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractTextFromPage(page: any): Promise<string> {
  const textContent = await page.getTextContent();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = textContent.items as any[];
  if (items.length === 0) return '';

  const lines: string[] = [];
  let currentLine = '';
  let lastY: number | null = null;
  let lineBold = false;
  let lineItalic = false;
  const Y_THRESHOLD = 5;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const str = item.str;
    if (!str) continue;

    const y = item.transform?.[5] ?? 0;

    // New line
    if (lastY !== null && Math.abs(y - lastY) > Y_THRESHOLD) {
      if (lineItalic) currentLine += '*';
      if (lineBold) currentLine += '**';
      lineBold = false;
      lineItalic = false;
      if (currentLine.trim()) lines.push(currentLine.trim());
      currentLine = '';
    }

    // Space detection
    if (currentLine && !currentLine.endsWith(' ') && !str.startsWith(' ') && i > 0) {
      const x = item.transform?.[4] ?? 0;
      const prev = items[i - 1];
      if (prev && x - (prev.transform?.[4] ?? 0 + (prev.str?.length ?? 0) * 6) > 3) {
        currentLine += ' ';
      }
    }

    // Formatting detection
    const fmt = detectFormatting(item.fontName || '');

    // Close/open markdown markers based on transition
    if (fmt.bold && fmt.italic) {
      if (!(lineBold && lineItalic)) {
        if (lineBold) currentLine += '**';
        if (lineItalic) currentLine += '*';
        currentLine += '***';
      }
      lineBold = true;
      lineItalic = true;
    } else if (fmt.bold) {
      if (lineBold && lineItalic) { currentLine += '***'; currentLine += '**'; }
      else if (lineItalic) { currentLine += '*'; currentLine += '**'; }
      else if (!lineBold) { currentLine += '**'; }
      lineBold = true;
      lineItalic = false;
    } else if (fmt.italic) {
      if (lineBold && lineItalic) { currentLine += '***'; currentLine += '*'; }
      else if (lineBold) { currentLine += '**'; currentLine += '*'; }
      else if (!lineItalic) { currentLine += '*'; }
      lineItalic = true;
      lineBold = false;
    } else {
      if (lineItalic) currentLine += '*';
      if (lineBold) currentLine += '**';
      lineBold = false;
      lineItalic = false;
    }

    currentLine += str;
    lastY = y;
  }

  if (lineItalic) currentLine += '*';
  if (lineBold) currentLine += '**';
  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines.join('\n');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractLinksFromPage(page: any, pageNum: number): Promise<ExtractedLink[]> {
  try {
    const annots = await page.getAnnotations();
    return annots.filter((a: any) => a.subtype === 'Link' && a.url).map((a: any) => ({ url: a.url, page: pageNum }));
  } catch { return []; }
}

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
  return (await worker.recognize(blob)).data.text?.trim() || '';
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
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

      const binaryString = atob(pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const pagesToProcess = Math.min(pdf.numPages, 15);
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
          allLinks.push(...await extractLinksFromPage(page, pageNum));
          const text = await extractTextFromPage(page);
          if (text.trim()) { if (fullText) fullText += '\n\n'; fullText += text; textPageCount++; continue; }
          if (!worker) { worker = await createWorker('eng'); setStatus('ocr-fallback'); }
          const ocrText = await ocrPage(worker, page, 2);
          if (ocrText) { if (fullText) fullText += '\n\n'; fullText += ocrText; ocrPageCount++; }
        } catch (e) { console.error(`Page ${pageNum}:`, e); }
      }
      if (worker) await worker.terminate();

      if (!fullText.trim()) { setStatus('error'); setErrorMsg('Could not extract any text from this PDF.'); return; }

      setExtractedText(fullText);
      setExtractedLinks(allLinks);
      setPagesWithText(textPageCount);
      setPagesWithOcr(ocrPageCount);

      // Extract embedded images
      setStatus('uploading-images');
      const imageUrls: string[] = [];
      try {
        for (const img of await extractEmbeddedImages(bytes)) {
          try {
            const blob = new Blob([img.bytes.buffer as ArrayBuffer], { type: img.contentType });
            const ext = img.contentType.includes('jpeg') ? '.jpg' : '.png';
            const result = await uploadToCloudinary(new File([blob], `pdf-img-p${img.pageNumber}-${imageUrls.length}${ext}`, { type: img.contentType }));
            imageUrls.push(result.url);
          } catch (e) { console.error('Image upload failed:', e); }
        }
      } catch (e) { console.error('Image extraction failed:', e); }

      setExtractedImages(imageUrls);
      setStatus('done');
    } catch (err) {
      console.error('PDF extraction error:', err);
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process PDF.');
    }
  }, [pdfBase64]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-500 shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scanned PDF Detected</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{filename}</p>
          </div>
        </div>

        {status === 'idle' && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This PDF has no embedded text layer. We'll extract text with formatting (bold/italic from font names), hyperlinks, and embedded images.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Processing happens locally. Large documents may take a minute.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button onClick={runExtraction} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">Extract Text & Images</button>
            </div>
          </>
        )}

        {(status === 'loading' || status === 'extracting' || status === 'ocr-fallback' || status === 'uploading-images') && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {status === 'loading' && 'Loading PDF in browser...'}
                {status === 'extracting' && `Extracting text with formatting... Page ${progress.current} of ${progress.total}`}
                {status === 'ocr-fallback' && `Running OCR for scanned pages... Page ${progress.current} of ${progress.total}`}
                {status === 'uploading-images' && 'Extracting embedded images & uploading to Cloudinary...'}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Please don't close this window.</p>
          </div>
        )}

        {status === 'done' && (
          <>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Text extracted from {progress.total} page(s).{pagesWithText > 0 && ` ${pagesWithText} with text layer.`}{pagesWithOcr > 0 && ` ${pagesWithOcr} via OCR.`}
                </p>
              </div>
              {extractedLinks.length > 0 && (
                <div className="flex items-start gap-2">
                  <Link className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">{extractedLinks.length} hyperlink(s) found:</p>
                    <ul className="mt-1 space-y-1 max-h-24 overflow-y-auto">
                      {extractedLinks.slice(0, 10).map((link, i) => (
                        <li key={i} className="text-xs text-blue-600 dark:text-blue-400 truncate">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="underline">{link.url}</a>
                          <span className="text-gray-400 ml-1">(p.{link.page})</span>
                        </li>
                      ))}
                      {extractedLinks.length > 10 && <li className="text-xs text-gray-400">...and {extractedLinks.length - 10} more</li>}
                    </ul>
                  </div>
                </div>
              )}
              {extractedImages.length > 0 && (
                <div className="flex items-start gap-2">
                  <Image className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-purple-700 dark:text-purple-300">{extractedImages.length} embedded image(s) extracted:</p>
                    <div className="mt-2 grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
                      {extractedImages.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={url.replace('/upload/', '/upload/w_150,h_150,c_fill/')} alt={`Image ${i + 1}`} className="w-full h-16 object-cover rounded border border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Extracted text preview (markdown):</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">{extractedText.slice(0, 600)}{extractedText.length > 600 ? '...' : ''}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button onClick={() => onExtracted(extractedText, extractedLinks, extractedImages)} className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">Use This Text</button>
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
              <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Close</button>
              <button onClick={() => { setStatus('idle'); setErrorMsg(''); }} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">Try Again</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
