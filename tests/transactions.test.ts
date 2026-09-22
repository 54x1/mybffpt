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
import { validateTransactionSchema, normalizeTransaction, DEFAULT_SOURCE } from "../src/utils/transactions";

const valid = () => ({
  id: "t1",
  date: "2026-06-15",
  type: "spending" as const,
  amount: 42.5,
  category: "Grocery",
  tags: ["weekly"],
  description: "Coles shop",
  recurring: false,
  frequency: "monthly" as const,
  recursions: 1,
  endDate: "",
  source: "ANZ",
});

describe("validateTransactionSchema", () => {
  it("accepts a well-formed transaction", () => {
    expect(validateTransactionSchema(valid())).toBe(true);
  });

  it("rejects non-objects and null", () => {
    expect(validateTransactionSchema(null)).toBe(false);
    expect(validateTransactionSchema(undefined)).toBe(false);
    expect(validateTransactionSchema("nope")).toBe(false);
    expect(validateTransactionSchema(42)).toBe(false);
  });

  it("rejects a type outside the enum", () => {
    expect(validateTransactionSchema({ ...valid(), type: "transfer" })).toBe(false);
  });

  it("rejects a frequency outside the enum", () => {
    expect(validateTransactionSchema({ ...valid(), frequency: "biweekly" })).toBe(false);
  });

  it("enforces field length limits", () => {
    expect(validateTransactionSchema({ ...valid(), description: "x".repeat(1001) })).toBe(false);
    expect(validateTransactionSchema({ ...valid(), category: "x".repeat(201) })).toBe(false);
    expect(validateTransactionSchema({ ...valid(), source: "x".repeat(101) })).toBe(false);
  });

  it("rejects non-finite amounts", () => {
    expect(validateTransactionSchema({ ...valid(), amount: NaN })).toBe(false);
    expect(validateTransactionSchema({ ...valid(), amount: Infinity })).toBe(false);
    expect(validateTransactionSchema({ ...valid(), amount: "12" as unknown as number })).toBe(false);
  });

  it("bounds recursions to at most 3650; 0 is treated as 'unset'", () => {
    // The validator guards optional fields with a truthiness check, so an
    // explicit 0 passes validation — normalizeTransaction clamps it to >= 1.
    expect(validateTransactionSchema({ ...valid(), recursions: 3651 })).toBe(false);
    expect(validateTransactionSchema({ ...valid(), recursions: 3650 })).toBe(true);
    expect(normalizeTransaction({ ...valid(), recursions: 0 }).recursions).toBe(1);
  });

  it("bounds seriesId length", () => {
    expect(validateTransactionSchema({ ...valid(), seriesId: "s".repeat(101) })).toBe(false);
  });

  it("limits tag count and tag length", () => {
    const many = Array.from({ length: 21 }, (_, i) => `t${i}`);
    expect(validateTransactionSchema({ ...valid(), tags: many })).toBe(false);
    expect(validateTransactionSchema({ ...valid(), tags: ["x".repeat(51)] })).toBe(false);
    expect(validateTransactionSchema({ ...valid(), tags: [42 as unknown as string] })).toBe(false);
  });

  it("decodes double-encoded HTML entities in place", () => {
    const tx = valid();
    tx.description = "Coles &amp;amp; Co";
    expect(validateTransactionSchema(tx)).toBe(true);
    // decodeHtmlEntities resolves repeated encoding fully, so stored
    // double-encoding never reaches the UI.
    expect(tx.description).toBe("Coles & Co");
  });
});

describe("normalizeTransaction", () => {
  it("replaces invalid input with a safe placeholder", () => {
    const tx = normalizeTransaction({ type: "bogus" });
    expect(tx.description).toBe("Invalid data");
    expect(tx.category).toBe("Uncategorized");
    expect(tx.amount).toBe(0);
    expect(tx.type).toBe("spending");
    expect(tx.source).toBe(DEFAULT_SOURCE);
    expect(tx.id).toBeTruthy();
  });

  it("keeps a valid transaction's values", () => {
    const tx = normalizeTransaction(valid());
    expect(tx.id).toBe("t1");
    expect(tx.date).toBe("2026-06-15");
    expect(tx.amount).toBe(42.5);
    expect(tx.category).toBe("Grocery");
    expect(tx.tags).toEqual(["weekly"]);
  });

  it("stores amounts as absolute values", () => {
    const tx = normalizeTransaction({ ...valid(), amount: -99.9 });
    expect(tx.amount).toBe(99.9);
  });

  it("defaults optional fields", () => {
    const tx = normalizeTransaction({ date: "2026-06-15", type: "income", amount: 10 });
    expect(tx.category).toBe("Uncategorized");
    expect(tx.tags).toEqual([]);
    expect(tx.frequency).toBe("monthly");
    expect(tx.recursions).toBe(1);
    expect(tx.source).toBe(DEFAULT_SOURCE);
    expect(tx.recurring).toBe(false);
  });

  it("clamps recursions to at least 1", () => {
    const tx = normalizeTransaction({ ...valid(), recursions: 0 });
    expect(tx.recursions).toBe(1);
  });

  it("falls back to today for an unparseable date", () => {
    // validate rejects nothing here (date isn't schema-checked), so the
    // normalizer's own parseDateGuess fallback applies.
    const tx = normalizeTransaction({ ...valid(), date: "garbage" });
    expect(tx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("decodes HTML entities in text fields", () => {
    const tx = normalizeTransaction({ ...valid(), category: "Restaurant &amp; Takeaway" });
    expect(tx.category).toBe("Restaurant & Takeaway");
  });

  it("passes through seriesId and splitGroupId only when present", () => {
    const plain = normalizeTransaction(valid());
    expect(plain.seriesId).toBeUndefined();
    const grouped = normalizeTransaction({ ...valid(), seriesId: "s1", splitGroupId: "g1" });
    expect(grouped.seriesId).toBe("s1");
    expect(grouped.splitGroupId).toBe("g1");
  });
});
