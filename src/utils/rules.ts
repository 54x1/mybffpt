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

import { PRESET_CATEGORY_RULES, PRESET_TAG_RULES } from "../utils/constants";
import { dedupeCI, sortAlpha } from "../utils/text";

// ========== AUTO-CATEGORISATION / AUTO-TAGGING ==========

export function autoCategoryFor(desc: string): string {
  const d = desc.toLowerCase();
  for (const { re, category } of PRESET_CATEGORY_RULES) {
    if (re.test(d)) return category;
  }
  return ""; // no hit → caller keeps existing/fallback
}

export function autoTagsFor(desc: string, category: string): string[] {
  const d = (desc || "").toLowerCase();
  const c = (category || "").toLowerCase();
  const out: string[] = [];
  for (const r of PRESET_TAG_RULES) {
    if (r.category && r.category.toLowerCase() !== c) continue;
    if (r.re.test(d)) out.push(r.tag);
  }
  return sortAlpha(dedupeCI(out));
}

export function autoMergeTags(existing: string[], add: string[]): string[] {
  if (!add?.length) return existing || [];
  return sortAlpha(dedupeCI([...(existing || []), ...add]));
}
