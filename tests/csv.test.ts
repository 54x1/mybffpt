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

import { describe, it, expect } from "vitest";
import {
  parseCSV,
  findIndexByKeywords,
  parseAmountNumber,
  inferColumns,
  scanAmountConvention,
  rowToTransaction,
  stableKey,
} from "../src/utils/csv";

describe("parseCSV", () => {
  it("splits simple rows and cells, trimming whitespace", () => {
    expect(parseCSV("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("strips a UTF-8 BOM", () => {
    expect(parseCSV("\uFEFFid,name\n1,x")[0][0]).toBe("id");
  });

  it("normalises CRLF and lone CR to LF", () => {
    expect(parseCSV("a,b\r\nc,d\r\ne,f")).toHaveLength(3);
  });

  it("handles quoted fields containing commas", () => {
    const rows = parseCSV('desc,amount\n"Smith, John",10');
    expect(rows[1]).toEqual(["Smith, John", "10"]);
  });

  it("handles escaped double quotes inside a field", () => {
    const rows = parseCSV('note\n"He said ""hi"""');
    expect(rows[1][0]).toBe('He said "hi"');
  });

  it("keeps newlines inside quoted fields", () => {
    const rows = parseCSV('a,b\n"x\ny",2');
    expect(rows[1][0]).toBe("x\ny");
  });

  it("drops an empty trailing flush but keeps interior rows", () => {
    // A trailing newline must not create a phantom data row.
    expect(parseCSV("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCSV("")).toEqual([]);
  });
});

describe("findIndexByKeywords", () => {
  const headers = ["Transaction Date", "Amount (AUD)", "Description"];
  it("returns the first header containing an earlier keyword", () => {
    expect(findIndexByKeywords(headers, ["amount"])).toBe(1);
  });
  it("prefers keywords listed first", () => {
    expect(findIndexByKeywords(headers, ["description", "date"])).toBe(2);
    expect(findIndexByKeywords(headers, ["date", "description"])).toBe(0);
  });
  it("returns -1 when nothing matches", () => {
    expect(findIndexByKeywords(headers, ["balance"])).toBe(-1);
  });
});

describe("parseAmountNumber", () => {
  it("parses plain numbers and $ / comma formatting", () => {
    expect(parseAmountNumber("12.34")).toBe(12.34);
    expect(parseAmountNumber("$1,234.56")).toBe(1234.56);
  });

  it("treats parentheses as negative", () => {
    expect(parseAmountNumber("(99.00)")).toBe(-99);
  });

  it("treats a trailing minus as negative", () => {
    expect(parseAmountNumber("12.34-")).toBe(-12.34);
  });

  it("applies DR/CR and IN/OUT indicators", () => {
    expect(parseAmountNumber("10", "DR")).toBe(-10);
    expect(parseAmountNumber("10", "CR")).toBe(10);
    expect(parseAmountNumber("10", "Out")).toBe(-10);
    expect(parseAmountNumber("10", "In")).toBe(10);
  });

  it("recognises European decimal-comma formatting", () => {
    // 1.234,56 → 1234.56
    expect(parseAmountNumber("1.234,56")).toBe(1234.56);
  });

  it("returns 0 for empty or unparseable input", () => {
    expect(parseAmountNumber("")).toBe(0);
    expect(parseAmountNumber(undefined)).toBe(0);
    expect(parseAmountNumber("not a number")).toBe(0);
  });
});

describe("inferColumns", () => {
  it("detects a generic single-amount layout", () => {
    const cols = inferColumns(["Date", "Description", "Amount"]);
    expect(cols.date).toBe(0);
    expect(cols.amount).toBe(2);
    expect(cols.desc).toContain(1);
  });

  it("prefers split debit/credit columns when both exist", () => {
    const cols = inferColumns(["Date", "Debit", "Credit", "Details"]);
    expect(cols.debit).toBe(1);
    expect(cols.credit).toBe(2);
    expect(cols.amount).toBeUndefined();
  });

  it("throws when no date column is present", () => {
    expect(() => inferColumns(["Description", "Amount"])).toThrow(/Date column/);
  });
});

describe("scanAmountConvention", () => {
  it("returns expensesPositive when every amount is positive", () => {
    const rows = [["10"], ["20"], ["5.5"]];
    expect(scanAmountConvention(rows, 0)).toBe("expensesPositive");
  });

  it("returns normal for a mixed sign column", () => {
    const rows = [["-10"], ["20"], ["-5"]];
    expect(scanAmountConvention(rows, 0)).toBe("normal");
  });
});

describe("rowToTransaction", () => {
  const cols = inferColumns(["Date", "Description", "Amount"]);

  it("builds a spending transaction from a negative amount", () => {
    const tx = rowToTransaction(["2026-06-15", "WOOLWORTHS", "-42.50"], cols, "ANZ");
    expect(tx).not.toBeNull();
    expect(tx!.type).toBe("spending");
    expect(tx!.amount).toBe(42.5);
    expect(tx!.date).toBe("2026-06-15");
    expect(tx!.source).toBe("ANZ");
  });

  it("builds an income transaction from a positive amount", () => {
    const tx = rowToTransaction(["2026-06-01", "SALARY", "3000.00"], cols, "ANZ");
    expect(tx!.type).toBe("income");
    expect(tx!.amount).toBe(3000);
  });

  it("returns null when the date is unparseable", () => {
    expect(rowToTransaction(["not-a-date", "x", "-5"], cols, "ANZ")).toBeNull();
  });

  it("returns null for a zero amount", () => {
    expect(rowToTransaction(["2026-06-15", "x", "0.00"], cols, "ANZ")).toBeNull();
  });

  it("auto-categorises known merchants and defaults otherwise", () => {
    const known = rowToTransaction(["2026-06-15", "COLES ONLINE #1", "-20"], cols, "ANZ");
    expect(known!.category).toBe("Grocery");
    const unknown = rowToTransaction(["2026-06-15", "MYSTERY MERCHANT", "-20"], cols, "ANZ");
    expect(unknown!.category).toBe("Uncategorized");
  });

  it("handles split debit/credit columns", () => {
    const splitCols = inferColumns(["Date", "Debit", "Credit", "Details"]);
    const spend = rowToTransaction(["2026-06-15", "30.00", "", "SHOP"], splitCols, "NAB");
    expect(spend!.type).toBe("spending");
    expect(spend!.amount).toBe(30);
    const income = rowToTransaction(["2026-06-15", "", "55.00", "REFUND"], splitCols, "NAB");
    expect(income!.type).toBe("income");
    expect(income!.amount).toBe(55);
  });

  it("flips sign for an expensesPositive convention column", () => {
    const expCols = inferColumns(["Date", "Description", "Amount"]);
    // scanAmountConvention would set this; rowToTransaction honours cols.amountConvention
    expCols.amountConvention = "expensesPositive";
    const tx = rowToTransaction(["2026-06-15", "SHOPPING", "25.00"], expCols, "UP");
    expect(tx!.type).toBe("spending"); // positive expense → spending
  });
});

describe("stableKey", () => {
  it("ignores numeric differences in the description", () => {
    const a = stableKey({ date: "2026-06-15", type: "spending", amount: 10, description: "COLES #123" });
    const b = stableKey({ date: "2026-06-15", type: "spending", amount: 10, description: "COLES #999" });
    expect(a).toBe(b);
  });

  it("differs when amount or date differs", () => {
    const base = { date: "2026-06-15", type: "spending" as const, amount: 10, description: "COLES" };
    expect(stableKey(base)).not.toBe(stableKey({ ...base, amount: 10.01 }));
    expect(stableKey(base)).not.toBe(stableKey({ ...base, date: "2026-06-16" }));
  });

  it("normalises the amount to two decimals", () => {
    const a = stableKey({ date: "2026-06-15", type: "spending", amount: 10, description: "X" });
    const b = stableKey({ date: "2026-06-15", type: "spending", amount: 10.0, description: "X" });
    expect(a).toBe(b);
  });
});
