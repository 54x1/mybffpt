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

// Note: share.ts and secureStorage.ts rely on Web Crypto (PBKDF2 + AES-GCM).
// Node ≥20.19 (see package.json `engines`) exposes `globalThis.crypto.subtle`
// natively, so no polyfill is needed here.

// Node's built-in (experimental) `localStorage` — the one that emits the
// `--localstorage-file` warning — shadows jsdom's and exposes NO methods
// (setItem/getItem/clear are all undefined). secureStorage.ts and storage.ts
// call those methods directly, so install a spec-shaped in-memory Storage on
// both globalThis and window when the ambient one is incomplete.
function installLocalStorage() {
  const store = new Map<string, string>();
  const api = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  const target = globalThis as any;
  Object.defineProperty(target, "localStorage", {
    value: api,
    writable: true,
    configurable: true,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      value: api,
      writable: true,
      configurable: true,
    });
  }
}

if (
  typeof localStorage === "undefined" ||
  typeof (localStorage as any).setItem !== "function"
) {
  installLocalStorage();
}

// jsdom implements neither API. Both are used directly (not through a
// composable) by DatePicker.vue, ChartsSection.vue and useTheme-adjacent
// prefers-reduced-motion checks, and by Chart.js's canvas resize handling —
// so any component test that mounts them needs these polyfilled up front.

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
