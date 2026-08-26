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

import type { ParsedQuery, Transaction } from "./types";
import { eqi } from "./text";
import { endOfMonthISO, toISOorEmpty, toLocalISO, todayLocalISO } from "./dates";

// ========== SMART SEARCH QUERY ==========

export function parseSmartQuery(raw: string): ParsedQuery {
  const out: ParsedQuery = {
    text: [],
    not: [],
    tagsInclude: [],
    tagsExclude: [],
  };
  const tokens = (raw.match(/"[^"]+"|\S+/g) || []).map((t) =>
    t.replace(/^"|"$/g, "")
  );
  for (const t0 of tokens) {
    const t = t0.trim();
    const low = t.toLowerCase();

    // amount:50 or $50 exact match
    if (/^\$?\d+(\.\d+)?$/.test(low)) {
      const numStr = low.startsWith("$") ? low.slice(1) : low;
      if (/^\d+(\.\d+)?$/.test(numStr)) {
        out.amount = Number(numStr);
        continue;
      }
    }

    // amount comparators
    if (/^[<>]=?\d+(\.\d+)?$/.test(low)) {
      const m = low.match(/^([<>]=?)(\d+(\.\d+)?)$/)!;
      const op = m[1];
      const val = Number(m[2]);
      if (op === ">" || op === ">=")
        out.min = Math.max(
          out.min ?? -Infinity,
          val + (op === ">" ? 1e-12 : 0)
        );
      else if (op === "<" || op === "<=")
        out.max = Math.min(out.max ?? Infinity, val - (op === "<" ? 1e-12 : 0));
      continue;
    }

    // type:
    if (low.startsWith("type:")) {
      const v = low.slice(5);
      if (v === "income" || v === "spending") out.type = v;
      continue;
    }
    // category:
    if (low.startsWith("cat:")) {
      out.category = t.slice(4);
      continue;
    }
    // source:
    if (low.startsWith("src:")) {
      out.source = t.slice(4);
      continue;
    }
    // tags: "#work" or "tag:work" (include) / "-#work" or "-tag:work" (exclude)
    // Incomplete tokens (still being typed) are ignored so the list doesn't flash empty
    if (low === "#" || low === "tag:" || low === "-#" || low === "-tag:") continue;
    if (low.startsWith("-#") && low.length > 2) {
      out.tagsExclude.push(t.slice(2));
      continue;
    }
    if (low.startsWith("-tag:") && low.length > 5) {
      out.tagsExclude.push(t.slice(5));
      continue;
    }
    if (low.startsWith("#") && low.length > 1) {
      out.tagsInclude.push(t.slice(1));
      continue;
    }
    if (low.startsWith("tag:") && low.length > 4) {
      out.tagsInclude.push(t.slice(4));
      continue;
    }

    // last:30d
    if (low.startsWith("last:") && /last:\d+d/.test(low)) {
      const days = Number(low.match(/last:(\d+)d/)![1]);
      const end = todayLocalISO();
      const d = new Date(end);
      d.setDate(d.getDate() - (days - 1));
      out.start = toLocalISO(d);
      out.end = end;
      continue;
    }
    // since:YYYY-MM[-DD]
    if (low.startsWith("since:")) {
      const dt = toISOorEmpty(low.slice(6));
      if (dt) out.start = dt;
      continue;
    }
    // date:YYYY-MM..YYYY-MM or YYYY-MM-DD..YYYY-MM-DD
    if (low.startsWith("date:") && low.includes("..")) {
      const [a, b] = low.slice(5).split("..");
      if (/^\d{4}-\d{2}$/.test(a)) {
        const [ya, ma] = a.split("-").map(Number);
        out.start = `${ya}-${String(ma).padStart(2, "0")}-01`;
      } else out.start = toISOorEmpty(a);

      if (/^\d{4}-\d{2}$/.test(b)) {
        const [yb, mb] = b.split("-").map(Number);
        out.end = endOfMonthISO(yb, mb);
      } else out.end = toISOorEmpty(b);
      continue;
    }

    // negatives
    if (low.startsWith("-")) {
      out.not.push(low.slice(1));
      continue;
    }
    // plain include
    out.text.push(low);
  }
  return out;
}

export function txMatches(t: Transaction, f: ParsedQuery): boolean {
  // OPTIMIZED: Avoid string concatenation - check fields individually
  // Null-safe: CSV imports can produce null/undefined for string fields
  const desc = (t.description || "").toLowerCase();
  const cat = (t.category || "").toLowerCase();
  const src = (t.source || "").toLowerCase();
  // Lazy tag scan: only runs when desc/cat/src miss, keeps the hot path cheap
  const tagList = t.tags || [];
  const tagHit = (q: string) =>
    tagList.some((tt) => (tt || "").toLowerCase().includes(q));

  if (f.text.length) {
    for (const q of f.text) {
      if (!desc.includes(q) && !cat.includes(q) && !src.includes(q) && !tagHit(q)) return false;
    }
  }
  if (f.not.length) {
    for (const q of f.not) {
      if (desc.includes(q) || cat.includes(q) || src.includes(q) || tagHit(q)) return false;
    }
  }

  if (f.type && t.type !== f.type) return false;
  if (f.category && !eqi(t.category || "", f.category)) return false;
  if (
    f.source &&
    !src.includes(f.source.toLowerCase())
  )
    return false;

  // exact amount match
  if (f.amount != null && Math.abs((t.amount || 0) - f.amount) > 1e-9) return false;

  // range match
  if (f.min != null && (t.amount || 0) < f.min) return false;
  if (f.max != null && (t.amount || 0) > f.max) return false;

  // Substring match (like src:) so partial tag names still hit, e.g. #groc
  if (
    f.tagsInclude.length &&
    !f.tagsInclude.every((tag) => tagHit(tag.toLowerCase()))
  )
    return false;
  if (
    f.tagsExclude.length &&
    f.tagsExclude.some((tag) => tagHit(tag.toLowerCase()))
  )
    return false;

  const date = t.date || "";
  if (f.start && date < f.start) return false;
  if (f.end && date > f.end) return false;

  return true;
}
