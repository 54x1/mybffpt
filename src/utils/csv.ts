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

import type { CreditCardDetection, InferredCols, Transaction, TransactionType } from "./types";
import { dbg, dbgw } from "./debug";
import { norm, normDesc, dedupeCI, sortAlpha } from "./text";
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

  // Detect European decimal-comma ("1.234,56") BEFORE separators are
  // stripped — once commas are gone the pattern is unrecognisable and the
  // amount silently parses as 1.23456 instead of 1234.56.
  const t = s.replace(/[^\d.,-]/g, ""); // keep digits, dots, commas, minus
  if (/^-?\d{1,3}(?:\.\d{3})+,\d{2}$/.test(t)) {
    // Dots are thousands separators, comma is the decimal point
    s = t.replace(/\./g, "").replace(",", ".");
  } else {
    // AU/US style: commas are thousands separators ("$1,234.56")
    s = t.replace(/,/g, "");
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
    account: has(["bank account", "account number", "account no", "account"]),
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

// ========= Credit-card statement detection & sign logic =========
//
// Card statements are NOT cash-flow exports: a purchase is money OWED
// (positive), not money gone from an account. Importing one with normal
// bank-sign logic inverts every row — purchases land as income and the
// occasional repayment as spending. In credit-card mode we instead type
// rows by meaning:
//   • repayments/payments  → income, category "Transfers" (money moved
//     from a bank account to the card; not new money, must not count as
//     income or spending in analytics)
//   • refunds/adjustments  → income (negative on the statement)
//   • everything else      → spending at |amount| (purchases, fees, interest)

const CC_HEADER_SIGNALS: Array<{ re: RegExp; label: string; strong?: boolean }> = [
  { re: /credit\s*card/i, label: "header mentions 'credit card'", strong: true },
  { re: /\bcard\s*(number|no|#)\b/i, label: "header has a card number column", strong: true },
  { re: /statement\s*(period|date|balance)/i, label: "statement period/balance columns" },
  // Deposit accounts never say "owed" or "minimum payment due" — only cards do.
  { re: /(current|closing|new)\s*balance\s*owed|balance\s*owed/i, label: "balance-owed column", strong: true },
  { re: /minimum\s*(payment|repayment)|payment\s*due|amount\s*due/i, label: "payment-due columns", strong: true },
];

const CC_FILENAME_RE = /(credit[\s_-]*card|\bcc\b|card[\s_-]*(statement|txns?|transactions))/i;

// Repayments are identified by description, never by sign (banks disagree on
// the sign of a repayment). Merchant rows that merely carry a "PAYMENT DDMMMYY"
// prefix (Westpac refunds/settlements) or mention interest/fees are NOT
// repayments — matching bare \bpayment\b swallowed those.
const REPAYMENT_RE = /\brepay(ment|ments|mnt|mnts)?\b|payment\s+thank\s*you|\bautopay\b|\ba\/c\b\s*payment|balance\s+(transfer|payment)|card\s*payment|\bbpay\b.{0,30}\bpayment\b/i;
const NOT_A_REPAYMENT_RE = /\binterest\b|\bfee\b|late\s*charge|annual\s*(fee|charge)/i;

// Refunds and adjustments reduce the balance owed without being repayments.
const REFUND_RE = /\brefund\b|credit\s*adjust(ment)?\b|reversal|charge\s?back|return\s*credit|\bcashback\b/i;

export function isCardRepaymentDescription(desc: string): boolean {
  return REPAYMENT_RE.test(desc) && !NOT_A_REPAYMENT_RE.test(desc);
}

export function isCardRefundDescription(desc: string): boolean {
  return REFUND_RE.test(desc);
}

/**
 * Inspect a parsed CSV for credit-card-statement shape.
 * `cols` may be passed to reuse inference; detection re-reads headers anyway.
 * Heuristic (never destructive — the UI lets the user override):
 *   likely = one strong header signal, OR filename hint + ≥1 other signal,
 *           OR a balance column combined with an all-positive amount column.
 */
export function detectCreditCardStatement(
  headers: string[],
  dataRows: string[][],
  cols?: InferredCols,
  filename = ""
): CreditCardDetection {
  const signals: string[] = [];
  let strong = false;

  for (const h of headers) {
    for (const sig of CC_HEADER_SIGNALS) {
      if (sig.re.test(h) && !signals.includes(sig.label)) {
        signals.push(sig.label);
        // Card wording / balance-owed / payment-due is decisive on its own.
        if (sig.strong) strong = true;
      }
    }
  }

  const hasBalanceCol = headers.some((h) => /balance/i.test(h));
  const fileHint = CC_FILENAME_RE.test(filename);
  if (fileHint) signals.push(`filename hint (${filename})`);

  // Westpac-style exports put the card's last-4 digits in an otherwise generic
  // "Bank Account" column, while deposit accounts export BSB-number strings.
  // A column of short pure-digit account values is therefore a card signal —
  // evaluated PER ACCOUNT so combined multi-account exports are handled: only
  // the card rows get card treatment (e.g. Westpac "Data_export" files mixing
  // a card with deposit accounts).
  const acctIdx = headers.findIndex((h) => /bank\s*account|account\s*(number|no|#)/i.test(h));
  let shortAcctHint = false;
  const cardAccounts: string[] = [];
  if (acctIdx !== -1) {
    const byAccount = new Map<string, number>();
    for (const r of dataRows.slice(0, 200)) {
      const v = (r[acctIdx] || "").trim();
      if (v) byAccount.set(v, (byAccount.get(v) || 0) + 1);
    }
    for (const [v] of byAccount) {
      // 3–6 bare digits: card last-4 pattern. Deposit exports carry BSB-number
      // strings ("032-123 4567890") or longer digit runs, never this shape.
      if (/^\d{3,6}$/.test(v)) cardAccounts.push(v);
    }
    shortAcctHint = cardAccounts.length > 0;
    if (shortAcctHint) {
      signals.push(`account column holds short numeric IDs (card last-digits pattern: ${cardAccounts.join(", ")})`);
    }
  }

  // Amount-sign shape: card statements are overwhelmingly positive with the
  // occasional negative repayment/refund.
  let pos = 0;
  let neg = 0;
  let repayments = 0;
  const descCols = cols?.desc ?? [];
  for (const r of dataRows.slice(0, 200)) {
    const amtIdx = cols?.amount;
    const v = amtIdx != null ? parseAmountNumber(r[amtIdx]) : 0;
    if (v > 0) pos++;
    else if (v < 0) neg++;
    const desc = descCols.map((i) => r[i] || "").join(" ");
    if (desc && isCardRepaymentDescription(desc)) repayments++;
  }
  const amountRows = pos + neg;
  const repaymentRatio = amountRows ? repayments / amountRows : 0;

  if (hasBalanceCol) signals.push("balance column present");
  if (amountRows > 0 && pos >= amountRows * 0.75) {
    signals.push(`${Math.round((pos / amountRows) * 100)}% of amounts positive`);
  }
  if (repayments > 0 && repayments <= Math.max(2, amountRows * 0.2)) {
    signals.push("a few repayment-looking rows among mostly purchases");
  }

  const weakCount =
    (hasBalanceCol ? 1 : 0) +
    (amountRows > 0 && pos >= amountRows * 0.75 ? 1 : 0) +
    (shortAcctHint ? 1 : 0);
  const repaymentHint = repayments > 0 && repayments <= Math.max(2, amountRows * 0.2);

  // Shape alone (positive amounts + balance column) also matches a deposits-only
  // savings account, so weak signals only decide it when repayment rows or the
  // filename corroborate; explicit card wording is decisive on its own. The
  // balance+short-account pair is decisive too: deposit exports carry BSB-number
  // strings ("032-123 4567890"), never bare last-4-digit values, and split
  // debit/credit files (Westpac) can't produce the amount-sign signal at all.
  const likely =
    strong ||
    (fileHint && weakCount >= 1) ||
    (hasBalanceCol && shortAcctHint) ||
    (weakCount >= 2 && repaymentHint);

  return {
    likely,
    signals,
    repaymentRatio,
    cardAccounts: cardAccounts.length ? cardAccounts : undefined,
  };
}

export function rowToTransaction(
  row: string[],
  cols: InferredCols,
  source: string
): Transaction | null {
  const dateISO = parseDateGuess(row[cols.date]);
  if (!dateISO) return null;

  // Assigned by exactly one import path below; each path either assigns both
  // or returns null, so no initial value is ever read.
  let signed: number;
  let description: string;
  // Set when credit-card mode reclassifies a row (repayment → Transfers).
  let forcedCategory = "";

  // Per-row card gate: in combined multi-account exports only the detected
  // card accounts get card treatment; other rows keep normal bank logic.
  const acctVal = cols.account != null ? (row[cols.account] || "").trim() : "";
  const rowIsCard = !!cols.creditCard && (!cols.creditCardAccounts?.length || cols.creditCardAccounts.includes(acctVal));

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

    // Description from first available desc column
    description = cols.desc.map(i => (row[i] || "").trim()).find(Boolean) || "";

    if (rowIsCard) {
      // Card statement in split-column form: "debit" is money owed (spend),
      // "credit" is either a repayment or a refund — both reduce what's owed.
      const isRepay = isCardRepaymentDescription(description);
      if (isRepay && Math.abs(c) >= Math.abs(d)) {
        signed = Math.abs(c);          // repayment → money into the card
        forcedCategory = "Transfers";
      } else if (Math.abs(c) > Math.abs(d)) {
        signed = Math.abs(c);          // refund/credit → income on the statement
      } else {
        signed = -Math.abs(d);         // purchase/fee → spending
      }
    } else if (Math.abs(d) >= Math.abs(c)) {
      signed = -Math.abs(d || -c);  // debit → negative (spending)
    } else {
      signed = Math.abs(c || -d);   // credit → positive (income)
    }
  }
  // ── Path D: Single amount column (ANZ, Westpac, ING, Macquarie, Up, UBank, St.George) ──
  else if (cols.amount != null) {
    const raw = parseAmountNumber(row[cols.amount]);
    if (Math.abs(raw) < 1e-9) return null;

    // Description from first available desc column
    description = cols.desc.map(i => (row[i] || "").trim()).find(Boolean) || "";

    if (rowIsCard) {
      // Card statement: every non-payment row is spending regardless of the
      // sign the bank chose; payments/refunds are money into the card.
      const isRepay = isCardRepaymentDescription(description);
      const isRefund = !isRepay && isCardRefundDescription(description);
      if (isRepay) {
        signed = Math.abs(raw);        // repayment → treated as inflow to card
        forcedCategory = "Transfers";
      } else if (isRefund || raw < 0) {
        signed = Math.abs(raw);        // refund/credit adjustment → income
      } else {
        signed = -Math.abs(raw);       // purchase, fee, interest → spending
      }
    } else {
      const convention = cols.amountConvention || "normal";

      if (convention === "expensesPositive") {
        // Positive = spending, negative = income
        signed = raw >= 0 ? -raw : Math.abs(raw);
      } else {
        // Normal: positive = income, negative = spending
        signed = raw;
      }
    }
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

  // Auto-categorize and auto-tag (credit-card repayments bypass merchant rules)
  const category = forcedCategory || autoCategoryFor(cleanDesc) || "Uncategorized";
  const autoTags = rowIsCard
    ? [...autoTagsFor(cleanDesc, category), "credit card"]
    : autoTagsFor(cleanDesc, category);

  return {
    id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: dateISO,
    type,
    amount: Number(amount.toFixed(2)),
    category,
    tags: sortAlpha(dedupeCI(autoTags)),
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
