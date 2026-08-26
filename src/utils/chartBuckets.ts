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

export type ChartGroupBy =
  | "daily"
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type ChartTransactionLike = {
  date: string | Date;
  type: "income" | "spending";
  amount: number;
};

export type TimeSeriesBuckets = {
  labels: string[];
  income: number[];
  spending: number[];
  balance: number[];
  cumulative: number[];
};

function parseDateGuess(value: string | undefined | null): string {
  if (!value) return "";
  const text = String(value).trim();

  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})(?:[ T].*)?$/);
  if (isoMatch) return isoMatch[1];

  const dmYMatch = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:[ T].*)?$/);
  if (dmYMatch) {
    const d = String(dmYMatch[1]).padStart(2, "0");
    const m = String(dmYMatch[2]).padStart(2, "0");
    let y = dmYMatch[3];
    if (y.length === 2) y = String(2000 + Number(y));
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(text.replace(" ", "T"));
  return Number.isNaN(parsed.getTime())
    ? ""
    : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function toLocalISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDate(dateValue: string | Date): Date | null {
  const iso = typeof dateValue === "string" ? parseDateGuess(dateValue) : toLocalISO(dateValue);
  const parsed = iso ? new Date(`${iso}T00:00:00`) : new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function startOfISOWeek(date: Date): Date {
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function startOfFortnight(date: Date): Date {
  const weekStart = startOfISOWeek(date);
  const anchor = new Date(weekStart);
  const dayOfYear = Math.floor(
    (+anchor - +new Date(anchor.getFullYear(), 0, 1)) / 86400000
  );
  const fortnightShift = Math.floor(dayOfYear / 7) % 2 ? -7 : 0;
  anchor.setDate(anchor.getDate() + fortnightShift);
  anchor.setHours(0, 0, 0, 0);
  return anchor;
}

function startOfQuarter(date: Date): Date {
  const quarterMonth = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarterMonth, 1);
}

function getBucketStart(date: Date, groupBy: ChartGroupBy): Date {
  switch (groupBy) {
    case "daily":
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    case "weekly":
      return startOfISOWeek(date);
    case "fortnightly":
      return startOfFortnight(date);
    case "monthly":
      return new Date(date.getFullYear(), date.getMonth(), 1);
    case "quarterly":
      return startOfQuarter(date);
    case "yearly":
      return new Date(date.getFullYear(), 0, 1);
  }
}

function advanceBucket(date: Date, groupBy: ChartGroupBy): Date {
  const next = getBucketStart(date, groupBy);
  switch (groupBy) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "fortnightly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  next.setHours(0, 0, 0, 0);
  return next;
}

function getBucketKey(date: Date, groupBy: ChartGroupBy): string {
  switch (groupBy) {
    case "daily":
      return toLocalISO(date);
    case "weekly":
    case "fortnightly":
      return toLocalISO(date);
    case "monthly":
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    case "quarterly":
      return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
    case "yearly":
      return String(date.getFullYear());
  }
}

function getSelectedRange(
  transactions: readonly ChartTransactionLike[],
  rangeStart?: string | Date,
  rangeEnd?: string | Date
): { start: Date; end: Date } | null {
  const dates = transactions
    .map((tx) => normalizeDate(tx.date))
    .filter((date): date is Date => date !== null);

  if (dates.length === 0) return null;

  const first = rangeStart ? normalizeDate(rangeStart) : dates.reduce((min, date) => (date < min ? date : min), dates[0]);
  const last = rangeEnd ? normalizeDate(rangeEnd) : dates.reduce((max, date) => (date > max ? date : max), dates[0]);

  if (!first || !last) return null;

  return first <= last ? { start: first, end: last } : { start: last, end: first };
}

export function buildTimeSeriesBuckets(
  transactions: readonly ChartTransactionLike[],
  groupBy: ChartGroupBy,
  options?: { rangeStart?: string | Date; rangeEnd?: string | Date }
): TimeSeriesBuckets {
  if (transactions.length === 0) {
    return { labels: [], income: [], spending: [], balance: [], cumulative: [] };
  }

  const range = getSelectedRange(transactions, options?.rangeStart, options?.rangeEnd);
  if (!range) {
    return { labels: [], income: [], spending: [], balance: [], cumulative: [] };
  }

  const start = getBucketStart(range.start, groupBy);
  const end = getBucketStart(range.end, groupBy);
  const buckets = new Map<string, { income: number; spending: number }>();

  for (const tx of transactions) {
    const date = normalizeDate(tx.date);
    if (!date) continue;
    const key = getBucketKey(getBucketStart(date, groupBy), groupBy);
    const existing = buckets.get(key) ?? { income: 0, spending: 0 };
    if (tx.type === "income") {
      existing.income += tx.amount;
    } else {
      existing.spending += tx.amount;
    }
    buckets.set(key, existing);
  }

  const labels: string[] = [];
  const income: number[] = [];
  const spending: number[] = [];
  const balance: number[] = [];
  const cumulative: number[] = [];
  let cursor = new Date(start);
  let running = 0;

  while (cursor <= end) {
    const key = getBucketKey(cursor, groupBy);
    const totals = buckets.get(key) ?? { income: 0, spending: 0 };
    const periodNet = totals.income - totals.spending;

    labels.push(key);
    income.push(totals.income);
    spending.push(totals.spending);
    balance.push(periodNet);
    running += periodNet;
    cumulative.push(running);

    cursor = advanceBucket(cursor, groupBy);
  }

  return { labels, income, spending, balance, cumulative };
}
