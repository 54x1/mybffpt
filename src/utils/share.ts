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

import { devError } from "./debug";

// ===== Base64 helpers (UTF-8 safe, no argument-spread) =====
//
// `String.fromCharCode(...bytes)` spreads the whole array as function
// arguments and throws `RangeError` past ~124KB (V8 arg limit) — which broke
// encryption for batches of ~536+ transactions. These helpers encode/decode in
// fixed-size chunks and round-trip arbitrary UTF-8 (emoji, etc.) via
// TextEncoder/TextDecoder instead of raw `btoa`/`atob` on a JSON string.

/** Encode a byte array to base64 without spreading the array as arguments. */
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000; // 32KB — well under the argument-spread limit
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]);
  }
  return btoa(bin);
}

/** Decode a base64 string to a byte array (inverse of `bytesToBase64`). */
export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** UTF-8-safe base64 of a JSON-serialisable value (inverse: `base64ToJson`). */
export function jsonToBase64(value: unknown): string {
  return bytesToBase64(new Uint8Array(new TextEncoder().encode(JSON.stringify(value))));
}

/** Inverse of `jsonToBase64`. */
export function base64ToJson<T = any>(b64: string): T {
  const bytes = base64ToBytes(b64);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

// ===== Share-code encryption & expiration =====

export async function encryptSharePayload(password: string, data: any): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 600000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(data))
  );

  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return bytesToBase64(combined);
}

export async function decryptShareData(password: string, encryptedBase64: string): Promise<any> {
  try {
    const combined = base64ToBytes(encryptedBase64);
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 600000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  } catch (error) {
    devError("Decryption failed:", error);
    throw new Error("Invalid password or corrupted data");
  }
}

export function addExpirationToShareData(data: any, days: number): any {
  const expirable = { ...data };
  if (days > 0) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);
    expirable.exp = expirationDate.toISOString();
  }
  return expirable;
}

export function checkShareCodeExpiration(data: any): boolean {
  if (!data.exp) return true; // No expiration set
  const expirationDate = new Date(data.exp);
  return expirationDate > new Date();
}

// ===== Password-protected file export =====
//
// Reuses the same PBKDF2-SHA256 @ 600k iters → AES-256-GCM pattern as the
// share-code helpers, but operates on raw UTF-8 text so it works for any
// export format (JSON / CSV / QIF). Output layout: salt(16) ‖ iv(12) ‖
// ciphertext.

const FILE_SALT_LEN = 16;
const FILE_IV_LEN = 12;
const FILE_PBKDF2_ITERATIONS = 600_000;

/**
 * Encrypt arbitrary text (CSV/QIF/JSON) with a password. Returns the raw
 * bytes `salt(16) ‖ iv(12) ‖ ciphertext` ready to be written to a file.
 */
export async function encryptFileContent(password: string, text: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const salt = crypto.getRandomValues(new Uint8Array(FILE_SALT_LEN));
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: FILE_PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(FILE_IV_LEN));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(text)
  );

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  return combined;
}

/**
 * Inverse of `encryptFileContent`. Throws on a wrong password or corrupted
 * data.
 */
export async function decryptFileContent(password: string, bytes: Uint8Array): Promise<string> {
  try {
    const salt = bytes.slice(0, FILE_SALT_LEN);
    const iv = bytes.slice(FILE_SALT_LEN, FILE_SALT_LEN + FILE_IV_LEN);
    const ciphertext = bytes.slice(FILE_SALT_LEN + FILE_IV_LEN);

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: FILE_PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    devError("File decryption failed:", error);
    throw new Error("Invalid password or corrupted file");
  }
}
