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

import type { ChartGroupBy } from "../utils/chartBuckets";

// ========== DATE UTILITIES ==========

export function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayLocalISO(): string {
  return toLocalISO(new Date());
}

export function isoToDDMMYYYY(iso?: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

export function ddmmyyyyToISO(ddmmyyyy: string): string | "" {
  const m = ddmmyyyy.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return "";
  const d = Number(m[1]),
    mo = Number(m[2]),
    y = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d)
    return "";
  return toLocalISO(dt);
}

export function formatDDMMProgressive(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

export function finalizeDDMM(raw: string): string | "" {
  const m = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (!m) return "";
  const d = String(Math.min(31, Number(m[1]))).padStart(2, "0");
  const mo = String(Math.min(12, Number(m[2]))).padStart(2, "0");
  let y = m[3];
  if (y.length === 2) y = String(2000 + Number(y));
  const iso = ddmmyyyyToISO(`${d}-${mo}-${y}`);
  return iso ? `${d}-${mo}-${y}` : "";
}

export function parseDateGuess(s: string | undefined | null): string {
  if (!s) return "";
  const t = String(s).trim();

  // ISO date with optional time ("YYYY-MM-DD" or "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm:ss")
  const mISO = t.match(/^(\d{4}-\d{2}-\d{2})(?:[ T].*)?$/);
  if (mISO) return mISO[1]; // keep only the date part

  // dd/mm/yyyy or dd-mm-yyyy (optionally with time)
  let m = t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:[ T].*)?$/);
  if (m) {
    const d = String(m[1]).padStart(2, "0");
    const mo = String(m[2]).padStart(2, "0");
    let y = m[3];
    if (y.length === 2) y = String(2000 + Number(y));
    const iso = ddmmyyyyToISO(`${d}-${mo}-${y}`);
    if (iso) return iso;
  }

  // dd MMM yyyy (e.g., "31 Jul 2026" — Macquarie, some other banks)
  m = t.match(/^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2,4})/i);
  if (m) {
    const months: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    const day = Number(m[1]);
    const mo = months[m[2].toLowerCase()];
    let y = Number(m[3]);
    if (m[3].length === 2) y += 2000;
    const dt = new Date(y, mo - 1, day);
    if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === day) {
      return toLocalISO(dt);
    }
  }

  // HH:MM DD-MM-YY or HH:MM DD-MM-YYYY (e.g., "15:10 29-12-25" — Ubank)
  m = t.match(/^(\d{1,2}):(\d{2})\s+(\d{1,2})-(\d{1,2})-(\d{2,4})/);
  if (m) {
    const day = Number(m[3]);
    const mo = Number(m[4]);
    let y = Number(m[5]);
    if (m[5].length === 2) y += 2000;
    const dt = new Date(y, mo - 1, day);
    if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === day) {
      return toLocalISO(dt);
    }
  }

  // Last-chance parse: normalize space → 'T'
  const dt = new Date(t.replace(" ", "T"));
  return isNaN(+dt) ? "" : toLocalISO(dt);
}

export function endOfMonthISO(y: number, m1to12: number) {
  return toLocalISO(new Date(y, m1to12, 0));
}

export function toISOorEmpty(s: string) {
  const iso = parseDateGuess(s);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : "";
}

export function startOfISOWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // Monday as week start
  const dt = new Date(d);
  dt.setDate(d.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function startOfFortnight(d: Date): Date {
  const w = startOfISOWeek(d);
  // group pairs of ISO weeks: even=0, odd=1 based on week number-ish
  const anchor = new Date(w);
  const dayOfYear = Math.floor(
    (+anchor - +new Date(anchor.getFullYear(), 0, 1)) / 86400000
  );
  const fortnightShift = Math.floor(dayOfYear / 7) % 2 ? -7 : 0;
  anchor.setDate(anchor.getDate() + fortnightShift);
  return anchor;
}

export function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1);
}

export function bucketKeyByGroup(iso: string, group: ChartGroupBy): string {
  const d = new Date(iso + "T00:00:00");
  let k: Date;
  switch (group) {
    case "daily":
      k = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      break;
    case "weekly":
      k = startOfISOWeek(d);
      break;
    case "fortnightly":
      k = startOfFortnight(d);
      break;
    case "monthly":
      k = new Date(d.getFullYear(), d.getMonth(), 1);
      break;
    case "quarterly":
      k = startOfQuarter(d);
      break;
    case "yearly":
      k = new Date(d.getFullYear(), 0, 1);
      break;
    default:
      k = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return toLocalISO(k);
}
