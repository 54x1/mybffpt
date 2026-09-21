/*
 * mybffpt — myBudget Forecaster
 * Copyright (C) 2026 54x1
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of mybffpt, free software licensed under the GNU Affero
 * General Public License v3.0 or later. See the LICENSE file in the project
 * root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
 */

// OCR fallback for image-based PDFs (ANZ print-to-PDF draws every glyph as a
// tiny 1-bit image mask — see isImageBasedPdf in pdf.ts). Renders each page
// to a canvas with pdf.js, recognizes words with tesseract.js entirely in
// the browser (all assets self-hosted from public/ocr — nothing leaves the
// machine, no CDN), then reconstructs `pdftotext -layout`-style lines from
// word bounding boxes so the existing column-mapper pipeline
// (detectPdfColumns / pdfPagesToStatement) works unchanged on scanned text.

import { getPdfjs } from "./pdf";
import type { PdfPageLayout } from "./pdf";

/** A recognized word with its box in canvas pixels (origin top-left). */
export interface OcrWord {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Human-readable OCR progress, reported per phase/page. */
export interface OcrProgress {
  page: number; // 1-based; 0 = engine setup phase
  pages: number;
  status: string;
}

// ── Layout reconstruction (pure — unit-testable without pdf.js/tesseract) ──

/**
 * Shared character-grid parameters for OCR word boxes, mirroring pageGrid()
 * in pdf.ts but derived from tesseract bboxes. ONE grid for the whole
 * document so the same physical amount column lands on the same text column
 * across pages (band clustering depends on it).
 */
export function ocrPageGrid(all: OcrWord[]): { charWidth: number; originX: number } {
  const usable = all.filter(
    (w) => w.text.trim().length >= 2 && w.x1 > w.x0,
  );
  const widths = usable.map((w) => (w.x1 - w.x0) / w.text.trim().length);
  const heights = all.map((w) => w.y1 - w.y0).filter((h) => h > 0);
  const sorted = [...widths].sort((a, b) => a - b);
  const medW = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 8;
  const medH = heights.length ? [...heights].sort((a, b) => a - b)[Math.floor(heights.length / 2)] : 16;
  return {
    charWidth: Math.min(40, Math.max(3, medW || medH * 0.5)),
    originX: all.length ? Math.min(...all.map((w) => w.x0)) : 0,
  };
}

/**
 * Rebuild reading-order layout lines from OCR words on a SHARED character
 * grid (pdftotext-style). Words are clustered into rows by vertical center
 * (tolerance = half the median word height), then placed at their true
 * columns — one output line per row cluster, exactly like layoutLines() in
 * pdf.ts. Wide gaps inside a row are kept as whitespace: detectPdfColumns /
 * pdfPagesToStatement slice lines by column bands, so date and amount stay
 * on the same line no matter how far apart they sit.
 */
export function wordsToLines(
  words: OcrWord[],
  grid: { charWidth: number; originX: number },
): string[] {
  const usable = words.filter((w) => w.text.trim().length > 0);
  if (!usable.length) return [];

  const heights = usable.map((w) => w.y1 - w.y0).filter((h) => h > 0);
  const medH = heights.length
    ? [...heights].sort((a, b) => a - b)[Math.floor(heights.length / 2)]
    : 16;
  const yTol = Math.max(4, medH * 0.5);

  // Cluster by vertical center, top → bottom.
  const sorted = [...usable].sort(
    (a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2 || a.x0 - b.x0,
  );
  interface Row { yc: number; words: OcrWord[] }
  const rows: Row[] = [];
  for (const w of sorted) {
    const yc = (w.y0 + w.y1) / 2;
    const row = rows.find((r) => Math.abs(r.yc - yc) <= yTol);
    if (row) row.words.push(w);
    else rows.push({ yc, words: [w] });
  }

  const lines: string[] = [];
  for (const row of rows) {
    const ordered = [...row.words].sort((a, b) => a.x0 - b.x0);
    const cells: string[] = [];
    for (const w of ordered) {
      const col0 = Math.max(0, Math.round((w.x0 - grid.originX) / grid.charWidth));
      const text = w.text;
      // joinRow-style push-right: when proportional glyph widths make the
      // next word start inside the previous one's columns, shift right
      // instead of overwriting — losing a digit in an amount is far worse
      // than a one-column band drift. Exact-duplicate first characters
      // (fake-bold overlays) overwrite in place.
      let col = col0;
      if (cells[col] !== undefined && cells[col] !== text[0]) {
        for (let shift = 1; shift <= 3; shift++) {
          if (cells[col + shift] === undefined || /\s/.test(cells[col + shift])) {
            col += shift;
            break;
          }
        }
      }
      for (let i = 0; i < text.length; i++) cells[col + i] = text[i];
    }
    let out = "";
    for (let i = 0; i < cells.length; i++) out += cells[i] ?? " ";
    out = out.replace(/\s+$/, "");
    if (out.trim().length) lines.push(out);
  }
  return lines;
}

// ── tesseract.js loading + rendering (browser only — tests never touch it) ─

/**
 * Self-hosted OCR runtime assets, copied from node_modules into `public/ocr`
 * by scripts/copy-ocr-assets.mjs (postinstall). They are plain static files
 * served at the site root in dev and prod alike, so root-absolute URLs are
 * correct everywhere — no bundler rewrite or CDN involved. Same-origin keeps
 * every load inside the CSP (`script-src 'self'`, `default-src 'self'`).
 */
function ocrAssetUrls(): { workerPath: string; corePath: string; langPath: string } {
  return { workerPath: "/ocr/worker.min.js", corePath: "/ocr/", langPath: "/ocr/" };
}

type TesseractWorker = {
  recognize(
    image: unknown,
    opts?: Record<string, unknown>,
    output?: Record<string, boolean>,
  ): Promise<{ data: OcrPageData }>;
  terminate(): Promise<void>;
};

interface OcrBbox { x0: number; y0: number; x1: number; y1: number }
interface OcrLine { words: { text?: string; bbox?: OcrBbox; isword?: boolean }[] }
interface OcrBlock {
  /** tesseract.js v7 emits the numeric PolyBlockType enum (1 = text). */
  blocktype?: string | number;
  paragraphs?: { lines?: OcrLine[] }[];
  lines?: OcrLine[];
}
interface OcrPageData {
  text?: string;
  blocks?: OcrBlock[] | null;
}

/** Flatten tesseract block → paragraph → line structure into word boxes. */
function collectWords(data: OcrPageData): OcrWord[] {
  const out: OcrWord[] = [];
  for (const block of data.blocks ?? []) {
    // No blocktype filter: tesseract.js v7 emits the numeric PolyBlockType
    // enum (1 = text), not a string — and non-text blocks carry no word
    // boxes anyway, so word extraction below naturally skips them.
    const lines: OcrLine[] = [];
    for (const para of block.paragraphs ?? []) lines.push(...(para.lines ?? []));
    if (!lines.length) lines.push(...(block.lines ?? []));
    for (const line of lines) {
      for (const w of line.words ?? []) {
        const text = typeof w.text === "string" ? w.text.trim() : "";
        if (!text || !w.bbox) continue;
        out.push({ text, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 });
      }
    }
  }
  return out;
}

/** Render scale: ~3× (216 DPI) gives tesseract a comfortable x-height for
 * small statement digits while keeping per-page canvas memory modest
 * (~18 MB RGBA, released between pages). */
const RENDER_SCALE = 3;

/**
 * OCR an image-based PDF into layout lines compatible with the statement
 * parser. Fully local: pdf.js renders pages to canvases, tesseract.js (LSTM,
 * English best-int model) recognizes words in a Web Worker. `password` is
 * for encrypted documents that were already confirmed openable.
 *
 * Throws when the OCR runtime assets are missing/unreachable so callers can
 * report it distinctly from "scan unreadable".
 */
export async function ocrPdfPages(
  bytes: Uint8Array,
  password?: string,
  onProgress?: (p: OcrProgress) => void,
): Promise<PdfPageLayout[]> {
  // Share pdf.js's lazy loader so the same-origin worker is wired exactly
  // once (extractPdfPages may or may not have run before us).
  const pdfjsMod = await getPdfjs();
  const task = (pdfjsMod as unknown as {
    getDocument(p: { data: Uint8Array; password?: string }): {
      promise: Promise<PdfDocLike>;
      destroy(): Promise<void>;
    };
  }).getDocument({ data: bytes.slice(), ...(password ? { password } : {}) });

  let doc: PdfDocLike;
  try {
    doc = await task.promise;
  } catch (err) {
    await task.destroy().catch(() => {});
    throw err;
  }

  const Tesseract = await import("tesseract.js");
  const assets = ocrAssetUrls();
  let worker: TesseractWorker;
  try {
    onProgress?.({ page: 0, pages: doc.numPages, status: "loading OCR engine" });
    worker = (await (Tesseract as unknown as {
      createWorker(
        langs: string,
        oem?: number,
        opts?: Record<string, unknown>,
      ): Promise<TesseractWorker>;
    }).createWorker("eng", undefined, {
      workerPath: assets.workerPath,
      corePath: assets.corePath,
      langPath: assets.langPath,
      // CSP-critical: the default spawns the worker from a blob: URL, which
      // `script-src 'self'` blocks. Load the same-origin file directly.
      workerBlobURL: false,
      gzip: true,
      legacyCore: false,
      // NOTE: do NOT pass `logging` here — createWorker forwards
      // options.logging straight into a postMessage payload (the worker's
      // load job), and functions are not structured-cloneable. The default
      // no-op `logger` keeps tesseract's progress chatter off the console.
    })) as TesseractWorker;
  } catch (err) {
    await task.destroy().catch(() => {});
    throw new Error(
      `OCR engine failed to load (${(err as Error)?.message ?? err})`,
    );
  }

  try {
    const pageWords: OcrWord[][] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      onProgress?.({ page: n, pages: doc.numPages, status: "rendering" });
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable for OCR render");
      // White background — image masks paint black-on-transparent; without a
      // fill the OCR input is transparent and tesseract sees nothing.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        canvas,
        viewport,
      } as unknown as Parameters<typeof page.render>[0]).promise;

      onProgress?.({ page: n, pages: doc.numPages, status: "recognizing" });
      const { data } = await worker.recognize(canvas, {}, { blocks: true, text: false });
      pageWords.push(collectWords(data));
      // Release canvas backing store between pages (large scans).
      canvas.width = 0;
      canvas.height = 0;
    }

    const grid = ocrPageGrid(pageWords.flat());
    return pageWords.map((words, i) => ({
      pageNumber: i + 1,
      lines: wordsToLines(words, grid),
    }));
  } finally {
    await worker.terminate().catch(() => {});
    await task.destroy().catch(() => {});
  }
}

interface PdfDocLike {
  numPages: number;
  getPage(n: number): Promise<{
    getViewport(opts: { scale: number }): { width: number; height: number };
    render(params: never): { promise: Promise<void> };
  }>;
}
