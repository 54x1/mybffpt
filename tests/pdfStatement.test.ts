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

// Unit tests for the generic bank-statement parser (src/utils/pdfStatement).
// Synthetic layout lines mimic `pdftotext -layout` output: columns separated
// by ≥3 spaces, amounts right-aligned at stable end columns.

import { describe, it, expect } from "vitest";
import {
  matchDateAtLineStart,
  matchAmountCell,
  splitCells,
  pdfPagesToStatement,
  statementRowsToCsv,
  yearHintFromPages,
} from "../src/utils/pdfStatement";
import { parseCSV, inferColumns, rowToTransaction } from "../src/utils/csv";

const HINT = { year: 2026 };

describe("matchDateAtLineStart", () => {
  it("parses dd/mm/yyyy and d-m-yy", () => {
    expect(matchDateAtLineStart("02/07/2026 COLES")?.dateISO).toBe("2026-07-02");
    expect(matchDateAtLineStart("2-7-26 SALARY")?.dateISO).toBe("2026-07-02");
  });

  it("parses 'dd MMM yyyy' and case-insensitive months", () => {
    expect(matchDateAtLineStart("15 Jul 2026 BUPA")?.dateISO).toBe("2026-07-15");
    expect(matchDateAtLineStart("15 jul 2026 BUPA")?.dateISO).toBe("2026-07-15");
  });

  it("parses Ubank-style 'HH:MM DD-MM-YY'", () => {
    expect(matchDateAtLineStart("15:10 29-12-25 WOOLWORTHS")?.dateISO).toBe("2025-12-29");
  });

  it("resolves yearless dates from the hint (hint year is authoritative)", () => {
    expect(matchDateAtLineStart("2 JUL COFFEE", HINT)?.dateISO).toBe("2026-07-02");
    // The filename-derived hint wins for otherwise-valid dates; the ±1-year
    // fallback only applies when the hinted date is invalid (e.g. Feb 29).
    expect(matchDateAtLineStart("20 DEC PAYME", { year: 2026 })?.dateISO).toBe("2026-12-20");
  });

  it("rejects non-dates and invalid days", () => {
    expect(matchDateAtLineStart("COLES ONLINE 4.50")).toBeNull();
    expect(matchDateAtLineStart("31/02/2026 BAD DATE")).toBeNull(); // Feb 31
    expect(matchDateAtLineStart("", HINT)).toBeNull();
  });

  it("tolerates leading indentation from grid reconstruction", () => {
    expect(matchDateAtLineStart("   02/07/2026 COLES")?.dateISO).toBe("2026-07-02");
  });
});

describe("matchAmountCell", () => {
  it("parses plain, $-prefixed and comma-grouped amounts", () => {
    expect(matchAmountCell("12.34")).toBe(12.34);
    expect(matchAmountCell("$54.30")).toBe(54.3);
    expect(matchAmountCell("3,200.00")).toBe(3200);
  });

  it("parses signed, parenthesised and trailing-minus negatives", () => {
    expect(matchAmountCell("-54.30")).toBe(-54.3);
    expect(matchAmountCell("(99.00)")).toBe(-99);
    expect(matchAmountCell("$1,234.56-")).toBe(-1234.56);
  });

  it("parses CR/DR suffixed amounts (deposit-account view)", () => {
    expect(matchAmountCell("85.00 CR")).toBe(85);
    expect(matchAmountCell("85.00 DR")).toBe(-85);
  });

  it("rejects non-amount cells", () => {
    expect(matchAmountCell("COLES ONLINE")).toBeNull();
    expect(matchAmountCell("")).toBeNull();
    expect(matchAmountCell("12.345.678,90")).toBeNull(); // EU decimal style
  });
});

describe("splitCells", () => {
  it("splits at ≥3-space gaps and records start columns", () => {
    const cells = splitCells("02/07/2026   COLES ONLINE      -54.30");
    expect(cells.map((c) => c.text)).toEqual(["02/07/2026", "COLES ONLINE", "-54.30"]);
    expect(cells[1].col).toBe(13);
  });

  it("keeps single/double-space words inside one cell", () => {
    const cells = splitCells("COLES  ONLINE EXPRESS");
    expect(cells.map((c) => c.text)).toEqual(["COLES  ONLINE EXPRESS"]);
  });
});

// ── End-to-end: synthetic statements in the three column geometries ────────

function pages(...lines: string[]) {
  return [{ pageNumber: 1, lines }];
}

describe("pdfPagesToStatement — single amount column", () => {
  const result = pdfPagesToStatement(
    pages(
      "Transaction History                       Page 1 of 2",
      "Date        Description                          Amount",
      "02/07/2026  COLES ONLINE                        -54.30",
      "03/07/2026  SALARY                3,200.00",
      "05/07/2026  BUPA PHARMACY                       -18.90",
      "            additional reference text only",
      "Balance carried forward                        4,132.80",
    ),
    HINT,
  );

  it("detects single-column mode and keeps all transactions", () => {
    expect(result.mode).toBe("single");
    expect(result.rows.length).toBe(3);
  });

  it("parses dates, descriptions and signed amounts", () => {
    const [a, b, c] = result.rows;
    expect(a).toMatchObject({ dateISO: "2026-07-02", description: "COLES ONLINE", amount: -54.3 });
    expect(b.amount).toBe(3200);
    expect(c.description).toContain("BUPA PHARMACY");
  });

  it("appends continuation text to the previous transaction", () => {
    expect(result.rows[2].description).toContain("additional reference text only");
  });

  it("rejects header/footer noise lines", () => {
    const descs = result.rows.map((r) => r.description);
    expect(descs.some((d) => /Page|Balance carried/i.test(d))).toBe(false);
  });

  it("emits CSV that round-trips through the existing pipeline", () => {
    const rows = parseCSV(result.csv);
    const cols = inferColumns(rows[0]);
    expect(cols.date).toBe(0);
    expect(cols.amount).toBe(2);
    const txs = rows.slice(1).map((r) => rowToTransaction(r, cols, "pdf"));
    expect(txs.filter(Boolean).length).toBe(3);
    // Explicit signs → normal convention preserved through the CSV.
    expect(txs[0]!.type).toBe("spending");
    expect(txs[1]!.type).toBe("income");
  });
});

describe("pdfPagesToStatement — split debit/credit columns", () => {
  const result = pdfPagesToStatement(
    pages(
      "Date        Description               Debit       Credit",
      "02/07/2026  WOOLWORTHS                87.45",
      "03/07/2026  INTEREST PAYMENT                      12.05",
      "04/07/2026  OPAL TRANS                 2.30",
      "05/07/2026  TRANSFER FROM SAVINGS                500.00",
    ),
    HINT,
  );

  it("detects split mode from mutually-exclusive column fills", () => {
    expect(result.mode).toBe("split");
    expect(result.rows.length).toBe(4);
  });

  it("signs debits negative and credits positive", () => {
    const amounts = result.rows.map((r) => r.amount);
    expect(amounts).toEqual([-87.45, 12.05, -2.3, 500]);
  });
});

describe("pdfPagesToStatement — running-balance column", () => {
  const result = pdfPagesToStatement(
    pages(
      "Date        Description              Amount       Balance",
      "01/07/2026  OPENING BALANCE                       1,540.00",
      "02/07/2026  COLES                   -54.30       1,485.70",
      "03/07/2026  SALARY                 3,200.00       4,685.70",
      "05/07/2026  BUPA                    -18.90       4,666.80",
    ),
    HINT,
  );

  it("trims the balance band and uses the amount column", () => {
    expect(result.mode).toBe("balance");
    // The opening-balance line has no amount → skipped as noise.
    expect(result.rows.length).toBe(3);
    expect(result.rows.map((r) => r.amount)).toEqual([-54.3, 3200, -18.9]);
  });
});

describe("pdfPagesToStatement — yearless dates with hint", () => {
  const result = pdfPagesToStatement(
    pages(
      "2 JUL   MORNING COFFEE                -4.50",
      "15 JUL  PAYME JANE                     60.00",
      "28 DEC  CHRISTMAS BONUS               250.00",
    ),
    { year: 2026 },
  );

  it("fills years from the hint", () => {
    expect(result.rows.map((r) => r.dateISO)).toEqual([
      "2026-07-02",
      "2026-07-15",
      "2026-12-28",
    ]);
  });
});

describe("statementRowsToCsv", () => {
  it("quotes descriptions containing commas or quotes", () => {
    const csv = statementRowsToCsv([
      { dateISO: "2026-07-02", description: 'CAFE, THE "BEST"', amount: -9.5 },
    ]);
    expect(csv.trim().split("\n")[1]).toBe('2026-07-02,"CAFE, THE ""BEST""",-9.50');
  });
});

describe("pdfPagesToStatement — degenerate input", () => {
  it("returns no rows for empty pages", () => {
    const r = pdfPagesToStatement([]);
    expect(r.rows).toEqual([]);
    expect(r.csv.trim()).toBe("Date,Description,Amount");
  });

  it("skips date lines with no amount (headers/summaries)", () => {
    const r = pdfPagesToStatement(
      pages("02/07/2026 Period overview", "02/07/2026 REAL TX   -5.00"),
      HINT,
    );
    expect(r.rows.length).toBe(1);
    expect(r.skippedCount).toBeGreaterThanOrEqual(1);
  });
});

// ── Regressions from real-bank troubleshooting (synthetic stand-ins) ───────

describe("yearHintFromPages", () => {
  it("detects the statement year from a month-name header", () => {
    const hint = yearHintFromPages(
      pages("Statement summary", "10 January 2024 - 9 May 2024", "Account 1234"),
    );
    expect(hint).toEqual({ year: 2024 });
  });

  it("returns null when no explicit month-name year is present", () => {
    // Westpac rows carry "31 Aug 26" — two-digit years must NOT hint.
    const hint = yearHintFromPages(pages("31 Aug 26   COLES   -5.00", "Account activity"));
    expect(hint).toBeNull();
  });

  it("majority year wins across lines", () => {
    const hint = yearHintFromPages(
      pages("1 January 2024 - 31 January 2024", "5 February 2024 note", "9 March 2025 odd one"),
    );
    expect(hint).toEqual({ year: 2024 });
  });

  it("yearless rows resolve to the detected page year, not the hint/filename", () => {
    const result = pdfPagesToStatement(
      pages(
        "10 January 2024 - 9 May 2024",
        "Date   Description              Money Out   Money In   Balance",
        "12 Jan To: SOME PAYEE             31.00                  1,000.00",
      ),
      { year: 2026 }, // stale filename hint must lose to the page header
    );
    expect(result.rows[0].dateISO).toBe("2024-01-12");
  });
});

describe("pdfPagesToStatement — CBA-style dual-date Money Out/In/Balance", () => {
  // Mimics CBA: transaction date repeated in-line, debit/credit split columns
  // plus a running Balance column that co-occurs with every row. Fixed-width
  // fields guarantee stable amount end-columns across rows.
  const cbaRow = (d: string, desc: string, out: string, inn: string, bal: string) =>
    `${d.padEnd(12)}${d.padEnd(12)}${desc.padEnd(24)}${out.padStart(10)}${inn.padStart(10)}${bal.padStart(12)}`;
  const result = pdfPagesToStatement(
    pages(
      "Date        Effective   Description               Money Out   Money In     Balance",
      cbaRow("12 Jan", "To: J SMITH", "31.00", "", "1,000.00"),
      cbaRow("12 Jan", "From: A FRIEND", "", "31.00", "1,031.00"),
      cbaRow("14 Jan", "DBS*FITNESS", "18.35", "", "1,012.65"),
      cbaRow("15 Jan", "GOOGLE", "6.05", "", "1,006.60"),
    ),
    HINT,
  );

  it("detects split mode and excludes the co-occurring balance column", () => {
    expect(result.mode).toBe("split");
    expect(result.rows.length).toBe(4);
  });

  it("strips the repeated in-line date from descriptions", () => {
    expect(result.rows[0].description).toBe("To: J SMITH");
    expect(result.rows[1].description).toBe("From: A FRIEND");
  });

  it("signs Money Out negative and Money In positive", () => {
    expect(result.rows.map((r) => r.amount)).toEqual([-31, 31, -18.35, -6.05]);
  });
});

describe("pdfPagesToStatement — description printed above the date row", () => {
  // Mimics Westpac Choice recurring payments: a digit-bearing reference line
  // follows each date row, and recurring rows print their description on the
  // line ABOVE the date+amount. Inline-description rows must keep their own
  // text and never steal or duplicate the above-line description.
  const tx = (date: string, desc: string, debit: string, credit: string) =>
    ` ${date.padEnd(21)}${desc.padEnd(29)}${debit.padStart(11)}${credit.padStart(13)}`;
  const above = (desc: string) => `${" ".repeat(22)}${desc}`;
  const result = pdfPagesToStatement(
    pages(
      tx("Date", "Description", "Debit", "Credit"),
      above("PAYMENT BY AUTHORITY TO PARTPAY"),
      tx("19 Aug 2026", "", "-$25.37", ""),
      above("8000340331F2020013"),
      tx("19 Aug 2026", "DEPOSIT ONLINE 2295157", "", "$200.00"),
      above("PAYMENT BY AUTHORITY TO PARTPAY"),
      tx("18 Aug 2026", "", "-$90.00", ""),
      above("SALARY"),
      tx("17 Aug 2026", "", "-$414.04", ""),
    ),
    HINT,
  );

  it("attaches the above-line description to the following date row", () => {
    expect(result.rows.length).toBe(4);
    expect(result.rows[0].description).toContain("PAYMENT BY AUTHORITY TO PARTPAY");
    expect(result.rows[1].description).toContain("DEPOSIT ONLINE 2295157");
    expect(result.rows[2].description).toContain("PAYMENT BY AUTHORITY TO PARTPAY");
    expect(result.rows[3].description).toBe("SALARY");
  });

  it("keeps inline descriptions and never duplicates the above-line text", () => {
    const deposit = result.rows.find((r) => r.amount === 200)!;
    expect(deposit.description).toContain("DEPOSIT ONLINE");
    expect(deposit.description).not.toContain("PAYMENT BY AUTHORITY");
    for (const r of result.rows) {
      const hits = (r.description.match(/PAYMENT BY AUTHORITY/g) ?? []).length;
      expect(hits).toBeLessThanOrEqual(1);
    }
  });

  it("drops digit-bearing reference lines from descriptions", () => {
    for (const r of result.rows) {
      expect(r.description).not.toMatch(/8000340331F/);
    }
  });

  it("signs debits negative and credits positive in split mode", () => {
    expect(result.mode).toBe("split");
    expect(result.rows.map((r) => r.amount)).toEqual([-25.37, 200, -90, -414.04]);
  });
});

// ── Manual column mapping (the "column mapper" feature) ─────────────────────

import {
  detectPdfColumns,
  fingerprintColumns,
  profileMatches,
  ANCHOR_TOL,
  type PdfImportProfile,
} from "../src/utils/pdfStatement";

describe("detectPdfColumns", () => {
  // CBA-style fixture: fixed-width fields → stable numeric right-edge anchors.
  const cbaRow = (d: string, desc: string, out: string, inn: string, bal: string) =>
    `${d.padEnd(12)}${d.padEnd(12)}${desc.padEnd(24)}${out.padStart(10)}${inn.padStart(10)}${bal.padStart(12)}`;
  const cbaPages = pages(
    "Date        Effective   Description               Money Out   Money In     Balance",
    cbaRow("12 Jan", "To: J SMITH", "31.00", "", "1,000.00"),
    cbaRow("12 Jan", "From: A FRIEND", "", "31.00", "1,031.00"),
    cbaRow("14 Jan", "DBS*FITNESS", "18.35", "", "1,012.65"),
    cbaRow("15 Jan", "GOOGLE", "6.05", "", "1,006.60"),
  );

  it("reports every numeric band (including the running balance) with samples", () => {
    const det = detectPdfColumns(cbaPages, HINT);
    expect(det.rowCount).toBe(4);
    const nums = det.columns.filter((c) => c.kind === "numeric");
    // Money Out / Money In / Balance — the user decides which is which.
    expect(nums.map((c) => c.anchorCol).sort((a, b) => a - b)).toEqual([58, 68, 80]);
    const balance = nums.find((c) => c.anchorCol === 80)!;
    expect(balance.fillCount).toBe(4);
    expect(balance.samples[0]).toContain("1,000.00");
  });

  it("reports a text column for the description cells", () => {
    const det = detectPdfColumns(cbaPages, HINT);
    const texts = det.columns.filter((c) => c.kind === "text");
    expect(texts.length).toBe(1);
    // Description field starts at column 24 (bucketed to TEXT_TOL multiples).
    expect(texts[0].anchorCol).toBe(24);
    expect(texts[0].samples).toContain("To: J SMITH");
  });

  it("exposes raw preview lines for the mapper UI", () => {
    const det = detectPdfColumns(cbaPages, HINT);
    expect(det.previewLines.length).toBeGreaterThan(0);
    expect(det.previewLines[0]).toContain("To: J SMITH");
  });

  it("auto-parse exposes a suggested mapping for the mapper preselect", () => {
    const auto = pdfPagesToStatement(cbaPages, HINT);
    expect(auto.autoMapping).not.toBeNull();
    expect(auto.autoMapping!.mode).toBe("split");
    expect(auto.autoMapping!.debitAnchor).toBe(58);
    expect(auto.autoMapping!.creditAnchor).toBe(68);
  });
});

describe("pdfPagesToStatement — explicit column mapping", () => {
  const cbaRow = (d: string, desc: string, out: string, inn: string, bal: string) =>
    `${d.padEnd(12)}${d.padEnd(12)}${desc.padEnd(24)}${out.padStart(10)}${inn.padStart(10)}${bal.padStart(12)}`;
  const cbaPages = pages(
    "Date        Effective   Description               Money Out   Money In     Balance",
    cbaRow("12 Jan", "To: J SMITH", "31.00", "", "1,000.00"),
    cbaRow("12 Jan", "From: A FRIEND", "", "31.00", "1,031.00"),
    cbaRow("14 Jan", "DBS*FITNESS", "18.35", "", "1,012.65"),
  );

  it("honours the user's debit/credit choice (swapped anchors flip signs)", () => {
    const correct = pdfPagesToStatement(cbaPages, HINT, { mode: "split", debitAnchor: 58, creditAnchor: 68 });
    expect(correct.mode).toBe("split");
    expect(correct.rows.map((r) => r.amount)).toEqual([-31, 31, -18.35]);

    const swapped = pdfPagesToStatement(cbaPages, HINT, { mode: "split", debitAnchor: 68, creditAnchor: 58 });
    expect(swapped.rows.map((r) => r.amount)).toEqual([31, -31, 18.35]);
  });

  it("single-mode mapping reads any numeric band, even a running balance", () => {
    const res = pdfPagesToStatement(cbaPages, HINT, { mode: "single", singleAnchor: 80 });
    expect(res.mode).toBe("single");
    expect(res.rows.map((r) => r.amount)).toEqual([1000, 1031, 1012.65]);
  });

  it("descAnchor slices the description to the chosen text column", () => {
    const res = pdfPagesToStatement(cbaPages, HINT, {
      mode: "split", debitAnchor: 58, creditAnchor: 68, descAnchor: 24,
    });
    expect(res.rows[0].description).toBe("To: J SMITH");
    expect(res.rows[1].description).toBe("From: A FRIEND");
  });

  it("never leaks unassigned column amounts into descriptions", () => {
    // An amount-looking cell sits between the text and the assigned column.
    const leaky = pages(
      "02/07/2026   COLES ONLINE   -54.30   REF 9911   1,000.00",
      "03/07/2026   SALARY     3,200.00            4,200.00",
    );
    const det = detectPdfColumns(leaky, HINT);
    const nums = det.columns.filter((c) => c.kind === "numeric").map((c) => c.anchorCol).sort((a, b) => a - b);
    // Assign only the rightmost band as the amount column.
    const res = pdfPagesToStatement(leaky, HINT, { mode: "single", singleAnchor: nums[nums.length - 1] });
    expect(res.rows.length).toBe(2);
    for (const r of res.rows) {
      expect(r.description).not.toMatch(/54\.30|3,200/);
    }
    expect(res.rows[0].description).toContain("COLES ONLINE");
  });

  it("skips rows with no value in the assigned amount column", () => {
    const res = pdfPagesToStatement(cbaPages, HINT, { mode: "split", debitAnchor: 58, creditAnchor: 68 });
    // All three rows have a value; drop to a band only one row fills.
    const singleOutOnly = pdfPagesToStatement(
      pages("02/07/2026  COLES   -1.00", "03/07/2026 "),
      HINT,
      { mode: "single", singleAnchor: 30 },
    );
    expect(res.rows.length).toBe(3);
    expect(singleOutOnly.rows.length).toBe(0);
  });
});

describe("fingerprintColumns / profileMatches", () => {
  const cbaRow = (d: string, desc: string, out: string, inn: string, bal: string) =>
    `${d.padEnd(12)}${d.padEnd(12)}${desc.padEnd(24)}${out.padStart(10)}${inn.padStart(10)}${bal.padStart(12)}`;

  it("is stable across different row counts of the same layout", () => {
    const full = detectPdfColumns(pages(
      cbaRow("12 Jan", "A", "31.00", "", "1,000.00"),
      cbaRow("13 Jan", "B", "", "31.00", "1,031.00"),
      cbaRow("14 Jan", "C", "18.35", "", "1,012.65"),
    ), HINT);
    const subset = detectPdfColumns(pages(
      cbaRow("15 Jan", "D", "6.05", "", "1,006.60"),
      cbaRow("16 Jan", "E", "", "2.00", "1,004.60"),
    ), HINT);
    expect(fingerprintColumns(full)).toBe(fingerprintColumns(subset));
  });

  it("matches exactly and tolerantly (within ANCHOR_TOL * 2)", () => {
    const det = detectPdfColumns(pages(
      cbaRow("12 Jan", "A", "31.00", "", "1,000.00"),
      cbaRow("13 Jan", "B", "", "31.00", "1,031.00"),
    ), HINT);
    const fp = fingerprintColumns(det);
    const profile = (fingerprint: string): PdfImportProfile => ({
      id: "p1", label: "Test bank", createdAt: new Date().toISOString(), fingerprint,
      mapping: { mode: "split", debitAnchor: 58, creditAnchor: 68 },
    });
    expect(profileMatches(profile(fp), det)).toBe(true);

    // Stored anchors drifted by one tolerance bucket still match.
    const drifted = fp.split(",").map((n) => Number(n) + ANCHOR_TOL).join(",");
    expect(profileMatches(profile(drifted), det)).toBe(true);

    // Different band count never matches.
    expect(profileMatches(profile("58,68"), det)).toBe(false);
    expect(profileMatches(profile(""), det)).toBe(false);
  });
});

// ── Layout-quirk regressions (real statements that broke the parser) ────────

describe("pdfPagesToStatement — NAB dot-leader with zero-space welded amounts", () => {
  // NAB welds some amounts straight onto the dot leader with NO gap
  // ("Happytel Retail....................49.00"). The old LEADER_AMOUNT_RE
  // required ≥1 space, so those rows were dropped AND their text leaked into
  // the next row's description. Every leader row must survive as its own
  // transaction with a clean (dot-free) description.
  const result = pdfPagesToStatement(
    pages(
      "6 Jan 2025",
      "                  EFTPOS    01/01 13:36 Au Canberra........................... 20.35",
      "                  EFTPOS    01/01 13:31 Happytel Retail........................49.00", // welded, zero gap
      "                  EFTPOS    01/01 18:07 Bunnings Fyshwick...................... 62.04",
      "                  EFTPOS    02/01 09:15 Coles Hume............................. 33.10",
      "                  EFTPOS    02/01 12:47 Woolworths Dickson...................... 88.20",
      "                  Transfer  02/01 To Savings............................ 1,200.00",
    ),
    { year: 2025 },
  );

  it("keeps every leader row including the zero-space welded one", () => {
    expect(result.rows.length).toBe(6);
    const happytel = result.rows.find((r) => r.description.includes("Happytel"));
    expect(happytel).toBeDefined();
    expect(Math.abs(happytel!.amount)).toBe(49);
  });

  it("never leaks a dot-leader run into a description", () => {
    for (const r of result.rows) {
      expect(r.description).not.toMatch(/\.{3,}/);
    }
  });

  // NAB prints each transaction's merchant on an undated memo line ABOVE the
  // amount row, led by a bank code and the payment's effective date:
  //   "V0031 31/12 Bunnings 307000            Gung"
  //   "                  Ref: 74940................... 12.00"
  // The code + dd/mm pair is bookkeeping noise — the description must read as
  // the merchant, not the memo header.
  const memoResult = pdfPagesToStatement(
    pages(
      "6 Jan 2025",
      "                  V0031 31/12 Bunnings 307000            Gung",
      "                  Ref: 74940................................................. 12.00",
      "                  V0031 30/12 Coles 4814                 Dick",
      "                  Ref: 74941................................................. 18.90",
      "                  V0031 30/12 McDonalds 951418           Holt",
      "                  Ref: 74942................................................. 19.45",
      "                  V0031 31/12 Woolworths Hume            Hume",
      "                  Ref: 74943................................................. 55.20",
      "     7 Jan 2025   V0031 06/01 Coles 0748                 Macq",
      "                  Ref: 74944................................................. 44.00",
    ),
    { year: 2025 },
  );

  it("drops the memo code + effective-date prefix from descriptions", () => {
    expect(memoResult.rows.length).toBe(5);
    for (const r of memoResult.rows) {
      expect(r.description).not.toMatch(/^[A-Z]\d{4}\s/);
      expect(r.description).not.toMatch(/\b\d{2}\/\d{2}\b/);
    }
    const bunnings = memoResult.rows.find((r) => r.description.includes("Bunnings"));
    expect(bunnings?.description).toBe("Bunnings 307000 Gung");
  });

  it("strips the prefix when a memo shares the day-header line", () => {
    // The first memo of a day prints on the same row as the date header, so
    // the code and date arrive as separate cells rather than one string.
    const jan7 = memoResult.rows.find((r) => r.dateISO === "2025-01-07");
    expect(jan7?.description).toBe("Coles 0748 Macq");
  });
});

describe("pdfPagesToStatement — CommBank wrapped amounts on the next line", () => {
  // CommBank "Direct Investment" prints date + description on one line and
  // pushes the amount onto the NEXT undated reference line. The old parser
  // skipped every such header (no inline amount) → almost no rows recovered.
  // Wrap mode must lift the deferred amount back onto its header row.
  const result = pdfPagesToStatement(
    pages(
      "Date        Description",
      "18 Mar   Direct Credit 458106 MEDIBANK DIV",
      "                MAR26/00966142                                            145.25",
      "19 Mar   Fast Transfer 458107 COLES ONLINE",
      "                MAR26/00966143                                             32.10",
      "20 Mar   Direct Credit 458108 SALARY",
      "                MAR26/00966144                                           2,200.00",
      "21 Mar   BP FUEL                                ",
      "                MAR26/00966145                                             55.00",
      "22 Mar   INTEREST PAYMENT",
      "                MAR26/00966146                                              8.75",
    ),
    { year: 2026 },
  );

  it("recovers one row per wrapped header (not just the inline-amount ones)", () => {
    expect(result.rows.length).toBe(5);
  });

  it("takes the description from the header, not the reference line", () => {
    const medibank = result.rows.find((r) => r.description.includes("MEDIBANK"));
    expect(medibank).toBeDefined();
    expect(Math.abs(medibank!.amount)).toBe(145.25);
    // The deferred reference token must not become the description.
    for (const r of result.rows) {
      expect(r.description).not.toMatch(/MAR26\/\d+/);
    }
  });

  it("never merges an integer-only continuation as an amount", () => {
    // A header whose next line is a bare reference number (no cents) must not
    // fabricate a transaction from it.
    const withRefs = pdfPagesToStatement(
      pages(
        "18 Mar   Direct Credit 458106 MEDIBANK DIV",
        "                MAR26/00966142                                            145.25",
        "19 Mar   Fast Transfer 458107 COLES ONLINE",
        "                MAR26/00966143                                             32.10",
        "20 Mar   Direct Credit 458108 SALARY",
        "                MAR26/00966144                                           2,200.00",
        "21 Mar   BP FUEL",
        "                MAR26/00966145                                             55.00",
        "22 Mar   INTEREST PAYMENT",
        "                MAR26/00966146                                              8.75",
        "23 Mar   Some header with only a ref below",
        "                641031007",
      ),
      { year: 2026 },
    );
    // The trailing integer-ref header is not turned into an amount row.
    const bogus = withRefs.rows.find((r) => r.description.includes("only a ref"));
    expect(bogus).toBeUndefined();
  });
});
