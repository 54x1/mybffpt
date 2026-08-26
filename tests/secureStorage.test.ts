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

import { describe, it, expect, beforeEach } from "vitest";
import { LS_KEYS } from "../src/utils/constants";
import { safeLocalStorageSet } from "../src/utils/storage";
import {
  setupMasterPassword,
  unlock,
  lock,
  secureGet,
  secureSet,
  isUnlocked,
  isEncryptedStorePresent,
  isSensitiveKey,
  setSecureDisabled,
  migratePlaintextToEncrypted,
  isPasswordProtectionEnabled,
  enablePasswordProtection,
  disablePasswordProtection,
  getStayUnlockedMode,
  setStayUnlockedMode,
  restoreSessionKey,
  clearSessionKey,
} from "../src/utils/secureStorage";

const PASSWORD = "master-password-123";

// jsdom's localStorage in this vitest build lacks `.clear()`, so remove keys
// manually. Snapshot the key list first (removing while iterating is unsafe).
function clearStorage(storage: Storage) {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k !== null) keys.push(k);
  }
  for (const k of keys) storage.removeItem(k);
}

beforeEach(() => {
  clearStorage(localStorage);
  clearStorage(sessionStorage);
  lock();
  setSecureDisabled(false);
});

describe("secureStorage — master password lifecycle", () => {
  it("sets up, encrypts, locks, and unlocks with the correct password", async () => {
    await setupMasterPassword(PASSWORD);
    expect(isEncryptedStorePresent()).toBe(true);
    expect(isUnlocked()).toBe(true);

    const tx = [
      { id: "t1", date: "2026-08-15", type: "spending", amount: 12.34, category: "Grocery" },
      { id: "t2", date: "2026-08-16", type: "income", amount: 2500, category: "Salary" },
    ];
    await secureSet(LS_KEYS.tx, tx);

    // At rest the value must be ciphertext (base64), not plaintext JSON.
    const raw = localStorage.getItem(LS_KEYS.tx);
    expect(raw).toBeTruthy();
    expect(() => JSON.parse(raw as string)).toThrow();

    lock();
    expect(isUnlocked()).toBe(false);

    await unlock(PASSWORD);
    expect(isUnlocked()).toBe(true);
    await expect(secureGet(LS_KEYS.tx)).resolves.toEqual(tx);
  });

  it("rejects a wrong password on unlock", async () => {
    await setupMasterPassword(PASSWORD);
    lock();
    await expect(unlock("wrong-password")).rejects.toThrow("Incorrect password");
    expect(isUnlocked()).toBe(false);
  });

  it("throws when reading a sensitive key while locked", async () => {
    await setupMasterPassword(PASSWORD);
    await secureSet(LS_KEYS.tx, [{ id: "t1" }]);
    lock();
    await expect(secureGet(LS_KEYS.tx)).rejects.toThrow("Secure store is locked");
  });

  it("rejects writes to sensitive keys while locked", async () => {
    await setupMasterPassword(PASSWORD);
    lock();
    await expect(secureSet(LS_KEYS.tx, [{ id: "t1" }])).rejects.toThrow(
      "Secure store is locked"
    );
  });

  it("throws on unlock when no store exists", async () => {
    await expect(unlock(PASSWORD)).rejects.toThrow("No secure store found");
  });
});

describe("secureStorage — non-sensitive keys pass through", () => {
  it("reads and writes non-sensitive keys as plaintext JSON", async () => {
    await setupMasterPassword(PASSWORD);
    await secureSet(LS_KEYS.theme, "dark");
    expect(localStorage.getItem(LS_KEYS.theme)).toBe(JSON.stringify("dark"));
    await expect(secureGet(LS_KEYS.theme)).resolves.toBe("dark");
  });

  it("classifies sensitive vs non-sensitive keys", () => {
    expect(isSensitiveKey(LS_KEYS.tx)).toBe(true);
    expect(isSensitiveKey(LS_KEYS.cats)).toBe(true);
    expect(isSensitiveKey(LS_KEYS.tags)).toBe(true);
    expect(isSensitiveKey(LS_KEYS.theme)).toBe(false);
    expect(isSensitiveKey(LS_KEYS.recent)).toBe(false);
  });
});

describe("secureStorage — plaintext fallback (insecure context)", () => {
  it("stores sensitive keys as plaintext when secure storage is disabled", async () => {
    setSecureDisabled(true);
    const tx = [{ id: "t1", amount: 5 }];
    await secureSet(LS_KEYS.tx, tx);
    expect(JSON.parse(localStorage.getItem(LS_KEYS.tx) as string)).toEqual(tx);
    await expect(secureGet(LS_KEYS.tx)).resolves.toEqual(tx);
  });
});

describe("secureStorage — migration", () => {
  it("migrates legacy plaintext data to ciphertext", async () => {
    // Simulate a pre-M1 plaintext store.
    const legacyTx = [{ id: "old-1", amount: 99.99 }];
    localStorage.setItem(LS_KEYS.tx, JSON.stringify(legacyTx));

    await setupMasterPassword(PASSWORD);
    await migratePlaintextToEncrypted();

    const raw = localStorage.getItem(LS_KEYS.tx);
    expect(() => JSON.parse(raw as string)).toThrow();
    await expect(secureGet(LS_KEYS.tx)).resolves.toEqual(legacyTx);
  });

  it("requires a master password before migrating", async () => {
    lock();
    await expect(migratePlaintextToEncrypted()).rejects.toThrow(
      "Set a master password first"
    );
  });
});

describe("secureStorage — optional password protection", () => {
  it("reports protection off when no store exists", () => {
    expect(isPasswordProtectionEnabled()).toBe(false);
  });

  it("enables protection, encrypts data, and reports it on", async () => {
    // Pre-existing plaintext data that should be encrypted on enable.
    const tx = [{ id: "t1", amount: 42 }];
    localStorage.setItem(LS_KEYS.tx, JSON.stringify(tx));

    await enablePasswordProtection(PASSWORD);

    expect(isPasswordProtectionEnabled()).toBe(true);
    expect(isEncryptedStorePresent()).toBe(true);
    // At rest the value must now be ciphertext.
    expect(() => JSON.parse(localStorage.getItem(LS_KEYS.tx) as string)).toThrow();
    await expect(secureGet(LS_KEYS.tx)).resolves.toEqual(tx);
  });

  it("disables protection, decrypting data back to plaintext", async () => {
    const tx = [{ id: "t1", amount: 42 }];
    await enablePasswordProtection(PASSWORD);
    await secureSet(LS_KEYS.tx, tx);

    // While enabled + unlocked, disable must decrypt back to plaintext.
    await disablePasswordProtection();

    expect(isPasswordProtectionEnabled()).toBe(false);
    expect(isEncryptedStorePresent()).toBe(false);
    expect(JSON.parse(localStorage.getItem(LS_KEYS.tx) as string)).toEqual(tx);
    // Store is locked after disabling; reads fall back to plaintext.
    expect(isUnlocked()).toBe(false);
    await expect(secureGet(LS_KEYS.tx)).resolves.toEqual(tx);
  });

  it("requires an unlocked store to disable protection", async () => {
    await enablePasswordProtection(PASSWORD);
    lock();
    await expect(disablePasswordProtection()).rejects.toThrow("Unlock the store first");
  });

  it("is idempotent when enabling with an existing store (just unlocks)", async () => {
    await enablePasswordProtection(PASSWORD);
    lock();
    // Re-enabling with the same password simply unlocks.
    await expect(enablePasswordProtection(PASSWORD)).resolves.toBeUndefined();
    expect(isUnlocked()).toBe(true);
  });
});

describe("secureStorage — stay-unlocked", () => {
  it("defaults to off", () => {
    expect(getStayUnlockedMode()).toBe("off");
  });

  it("migrates the legacy 'true'/'false' values", () => {
    localStorage.setItem(LS_KEYS.stayUnlocked, "true");
    expect(getStayUnlockedMode()).toBe("device");
    localStorage.setItem(LS_KEYS.stayUnlocked, "false");
    expect(getStayUnlockedMode()).toBe("off");
  });

  it("persists the preference and clears the key when turned off", () => {
    setStayUnlockedMode("device");
    expect(getStayUnlockedMode()).toBe("device");
    setStayUnlockedMode("off");
    expect(getStayUnlockedMode()).toBe("off");
    expect(localStorage.getItem(LS_KEYS.sessionKey)).toBeNull();
  });

  it("exports the session key on unlock when stay-unlocked (device) is on", async () => {
    setStayUnlockedMode("device");
    await setupMasterPassword(PASSWORD);
    // After setup the store is unlocked and the key should be persisted.
    expect(localStorage.getItem(LS_KEYS.sessionKey)).toBeTruthy();
  });

  it("restores the persisted key after a lock (auto-unlock path)", async () => {
    setStayUnlockedMode("device");
    await setupMasterPassword(PASSWORD);
    const tx = [{ id: "t1", amount: 7 }];
    await secureSet(LS_KEYS.tx, tx);

    lock();
    expect(isUnlocked()).toBe(false);

    // Simulate a fresh page load: restore the persisted key.
    await expect(restoreSessionKey()).resolves.toBe(true);
    expect(isUnlocked()).toBe(true);
    await expect(secureGet(LS_KEYS.tx)).resolves.toEqual(tx);
  });

  it("does not persist a key when stay-unlocked is off", async () => {
    setStayUnlockedMode("off");
    await setupMasterPassword(PASSWORD);
    expect(localStorage.getItem(LS_KEYS.sessionKey)).toBeNull();
  });

  it("clears the session key when protection is disabled", async () => {
    setStayUnlockedMode("device");
    await setupMasterPassword(PASSWORD);
    expect(localStorage.getItem(LS_KEYS.sessionKey)).toBeTruthy();
    await disablePasswordProtection();
    expect(localStorage.getItem(LS_KEYS.sessionKey)).toBeNull();
  });

  it("clearSessionKey removes the stored key", async () => {
    setStayUnlockedMode("device");
    await setupMasterPassword(PASSWORD);
    expect(localStorage.getItem(LS_KEYS.sessionKey)).toBeTruthy();
    clearSessionKey();
    expect(localStorage.getItem(LS_KEYS.sessionKey)).toBeNull();
  });

  it("'session' mode persists the key to sessionStorage, not localStorage", async () => {
    sessionStorage.removeItem(LS_KEYS.sessionKey);
    setStayUnlockedMode("session");
    await setupMasterPassword(PASSWORD);
    expect(sessionStorage.getItem(LS_KEYS.sessionKey)).toBeTruthy();
    expect(localStorage.getItem(LS_KEYS.sessionKey)).toBeNull();

    lock();
    await expect(restoreSessionKey()).resolves.toBe(true);
    expect(isUnlocked()).toBe(true);

    clearSessionKey();
    expect(sessionStorage.getItem(LS_KEYS.sessionKey)).toBeNull();
  });

  it("switching from 'device' to 'session' clears the localStorage copy", async () => {
    setStayUnlockedMode("device");
    await setupMasterPassword(PASSWORD);
    expect(localStorage.getItem(LS_KEYS.sessionKey)).toBeTruthy();

    setStayUnlockedMode("session");
    expect(localStorage.getItem(LS_KEYS.sessionKey)).toBeNull();
  });
});

describe("secureStorage — security hardening (Phase 4)", () => {
  it("routes sensitive writes through the registered hook (safeLocalStorageSet → secureSet)", async () => {
    await setupMasterPassword(PASSWORD);
    const tx = [{ id: "t1", amount: 5 }];

    // safeLocalStorageSet is the synchronous call site used across the app.
    // For a sensitive key it must divert to the encrypted hook, NOT write
    // plaintext JSON.
    safeLocalStorageSet(LS_KEYS.tx, tx);

    // The hook is async; give it a tick to encrypt + persist.
    await new Promise((r) => setTimeout(r, 50));

    const raw = localStorage.getItem(LS_KEYS.tx);
    expect(raw).toBeTruthy();
    // At rest it must be ciphertext (base64), not plaintext JSON.
    expect(() => JSON.parse(raw as string)).toThrow();
    await expect(secureGet(LS_KEYS.tx)).resolves.toEqual(tx);
  });

  it("leaves non-sensitive keys as plaintext via safeLocalStorageSet", () => {
    safeLocalStorageSet(LS_KEYS.theme, "dark");
    expect(localStorage.getItem(LS_KEYS.theme)).toBe(JSON.stringify("dark"));
  });

  it("serializes rapid concurrent secureSet writes to the same key (last write wins)", async () => {
    await setupMasterPassword(PASSWORD);
    const v1 = [{ id: "a" }];
    const v2 = [{ id: "b" }];
    const v3 = [{ id: "c" }];

    // Fire three writes back-to-back without awaiting; the per-key queue must
    // preserve ordering so the final value is the last one written.
    const p1 = secureSet(LS_KEYS.tx, v1);
    const p2 = secureSet(LS_KEYS.tx, v2);
    const p3 = secureSet(LS_KEYS.tx, v3);
    await Promise.all([p1, p2, p3]);

    await expect(secureGet(LS_KEYS.tx)).resolves.toEqual(v3);
  });

  it("migrates legacy plaintext cats and tags (not just tx)", async () => {
    const legacyCats = ["Grocery", "Utilities"];
    const legacyTags = ["coles", "anb"];
    localStorage.setItem(LS_KEYS.cats, JSON.stringify(legacyCats));
    localStorage.setItem(LS_KEYS.tags, JSON.stringify(legacyTags));

    await setupMasterPassword(PASSWORD);
    await migratePlaintextToEncrypted();

    // Both must now be ciphertext at rest.
    expect(() => JSON.parse(localStorage.getItem(LS_KEYS.cats) as string)).toThrow();
    expect(() => JSON.parse(localStorage.getItem(LS_KEYS.tags) as string)).toThrow();
    await expect(secureGet(LS_KEYS.cats)).resolves.toEqual(legacyCats);
    await expect(secureGet(LS_KEYS.tags)).resolves.toEqual(legacyTags);
  });

  it("restoreSessionKey returns false and leaves the store locked on a corrupted key", async () => {
    setStayUnlockedMode("device");
    await setupMasterPassword(PASSWORD);
    lock();

    // Corrupt the persisted key so importKey/decrypt can't use it.
    localStorage.setItem(LS_KEYS.sessionKey, "!!!not-valid-base64-key!!!");

    await expect(restoreSessionKey()).resolves.toBe(false);
    expect(isUnlocked()).toBe(false);
  });

  it("disablePasswordProtection is a no-op when data is already plaintext (no store)", async () => {
    // No master password set → no store. Disabling must not throw.
    await expect(disablePasswordProtection()).resolves.toBeUndefined();
    expect(isPasswordProtectionEnabled()).toBe(false);
  });
});
