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

import type { Transaction } from "./types";
import { dedupeCI, sortAlpha } from "./text";

// ========== INTERNAL TRANSFER PAIRING ==========
//
// Bank exports have no cross-account view: moving $500 from an everyday
// account to a loan appears twice — once as a withdrawal on one statement
// and once as a deposit on the other. Imported naively that double-counts
// as both spending and income (it nets out in totals but distorts category
// analytics). This module pairs such rows across sources when BOTH sides
// look like deliberate money movement (TFR/transfer wording), never for
// coincidental amount matches — a merchant charge equal to some deposit
// on the same day stays a genuine expense.

export const TRANSFER_TAG = "internal transfer";

// Westpac-family: "TFR", "TF/DR", "TFR TO ...", plus generic wording used by
// other AU banks for account-to-account movement.
const TRANSFER_DESC_RE =
  /\btf\/?dr\b|\btfr\b|\beft\b|transfer (to|from|frm|too)\b|\bbp\/?ay\b|on-?line transfer|balance transfer/i;

/** True when a description reads as an account-to-account movement. */
export function isTransferDescription(desc: string): boolean {
  return TRANSFER_DESC_RE.test(desc || "");
}

type Candidate = { tx: Transaction; idx: number };

function sameDay(a: Transaction, b: Transaction): boolean {
  return a.date === b.date;
}

/**
 * Find and label internal-transfer pairs across accounts.
 *
 * A pair is one spending row from source X and one income row from source Y
 * (X ≠ Y) on the same date with equal amounts, where BOTH descriptions look
 * like transfers. Paired rows get category "Transfers" and the
 * `internal transfer` tag so they can be filtered out of spend/income views
 * together. Greedy 1:1 matching; already-tagged rows are left alone.
 *
 * Mutates and returns { pairs, updated } where `updated` lists the ids that
 * changed (callers persist those). Input order matters only for tie-breaking
 * among equal candidates.
 */
export function linkInternalTransfers(
  txs: Transaction[]
): { pairs: number; updatedIds: string[] } {
  const spendCands: Candidate[] = [];
  const incomeCands: Candidate[] = [];

  txs.forEach((tx, idx) => {
    if (tx.tags?.some((t) => t.toLowerCase() === TRANSFER_TAG)) return; // already linked
    if (!isTransferDescription(tx.description)) return;
    if (tx.type === "spending") spendCands.push({ tx, idx });
    else incomeCands.push({ tx, idx });
  });

  const usedSpend = new Set<number>();
  const usedIncome = new Set<number>();
  const updatedIds: string[] = [];
  let pairs = 0;

  for (const s of spendCands) {
    if (usedSpend.has(s.idx)) continue;
    // Prefer the earliest unused income row from a different source with the
    // exact same date and amount.
    const m = incomeCands.find(
      (i) =>
        !usedIncome.has(i.idx) &&
        i.tx.source !== s.tx.source &&
        sameDay(s.tx, i.tx) &&
        Math.abs(i.tx.amount - s.tx.amount) < 0.005
    );
    if (!m) continue;

    usedSpend.add(s.idx);
    usedIncome.add(m.idx);
    pairs++;

    for (const c of [s, m]) {
      const t = txs[c.idx];
      t.category = "Transfers";
      t.tags = sortAlpha(dedupeCI([...(t.tags || []), TRANSFER_TAG]));
      updatedIds.push(t.id);
    }
  }

  return { pairs, updatedIds };
}
