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
import { decodeHtmlEntities } from "./text";
import { parseDateGuess, todayLocalISO } from "./dates";
import { devWarn } from "./debug";

export const DEFAULT_SOURCE = "Unlabeled";

// Validate transaction schema to prevent code injection
export function validateTransactionSchema(tx: any): boolean {
  if (typeof tx !== 'object' || tx === null) return false;

  const MAX_LENGTH = 1000;
  const ALLOWED_TYPES = ['income', 'spending'];
  const ALLOWED_FREQUENCIES = ['daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'];

  if (tx.type && !ALLOWED_TYPES.includes(tx.type)) return false;
  if (tx.frequency && !ALLOWED_FREQUENCIES.includes(tx.frequency)) return false;
  if (tx.description && String(tx.description).length > MAX_LENGTH) return false;
  if (tx.category && String(tx.category).length > 200) return false;
  if (tx.source && String(tx.source).length > 100) return false;
  if (tx.amount !== undefined && (typeof tx.amount !== 'number' || !isFinite(tx.amount))) return false;
  if (tx.recursions && (typeof tx.recursions !== 'number' || tx.recursions < 1 || tx.recursions > 3650)) return false;
  if (tx.seriesId && (typeof tx.seriesId !== 'string' || tx.seriesId.length > 100)) return false;
  if (tx.tags && Array.isArray(tx.tags)) {
    if (tx.tags.length > 20) return false;
    for (const tag of tx.tags) {
      if (typeof tag !== 'string' || tag.length > 50) return false;
    }
  }

  // Decode any HTML entities that may have been double-encoded in previous saves
  const sanitize = (str: string): string => decodeHtmlEntities(str);
  if (tx.description) tx.description = sanitize(String(tx.description));
  if (tx.category) tx.category = sanitize(String(tx.category));
  if (tx.source) tx.source = sanitize(String(tx.source));
  if (Array.isArray(tx.tags)) tx.tags = tx.tags.map((tag: string) => sanitize(String(tag)));

  return true;
}

export function normalizeTransaction(raw: any): Transaction {
  if (!validateTransactionSchema(raw)) {
    devWarn("Invalid transaction data rejected:", raw);
    return {
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      date: todayLocalISO(),
      type: "spending",
      amount: 0,
      category: "Uncategorized",
      tags: [],
      description: "Invalid data",
      recurring: false,
      frequency: "monthly",
      recursions: 1,
      endDate: "",
      source: String(DEFAULT_SOURCE),
    };
  }
  return {
    id: String(raw?.id ?? `${Date.now()}-${Math.floor(Math.random() * 10000)}`),
    date: parseDateGuess(String(raw?.date ?? "")) || todayLocalISO(),
    type: raw?.type === "income" ? "income" : "spending",
    amount: Math.abs(Number(raw?.amount ?? 0)),
    category: decodeHtmlEntities(String(raw?.category ?? "Uncategorized")),
    tags: Array.isArray(raw?.tags) ? raw.tags.map(decodeHtmlEntities) : [],
    description: decodeHtmlEntities(String(raw?.description ?? "")),
    recurring: !!raw?.recurring,
    frequency: raw?.frequency || "monthly",
    recursions: Math.max(1, Number(raw?.recursions ?? 1)),
    endDate: String(raw?.endDate ?? ""),
    source: decodeHtmlEntities(String(raw?.source ?? DEFAULT_SOURCE)),
    seriesId: raw?.seriesId ? String(raw.seriesId) : undefined,
  };
}
