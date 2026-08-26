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

// Verifies every relevant source file carries the AGPL SPDX header.
// Run via `npm run license:check`.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const CHECK_EXTENSIONS = new Set(['.ts', '.vue', '.css', '.js', '.html']);
const IGNORE_DIRS = new Set(['node_modules', 'dist', 'dist-ssr', '.git', 'coverage', 'playwright-report', 'test-results']);
const NEEDLE = 'SPDX-License-Identifier';

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.has(entry)) walk(full, files);
    } else if (CHECK_EXTENSIONS.has(extname(entry))) {
      files.push(full);
    }
  }
  return files;
}

const root = process.cwd();
const targets = walk(root);
const missing = targets.filter((f) => !readFileSync(f, 'utf8').includes(NEEDLE));

if (missing.length > 0) {
  console.error(`Missing SPDX license header in ${missing.length} file(s):`);
  for (const f of missing) console.error(`  - ${f.replace(root + '\\', '').replace(root + '/', '')}`);
  process.exit(1);
}

console.log(`License header check passed (${targets.length} files scanned).`);
