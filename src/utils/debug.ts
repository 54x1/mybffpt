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

// ==== Debug helpers ====
export const DEBUG_IMPORT = (import.meta as any).env.MODE === 'development';
export const dbg = (...a: any[]) => DEBUG_IMPORT && console.log("[import]", ...a);
export const dbgw = (...a: any[]) => DEBUG_IMPORT && console.warn("[import]", ...a);
export const dbge = (...a: any[]) => DEBUG_IMPORT && console.error("[import]", ...a);
export const dbgg = (label: string) => {
  if (DEBUG_IMPORT) console.group(label);
};
export const dbgge = () => {
  if (DEBUG_IMPORT) console.groupEnd();
};

// Generic (unprefixed) dev-only logging for call sites outside the import
// pipeline — keeps production consoles quiet without an "[import]" tag that
// wouldn't make sense there.
export const devLog = (...a: any[]) => DEBUG_IMPORT && console.log(...a);
export const devWarn = (...a: any[]) => DEBUG_IMPORT && console.warn(...a);
export const devError = (...a: any[]) => DEBUG_IMPORT && console.error(...a);

export function sample<T>(arr: T[], n = 3): T[] {
  return arr.slice(0, Math.max(0, Math.min(n, arr.length)));
}
