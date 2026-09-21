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

// Copies tesseract.js runtime assets from node_modules into public/ocr so
// OCR works fully offline / CSP-'self'-only (no CDN fetches). Run after
// `npm install` (wired as postinstall) — files are committed-free: public/ocr
// is generated, gitignored.
//
// What lands in public/ocr:
//   worker.min.js                              tesseract web-worker script
//   tesseract-core-{,simd-,relaxedsimd-}lstm.wasm.js
//     LSTM cores; the worker feature-detects SIMD support and importScripts()
//     exactly one of these (all three ship so any browser works offline).
//   eng.traineddata.gz                         best-int English model (~1.5 MB)

import { cpSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/ocr");

const copies = [
  [require.resolve("tesseract.js/dist/worker.min.js"), "worker.min.js"],
  [
    require.resolve("tesseract.js-core/tesseract-core-lstm.wasm.js"),
    "tesseract-core-lstm.wasm.js",
  ],
  [
    require.resolve("tesseract.js-core/tesseract-core-simd-lstm.wasm.js"),
    "tesseract-core-simd-lstm.wasm.js",
  ],
  [
    require.resolve(
      "tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js",
    ),
    "tesseract-core-relaxedsimd-lstm.wasm.js",
  ],
  [
    require.resolve("@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz"),
    "eng.traineddata.gz",
  ],
];

mkdirSync(outDir, { recursive: true });
for (const [src, name] of copies) {
  cpSync(src, resolve(outDir, name));
  console.log(`ocr asset: ${name}`);
}
console.log(`public/ocr ready (${copies.length} files)`);
