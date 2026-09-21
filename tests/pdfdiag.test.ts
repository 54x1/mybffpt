// @ts-nocheck — temporary diagnostic harness: uses Node APIs without the
// project's browser-only tsconfig types (no @types/node dependency added).
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

// TEMPORARY diagnostic harness — runs the real PDF pipeline against local
// statement files (all processing stays on-machine). Enable with:
//   $env:PDF_DIAG="C:\path\stmt1.pdf;C:\path\stmt2.pdf"
//   $env:PDF_DIAG_PW="secret"        # optional, applied to every file
//   npx vitest run tests/pdfdiag.test.ts
// Skipped from normal runs when PDF_DIAG is unset.

import { describe, it } from "vitest";
import { readFileSync, existsSync, appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { layoutLines, pageGrid, type PdfPageLayout } from "../src/utils/pdf";
import {
  pdfPagesToStatement,
  matchDateAtLineStart,
  matchAmountCell,
  splitCells,
} from "../src/utils/pdfStatement";

/** Replicates pass-1 candidate collection to expose amount-column geometry. */
function geometryDump(pages: PdfPageLayout[], hint: { year: number }) {
  const lines = pages.flatMap((p) => p.lines);
  const rows: { endCols: number[]; vals: string[] }[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const dateHit = matchDateAtLineStart(line, hint);
    if (!dateHit) continue;
    const cells = splitCells(line.slice(dateHit.end));
    const hits: { endCol: number; text: string }[] = [];
    for (let i = cells.length - 1; i >= 0; i--) {
      if (matchAmountCell(cells[i].text) !== null) {
        hits.unshift({ endCol: dateHit.end + cells[i].col + cells[i].text.length, text: cells[i].text });
      } else break;
    }
    rows.push({ endCols: hits.map((h) => h.endCol), vals: hits.map((h) => h.text) });
  }
  // Histogram of all amount end-columns.
  const hist = new Map<number, number>();
  for (const r of rows) for (const c of r.endCols) hist.set(c, (hist.get(c) ?? 0) + 1);
  const buckets: string[] = [];
  for (const [col, n] of [...hist.entries()].sort((a, b) => a[0] - b[0])) {
    if (n >= 2) buckets.push(`${col}:${n}`);
  }
  log(`  candidate-rows=${rows.length} endCol-histogram(>=2)=${buckets.join(" ") || "(none)"}`);
  // Per-page histograms: does the same logical column shift between pages?
  const pageRows = pages.map((p) => {
    const pr: { endCols: number[] }[] = [];
    for (const line of p.lines) {
      if (!line.trim()) continue;
      const dateHit = matchDateAtLineStart(line, hint);
      if (!dateHit) continue;
      const cells = splitCells(line.slice(dateHit.end));
      const hits: number[] = [];
      for (let i = cells.length - 1; i >= 0; i--) {
        if (matchAmountCell(cells[i].text) !== null) {
          hits.unshift(dateHit.end + cells[i].col + cells[i].text.length);
        } else break;
      }
      if (hits.length) pr.push({ endCols: hits });
    }
    return pr;
  });
  pageRows.forEach((pr, i) => {
    if (!pr.length) return;
    const h = new Map<number, number>();
    for (const r of pr) for (const c of r.endCols) h.set(c, (h.get(c) ?? 0) + 1);
    const bs: string[] = [];
    for (const [col, n] of [...h.entries()].sort((a, b) => a[0] - b[0])) if (n >= 2) bs.push(`${col}:${n}`);
    log(`  PG${i + 1} rows=${pr.length} bands=${bs.join(" ") || "(none)"}`);
  });
  const nonEmpty = rows.filter((r) => r.endCols.length > 0);
  log(`  candidates-with-numerics=${nonEmpty.length} without=${rows.length - nonEmpty.length}`);
  for (const r of nonEmpty.slice(0, 30)) {
    log(`  G | ${JSON.stringify(r.endCols)} ${JSON.stringify(r.vals)}`);
  }
}

const files = (process.env.PDF_DIAG ?? "").split(";").map((s) => s.trim()).filter(Boolean);
const pw = process.env.PDF_DIAG_PW || undefined;
const yearHint = { year: new Date().getFullYear() };

const REPORT = process.env.PDF_DIAG_OUT || "tests/pdfdiag-report.txt";
writeFileSync(REPORT, "");
function log(s: string) {
  appendFileSync(REPORT, s + "\n");
}

// jsdom has no Worker; point pdf.js at the real worker file so its fake-worker
// fallback can import() it (Vite rewrites new URL(...) to http: which Node
// rejects — this is harness-only, browser app uses the emitted asset).
type Item = { str: string; transform: number[]; width: number; height: number };

async function extract(file: string, password?: string): Promise<{ pages: PdfPageLayout[]; allItems: Item[][] }> {
  const pdfjs = await import("pdfjs-dist");
  const workerPath = path.resolve("node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } })
    .GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  const task = pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), ...(password ? { password } : {}) });
  const doc = await task.promise;
  const allItems: Item[][] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    allItems.push(
      (content.items as unknown[])
        .filter((it): it is Item => typeof (it as { str?: unknown }).str === "string")
        .map((it) => ({ str: it.str, transform: [...it.transform], width: Number(it.width) || 0, height: Number(it.height) || 10 })),
    );
  }
  await task.destroy().catch(() => {});
  const grid = pageGrid(allItems.flat());
  const pages = allItems.map((items, i) => ({ pageNumber: i + 1, lines: layoutLines(items, grid) }));
  return { pages, allItems };
}

async function diag(file: string): Promise<{ pages: PdfPageLayout[]; allItems: Item[][] }> {
  try {
    return await extract(file, pw);
  } catch (err) {
    const e = err as { name?: string; code?: string | number };
    if (e?.name === "PasswordException") {
      log(`  [PASSWORD NEEDED (code=${String(e.code)}) — set $env:PDF_DIAG_PW and re-run]`);
    }
    throw err;
  }
}

async function diagnoseFile(file: string) {
    if (!existsSync(file)) return log(`MISSING: ${file}`);
    log(`\n===== ${file} =====`);
    let pages: PdfPageLayout[];
    let allItemsRef: Item[][];
    try {
      ({ pages, allItems: allItemsRef } = await diag(file));
    } catch (err) {
      log(`  EXTRACTION FAILED: ${(err as Error).name}: ${(err as Error).message}`);
      return;
    }
    const totalLines = pages.reduce((n, p) => n + p.lines.length, 0);
    log(`  pages=${pages.length} lines=${totalLines}`);

    // Dump first page layout verbatim (spaces visible via JSON quotes).
    const dump = pages[0]?.lines ?? [];
    for (const l of dump.slice(0, 45)) {
      log(`  | ${JSON.stringify(l)}`);
    }
    // Page 2/3 raw lines — transaction tables usually start there.
    for (const pg of [1, 2]) {
      const ls = pages[pg]?.lines ?? [];
      log(`  --- page ${pg + 1} first 40 ---`);
      for (const l of ls.slice(0, 40)) log(`  P${pg + 1}| ${JSON.stringify(l)}`);
    }

    // How many lines even look like they start with a date?
    const dateLines = pages.flatMap((p) => p.lines).filter((l) => matchDateAtLineStart(l, yearHint));
    log(`  lines-with-leading-date=${dateLines.length}`);
    for (const l of dateLines.slice(0, 8)) {
      log(`  D | ${JSON.stringify(l)}`);
    }

    // Raw item dump for the first transaction-looking line (debug kerning).
    if (process.env.PDF_DIAG_ITEMS && file.includes("estatement.pdf")) {
      const itemsAll = allItemsRef[2] ?? [];
      // Find y of first date-ish line then dump its row's raw items.
      const rowsMap = new Map<number, typeof itemsAll>();
      for (const it of itemsAll) {
        const key = Math.round(it.transform[5]);
        const arr = rowsMap.get(key) ?? [];
        arr.push(it);
        rowsMap.set(key, arr);
      }
      let shown = 0;
      for (const [, arr] of [...rowsMap.entries()].sort((a, b) => b[0] - a[0])) {
        const text = arr.map((i) => i.str).join("|");
        if (/^\s*\d{2} /.test(text) && /\d/.test(text) && shown < 3) {
          log(`  ITEMS(${JSON.stringify(text)}) x:`);
          for (const it of [...arr].sort((a, b) => a.transform[4] - b.transform[4])) {
            log(`    ${it.transform[4].toFixed(1)} w=${it.width.toFixed(1)} h=${it.height.toFixed(2)} ${JSON.stringify(it.str)}`);
          }
          shown++;
        }
      }
    }

    if (!dateLines.length) {
      // Local copy of the isImageBasedPdf heuristic — must NOT call the one
      // in pdf.ts, whose getPdfjs sets a Vite-rewritten http: workerSrc that
      // Node rejects (same reason extract() above is duplicated here).
      try {
        // Node 25 lacks getOrInsertComputed, which pdf.js v6 uses inside
        // getOperatorList's intent-state bookkeeping. Must be `value:` form —
        // shorthand method syntax fails after TS transform. Object variant
        // operates on plain objects (own-property check), Map variant on Maps.
        if (!(Map.prototype as any).getOrInsertComputed) {
          Object.defineProperty(Map.prototype, "getOrInsertComputed", {
            configurable: true,
            writable: true,
            value: function (key: any, fn: (k: any) => any) {
              if (!this.has(key)) this.set(key, fn(key));
              return this.get(key);
            },
          });
        }
        if (!(Object as any).getOrInsertComputed) {
          Object.defineProperty(Object, "getOrInsertComputed", {
            configurable: true,
            writable: true,
            value: function (target: Record<string | symbol, any>, key: string | symbol, fn: () => any) {
              if (!Object.prototype.hasOwnProperty.call(target, key)) target[key] = fn();
              return target[key];
            },
          });
        }

        const pdfjs = await import("pdfjs-dist");
        const task2 = pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), ...(pw ? { password: pw } : {}) });
        const doc2 = await task2.promise;
        let imageOps = 0;
        const perPage: string[] = [];
        for (let n = 1; n <= Math.min(doc2.numPages, 6); n++) {
          const page = await doc2.getPage(n);
          const ops = await page.getOperatorList();
          let p = 0;
          const IMG_OPS = new Set(["paintImageXObject", "paintJpegXObject", "paintImageXObjectRepeat", "paintImageMaskXObject", "paintImageMaskXObjectGroup", "paintImageMaskXObjectRepeat"].map((k) => (pdfjs.OPS as any)[k]));
          for (const fn of ops.fnArray) {
            if (IMG_OPS.has(fn)) p++;
          }
          perPage.push(`P${n}:${p}`);
          imageOps += p;
        }
        await task2.destroy().catch(() => {});
        log(`  image-paint-ops=${imageOps} [${perPage.join(" ")}] image-based-pdf=${imageOps >= 8}${imageOps >= 8 ? "  (rasterized/scanned — no text layer to parse)" : ""}`);
        if (!imageOps) {
          // Debug: what IS in the operator lists? Histogram by op name.
          const task3 = pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), ...(pw ? { password: pw } : {}) });
          const doc3 = await task3.promise;
          const page3 = await doc3.getPage(2);
          const ops3 = await page3.getOperatorList();
          const nameOf: Record<number, string> = {};
          for (const [k, v] of Object.entries(pdfjs.OPS as any)) if (typeof v === "number") nameOf[v] = k;
          const h = new Map<string, number>();
          for (const fn of ops3.fnArray) {
            const nm = nameOf[fn] ?? `?${fn}`;
            h.set(nm, (h.get(nm) ?? 0) + 1);
          }
          log(`  P2-op-histogram: ${[...h.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(" ")}`);
          await task3.destroy().catch(() => {});
        }
      } catch (e) {
        log(`  image-based check failed: ${(e as Error).message}`);
      }
    }

    const result = pdfPagesToStatement(pages, yearHint);
    log(`  mode=${result.mode} kept=${result.rows.length} skipped=${result.skippedCount}`);
    geometryDump(pages, yearHint);
    for (const r of result.rows.slice(0, 12)) {
      log(`  R | ${r.dateISO}  ${JSON.stringify(r.description)}  ${r.amount}`);
    }
}

describe.skipIf(!files.length)("pdf diagnostics", () => {
  it("diagnose local statements", async () => {
    for (const file of files) await diagnoseFile(file);
  }, 120_000);
});
