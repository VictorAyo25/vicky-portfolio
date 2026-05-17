declare module 'tesseract.js' {
  export interface RecognizeResult {
    data: {
      text: string;
      confidence: number;
    };
  }

  export interface Worker {
    recognize(image: Blob | string | Buffer): Promise<RecognizeResult>;
    terminate(): Promise<void>;
  }

  export function createWorker(lang: string): Promise<Worker>;
}
