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

// Minimal ambient shims so e2e specs can use a handful of Node built-ins
// (fixture paths / one-shot fixture generation) without adding an
// @types/node dependency to this browser-only tsconfig — same rationale as
// the @ts-nocheck note in tests/pdfdiag.test.ts. Playwright runs specs on
// Node, so these exist at runtime; typing them as `any` keeps the rest of
// each spec (Playwright/axe APIs) fully type-checked.

declare module 'node:child_process' {
  export const execSync: (...args: unknown[]) => unknown;
}
declare module 'node:fs' {
  export const existsSync: (...args: unknown[]) => boolean;
  export const readFileSync: (...args: unknown[]) => unknown;
  export const writeFileSync: (...args: unknown[]) => void;
}
declare module 'node:path' {
  export const join: (...parts: string[]) => string;
  export const dirname: (p: string) => string;
}
declare module 'node:url' {
  export const fileURLToPath: (url: string | URL) => string;
}
