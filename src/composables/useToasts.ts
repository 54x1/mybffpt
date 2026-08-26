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

import { ref } from "vue";
import type { ToastKind } from "../utils/types";

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

// Module-scoped singleton state: every component importing useToasts()
// shares the same toast list (Vue 3 "simple store" pattern).
const toasts = ref<Toast[]>([]);
let toastId = 1;

function pushToast(message: string, kind: ToastKind = "info", ms = 3500) {
  const id = toastId++;
  toasts.value.push({ id, message, kind });
  if (ms > 0) setTimeout(() => dismissToast(id), ms);
}

function dismissToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

export function useToasts() {
  return { toasts, pushToast, dismissToast };
}
