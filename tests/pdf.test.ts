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

// Unit tests for the pure layout-reconstruction half of src/utils/pdf.ts.
// The pdf.js loader is lazy (dynamic import inside getPdfjs), so importing
// this module in jsdom never touches WASM or the worker.

import { describe, it, expect } from "vitest";
import { layoutLines, type PdfTextItem } from "../src/utils/pdf";

const CHAR_W = 6; // width we assign per character so grid columns are exact

function item(str: string, x: number, y: number): PdfTextItem {
  return {
    str,
    transform: [1, 0, 0, 1, x, y],
    width: str.length * CHAR_W,
    height: 10,
  };
}

describe("layoutLines", () => {
  it("returns nothing for empty input", () => {
    expect(layoutLines([])).toEqual([]);
    expect(layoutLines([item("", 0, 700)])).toEqual([]);
  });

  it("joins items on the same baseline left→right with grid gaps", () => {
    const lines = layoutLines([
      item("Date", 50, 700),
      item("Description", 120, 700),
      item("Amount", 300, 700),
    ]);
    expect(lines).toHaveLength(1);
    const cells = lines[0].split(/\s{3,}/);
    expect(cells).toEqual(["Date", "Description", "Amount"]);
  });

  it("orders rows top→bottom (PDF y grows upward)", () => {
    const lines = layoutLines([
      item("bottom row", 50, 600),
      item("top row", 50, 700),
      item("middle row", 50, 650),
    ]);
    expect(lines).toEqual(["top row", "middle row", "bottom row"]);
  });

  it("clusters items within the y tolerance into one row", () => {
    // Baselines differ by 2pt (< tolerance derived from median height 10).
    const lines = layoutLines([
      item("02/07/2026", 50, 680),
      item("COLES ONLINE", 130, 682),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("02/07/2026");
    expect(lines[0]).toContain("COLES ONLINE");
  });

  it("keeps rows outside the y tolerance separate", () => {
    const lines = layoutLines([
      item("row one", 50, 700),
      item("row two", 50, 680), // 20pt away — clearly a different line
    ]);
    expect(lines).toEqual(["row one", "row two"]);
  });

  it("aligns amount columns across rows so cell splitting sees one column", () => {
    // Right-aligned amounts at the same x → same grid column on every row.
    const lines = layoutLines([
      item("02/07/2026", 50, 700),
      item("COLES ONLINE", 130, 700),
      item("-54.30", 300, 700),
      item("03/07/2026", 50, 686),
      item("SALARY ACME CORP", 130, 686),
      item("3,200.00", 294, 686), // one char wider → starts a column earlier
    ]);
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      const cells = line.split(/\s{3,}/);
      expect(cells.length).toBe(3);
    }
    // Amounts are right-aligned: their END columns agree even though the
    // descriptions differ in length and the amounts differ in width.
    const endColOf = (line: string) => {
      const amount = line.split(/\s{3,}/).pop()!;
      return line.lastIndexOf(amount) + amount.length;
    };
    expect(Math.abs(endColOf(lines[0]) - endColOf(lines[1]))).toBeLessThanOrEqual(1);
  });

  it("pushes overlapping fragments right instead of overwriting digits", () => {
    // Two items overlapping on the grid: pdf.js splits kerned text ("14 Jul" +
    // "26") closer together than our uniform charW allows. The later fragment
    // is pushed right so no character is lost — losing a digit in an amount
    // or year is far worse than a one-column band drift. Exact-duplicate
    // first characters (fake-bold overlays) still overwrite in place.
    const lines = layoutLines([item("AB", 50, 700), item("CD", 56, 700)]);
    expect(lines).toEqual(["ABCD"]); // both fragments survive intact
    const bold = layoutLines([item("14 Jul 26", 50, 700), item("14 Jul 26", 51, 700)]);
    expect(bold).toEqual(["14 Jul 26"]); // fake-bold overlay overwrites in place
  });
});
