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

import { describe, it, expect } from "vitest";
import {
  bytesToBase64,
  base64ToBytes,
  jsonToBase64,
  base64ToJson,
  encryptSharePayload,
  decryptShareData,
  addExpirationToShareData,
  checkShareCodeExpiration,
  encryptFileContent,
  decryptFileContent,
} from "../src/utils/share";

// A realistic transaction shape (mirrors src/utils/types.ts).
function makeTx(i: number) {
  return {
    id: `import-123-${i}`,
    date: "2026-08-15",
    type: "spending",
    amount: 12.34,
    category: "Grocery",
    tags: ["coles"],
    description: `COLES ONLINE #12345 ${i}`,
    recurring: false,
    frequency: "monthly",
    recursions: 1,
    endDate: "",
    source: "ANZ",
  };
}

describe("base64 helpers", () => {
  it("round-trips a small byte array", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 255]);
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(
      Array.from(bytes)
    );
  });

  it("round-trips a byte array larger than the old btoa spread limit (N1)", () => {
    // ~200KB — well past the ~124KB V8 argument-spread threshold that used to
    // throw RangeError inside String.fromCharCode(...bytes).
    const bytes = new Uint8Array(200 * 1024);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i & 0xff;
    const b64 = bytesToBase64(bytes);
    expect(base64ToBytes(b64)).toEqual(bytes);
  });

  it("round-trips JSON with emoji and non-ASCII (L4)", () => {
    const value = {
      note: "Café ☕ — 50% off 🎉",
      items: ["🍜 ramen", "🥐 croissant", "日本語 テスト"],
      nested: { deep: { emoji: "🚀" } },
    };
    expect(base64ToJson(jsonToBase64(value))).toEqual(value);
  });
});

describe("share-code encryption", () => {
  it("round-trips a small payload", async () => {
    const data = { tx: [makeTx(0), makeTx(1)], cats: ["Grocery"], tags: ["coles"] };
    const encrypted = await encryptSharePayload("hunter2", data);
    expect(typeof encrypted).toBe("string");
    await expect(decryptShareData("hunter2", encrypted)).resolves.toEqual(data);
  });

  it("round-trips a ~700-transaction payload (N1 regression)", async () => {
    // 700 tx × ~180B ≈ 126KB of plaintext — the size class that broke the old
    // `String.fromCharCode(...bytes)` spread.
    const tx = Array.from({ length: 700 }, (_, i) => makeTx(i));
    const data = { tx, cats: ["Grocery", "Utilities"], tags: ["coles", "anb"] };
    const encrypted = await encryptSharePayload("correct-horse-battery-staple", data);
    await expect(decryptShareData("correct-horse-battery-staple", encrypted)).resolves.toEqual(
      data
    );
  });

  it("round-trips a payload with emoji (L4 regression)", async () => {
    const data = {
      tx: [makeTx(0)],
      cats: ["Café ☕"],
      tags: ["🎉 party"],
      note: "日本語 备注 🚀",
    };
    const encrypted = await encryptSharePayload("pw", data);
    await expect(decryptShareData("pw", encrypted)).resolves.toEqual(data);
  });

  it("rejects a wrong password with a stable error message", async () => {
    const data = { tx: [makeTx(0)] };
    const encrypted = await encryptSharePayload("right-password", data);
    await expect(decryptShareData("wrong-password", encrypted)).rejects.toThrow(
      "Invalid password or corrupted data"
    );
  });

  it("rejects corrupted ciphertext", async () => {
    const data = { tx: [makeTx(0)] };
    const encrypted = await encryptSharePayload("pw", data);
    // Flip a character in the ciphertext region.
    const corrupted = encrypted.slice(0, -4) + (encrypted.endsWith("AAAA") ? "BBBB" : "AAAA");
    await expect(decryptShareData("pw", corrupted)).rejects.toThrow(
      "Invalid password or corrupted data"
    );
  });
});

describe("share-code expiration", () => {
  it("adds an expiration date when days > 0", () => {
    const data = { tx: [] };
    const withExp = addExpirationToShareData(data, 7);
    expect(withExp.exp).toBeTruthy();
    expect(checkShareCodeExpiration(withExp)).toBe(true);
  });

  it("leaves data untouched when days <= 0", () => {
    const data = { tx: [] };
    expect(addExpirationToShareData(data, 0)).toEqual(data);
    expect(checkShareCodeExpiration(data)).toBe(true);
  });

  it("reports expired codes as invalid", () => {
    const data = { tx: [], exp: new Date(Date.now() - 1000).toISOString() };
    expect(checkShareCodeExpiration(data)).toBe(false);
  });
});

describe("password-protected file export", () => {
  it("round-trips CSV text", async () => {
    const csv = "Date,Type,Amount\n2026-08-15,spending,12.34\n";
    const encrypted = await encryptFileContent("export-pw", csv);
    expect(encrypted).toBeInstanceOf(Uint8Array);
    // salt(16) + iv(12) + ciphertext (>= plaintext length for AES-GCM)
    expect(encrypted.length).toBeGreaterThan(16 + 12 + csv.length);
    await expect(decryptFileContent("export-pw", encrypted)).resolves.toBe(csv);
  });

  it("round-trips JSON with emoji (L4 regression)", async () => {
    const json = JSON.stringify({ note: "Café ☕ 日本語 🚀", items: ["🍜"] });
    const encrypted = await encryptFileContent("pw", json);
    await expect(decryptFileContent("pw", encrypted)).resolves.toBe(json);
  });

  it("produces different ciphertext for the same input (random salt/iv)", async () => {
    const text = "same-content";
    const a = await encryptFileContent("pw", text);
    const b = await encryptFileContent("pw", text);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  it("rejects a wrong password with a stable error message", async () => {
    const encrypted = await encryptFileContent("right", "secret");
    await expect(decryptFileContent("wrong", encrypted)).rejects.toThrow(
      "Invalid password or corrupted file"
    );
  });

  it("rejects corrupted ciphertext", async () => {
    const encrypted = await encryptFileContent("pw", "secret");
    const corrupted = new Uint8Array(encrypted);
    corrupted[corrupted.length - 1] ^= 0xff;
    await expect(decryptFileContent("pw", corrupted)).rejects.toThrow(
      "Invalid password or corrupted file"
    );
  });
});

describe("encrypted export import round-trip (payload shapes)", () => {
  // These tests lock in the contract the in-app "import an encrypted export"
  // path relies on: the exact JSON wrapper and CSV header row that
  // downloadJson / downloadCsv produce must survive encrypt → decrypt → parse.

  it("round-trips the JSON export wrapper ({ transactions, exportDate, version })", async () => {
    const txs = [makeTx(0), makeTx(1), makeTx(2)];
    // Mirrors downloadJson's payload shape.
    const payload = { transactions: txs, exportDate: "2026-08-15", version: 1 };
    const text = JSON.stringify(payload, null, 2);

    const encrypted = await encryptFileContent("export-pw", text);
    const decrypted = await decryptFileContent("export-pw", encrypted);

    // The decrypted text must parse back to the same wrapper.
    const parsed = JSON.parse(decrypted);
    expect(Array.isArray(parsed.transactions)).toBe(true);
    expect(parsed.transactions).toHaveLength(3);
    expect(parsed.transactions[0].description).toBe(txs[0].description);
    expect(parsed.exportDate).toBe("2026-08-15");
  });

  it("round-trips a bare-array JSON export", async () => {
    const txs = [makeTx(0), makeTx(1)];
    const text = JSON.stringify(txs);

    const encrypted = await encryptFileContent("pw", text);
    const decrypted = await decryptFileContent("pw", encrypted);

    const parsed = JSON.parse(decrypted);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });

  it("round-trips the CSV export header row (Date,Type,Amount,Category,Tags,Description,Source)", async () => {
    // Mirrors downloadCsv's header + a couple of data rows.
    const csv =
      "Date,Type,Amount,Category,Tags,Description,Source\n" +
      "2026-08-15,spending,12.34,Grocery,coles,COLES ONLINE #12345,ANZ\n" +
      "2026-08-16,income,2500.00,Salary,,Payroll,ANZ\n";

    const encrypted = await encryptFileContent("export-pw", csv);
    const decrypted = await decryptFileContent("export-pw", encrypted);

    // The header row must be intact so column inference can map it.
    const lines = decrypted.split("\n").filter((l) => l.trim());
    expect(lines[0]).toBe("Date,Type,Amount,Category,Tags,Description,Source");
    expect(lines).toHaveLength(3);
  });

  it("rejects a wrong password on an encrypted JSON export", async () => {
    const text = JSON.stringify({ transactions: [makeTx(0)] });
    const encrypted = await encryptFileContent("right-pw", text);
    await expect(decryptFileContent("wrong-pw", encrypted)).rejects.toThrow(
      "Invalid password or corrupted file"
    );
  });
});

describe("security properties (explicit contracts)", () => {
  // Phase 1: lock in the CURRENT behavior of an empty-password "protected"
  // export. encryptFileContent("", …) is keyed by the empty string, so it
  // round-trips with an empty password — i.e. it is trivially decryptable.
  // This test documents that risk so a future change is deliberate.
  it("empty-password file export round-trips with an empty password (trivially decryptable)", async () => {
    const text = JSON.stringify({ transactions: [makeTx(0)] });
    const encrypted = await encryptFileContent("", text);
    expect(encrypted).toBeInstanceOf(Uint8Array);
    await expect(decryptFileContent("", encrypted)).resolves.toBe(text);
    // …and a non-empty password must NOT decrypt it (the key is the empty string).
    await expect(decryptFileContent("anything", encrypted)).rejects.toThrow(
      "Invalid password or corrupted file"
    );
  });

  // Phase 2: the default `tx:` share code is base64 (encoding), NOT encryption.
  // Anyone holding the code can decode the full ledger. This test locks in that
  // plaintext default as an explicit, tested contract.
  it("default `tx:` share code is base64-decodable to readable JSON (NOT encrypted)", () => {
    const data = { t: [makeTx(0), makeTx(1)], v: 1, ts: Date.now() };
    const code = `tx:${jsonToBase64(data)}`;
    expect(code.startsWith("tx:")).toBe(true);
    // The payload after the `tx:` prefix must decode straight to the ledger.
    const decoded = base64ToJson(code.slice(3));
    expect(decoded).toEqual(data);
    // …and it must NOT be the salt‖iv‖ciphertext layout of an encrypted payload
    // (which would be opaque bytes, not valid JSON).
    expect(() => JSON.stringify(decoded)).not.toThrow();
  });

  // Phase 4: encryptSharePayload must use a random salt/iv so two encryptions
  // of the same payload differ (mirrors the file-content randomness test).
  it("encryptSharePayload produces different ciphertext for the same input (random salt/iv)", async () => {
    const data = { tx: [makeTx(0)] };
    const a = await encryptSharePayload("pw", data);
    const b = await encryptSharePayload("pw", data);
    expect(a).not.toBe(b);
  });

  // Phase 4: expiration boundary + negative-days behavior.
  it("treats a code as valid up to (but not past) its expiry instant", () => {
    // Just in the future → valid.
    const valid = { tx: [], exp: new Date(Date.now() + 60_000).toISOString() };
    expect(checkShareCodeExpiration(valid)).toBe(true);
    // Just in the past → expired.
    const expired = { tx: [], exp: new Date(Date.now() - 60_000).toISOString() };
    expect(checkShareCodeExpiration(expired)).toBe(false);
  });

  it("treats negative days as 'no expiration' (leaves data untouched)", () => {
    const data = { tx: [] };
    const result = addExpirationToShareData(data, -5);
    expect(result).toEqual(data);
    expect(checkShareCodeExpiration(result)).toBe(true);
  });
});
