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

import type { DateFormatOption } from "./types";

// ========= localStorage keys =========
export const LS_KEYS = {
  tx: "financial-tracker-transactions",
  cats: "financial-tracker-custom-categories",
  tags: "financial-tracker-tags",
  recent: "financial-tracker-recent-cats",
  catsHidden: "financial-tracker-hidden-categories",
  theme: "financial-tracker-theme",
  tips: "financial-tracker-tips-dismissed",
  view: "financial-tracker-advanced-view",
  dateFormat: "financial-tracker-date-format",
  chartSelection: "financial-tracker-chart-selection",
  recurringDefaults: "financial-tracker-recurring-defaults",
  // M1: master-password metadata (KDF salt + password verifier). NOT encrypted —
  // it only contains the salt and an AES-GCM verifier, both safe to store.
  meta: "financial-tracker-secure-meta",
  // M1: first-run password choice ("declined" | "set") so we don't re-ask.
  passwordChoice: "financial-tracker-password-choice",
  // Stay-unlocked: user preference ("off" | "session" | "device"; legacy
  // "true"/"false" values are migrated). "session" auto-unlocks only for this
  // tab (sessionStorage, cleared on tab close or inactivity); "device"
  // auto-unlocks persistently (localStorage).
  stayUnlocked: "financial-tracker-stay-unlocked",
  // Stay-unlocked: base64 raw AES key, present only while stay-unlocked is on
  // AND the store is unlocked. Lives in sessionStorage or localStorage
  // depending on the mode above. SECURITY: storing the raw key here means
  // anyone with access to that storage can read it and decrypt the data — the
  // tradeoff is surfaced in the UI.
  sessionKey: "financial-tracker-session-key",
  // Stay-unlocked ("session" mode): sessionStorage timestamp (ms) written
  // whenever the tab is backgrounded, used to detect and force-lock after a
  // period of inactivity even if the tab itself never closes (mobile browsers
  // commonly keep a backgrounded tab's sessionStorage alive indefinitely).
  lastHiddenAt: "financial-tracker-last-hidden-at",
};

// Stay-unlocked ("session" mode): how long the app may sit backgrounded or
// idle before it's force-locked, requiring the password again.
export const STAY_UNLOCKED_INACTIVITY_MS = 5 * 60 * 1000;

export const dateFormatOptions: { value: DateFormatOption; label: string; example: string }[] = [
  { value: "dd/mm/yyyy", label: "DD/MM/YYYY", example: "25/12/2024" },
  { value: "mm/dd/yyyy", label: "MM/DD/YYYY", example: "12/25/2024" },
  { value: "yyyy-mm-dd", label: "YYYY-MM-DD", example: "2024-12-25" },
  { value: "dd-mmm-yyyy", label: "DD-Mon-YYYY", example: "25-Dec-2024" },
];

export const DEFAULT_CATEGORIES = [
  'Salary', 'Freelance', 'Investment Returns', 'Gifts Received', 'Refunds', 'Other Income',
  'Donations', 'Restaurant & Takeaway', 'AfterPay', 'Vehicle Expenses', 'Transport & Parking',
  'Bills & Services', 'BNPL', 'Grocery', 'Investment', 'Transfers', 'Retail Shopping',
  'Flights', 'Gambling', 'Accommodation', 'Attractions & Events', 'Clothing & Personal Life',
  'Education', 'Cafes & Coffees', 'Health & Medical', 'Subscriptions', 'Fitness', 'Hobbies',
  'Home Stuff', 'Fuel', 'Entertainment', 'Travel', 'Fees & Charges', 'Uncategorized',
];

export const VIBRANT_COLORS = [
  'rgba(59, 130, 246, 0.7)',   // blue
  'rgba(239, 68, 68, 0.7)',    // red
  'rgba(34, 197, 94, 0.7)',    // green
  'rgba(168, 85, 247, 0.7)',   // purple
  'rgba(249, 115, 22, 0.7)',   // orange
  'rgba(236, 72, 153, 0.7)',   // pink
  'rgba(20, 184, 166, 0.7)',   // teal
  'rgba(234, 179, 8, 0.7)',    // yellow
  'rgba(99, 102, 241, 0.7)',   // indigo
  'rgba(6, 182, 212, 0.7)',    // cyan
  'rgba(244, 63, 94, 0.7)',    // rose
  'rgba(132, 204, 22, 0.7)',   // lime
  'rgba(217, 70, 239, 0.7)',   // fuchsia
  'rgba(251, 146, 60, 0.7)',   // amber
  'rgba(45, 212, 191, 0.7)',   // emerald
  'rgba(156, 163, 175, 0.7)',  // gray
];

export const VIBRANT_BORDERS = VIBRANT_COLORS.map(c => c.replace('0.7)', '1)'));

// ── Chart series colors (fixed, readable on any DaisyUI theme) ──
export const INCOME_COLOR = { bg: 'rgba(34, 197, 94, 0.6)', border: 'rgba(34, 197, 94, 1)' };
export const SPENDING_COLOR = { bg: 'rgba(239, 68, 68, 0.6)', border: 'rgba(239, 68, 68, 1)' };
export const BALANCE_COLOR = { bg: 'rgba(59, 130, 246, 0.6)', border: 'rgba(59, 130, 246, 1)' };

// --- Auto-categorisation rules ---
export const PRESET_CATEGORY_RULES: Array<{ re: RegExp; category: string }> = [
  // Restaurants & takeaway
  {
    re: /(mcdonald'?s|kfc|subway|domino'?s|hungry\s*jack'?s|nando'?s|oporto|red\s*rooster|grill'?d|mad\s*mex|pizza\s*hut|ubereats|deliveroo|doordash)/i,
    category: "Restaurant & Takeaway",
  },
  // Grocery
  { re: /(woolworths|woolies|coles|aldi|iga|costco)/i, category: "Grocery" },
];

// --- Auto-tagging rules (merchant → tag), optionally scoped by category ---
export const PRESET_TAG_RULES: Array<{ re: RegExp; tag: string; category?: string }> =
  [
    // Grocery merchants
    { re: /\baldi\b/i, tag: "aldi", category: "Grocery" },
    { re: /\bcoles\b/i, tag: "coles", category: "Grocery" },
    { re: /\bwoolworths|woolies\b/i, tag: "woolworths", category: "Grocery" },
    { re: /\biga\b/i, tag: "iga", category: "Grocery" },
    { re: /\bcostco\b/i, tag: "costco", category: "Grocery" },
    { re: /\bubereats\b/i, tag: "ubereats", category: "Restaurant & Takeaway" },
    {
      re: /\bdeliveroo\b/i,
      tag: "deliveroo",
      category: "Restaurant & Takeaway",
    },
    { re: /\bdoordash\b/i, tag: "doordash", category: "Restaurant & Takeaway" },
    {
      re: /\bmcdonald'?s\b/i,
      tag: "mcdonalds",
      category: "Restaurant & Takeaway",
    },
    { re: /\bkfc\b/i, tag: "kfc", category: "Restaurant & Takeaway" },
    // Health & Medical
    { re: /(chemist\s*warehouse|pharmacy|chemists?)/i, tag: "chemist", category: "Health & Medical" },
    { re: /(aami|nrma|allianz|bupa|medibank|hbf)/i, tag: "insurance", category: "Insurance" },
  ];
