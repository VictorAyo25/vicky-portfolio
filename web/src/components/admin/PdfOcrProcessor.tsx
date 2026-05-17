'use client';

import { useState, useCallback } from 'react';
import { Loader2, FileText, AlertCircle } from 'lucide-react';

interface PdfOcrProcessorProps {
  pdfBase64: string;
  filename: string;
  onExtracted: (text: string) => void;
  onCancel: () => void;
}

export default function PdfOcrProcessor({ pdfBase64, filename, onExtracted, onCancel }: PdfOcrProcessorProps) {
  const [status, setStatus] = useState<'idle' | 'loading-pdf' | 'ocr' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const [ocrText, setOcrText] = useState('');

  const runOcr = useCallback(async () => {
    setStatus('loading-pdf');
    setErrorMsg('');

    try {
      // Dynamic imports so these heavy libs are only loaded when needed
      const pdfjsLib = await import('pdfjs-dist');
      const { createWorker } = await import('tesseract.js');

      // Use the bundled worker via CDN
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

      // Decode base64 to Uint8Array
      const binaryString = atob(pdfBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      // Limit to first 15 pages to avoid browser freeze
      const pagesToProcess = Math.min(totalPages, 15);
      setProgress({ current: 0, total: pagesToProcess });
      setStatus('ocr');

      const worker = await createWorker('eng');
      let fullText = '';

      try {
        for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
          setProgress({ current: pageNum, total: pagesToProcess });

          try {
            const page = await pdf.getPage(pageNum);
            const scale = 2;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            await page.render({ canvasContext: ctx, viewport }).promise;

            // Convert canvas to blob for Tesseract
            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, 'image/png'),
            );
            if (!blob) continue;

            const result = await worker.recognize(blob);
            const pageText = result.data.text?.trim();
            if (pageText) {
              if (fullText) fullText += '\n\n';
              fullText += pageText;
            }
          } catch (pageErr) {
            console.error(`OCR failed for page ${pageNum}:`, pageErr);
          }
        }
      } finally {
        await worker.terminate();
      }

      if (!fullText.trim()) {
        setStatus('error');
        setErrorMsg('OCR completed but no text was recognized. The PDF may contain only images with no readable text, or the scan quality may be too low.');
        return;
      }

      setOcrText(fullText);
      setStatus('done');
    } catch (err) {
      console.error('PDF OCR error:', err);
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process PDF. The file may be corrupted or password-protected.');
    }
  }, [pdfBase64]);

  const handleUseText = () => {
    onExtracted(ocrText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-500 shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Scanned PDF Detected
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {filename}
            </p>
          </div>
        </div>

        {status === 'idle' && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This PDF doesn't have an embedded text layer — it appears to be a scanned document.
              We can extract the text using OCR (Optical Character Recognition) right here in your browser.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Note: OCR processing happens locally in your browser. For large documents, this may take a minute.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={runOcr}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Start OCR
              </button>
            </div>
          </>
        )}

        {(status === 'loading-pdf' || status === 'ocr') && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {status === 'loading-pdf'
                  ? 'Loading PDF in browser...'
                  : `Running OCR... Page ${progress.current} of ${progress.total}`}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%',
                }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {status === 'ocr' && 'This may take a moment. Please don\'t close this window.'}
            </p>
          </div>
        )}

        {status === 'done' && (
          <>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ OCR completed successfully! {progress.total} page(s) processed.
              </p>
            </div>
            <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Extracted text preview:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {ocrText.slice(0, 500)}{ocrText.length > 500 ? '...' : ''}
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
                <p className="text-sm font-medium text-red-700 dark:text-red-300">OCR Failed</p>
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
