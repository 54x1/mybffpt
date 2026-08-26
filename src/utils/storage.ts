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

import { devWarn } from "./debug";

// ========== STORAGE UTILITIES ==========

// M1: sensitive keys (transactions/categories/tags) are encrypted at rest.
// `secureStorage.ts` registers a predicate + async write hook here so that the
// existing synchronous `safeLocalStorageSet` call sites transparently route
// sensitive writes through AES-GCM encryption — without any call-site changes
// and without a circular import (storage never imports secureStorage).
type SensitiveWriteHook = (key: string, value: any) => void;
let sensitiveKeyPredicate: ((key: string) => boolean) | null = null;
let sensitiveWriteHook: SensitiveWriteHook | null = null;

/** Register which keys are sensitive and how to persist them (encrypted). */
export function registerSensitiveStorage(
  predicate: (key: string) => boolean,
  writeHook: SensitiveWriteHook
): void {
  sensitiveKeyPredicate = predicate;
  sensitiveWriteHook = writeHook;
}

export function safeLocalStorageGet(key: string): any {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    devWarn(`Failed to read from localStorage key "${key}":`, e);
    return null;
  }
}

export function safeLocalStorageSet(key: string, value: any): void {
  // Sensitive keys are handled by the registered (async, encrypted) hook.
  if (sensitiveKeyPredicate && sensitiveWriteHook && sensitiveKeyPredicate(key)) {
    sensitiveWriteHook(key, value);
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    devWarn(`Failed to write to localStorage key "${key}":`, e);
  }
}
