import * as pdfjsLib from 'pdfjs-dist';

// Use unpkg / cdnjs worker matching pdfjs-dist version to guarantee smooth worker loading in Vite dev and production
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;

import Parser from './parser';

export async function extractPdf(file) {
  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  let h = 792;
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    h = p.getViewport({ scale: 1 }).height;
    pages.push((await p.getTextContent()).items);
  }
  return Parser.parse(pages, h);
}

export { pdfjsLib };

