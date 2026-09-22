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
import { parseSmartQuery, txMatches } from "../src/utils/query";
import type { Transaction } from "../src/utils/types";

function makeTx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    date: "2026-06-15",
    type: "spending",
    amount: 42.5,
    category: "Grocery",
    tags: ["coles", "weekly-shop"],
    description: "COLES ONLINE #12345",
    recurring: false,
    frequency: "monthly",
    recursions: 1,
    endDate: "",
    source: "ANZ",
    ...over,
  };
}

describe("parseSmartQuery", () => {
  it("parses plain text tokens lowercased", () => {
    const q = parseSmartQuery("Coles milk");
    expect(q.text).toEqual(["coles", "milk"]);
  });

  it("keeps quoted phrases as single tokens", () => {
    const q = parseSmartQuery('"weekly shop"');
    expect(q.text).toEqual(["weekly shop"]);
  });

  it("parses negation with leading dash", () => {
    const q = parseSmartQuery("food -petrol");
    expect(q.text).toEqual(["food"]);
    expect(q.not).toEqual(["petrol"]);
  });

  it("parses exact amount with and without $", () => {
    expect(parseSmartQuery("$50").amount).toBe(50);
    expect(parseSmartQuery("42.5").amount).toBe(42.5);
  });

  it("parses comparators into min/max bounds", () => {
    const gt = parseSmartQuery(">100");
    expect(gt.min).toBeGreaterThan(100);
    const ge = parseSmartQuery(">=100");
    expect(ge.min).toBe(100);
    const lt = parseSmartQuery("<20");
    expect(lt.max).toBeLessThan(20);
    const le = parseSmartQuery("<=20");
    expect(le.max).toBe(20);
  });

  it("parses type:, cat: and src: filters", () => {
    const q = parseSmartQuery("type:income cat:Salary src:wester");
    expect(q.type).toBe("income");
    expect(q.category).toBe("Salary");
    expect(q.source).toBe("wester");
  });

  it("parses include and exclude tags (#tag, -#tag, tag:x, -tag:x)", () => {
    const q = parseSmartQuery("#groc -#personal tag:work -tag:home");
    expect(q.tagsInclude).toEqual(["groc", "work"]);
    expect(q.tagsExclude).toEqual(["personal", "home"]);
  });

  it("ignores incomplete tag tokens while typing", () => {
    const q = parseSmartQuery("#");
    expect(q.tagsInclude).toEqual([]);
    expect(q.text).toEqual([]);
  });

  it("parses a since: date into start", () => {
    const q = parseSmartQuery("since:2026-01-15");
    expect(q.start).toBe("2026-01-15");
  });

  it("parses date:YYYY-MM..YYYY-MM month ranges to full-month bounds", () => {
    const q = parseSmartQuery("date:2026-03..2026-05");
    expect(q.start).toBe("2026-03-01");
    expect(q.end).toBe("2026-05-31");
  });

  it("parses last:Nd into a rolling window ending today", () => {
    const q = parseSmartQuery("last:30d");
    expect(q.start).toBeTruthy();
    expect(q.end).toBeTruthy();
    expect((q.end as string) >= (q.start as string)).toBe(true);
  });
});

describe("txMatches", () => {
  it("matches plain text against description, category, source or tags", () => {
    const q = parseSmartQuery("coles");
    expect(txMatches(makeTx(), q)).toBe(true); // via description
    // description no longer contains it, but the "coles" tag still matches
    expect(txMatches(makeTx({ description: "other" }), q)).toBe(true);
    // no field or tag contains it anymore
    expect(txMatches(makeTx({ description: "other", tags: [] }), q)).toBe(false);
  });

  it("fails when text token matches nothing", () => {
    const q = parseSmartQuery("petrol");
    expect(txMatches(makeTx(), q)).toBe(false);
  });

  it("excludes via -token", () => {
    const q = parseSmartQuery("-online");
    expect(txMatches(makeTx(), q)).toBe(false); // desc contains "online"
  });

  it("filters by type", () => {
    const q = parseSmartQuery("type:income");
    expect(txMatches(makeTx({ type: "spending" }), q)).toBe(false);
    expect(txMatches(makeTx({ type: "income" }), q)).toBe(true);
  });

  it("filters by category case-insensitively (exact)", () => {
    const q = parseSmartQuery("cat:gROCery");
    expect(txMatches(makeTx(), q)).toBe(true);
    expect(txMatches(makeTx({ category: "Groceries" }), q)).toBe(false);
  });

  it("filters by source substring", () => {
    const q = parseSmartQuery("src:anz");
    expect(txMatches(makeTx(), q)).toBe(true);
    expect(txMatches(makeTx({ source: "NAB" }), q)).toBe(false);
  });

  it("matches exact amount within epsilon", () => {
    const q = parseSmartQuery("$42.50");
    expect(txMatches(makeTx({ amount: 42.5 }), q)).toBe(true);
    expect(txMatches(makeTx({ amount: 42.51 }), q)).toBe(false);
  });

  it("applies min/max range bounds", () => {
    const ge = parseSmartQuery(">=40");
    expect(txMatches(makeTx({ amount: 42.5 }), ge)).toBe(true);
    expect(txMatches(makeTx({ amount: 39 }), ge)).toBe(false);
    const lt = parseSmartQuery("<10");
    expect(txMatches(makeTx({ amount: 42.5 }), lt)).toBe(false);
  });

  it("requires all include-tags and rejects any exclude-tag", () => {
    const inc = parseSmartQuery("#weekly-shop #missing");
    expect(txMatches(makeTx(), inc)).toBe(false);
    const exc = parseSmartQuery("-#weekly-shop");
    expect(txMatches(makeTx(), exc)).toBe(false);
  });

  it("applies date window bounds", () => {
    const q = parseSmartQuery("date:2026-01..2026-03");
    expect(txMatches(makeTx({ date: "2026-02-01" }), q)).toBe(true);
    expect(txMatches(makeTx({ date: "2026-06-15" }), q)).toBe(false);
  });

  it("tolerates null-ish string fields from CSV imports", () => {
    const tx = makeTx();
    (tx as any).description = null;
    (tx as any).category = undefined;
    (tx as any).tags = null;
    expect(() => txMatches(tx, parseSmartQuery("anything"))).not.toThrow();
  });

  it("empty query matches everything", () => {
    expect(txMatches(makeTx(), parseSmartQuery(""))).toBe(true);
  });
});
