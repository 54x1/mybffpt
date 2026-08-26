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

import type { InferredCols, Transaction, TransactionType } from "./types";
import { dbg, dbgw } from "./debug";
import { norm, normDesc } from "./text";
import { parseDateGuess } from "./dates";
import { autoCategoryFor, autoTagsFor } from "./rules";

// ========= CSV parsing  bank column inference =========

export function parseCSV(text: string): string[][] {
  // Strip BOM & normalise newlines
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const rows: string[][] = [];
  let cur = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" && !inQuotes) {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else {
      cur += ch;
    }
  }
  // Flush last field/row
  row.push(cur);
  if (row.length && row.some((c) => c.trim().length)) rows.push(row);

  // Trim cells
  return rows.map((r) => r.map((c) => c.trim()));
}

// Header helpers
export function findIndexByKeywords(headers: string[], kws: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  for (const kw of kws) {
    const idx = lower.findIndex((h) => h.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

//Amount parsing that handles $, commas, parentheses, DR/CR, trailing minus
export function parseAmountNumber(
  raw: string | undefined,
  indicator?: string | undefined
): number {
  if (!raw) return 0;
  let s = String(raw).trim();
  let sign = 1;

  // Direction / DR-CR overrides
  if (indicator) {
    const d = indicator.toLowerCase();
    if (/\bout\b/.test(d)) sign = -1; // OUT → negative
    else if (/\bin\b/.test(d)) sign = 1; // IN  → positive
    else if (/\bdr\b|\bdebit\b/.test(d)) sign = -1;
    else if (/\bcr\b|\bcredit\b/.test(d)) sign = 1;
  }

  // Parentheses mean negative
  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1);
  }

  // Trailing minus like "123.45-"
  if (/^-?[\d.,]+-$/.test(s)) {
    sign = -1;
    s = s.slice(0, -1);
  }

  // Strip currency symbols, spaces, and commas
  s = s.replace(/[^\d.-]/g, "").replace(/,/g, "");
  if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  if (!isFinite(n)) {
    dbgw("Amount parse failed → treating as 0", { raw, indicator, cleaned: s });
    return 0;
  }

  const out = sign * n;
  dbg("parsed amount", { raw, indicator, cleaned: s, sign, out });
  return out;
}

export function inferColumns(headers: string[]): InferredCols {
  dbg("Headers:", headers);
  const has = (kws: string[]) => findIndexByKeywords(headers, kws);

  // ── Essential column detection (covers ANZ, Westpac, NAB, CommBank, St.George, ING, Macquarie, Up, UBank) ──
  const date = has([
    "date", "transaction date", "posted date", "settled date",
    "date and time", "created on",
  ]);

  const amount = has([
    "amount", "amount aud", "total aud", "value",
    "total (aud)", "total",
  ]);

  const debit = has(["debit amount", "debit", "withdrawal"]);
  const credit = has(["credit amount", "credit", "deposit"]);

  const desc = [
    has(["transaction description", "description", "details",
      "narrative", "merchant", "transaction details", "payee"]),
  ].filter(i => i !== -1);

  // ── Wise format detection ──
  const isWiseMobile = has(["transferwise id"]) !== -1;
  const isWiseDesktop = has(["id"]) !== -1 && has(["direction"]) !== -1;

  if (date === -1) throw new Error("Could not find Date column in CSV.");

  // Wise Mobile
  if (isWiseMobile) {
    return {
      date,
      amount,
      desc: [
        has(["merchant"]),
        has(["payer name"]),
        has(["description"]),
      ].filter(i => i !== -1),
      mobileId: has(["transferwise id"]),
    };
  }

  // Wise Desktop
  if (isWiseDesktop) {
    return {
      date: has(["created on"]),
      drcr: has(["direction"]),
      desc: [has(["target name"])],
      srcAmt: has(["source amount (after fees)"]),
      srcCur: has(["source currency"]),
      desktopId: has(["id"]),
    };
  }

  // ── Generic Australian bank format ──
  // If both debit AND credit columns exist, prefer split-column mode
  const haveSplit = debit !== -1 && credit !== -1;

  return {
    date,
    amount: haveSplit ? undefined : amount,  // ignore single amount when split exists
    debit: haveSplit ? debit : undefined,
    credit: haveSplit ? credit : undefined,
    desc: desc.length ? desc : [2], // fallback: column index 2
  };
}

export function scanAmountConvention(
  dataRows: string[][],
  amtColIndex: number,
  maxScan = 200
): "normal" | "expensesPositive" {
  let pos = 0;
  let neg = 0;

  const rows = dataRows.slice(0, maxScan);
  for (const cols of rows) {
    const v = parseAmountNumber(cols[amtColIndex]);
    if (v > 0) pos++;
    else if (v < 0) neg++;
  }

  // If ALL amounts are positive (or vastly more positive than negative),
  // the bank exports expenses as positive numbers
  if (pos > 0 && neg === 0) return "expensesPositive";
  if (pos > neg * 10) return "expensesPositive";

  return "normal";
}

export function rowToTransaction(
  row: string[],
  cols: InferredCols,
  source: string
): Transaction | null {
  const dateISO = parseDateGuess(row[cols.date]);
  if (!dateISO) return null;

  let signed = 0;
  let description = "";

  // ── Path A: Wise Mobile ──
  if (cols.mobileId != null) {
    signed = parseAmountNumber(row[cols.amount!]);
    description = cols.desc.map(i => (row[i] || "").trim()).find(Boolean) || "Wise Transaction";
  }
  // ── Path B: Wise Desktop ──
  else if (cols.desktopId != null) {
    if ((row[cols.srcCur!] || "").toUpperCase() !== "AUD") return null;
    signed = parseAmountNumber(row[cols.srcAmt!], row[cols.drcr!]);
    description = (row[cols.desc[0]] || "").trim() || "Wise Transfer";
  }
  // ── Path C: Split debit/credit columns (CommBank, NAB, some Westpac) ──
  else if (cols.debit != null && cols.credit != null) {
    const d = parseAmountNumber(row[cols.debit] ?? "");
    const c = parseAmountNumber(row[cols.credit] ?? "");

    if (Math.abs(d) < 1e-9 && Math.abs(c) < 1e-9) return null;

    if (Math.abs(d) >= Math.abs(c)) {
      signed = -Math.abs(d || -c);  // debit → negative (spending)
    } else {
      signed = Math.abs(c || -d);   // credit → positive (income)
    }

    // Description from first available desc column
    description = cols.desc.map(i => (row[i] || "").trim()).find(Boolean) || "";
  }
  // ── Path D: Single amount column (ANZ, Westpac, ING, Macquarie, Up, UBank, St.George) ──
  else if (cols.amount != null) {
    const raw = parseAmountNumber(row[cols.amount]);
    if (Math.abs(raw) < 1e-9) return null;

    const convention = cols.amountConvention || "normal";

    if (convention === "expensesPositive") {
      // Positive = spending, negative = income
      signed = raw >= 0 ? -raw : Math.abs(raw);
    } else {
      // Normal: positive = income, negative = spending
      signed = raw;
    }

    // Description from first available desc column
    description = cols.desc.map(i => (row[i] || "").trim()).find(Boolean) || "";
  }
  // ── No valid amount path ──
  else {
    dbgw("Row skipped — no amount column matched", { row });
    return null;
  }

  if (signed === 0) return null;

  const type: TransactionType = signed < 0 ? "spending" : "income";
  const amount = Math.abs(signed);
  const cleanDesc = norm(description) || "Transaction";

  // Auto-categorize and auto-tag
  const category = autoCategoryFor(cleanDesc) || "Uncategorized";
  const autoTags = autoTagsFor(cleanDesc, category);

  return {
    id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: dateISO,
    type,
    amount: Number(amount.toFixed(2)),
    category,
    tags: autoTags,
    description: cleanDesc,
    source: cols.mobileId
      ? "Wise Mobile"
      : cols.desktopId
        ? "Wise Desktop"
        : source,
  };
}

// Duplicate detection key (ignore id differences, normalise description)
export function stableKey(
  tx: Pick<Transaction, "date" | "type" | "amount" | "description">
): string {
  return `${tx.date}|${tx.type}|${tx.amount.toFixed(2)}|${normDesc(
    tx.description
  )}`;
}
