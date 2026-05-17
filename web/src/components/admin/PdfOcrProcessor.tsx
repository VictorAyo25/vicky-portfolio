'use client';

import { useState, useCallback } from 'react';
import { Loader2, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface PdfOcrProcessorProps {
  pdfBase64: string;
  filename: string;
  onExtracted: (text: string) => void;
  onCancel: () => void;
}

interface TextItem {
  str: string;
  fontName: string;
  hasEOL: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LinkAnnotation {
  url: string;
  rect: [number, number, number, number];
  page: number;
}

/**
 * Extract text with formatting hints from a PDF page using pdfjs-dist's getTextContent.
 * Returns structured text with **bold**, *italic*, and [link](url) markers.
 */
async function extractTextWithFormatting(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  pageNum: number,
  annotations: LinkAnnotation[],
): Promise<string> {
  const textContent = await page.getTextContent();
  const items: TextItem[] = textContent.items as TextItem[];

  if (items.length === 0) return '';

  // Group items into lines based on Y position
  const lineTolerance = 2;
  const lines: TextItem[][] = [];
  let currentLine: TextItem[] = [];
  let lastY = -9999;

  const sortedItems = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > lineTolerance) return b.y - a.y; // top to bottom
    return a.x - b.x; // left to right
  });

  for (const item of items) {
    const y = item.y;
    if (Math.abs(y - lastY) > lineTolerance && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [];
    }
    currentLine.push(item);
    lastY = y;
  }
  if (currentLine.length > 0) lines.push(currentLine);

  // Process each line into formatted text
  const formattedLines: string[] = [];

  for (const line of lines) {
    // Sort items in line left to right
    line.sort((a, b) => a.x - b.x);

    let lineText = '';
    for (const item of line) {
      const str = item.str;
      if (!str.trim()) continue;

      // Detect formatting from font name
      const font = (item.fontName || '').toLowerCase();
      const isBold = font.includes('bold') || font.includes('heavy') || font.includes('black') || font.includes('demi');
      const isItalic = font.includes('italic') || font.includes('oblique') || font.includes('slanted');

      // Check if this text overlaps with a hyperlink annotation
      const link = annotations.find((a) => {
        if (a.page !== pageNum) return false;
        const [x1, y1, x2, y2] = a.rect;
        return item.x >= x1 - 2 && item.x + item.width <= x2 + 2 && item.y >= y1 - 2 && item.y + item.height <= y2 + 2;
      });

      let formatted = str;
      if (link) {
        formatted = `[${str}](${link.url})`;
      } else {
        if (isBold && isItalic) {
          formatted = `***${str}***`;
        } else if (isBold) {
          formatted = `**${str}**`;
        } else if (isItalic) {
          formatted = `*${str}*`;
        }
      }

      lineText += formatted;
    }

    if (lineText.trim()) {
      formattedLines.push(lineText);
    }
  }

  return formattedLines.join('\n');
}

/**
 * Extract link annotations from a PDF page.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractLinks(page: any, pageNum: number): Promise<LinkAnnotation[]> {
  try {
    const annots = await page.getAnnotations();
    const links: LinkAnnotation[] = [];

    for (const annot of annots) {
      if (annot.subtype === 'Link' && annot.url) {
        links.push({
          url: annot.url,
          rect: annot.rect as [number, number, number, number],
          page: pageNum,
        });
      }
    }

    return links;
  } catch {
    return [];
  }
}

/**
 * Run Tesseract OCR on a page image as fallback.
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
  const [status, setStatus] = useState<'idle' | 'loading' | 'extracting' | 'ocr-fallback' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [method, setMethod] = useState<'text' | 'ocr'>('text');

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
      let usedOcr = false;
      let worker: ReturnType<typeof createWorker> extends Promise<infer T> ? T : never = null as never;

      for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
        setProgress({ current: pageNum, total: pagesToProcess });

        try {
          const page = await pdf.getPage(pageNum);

          // Strategy 1: Try getTextContent (preserves bold/italic/links from PDF structure)
          const links = await extractLinks(page, pageNum);
          const text = await extractTextWithFormatting(page, pageNum, links);

          if (text.trim()) {
            if (fullText) fullText += '\n\n';
            fullText += text;
            continue;
          }

          // Strategy 2: Fallback to Tesseract OCR for this page
          if (!usedOcr) {
            usedOcr = true;
            setStatus('ocr-fallback');
            worker = await createWorker('eng');
          }

          if (worker) {
            const ocrText = await ocrPage(worker, page, 2);
            if (ocrText) {
              if (fullText) fullText += '\n\n';
              fullText += ocrText;
            }
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

      setMethod(usedOcr ? 'ocr' : 'text');
      setExtractedText(fullText);
      setStatus('done');
    } catch (err) {
      console.error('PDF extraction error:', err);
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process PDF.');
    }
  }, [pdfBase64]);

  const handleUseText = () => {
    onExtracted(extractedText);
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
              This PDF has no embedded text layer. We'll extract text using your browser,
              preserving <strong>bold</strong>, <em>italic</em>, and <span className="text-blue-500 underline">hyperlinks</span> where possible.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Processing happens locally in your browser. Large documents may take a minute.
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

        {(status === 'loading' || status === 'extracting' || status === 'ocr-fallback') && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {status === 'loading' && 'Loading PDF in browser...'}
                {status === 'extracting' && `Extracting text with formatting... Page ${progress.current} of ${progress.total}`}
                {status === 'ocr-fallback' && `Running OCR fallback for scanned pages... Page ${progress.current} of ${progress.total}`}
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
            <div className="flex items-start gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✓ Text extracted from {progress.total} page(s).
                  {method === 'text' && ' Formatting and links preserved.'}
                  {method === 'ocr' && ' Some pages required OCR fallback (formatting may be limited).'}
                </p>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Preview (markdown formatting):</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                {extractedText.slice(0, 600)}{extractedText.length > 600 ? '...' : ''}
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
