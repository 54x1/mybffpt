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
  detectCreditCardStatement,
  isCardRepaymentDescription,
  isCardRefundDescription,
} from "../src/utils/csv";
import type { Transaction } from "../src/utils/types";

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

  describe("credit-card mode", () => {
    const ccCols = () => ({ ...inferColumns(["Date", "Description", "Amount"]), creditCard: true });

    it("treats positive purchases as spending (statement sign)", () => {
      const tx = rowToTransaction(["2026-06-15", "WOOLWORTHS", "84.20"], ccCols(), "CC");
      expect(tx!.type).toBe("spending");
      expect(tx!.amount).toBe(84.2);
    });

    it("classifies repayments as Transfers income, not merchant spend", () => {
      const tx = rowToTransaction(["2026-06-15", "PAYMENT THANK YOU", "500.00"], ccCols(), "CC");
      expect(tx!.type).toBe("income");
      expect(tx!.category).toBe("Transfers");
    });

    it("keeps interest/fee rows as spending even when they mention payment", () => {
      const tx = rowToTransaction(["2026-06-15", "INTEREST ON OUTSTANDING PAYMENT BALANCE", "12.34"], ccCols(), "CC");
      expect(tx!.type).toBe("spending");
    });

    it("treats refunds as income", () => {
      const tx = rowToTransaction(["2026-06-15", "AMAZON REFUND", "-32.10"], ccCols(), "CC");
      expect(tx!.type).toBe("income");
      expect(tx!.amount).toBe(32.1);
    });

    it("tags every card row with 'credit card'", () => {
      const tx = rowToTransaction(["2026-06-15", "COFFEE SHOP", "5.40"], ccCols(), "CC");
      expect(tx!.tags).toContain("credit card");
    });

    it("handles split debit/credit card statements", () => {
      const cols = { ...inferColumns(["Date", "Debit", "Credit", "Details"]), creditCard: true };
      const purchase = rowToTransaction(["2026-06-15", "42.00", "", "MYER"], cols, "CC");
      expect(purchase!.type).toBe("spending");
      const repayment = rowToTransaction(["2026-06-16", "", "300.00", "CREDIT CARD PAYMENT"], cols, "CC");
      expect(repayment!.type).toBe("income");
      expect(repayment!.category).toBe("Transfers");
    });

    it("leaves non-card imports untouched (regression)", () => {
      const cols = inferColumns(["Date", "Description", "Amount"]);
      const tx = rowToTransaction(["2026-06-15", "SALARY", "3240.00"], cols, "WP");
      expect(tx!.type).toBe("income");
      expect(tx!.tags).not.toContain("credit card");
    });
  });

  describe("detectCreditCardStatement", () => {
    it("flags a statement with credit-card headers", () => {
      const det = detectCreditCardStatement(
        ["Transaction Date", "Description", "Amount", "Balance Owed"],
        [["2026-06-15", "MYER", "42.00", "1242.00"]],
        inferColumns(["Transaction Date", "Description", "Amount", "Balance Owed"])
      );
      expect(det.likely).toBe(true);
    });

    it("flags via filename plus shape signals", () => {
      const det = detectCreditCardStatement(
        ["Date", "Description", "Amount", "Running Balance"],
        [
          ["2026-06-15", "MYER", "42.00", "1042.00"],
          ["2026-06-16", "COLES", "88.50", "1130.50"],
          ["2026-06-20", "PAYMENT THANK YOU", "-500.00", "630.50"],
        ],
        inferColumns(["Date", "Description", "Amount", "Running Balance"]),
        "westpac-credit-card-jun2026.csv"
      );
      expect(det.likely).toBe(true);
    });

    it("does not flag a plain transaction-account export", () => {
      const det = detectCreditCardStatement(
        ["Date", "Description", "Amount", "Balance"],
        [
          ["2026-06-15", "SALARY ACME", "3240.00", "10240.00"],
          ["2026-06-16", "WOOLWORTHS", "-84.20", "10155.80"],
          ["2026-06-17", "BUBS CAFE", "-6.50", "10149.30"],
        ],
        inferColumns(["Date", "Description", "Amount", "Balance"]),
        "everyday-account.csv"
      );
      expect(det.likely).toBe(false);
    });

    it("recognises repayment and refund descriptions", () => {
      expect(isCardRepaymentDescription("BPAY WESTPAC CREDIT CARD PAYMENT")).toBe(true);
      expect(isCardRepaymentDescription("AUTOPAY FROM SAVINGS")).toBe(true);
      expect(isCardRepaymentDescription("CREDIT CARD REPAYMENT 1234")).toBe(true);
      expect(isCardRepaymentDescription("LATE PAYMENT FEE")).toBe(false);
      // Westpac merchant rows carry a "PAYMENT DDMMMYY" prefix — not repayments.
      expect(isCardRepaymentDescription("PAYMENT 15OCT26 COSTCO GAS CANBERR")).toBe(false);
      expect(isCardRefundDescription("TARGET REFUND")).toBe(true);
      expect(isCardRefundDescription("CHARGEBACK ADJUSTMENT")).toBe(true);
    });

    it("detects Westpac 'Data_export' split-column card format", () => {
      // Real-world shape: generic headers, card last-4 in "Bank Account".
      const headers = ["Bank Account", "Date", "Narrative", "Debit Amount", "Credit Amount", "Balance", "Categories", "Serial"];
      const dataRows = [
        ["7163", "16/10/2026", "PAYMENT 15OCT26 COSTCO GAS CANBERR", "", "21.32", "0.00", "CREDIT", ""],
        ["7163", "16/10/2026", "DBS*Anytime Fitness  C Charnwood AUS", "21.95", "", "0.00", "OTHER", ""],
      ];
      const det = detectCreditCardStatement(headers, dataRows, inferColumns(headers), "Data_export_17102026 (1).csv");
      expect(det.likely).toBe(true);

      // A credit-column merchant row is a refund (income/Grocery), not a repayment/Transfers.
      const cols = { ...inferColumns(headers), creditCard: true };
      const refund = rowToTransaction(dataRows[0], cols, "CC");
      expect(refund!.type).toBe("income");
      expect(refund!.category).not.toBe("Transfers");
      const spend = rowToTransaction(dataRows[1], cols, "CC");
      expect(spend!.type).toBe("spending");
    });

    it("handles combined multi-account exports per account (real Westpac shape)", () => {
      // One file: card 7163 + everyday 732778572783 + PartPay loan 732729710852.
      const headers = ["Bank Account", "Date", "Narrative", "Debit Amount", "Credit Amount", "Balance", "Categories", "Serial"];
      const dataRows = [
        ["732778572783", "16/10/2026", "WITHDRAWAL MOBILE 1872227 TFR Westpac Cho", "500.00", "", "400.00", "PAYMENT", ""],
        ["7163", "16/10/2026", "PAYMENT 15OCT26 COSTCO GAS CANBERR", "", "21.32", "0.00", "CREDIT", ""],
        ["7163", "16/10/2026", "DBS*Anytime Fitness  C Charnwood AUS", "21.95", "", "0.00", "OTHER", ""],
        ["732729710852", "16/10/2026", "PAYMENT BY AUTHORITY TO PARTPAY REPAYMNT 8000340331F2880011", "116.00", "", "348.93", "PAYMENT", ""],
        ["732729710852", "16/10/2026", "DEPOSIT ONLINE 2872227 TFR Westpac Cho", "", "500.00", "510.07", "CREDIT", ""],
      ];
      const cols = inferColumns(headers);
      const det = detectCreditCardStatement(headers, dataRows, cols, "Data_export_17102026.csv");
      expect(det.likely).toBe(true);
      expect(det.cardAccounts).toEqual(["7163"]);

      // App wiring: card mode gated to the detected card accounts.
      cols.creditCard = true;
      cols.creditCardAccounts = det.cardAccounts!;
      const txs = dataRows.map((r) => rowToTransaction(r, cols, "combined")) as Transaction[];

      // Everyday withdrawal: normal bank logic (debit → spending), no card tag.
      expect(txs[0].type).toBe("spending");
      expect(txs[0].tags).not.toContain("credit card");
      // Card refund row: income, not Transfers; tagged credit card.
      expect(txs[1].type).toBe("income");
      expect(txs[1].category).not.toBe("Transfers");
      expect(txs[1].tags).toContain("credit card");
      // Card purchase: spending, tagged.
      expect(txs[2].type).toBe("spending");
      expect(txs[2].tags).toContain("credit card");
      // Loan repayment rows stay bank logic (debit → spending), untagged.
      expect(txs[3].type).toBe("spending");
      expect(txs[3].tags).not.toContain("credit card");
      expect(txs[4].type).toBe("income");
    });

    it("does not flag a deposit export with BSB-number account strings", () => {
      const headers = ["Bank Account", "Date", "Narrative", "Debit Amount", "Credit Amount", "Balance"];
      const dataRows = [
        ["032-123 4567890", "16/10/2026", "SALARY ACME", "", "3240.00", "10240.00"],
        ["032-123 4567890", "16/10/2026", "WOOLWORTHS", "84.20", "", "10155.80"],
      ];
      const det = detectCreditCardStatement(headers, dataRows, inferColumns(headers), "everyday.csv");
      expect(det.likely).toBe(false);
    });
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
