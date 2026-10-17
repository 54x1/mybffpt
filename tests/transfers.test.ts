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
import { isTransferDescription, linkInternalTransfers, TRANSFER_TAG } from "../src/utils/transfers";
import type { Transaction } from "../src/utils/types";

const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2),
  date: "2026-10-01",
  type: "spending",
  amount: 500,
  category: "Uncategorized",
  tags: [],
  description: "TFR TO LOAN ACCOUNT",
  source: "everyday",
  ...over,
});

describe("isTransferDescription", () => {
  it("recognises Westpac-family TFR wording", () => {
    expect(isTransferDescription("TFR TO ACC 1234 LOAN")).toBe(true);
    expect(isTransferDescription("TF/DR TO OFFSET")).toBe(true);
    expect(isTransferDescription("EFT INST 998877 FROM SAVINGS")).toBe(true);
    expect(isTransferDescription("TRANSFER FRM SPEND ACCOUNT")).toBe(true);
    expect(isTransferDescription("BPAY AGL 44321")).toBe(true);
  });

  it("rejects ordinary merchant activity", () => {
    expect(isTransferDescription("WOOLWORTHS HOUSING")).toBe(false);
    expect(isTransferDescription("COFFES ON 5TH")).toBe(false);
    expect(isTransferDescription("SALARY ACME PTY LTD")).toBe(false);
  });
});

describe("linkInternalTransfers", () => {
  it("pairs a same-day equal-amount TFR out/in across two sources", () => {
    const out = tx({ description: "TFR TO LOAN 0987" });
    const inn = tx({ type: "income", source: "home loan", description: "TFR FROM SPEND 1234" });
    const res = linkInternalTransfers([out, inn]);
    expect(res.pairs).toBe(1);
    for (const t of [out, inn]) {
      expect(t.category).toBe("Transfers");
      expect(t.tags).toContain(TRANSFER_TAG);
    }
  });

  it("does not pair rows from the same source", () => {
    const out = tx({ description: "TFR TO LOAN" });
    const inn = tx({ type: "income", description: "TFR FROM SOMEONE" }); // both "everyday"
    expect(linkInternalTransfers([out, inn]).pairs).toBe(0);
  });

  it("does not pair when only one side looks like a transfer", () => {
    const out = tx({ description: "TFR TO LOAN" });
    const inn = tx({ type: "income", source: "loan", description: "SOME DEPOSIT REFUND" });
    expect(linkInternalTransfers([out, inn]).pairs).toBe(0);
  });

  it("does not pair across different dates or amounts", () => {
    const out = tx({ description: "TFR TO LOAN" });
    const wrongDay = tx({ type: "income", source: "loan", date: "2026-10-02", description: "TFR FROM SPEND" });
    const wrongAmt = tx({ type: "income", source: "loan", amount: 499.5, description: "TFR FROM SPEND" });
    expect(linkInternalTransfers([out, wrongDay]).pairs).toBe(0);
    expect(linkInternalTransfers([out, wrongAmt]).pairs).toBe(0);
  });

  it("matches 1:1 and leaves extra rows alone", () => {
    const outA = tx({ description: "TFR TO LOAN A" });
    const outB = tx({ description: "TFR TO LOAN B" });
    const inn = tx({ type: "income", source: "loan", description: "TFR FROM SPEND" });
    const res = linkInternalTransfers([outA, outB, inn]);
    expect(res.pairs).toBe(1);
    const paired = [outA, outB].filter((t) => t.tags.includes(TRANSFER_TAG));
    expect(paired.length).toBe(1); // only one spending row got tagged
  });

  it("is idempotent — already-paired rows are skipped", () => {
    const out = tx({ description: "TFR TO LOAN" });
    const inn = tx({ type: "income", source: "loan", description: "TFR FROM SPEND" });
    expect(linkInternalTransfers([out, inn]).pairs).toBe(1);
    expect(linkInternalTransfers([out, inn]).pairs).toBe(0);
  });

  it("returns updated ids for persistence", () => {
    const out = tx({ description: "TFR TO LOAN" });
    const inn = tx({ type: "income", source: "loan", description: "TFR FROM SPEND" });
    const res = linkInternalTransfers([out, inn]);
    expect(res.updatedIds.sort()).toEqual([out.id, inn.id].sort());
  });
});
