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

// ========== TEXT / STRING UTILITIES ==========

export const isString = (v: unknown): v is string => typeof v === "string";

export const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** Escape regex metacharacters so a string can be used as a literal match pattern. */
export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const eqi = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;

/** Normalise a description for duplicate detection (numbers stripped). */
export function normDesc(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/\d+/g, "") // strip all numbers
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

// Decode HTML entities to fix double-encoding bug (&amp;amp; → &)
// Applies decoding recursively until no more entities remain.
// SECURITY: the result is plain text and is only ever rendered as text
// ({{ }} interpolation). It must NEVER be passed to `v-html` — doing so would
// turn any decoded `<script>`/`<img onerror>` in imported data into live HTML.
export function decodeHtmlEntities(s: string): string {
  if (!s) return s;
  let prev = s;
  let decoded = s;
  // Decode multiple passes for deeply encoded data
  for (let i = 0; i < 10; i++) {
    decoded = decoded
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
    if (decoded === prev) break; // No more entities to decode
    prev = decoded;
  }
  return decoded;
}

export const containsCaseIns = (arr: string[], val: string) =>
  arr.some((x) => eqi(x, val));

export const dedupeCI = (arr: string[]) => {
  const out: string[] = [];
  for (const raw of arr) {
    const s = raw.trim().replace(/\s+/g, " ");
    if (!s) continue;
    if (!containsCaseIns(out, s)) out.push(s);
  }
  return out;
};

export const sortAlpha = (arr: string[]) =>
  [...arr].sort((a, b) => a.localeCompare(b));

export function highlight(text: string, q: string) {
  const esc = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[ch]!)
    );
  const needle = (q || "").trim();
  if (!needle) return esc(text);
  const re = new RegExp(
    `(${needle.replace(/[.*?^${}()|[\]\\]/g, "\\$&")})`,
    "ig"
  );
  return esc(text).replace(re, "<mark>$1</mark>");
}
