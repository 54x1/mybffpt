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

// PDF text extraction for bank-statement import. The layout-reconstruction
// approach (y-clustering + gap-proportional spacing) mirrors the physical
// output of `pdftotext -layout`, which the monopoly / StatementSensei parsers
// (https://github.com/benjamin-awd/monopoly, AGPL-3.0) are designed around —
// see NOTICE.md for attribution. pdf.js runs fully client-side; PDF bytes
// never leave the browser.

/** A positioned text fragment, structurally compatible with a pdf.js TextItem. */
export interface PdfTextItem {
  str: string;
  /** PDF transform matrix [a b c d e f]; e = x, f = y (baseline). */
  transform: number[];
  width: number;
  height: number;
}

/** One page of reconstructed layout text — lines ordered top → bottom. */
export interface PdfPageLayout {
  pageNumber: number; // 1-based
  lines: string[];
}

/** The PDF is encrypted and requires a password to open. */
export class PdfPasswordNeededError extends Error {
  constructor(message = "This PDF is password-protected") {
    super(message);
    this.name = "PdfPasswordNeededError";
  }
}

/** The supplied password was rejected by the PDF. */
export class PdfWrongPasswordError extends Error {
  constructor(message = "Incorrect password for this PDF") {
    super(message);
    this.name = "PdfWrongPasswordError";
  }
}

// ── pdf.js loading (lazy, so the WASM/worker chunks stay out of the main
//    bundle and unit tests never touch them) ────────────────────────────────

type GetDocumentLike = (params: {
  data: Uint8Array;
  password?: string;
}) => { promise: Promise<PdfDocumentLike>; destroy(): Promise<void> };

interface PdfDocumentLike {
  numPages: number;
  getPage(n: number): Promise<{
    getTextContent(): Promise<{ items: unknown[] }>;
    getOperatorList(): Promise<{ fnArray: ArrayLike<number> }>;
  }>;
  /** pdfjs v6: documents release resources via `cleanup()` — `destroy()` was
   * removed from PDFDocumentProxy and exists only on the loading task. */
  cleanup?(): Promise<unknown>;
}

interface PdfJsModule {
  getDocument: GetDocumentLike;
  /** Operator-id constants (paintImageXObject etc.) exported by pdf.js. */
  OPS: Record<string, number>;
}

let pdfjsPromise: Promise<PdfJsModule> | null = null;

/** Lazily import pdf.js and wire its same-origin worker (CSP 'self').
 * Exported so the OCR renderer (pdfOcr.ts) shares the exact same configured
 * module instance instead of depending on call order. */
export async function getPdfjs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      try {
        // Same-origin worker chunk emitted by Vite → CSP 'self' compatible.
        const workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } })
          .GlobalWorkerOptions.workerSrc = workerSrc;
      } catch {
        // Fall back to pdf.js main-thread ("fake worker") mode.
      }
      return pdfjs as unknown as PdfJsModule;
    })();
  }
  return pdfjsPromise;
}

function isPasswordException(err: unknown): boolean {
  const e = err as { name?: string; code?: string | number };
  if (e?.name !== "PasswordException") return false;
  // pdf.js v4/v5 use string codes ("NEED_PASSWORD" / "INCORRECT_PASSWORD");
  // older builds used the numeric PasswordResponses enum (1/2/3).
  const code = String(e.code ?? "");
  return code.includes("PASSWORD") || code === "1" || code === "2";
}

function isWrongPassword(err: unknown): boolean {
  const e = err as { name?: string; code?: string | number };
  const code = String(e.code ?? "");
  return (
    e?.name === "PasswordException" &&
    (code.includes("INCORRECT") || code === "2")
  );
}

/**
 * Heuristic: is this document drawn as pictures rather than selectable text?
 * Two flavours seen in the wild, both invisible to `getTextContent`:
 *  - scanned / rasterized pages (whole-page images);
 *  - driver-rasterized Type3-style glyphs — ANZ print-to-PDF draws EVERY
 *    character as a tiny 1-bit image mask (~1.5k paintImageMaskXObject ops
 *    per page, no ToUnicode map), verified on a real ANZ statement.
 * Counts image-paint operators in the first few pages' operator lists. Only
 * worth calling when text extraction found nothing useful — it re-parses
 * content streams.
 */
export async function isImageBasedPdf(
  bytes: Uint8Array,
  password?: string,
): Promise<boolean> {
  const pdfjs = await getPdfjs();
  const task = pdfjs.getDocument({
    data: bytes.slice(),
    ...(password ? { password } : {}),
  });
  let doc: PdfDocumentLike;
  try {
    doc = await task.promise;
  } catch (err) {
    await task.destroy().catch(() => {});
    throw err;
  }
  try {
    const { paintImageXObject, paintJpegXObject, paintImageXObjectRepeat, paintImageMaskXObject, paintImageMaskXObjectGroup, paintImageMaskXObjectRepeat } = pdfjs.OPS;
    const imageFns = new Set([
      paintImageXObject,
      paintJpegXObject,
      paintImageXObjectRepeat,
      paintImageMaskXObject,
      paintImageMaskXObjectGroup,
      paintImageMaskXObjectRepeat,
    ]);
    let imageOps = 0;
    for (let n = 1; n <= Math.min(doc.numPages, 3) && imageOps < 8; n++) {
      const page = await doc.getPage(n);
      const ops = await page.getOperatorList();
      for (let i = 0; i < ops.fnArray.length; i++) {
        if (imageFns.has(ops.fnArray[i])) imageOps++;
      }
    }
    // ≥8 image paints on a statement page can't be a logo/watermark — text
    // statements carry at most a handful of decorative images.
    return imageOps >= 8;
  } finally {
    await task.destroy().catch(() => {});
  }
}

/**
 * Extract layout text from every page of a PDF.
 * Throws {@link PdfPasswordNeededError} when the document is encrypted and no
 * (usable) password was supplied, or {@link PdfWrongPasswordError} when the
 * password is rejected. Other errors propagate as-is.
 */
export async function extractPdfPages(
  bytes: Uint8Array,
  password?: string,
): Promise<PdfPageLayout[]> {
  const pdfjs = await getPdfjs();
  // pdf.js transfers the buffer to its worker — always hand it a copy so
  // retries (e.g. after unlocking) still have intact bytes.
  const task = pdfjs.getDocument({
    data: bytes.slice(),
    ...(password ? { password } : {}),
  });
  let doc: PdfDocumentLike;
  try {
    doc = await task.promise;
  } catch (err) {
    // Release the failed loading task's worker before propagating.
    await task.destroy().catch(() => {});
    if (isPasswordException(err)) {
      throw isWrongPassword(err) ? new PdfWrongPasswordError() : new PdfPasswordNeededError();
    }
    throw err;
  }

  try {
    // Collect every page's items first so the character grid can use ONE
    // shared x→column transform for the whole document. Per-page origins
    // make the same physical amount column land on different columns on
    // different pages (each page's leftmost text differs), which shatters
    // the statement parser's vertical band clustering across multi-page
    // statements (verified against real Westpac PDFs).
    const allItems: PdfTextItem[][] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      for (const raw of content.items) {
        const it = raw as Partial<PdfTextItem> & { str?: unknown };
        if (typeof it.str !== "string" || !Array.isArray(it.transform)) continue;
        items.push({
          str: it.str,
          transform: it.transform as number[],
          width: Number(it.width) || 0,
          height: Number(it.height) || 10,
        });
      }
      allItems.push(items);
    }
    const grid = pageGrid(allItems.flat());
    return allItems.map((items, i) => ({
      pageNumber: i + 1,
      lines: layoutLines(items, grid),
    }));
  } finally {
    // Teardown goes through the loading task — `PDFDocumentProxy` has no
    // destroy() in pdfjs v6 (only cleanup()); destroying the task releases
    // document + worker resources across v4–v6.
    await task.destroy().catch(() => {});
  }
}

// ── Layout reconstruction (pure — unit-testable without pdf.js) ────────────

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Shared character-grid parameters (x → column) for a set of pages. */
export interface PdfGrid {
  charWidth: number;
  originX: number;
}

/** Derive one grid from all items so every page maps x positions identically. */
export function pageGrid(all: PdfTextItem[]): PdfGrid {
  const usable = all.filter((it) => it.str.trim().length >= 2 && it.width > 0);
  const charWidths = usable.map((i) => i.width / i.str.trim().length);
  const anyH = all.length ? median(all.map((i) => i.height)) : 10;
  return {
    charWidth: Math.min(20, Math.max(1.5, median(charWidths) || anyH * 0.5)),
    originX: all.length ? Math.min(...all.map((i) => i.transform[4])) : 0,
  };
}

/**
 * Rebuild reading-order layout lines from positioned text items, mimicking
 * `pdftotext -layout`: items are clustered into rows by baseline y (with a
 * tolerance), then placed onto a shared character grid. Pass an explicit
 * {@link PdfGrid} to keep columns aligned ACROSS pages; without one the grid
 * is derived from these items only.
 */
export function layoutLines(items: PdfTextItem[], grid?: PdfGrid): string[] {
  const usable = items.filter((it) => it.str.length > 0);
  if (!usable.length) return [];

  const medianH = median(usable.map((i) => i.height)) || 10;
  const yTol = Math.max(1.5, medianH * 0.4);

  // Estimate the average character width from proportional text items so x
  // positions map to stable character columns (pdftotext does the same).
  const charW = grid?.charWidth ?? pageGrid(usable).charWidth;

  // Cluster by baseline y (top → bottom). Sort first so cluster seeds are
  // deterministic regardless of pdf.js item order.
  const sorted = [...usable].sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);

  interface Row { y: number; items: PdfTextItem[] }
  const rows: Row[] = [];
  for (const it of sorted) {
    const y = it.transform[5];
    // Rows are kept in descending-y order; scan from the closest backwards.
    let row: Row | undefined;
    for (let i = rows.length - 1; i >= 0 && !row; i--) {
      if (Math.abs(rows[i].y - y) <= yTol) row = rows[i];
    }
    if (row) row.items.push(it);
    else rows.push({ y, items: [it] });
  }

  const minX = Math.min(...usable.map((i) => i.transform[4]));

  return rows
    .map((row) => joinRow(row.items, charW, minX))
    .filter((l) => l.trim().length > 0);
}

/** ≥3 consecutive dots: dot-leader column filler (NAB statements). */
const DOT_LEADER_RE = /\.{3,}/;

interface CellPlacement {
  col: number;
  text: string;
}

/**
 * Grid placements for one item. Normally a single placement at the item's
 * start column — but dot leaders render far narrower per character than the
 * uniform grid assumes (NAB pads to amounts with runs of periods). When an
 * item's characters overflow its PHYSICAL span by ≥3 columns and it contains
 * a leader run, each text segment between leaders is placed at its true x
 * position instead: one-character-per-column would push trailing amounts
 * right in proportion to dot count, destroying band alignment. Segments that
 * end the item (the amount) are right-aligned to the item's physical edge —
 * amounts are right-aligned on the page. Leader runs are filled with dots at
 * proportional positions so downstream parsing still SEES the leader (it
 * marks padded rows) while every character keeps its true column.
 */
function placementsFor(it: PdfTextItem, minX: number, charW: number): CellPlacement[] {
  const str = it.str;
  if (!str.length) return [];
  const x0 = it.transform[4];
  const startCol = Math.max(0, Math.round((x0 - minX) / charW));
  const w = Number(it.width) || 0;
  const spanCols = Math.round(w / charW);
  if (!w || str.length <= spanCols + 2 || !DOT_LEADER_RE.test(str)) {
    return [{ col: startCol, text: str }];
  }

  const len = str.length;
  const colAt = (charIdx: number) => Math.max(0, Math.round((x0 + charIdx * (w / len) - minX) / charW));
  const segs: CellPlacement[] = [];
  const re = /\.{3,}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let reservedEnd = -1; // one blank column after each leader run
  const pushText = (start: number, text: string) => {
    const trimmed = text.trimEnd();
    if (!trimmed.trim().length) return;
    const body = trimmed.trimStart();
    let col: number;
    if (start + text.length >= len - 1 && /\d/.test(body)) {
      // Segment reaches the item's end → right-align to its physical edge.
      col = Math.round((x0 + w - minX) / charW) - body.length;
    } else {
      col = colAt(start + trimmed.length - trimmed.trimStart().length);
    }
    if (col < reservedEnd) col = reservedEnd; // keep a space after the leader
    segs.push({ col: Math.max(0, col), text: body });
  };
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) pushText(last, str.slice(last, m.index));
    const runStart = colAt(m.index);
    const runEnd = colAt(m.index + m[0].length);
    segs.push({ col: runStart, text: ".".repeat(Math.max(1, runEnd - runStart - 1)) });
    reservedEnd = Math.max(reservedEnd, runStart + Math.max(1, runEnd - runStart - 1) + 1);
    last = m.index + m[0].length;
  }
  if (last < len) pushText(last, str.slice(last));
  return segs.length ? segs : [{ col: startCol, text: str }];
}

function joinRow(items: PdfTextItem[], charW: number, minX: number): string {
  const ordered = [...items].sort((a, b) => a.transform[4] - b.transform[4]);
  // Place each item's characters onto the grid starting at its column. When
  // proportional glyph widths make consecutive items overlap (pdf.js splits
  // kerned text like "14 Jul 26" into fragments closer together than our
  // uniform charW allows), push the later fragment right instead of
  // overwriting — losing a digit in an amount or year is far worse than a
  // one-column band drift. Exact-duplicate first characters (fake-bold
  // overlays) overwrite in place instead.
  const cells: string[] = [];
  for (const it of ordered) {
    if (!it.str.length) continue;
    for (const p of placementsFor(it, minX, charW)) {
      let col = Math.max(0, p.col);
      const text = p.text;
      if (!text.length) continue;
      if (cells[col] !== undefined && !/\s/.test(cells[col]) && cells[col] !== "." && cells[col] !== text[0]) {
        for (let shift = 1; shift <= 3; shift++) {
          if (cells[col + shift] === undefined || /\s/.test(cells[col + shift])) {
            col += shift;
            break;
          }
        }
      }
      for (let i = 0; i < text.length; i++) {
        cells[col + i] = text[i];
      }
    }
  }
  let out = "";
  for (let i = 0; i < cells.length; i++) out += cells[i] ?? " ";
  return out.replace(/\s+$/, "");
}
