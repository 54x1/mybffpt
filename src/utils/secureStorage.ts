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

// ===== M1: Encrypt the ledger at rest with a master password =====
//
// Reuses the same crypto pattern as share.ts (PBKDF2-SHA256 @ 600k iters →
// AES-256-GCM). A master password is set on first run; it derives an AES key
// that encrypts the sensitive localStorage keys (transactions, categories,
// tags). Only the KDF salt + a password *verifier* are stored in the clear —
// never the key or the plaintext.
//
// IMPORTANT: `crypto.subtle` only exists in a secure context (HTTPS or
// localhost). When it's unavailable we fall back to plaintext storage and the
// caller shows a warning banner (see `isSecureContextAvailable`).

import { LS_KEYS } from "./constants";
import { bytesToBase64, base64ToBytes } from "./share";
import { safeLocalStorageGet, safeLocalStorageSet, registerSensitiveStorage } from "./storage";
import { devWarn } from "./debug";

const PBKDF2_ITERATIONS = 600_000;
const SALT_LEN = 16;
const IV_LEN = 12;
const VERIFIER_PLAINTEXT = "mybffpt-secure-storage-verifier-v1";

// Sensitive keys that are encrypted at rest. Everything else (theme, tips,
// view, dateFormat, recent, lastCat, catsHidden, recurringDefaults, …) stays
// plaintext — it's non-sensitive UI state.
const SENSITIVE_KEYS = new Set<string>([LS_KEYS.tx, LS_KEYS.cats, LS_KEYS.tags]);

let activeKey: CryptoKey | null = null;
let secureDisabled = false;

/** True when the browser exposes Web Crypto (secure context). */
export function isSecureContextAvailable(): boolean {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

/** When true, `secureGet`/`secureSet` use plaintext storage (no crypto). */
export function setSecureDisabled(v: boolean): void {
  secureDisabled = v;
}

export function isSecureDisabled(): boolean {
  return secureDisabled;
}

/**
 * True when sensitive data should be stored in plaintext (no crypto): either
 * Web Crypto is unavailable (insecure context) or the user has not turned on
 * password protection (no master-password metadata present).
 */
function usePlaintext(): boolean {
  return secureDisabled || !isEncryptedStorePresent();
}

/** True once a master password has been set (meta present in localStorage). */
export function isEncryptedStorePresent(): boolean {
  try {
    return localStorage.getItem(LS_KEYS.meta) !== null;
  } catch {
    return false;
  }
}

/** True when the in-memory key is loaded (store unlocked). */
export function isUnlocked(): boolean {
  return activeKey !== null;
}

/** Drop the in-memory key. Call on "lock" / before switching accounts. */
export function lock(): void {
  activeKey = null;
}

// ===== Stay-unlocked (persistent) =====
//
// When the user opts in, we persist the raw AES key so the app can
// auto-unlock without re-prompting for the password. Three modes:
//   "off"     → never persist the key; always ask for the password.
//   "session" → key lives in sessionStorage: per-tab, cleared when the tab
//               closes (and separately force-cleared after a period of
//               inactivity — see inactivityLock.ts — since mobile browsers
//               often keep a backgrounded tab's sessionStorage alive
//               indefinitely rather than tearing it down).
//   "device"  → key lives in localStorage: persists until the user turns
//               it off, shared across tabs.
//
// SECURITY TRADEOFF (surfaced in the UI): storing the raw key in Web Storage
// means anyone with access to that storage can read the key and decrypt the
// data — this weakens encryption-at-rest. The user accepts this tradeoff;
// "session" mode bounds the exposure window, "device" does not.

export type StayUnlockedMode = "off" | "session" | "device";

/** Storage backend for the persisted key under the given mode. */
function storageFor(mode: StayUnlockedMode): Storage | null {
  if (mode === "session") return sessionStorage;
  if (mode === "device") return localStorage;
  return null;
}

/** Current stay-unlocked mode. Migrates the legacy "true"/"false" values. */
export function getStayUnlockedMode(): StayUnlockedMode {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LS_KEYS.stayUnlocked);
  } catch {
    return "off";
  }
  if (raw === "session" || raw === "device" || raw === "off") return raw;
  if (raw === "true") return "device"; // legacy boolean → preserve existing behavior
  return "off";
}

/** True for any mode other than "off". */
export function isAnyStayUnlocked(): boolean {
  return getStayUnlockedMode() !== "off";
}

/**
 * Set the stay-unlocked mode. Clears any key persisted under a *different*
 * mode's storage so a stale copy can't linger (e.g. switching device → off
 * removes the localStorage copy; switching device → session removes it too,
 * since the caller re-exports into sessionStorage afterward if unlocked).
 */
export function setStayUnlockedMode(mode: StayUnlockedMode): void {
  try {
    localStorage.setItem(LS_KEYS.stayUnlocked, mode);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
  for (const m of ["session", "device"] as const) {
    if (m === mode) continue;
    try {
      storageFor(m)?.removeItem(LS_KEYS.sessionKey);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Persist the current in-memory key (base64 raw) to the storage backend for
 * the active mode. No-op when mode is "off" or no key is loaded.
 */
export async function exportSessionKey(): Promise<void> {
  const storage = storageFor(getStayUnlockedMode());
  if (!activeKey || !storage) return;
  try {
    const raw = await subtle().exportKey("raw", activeKey);
    storage.setItem(LS_KEYS.sessionKey, bytesToBase64(new Uint8Array(raw)));
  } catch (e) {
    devWarn("Failed to export session key:", e);
  }
}

/**
 * Restore the persisted key (from the active mode's storage) into memory.
 * Returns true on success.
 */
export async function restoreSessionKey(): Promise<boolean> {
  const storage = storageFor(getStayUnlockedMode());
  if (!storage) return false;
  let b64: string | null = null;
  try {
    b64 = storage.getItem(LS_KEYS.sessionKey);
  } catch {
    return false;
  }
  if (!b64) return false;
  try {
    const bytes = base64ToBytes(b64);
    activeKey = await subtle().importKey(
      "raw",
      bytes,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    return true;
  } catch (e) {
    devWarn("Failed to restore session key:", e);
    activeKey = null;
    return false;
  }
}

/** Remove the persisted session key from both storage backends. */
export function clearSessionKey(): void {
  for (const m of ["session", "device"] as const) {
    try {
      storageFor(m)?.removeItem(LS_KEYS.sessionKey);
    } catch {
      /* ignore */
    }
  }
}

function subtle(): SubtleCrypto {
  if (!isSecureContextAvailable()) {
    throw new Error(
      "Secure storage requires a secure context (HTTPS or localhost) for Web Crypto."
    );
  }
  return crypto.subtle;
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const keyMaterial = await subtle().importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  // extractable: true — required so the stay-unlocked feature can persist the
  // raw key to localStorage (see exportSessionKey). The tradeoff (anyone with
  // browser access can read the key) is surfaced in the UI.
  return subtle().deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

async function encryptWithKey(key: CryptoKey, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const ct = await subtle().encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(value))
  );
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.length);
  return bytesToBase64(combined);
}

async function decryptWithKey(key: CryptoKey, b64: string): Promise<any> {
  const combined = base64ToBytes(b64);
  const iv = combined.slice(0, IV_LEN);
  const ct = combined.slice(IV_LEN);
  const pt = await subtle().decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}

/**
 * First run: derive a key from `password`, store the salt + a password
 * verifier under `LS_KEYS.meta`, and load the key into memory.
 */
export async function setupMasterPassword(password: string): Promise<void> {
  if (!isSecureContextAvailable()) throw new Error("Secure context required");
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const key = await deriveKey(password, salt);
  const verifier = await encryptWithKey(key, VERIFIER_PLAINTEXT);
  const meta = { v: 1, salt: bytesToBase64(salt), verifier };
  localStorage.setItem(LS_KEYS.meta, JSON.stringify(meta));
  activeKey = key;
  if (isAnyStayUnlocked()) await exportSessionKey();
}

/**
 * Returning user: re-derive the key from `password` and verify it against the
 * stored verifier. Throws on a wrong password.
 */
export async function unlock(password: string): Promise<void> {
  if (!isSecureContextAvailable()) throw new Error("Secure context required");
  const metaRaw = localStorage.getItem(LS_KEYS.meta);
  if (!metaRaw) throw new Error("No secure store found");
  const meta = JSON.parse(metaRaw);
  const salt = base64ToBytes(meta.salt);
  const key = await deriveKey(password, salt);
  let verifierPlain: string;
  try {
    verifierPlain = await decryptWithKey(key, meta.verifier);
  } catch {
    throw new Error("Incorrect password");
  }
  if (verifierPlain !== VERIFIER_PLAINTEXT) throw new Error("Incorrect password");
  activeKey = key;
  if (isAnyStayUnlocked()) await exportSessionKey();
}

/**
 * Read a sensitive key. Falls back to plaintext when secure storage is
 * disabled; otherwise requires an unlocked key and decrypts.
 */
export async function secureGet(key: string): Promise<any> {
  if (!SENSITIVE_KEYS.has(key)) return safeLocalStorageGet(key);
  if (usePlaintext()) return safeLocalStorageGet(key);
  if (!activeKey) throw new Error("Secure store is locked");
  const item = localStorage.getItem(key);
  if (!item) return null;
  try {
    return await decryptWithKey(activeKey, item);
  } catch (e) {
    devWarn(`Failed to decrypt "${key}":`, e);
    throw new Error("Failed to decrypt stored data");
  }
}

// Per-key write queue so rapid successive writes to the same key can't
// interleave and drop the last value (encryption is async).
const writeQueues = new Map<string, Promise<void>>();

/**
 * Write a sensitive key. Falls back to plaintext when secure storage is
 * disabled; otherwise requires an unlocked key and encrypts. Writes to the
 * same key are serialized so ordering is preserved.
 */
export function secureSet(key: string, value: any): Promise<void> {
  if (!SENSITIVE_KEYS.has(key)) {
    safeLocalStorageSet(key, value);
    return Promise.resolve();
  }
  if (usePlaintext()) {
    // Plaintext fallback. Write directly (NOT via safeLocalStorageSet, which
    // would re-route sensitive keys back into this hook → infinite recursion).
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      devWarn(`Failed to write to localStorage key "${key}":`, e);
    }
    return Promise.resolve();
  }
  if (!activeKey) return Promise.reject(new Error("Secure store is locked"));
  const aesKey = activeKey; // capture: TS can't narrow `activeKey` inside the closure
  const prev = writeQueues.get(key) ?? Promise.resolve();
  const next = prev.then(async () => {
    const b64 = await encryptWithKey(aesKey, value);
    localStorage.setItem(key, b64);
  });
  // Keep the chain alive even if this write fails, so later writes still run.
  writeQueues.set(key, next.catch(() => {}));
  return next;
}

/**
 * One-time migration: read any legacy plaintext sensitive data, then re-write
 * it encrypted under the freshly-set master password.
 */
export async function migratePlaintextToEncrypted(): Promise<void> {
  if (!activeKey) throw new Error("Set a master password first");
  for (const key of [LS_KEYS.tx, LS_KEYS.cats, LS_KEYS.tags]) {
    const raw = safeLocalStorageGet(key);
    if (raw === null || raw === undefined) continue;
    const b64 = await encryptWithKey(activeKey, raw);
    localStorage.setItem(key, b64);
  }
}

/**
 * True when password protection is available AND enabled (a master password
 * has been set). Used to decide whether to show the lock button / require an
 * unlock on load.
 */
export function isPasswordProtectionEnabled(): boolean {
  return isSecureContextAvailable() && isEncryptedStorePresent();
}

/**
 * Turn password protection ON. Derives a key from `password`, stores the salt
 * + verifier, and encrypts any existing plaintext sensitive data. Idempotent:
 * if a store already exists it simply unlocks with the given password.
 */
export async function enablePasswordProtection(password: string): Promise<void> {
  if (!isSecureContextAvailable()) throw new Error("Secure context required");
  if (isEncryptedStorePresent()) {
    await unlock(password);
    return;
  }
  await setupMasterPassword(password);
  await migratePlaintextToEncrypted();
}

/**
 * Turn password protection OFF. Decrypts the sensitive keys back to plaintext
 * (so no data is lost), removes the master-password metadata, and locks.
 * Requires an unlocked store (the key is needed to decrypt).
 */
export async function disablePasswordProtection(): Promise<void> {
  if (!isSecureContextAvailable()) throw new Error("Secure context required");
  if (!isEncryptedStorePresent()) return; // already off
  if (!activeKey) throw new Error("Unlock the store first");
  for (const key of [LS_KEYS.tx, LS_KEYS.cats, LS_KEYS.tags]) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const value = await decryptWithKey(activeKey, raw);
    localStorage.setItem(key, JSON.stringify(value));
  }
  localStorage.removeItem(LS_KEYS.meta);
  clearSessionKey();
  lock();
}

/** True when a key holds sensitive data that must be encrypted at rest. */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key);
}

// Register the sensitive-write hook so existing synchronous
// `safeLocalStorageSet` call sites transparently encrypt sensitive keys.
registerSensitiveStorage(isSensitiveKey, (key, value) => {
  secureSet(key, value).catch((e) => devWarn(`secureSet failed for "${key}":`, e));
});
