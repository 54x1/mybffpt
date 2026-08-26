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

import { ref, watch } from "vue";
import type { DateFormatOption } from "../utils/types";
import { LS_KEYS, dateFormatOptions } from "../utils/constants";
import { toLocalISO } from "../utils/dates";

// Module-scoped singleton: the chosen display format is app-wide state.
const selectedDateFormat = ref<DateFormatOption>(
  (localStorage.getItem(LS_KEYS.dateFormat) as DateFormatOption) || "dd/mm/yyyy"
);

// Persist on change
watch(selectedDateFormat, (fmt) => {
  localStorage.setItem(LS_KEYS.dateFormat, fmt);
});

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── The single formatDate function
function formatDate(iso?: string): string {
  if (!iso) return "";

  // Normalise to ISO if it isn't already
  let dateISO = iso;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const dt = new Date(iso);
    if (isNaN(+dt)) return iso;
    dateISO = toLocalISO(dt);
  }

  const [y, m, d] = dateISO.split("-");
  const month = Number(m);

  switch (selectedDateFormat.value) {
    case "dd/mm/yyyy":
      return `${d}/${m}/${y}`;
    case "mm/dd/yyyy":
      return `${m}/${d}/${y}`;
    case "yyyy-mm-dd":
      return dateISO;                          // already ISO
    case "dd-mmm-yyyy":
      return `${d}-${MONTHS_SHORT[month - 1]}-${y}`;
    default:
      return `${d}/${m}/${y}`;
  }
}

export function useDateFormat() {
  return { selectedDateFormat, dateFormatOptions, formatDate };
}
