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

// Generates synthetic bank-statement PDFs for manual/e2e testing of the PDF
// import column mapper. Output goes to test-results/pdf-fixtures/ (gitignored)
// and contains ONLY invented transactions — never real statement data.
//
// Usage: node scripts/make-test-statement.mjs
//
// Hand-rolled uncompressed PDF (Courier, fixed 0.6em advance width) so no
// extra devDependency is needed. Right-aligned amount columns mirror the CBA
// layout used in tests/pdfStatement.test.ts: debit right edge ~400pt, credit
// ~460pt, balance ~530pt, description starting ~120pt, date at 50pt.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "test-results", "pdf-fixtures");

const PAGE_W = 595; // A4 portrait, points
const PAGE_H = 842;
const FONT_SIZE = 9;
const CHAR_W = FONT_SIZE * 0.6; // Courier fixed advance
const LINE_H = 13;

/** @typedef {{ text: string; x: number }} Cell */

/** Right-align a cell so its right edge lands on `edge`. */
function right(text, edge) {
  return { text, x: edge - text.length * CHAR_W };
}

/** Left-align at `x` (identity, for readability of row specs). */
function left(text, x) {
  return { text, x };
}

// Column geometry (pt from page left) — matches the CBA fixture in tests.
const COL_DATE = 50;
const COL_DESC = 120;
const COL_DEBIT_R = 400;
const COL_CREDIT_R = 460;
const COL_BAL_R = 530;

/** @type {Cell[][]} one row of cells per line, top → bottom */
const rows = [
  [left("COMMONWEALTH BANK OF AUSTRALIA", COL_DATE)],
  [left("Statement of account 1234 5678 9012 3456", COL_DATE)],
  [left("Period: 10 January 2024 - 09 May 2024", COL_DATE)],
  [],
  [
    left("Date", COL_DATE),
    left("Description", COL_DESC),
    right("Debit", COL_DEBIT_R),
    right("Credit", COL_CREDIT_R),
    right("Balance", COL_BAL_R),
  ],
  [
    left("12 Jan", COL_DATE),
    left("SALARY ABC LTD", COL_DESC),
    right("", COL_DEBIT_R),
    right("3,100.00", COL_CREDIT_R),
    right("4,100.00", COL_BAL_R),
  ],
  [
    left("15 Jan", COL_DATE),
    left("COLES ONLINE #0042", COL_DESC),
    right("84.50", COL_DEBIT_R),
    right("", COL_CREDIT_R),
    right("4,015.50", COL_BAL_R),
  ],
  [
    left("18 Jan", COL_DATE),
    left("INTEREST PAID", COL_DESC),
    right("", COL_DEBIT_R),
    right("2.00", COL_CREDIT_R),
    right("4,017.50", COL_BAL_R),
  ],
  [
    left("22 Jan", COL_DATE),
    left("BUNNINGS WAREHOUSE 118", COL_DESC),
    right("132.90", COL_DEBIT_R),
    right("", COL_CREDIT_R),
    right("3,884.60", COL_BAL_R),
  ],
  [
    left("26 Jan", COL_DATE),
    left("TRANSFER TO SAVINGS", COL_DESC),
    right("500.00", COL_DEBIT_R),
    right("", COL_CREDIT_R),
    right("3,384.60", COL_BAL_R),
  ],
  [
    left("31 Jan", COL_DATE),
    left("REFUND AMAZON MARKETPLACE", COL_DESC),
    right("", COL_DEBIT_R),
    right("25.99", COL_CREDIT_R),
    right("3,410.59", COL_BAL_R),
  ],
  [],
  [left("Page 1 of 1", COL_DATE)],
];

/** Escape literal text for a PDF string. */
function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Build the content stream: one Tj per non-empty cell. */
function contentStream(rows) {
  const parts = [];
  let yTop = 60; // pt from top of page for first line
  for (const cells of rows) {
    const y = PAGE_H - yTop;
    for (const { text, x } of cells) {
      if (!text) continue;
      parts.push(`BT /F1 ${FONT_SIZE} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${esc(text)}) Tj ET`);
    }
    yTop += LINE_H;
  }
  return parts.join("\n");
}

/** Assemble a minimal one-page uncompressed PDF. */
function buildPdf(rows) {
  const stream = contentStream(rows);
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    out += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, "cba-style.pdf");
writeFileSync(outPath, buildPdf(rows));
console.log(`Wrote ${outPath} (${rows.length} lines)`);
