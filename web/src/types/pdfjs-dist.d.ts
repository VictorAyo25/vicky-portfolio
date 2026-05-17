declare module 'pdfjs-dist' {
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  export interface PDFPageProxy {
    getViewport(options: { scale: number }): PDFViewport;
    render(options: {
      canvasContext: CanvasRenderingContext2D;
      viewport: PDFViewport;
    }): PDFRenderTask;
  }

  export interface PDFViewport {
    width: number;
    height: number;
  }

  export interface PDFRenderTask {
    promise: Promise<void>;
  }

  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export function getDocument(
    source: { data: Uint8Array } | { url: string }
  ): { promise: Promise<PDFDocumentProxy> };
}
