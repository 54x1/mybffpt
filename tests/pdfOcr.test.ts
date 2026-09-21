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

// Unit tests for the pure OCR layout-reconstruction helpers: word boxes →
// shared character grid → reading-order lines with aligned columns. The
// tesseract/pdf.js runtime paths are browser-only and never imported here.

import { describe, expect, it } from "vitest";
import { ocrPageGrid, wordsToLines, type OcrWord } from "../src/utils/pdfOcr";

/** Word box helper: monospace-ish 8px-wide glyphs at (x0, baselineTop). */
function word(text: string, x0: number, yTop: number, charW = 8): OcrWord {
  return { text, x0, y0: yTop, x1: x0 + text.length * charW, y1: yTop + 16 };
}

describe("ocrPageGrid", () => {
  it("derives charWidth from the median per-character width", () => {
    const words = [word("HELLO", 0, 0), word("WORLD", 100, 30)]; // 8px/char
    const grid = ocrPageGrid(words);
    expect(grid.charWidth).toBeCloseTo(8);
    expect(grid.originX).toBe(0);
  });

  it("clamps charWidth into a sane range for degenerate input", () => {
    // Absurdly wide glyphs (100px/char) must clamp to the upper bound.
    const huge = [word("A B".slice(0, 3), 0, 0, 400)];
    expect(ocrPageGrid(huge).charWidth).toBeLessThanOrEqual(40);
    // Empty input still yields a usable grid rather than NaN.
    const empty = ocrPageGrid([]);
    expect(Number.isFinite(empty.charWidth)).toBe(true);
  });
});

describe("wordsToLines", () => {
  it("joins words on the same baseline into one line, ordered left→right", () => {
    const grid = { charWidth: 8, originX: 0 };
    const lines = wordsToLines(
      [word("COFFEE", 40, 10), word("DIGITAL", 200, 12)], // same row (within tol)
      grid,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\s*COFFEE\s+DIGITAL$/);
    // True columns: COFFEE x=40 → col 5, DIGITAL x=200 → col 25.
    expect(lines[0].indexOf("COFFEE")).toBe(5);
    expect(lines[0].indexOf("DIGITAL")).toBe(25);
  });

  it("keeps rows apart vertically on separate lines, top→bottom", () => {
    const grid = { charWidth: 8, originX: 0 };
    const lines = wordsToLines(
      [word("SECOND", 40, 60), word("FIRST", 40, 10)],
      grid,
    );
    expect(lines.map((l) => l.trim())).toEqual(["FIRST", "SECOND"]);
  });

  it("places date left, description middle, amount right on each row", () => {
    const grid = { charWidth: 8, originX: 0 };
    // Date col at x=0, description at x=160, amounts in the right-hand band.
    const lines = wordsToLines(
      [
        word("01/09/26", 0, 10),
        word("SALARY ACME PTY", 160, 10),
        word("4,120.50", 560, 10),
        word("02/09/26", 0, 40),
        word("COFFEES", 160, 40),
        word("4.50", 600, 40),
      ],
      grid,
    );
    expect(lines).toHaveLength(2);
    for (const [i, line] of lines.entries()) {
      const date = i === 0 ? "01/09/26" : "02/09/26";
      const desc = i === 0 ? "SALARY ACME PTY" : "COFFEES";
      const amt = i === 0 ? "4,120.50" : "4.50";
      const dCol = line.indexOf(date);
      const sCol = line.indexOf(desc);
      const aCol = line.indexOf(amt);
      expect(dCol).toBe(0); // date at the left margin (leading whitespace kept)
      expect(sCol).toBeGreaterThan(dCol); // description after the date
      expect(aCol).toBeGreaterThan(sCol); // amount in the right-hand band
      expect(aCol).toBeGreaterThanOrEqual(60); // far-right column region
    }
  });

  it("keeps side-by-side words on one line with true columns (wide gap = whitespace)", () => {
    const grid = { charWidth: 8, originX: 0 };
    // Same row cluster → one output line; the wide gap stays as padding so
    // detectPdfColumns can still slice date/amount bands (layoutLines parity).
    const lines = wordsToLines(
      [word("LEFTROW", 40, 10), word("RIGHTROW", 640, 12)],
      grid,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].indexOf("LEFTROW")).toBe(5); // x=40 → col 5
    expect(lines[0].indexOf("RIGHTROW")).toBe(80); // x=640 → col 80 preserved
  });

  it("keeps moderate intra-row gaps on a single logical line", () => {
    const grid = { charWidth: 8, originX: 0 };
    // Gap from x=88 to x=160 → 9 cols ≤ default split threshold of 10.
    const lines = wordsToLines(
      [word("COFFEE", 40, 10), word("SHOP", 160, 10)],
      grid,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\s*COFFEE\s+SHOP$/);
  });

  it("pushes overlapping words right instead of overwriting digits", () => {
    const grid = { charWidth: 8, originX: 0 };
    // "Jul26" starts at x=8 → column 1, colliding with the '4' of "14".
    // joinRow-style push-right must shift it to column 2 — welding the
    // fragments rather than losing a character (pdf.ts does the same).
    const lines = wordsToLines(
      [word("14", 0, 10), word("Jul26", 8, 10)],
      grid,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("14Jul26"); // no lost characters
    expect(lines[0].length).toBe(7); // 2 + 5 characters preserved
  });

  it("drops words whose text is blank after trimming", () => {
    const grid = { charWidth: 8, originX: 0 };
    const lines = wordsToLines(
      [word("   ", 40, 10), word("KEEP", 200, 10)],
      grid,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].trim()).toBe("KEEP");
  });

  it("returns no lines for empty input", () => {
    expect(wordsToLines([], { charWidth: 8, originX: 0 })).toEqual([]);
  });
});
