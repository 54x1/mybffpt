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

// Deep accessibility scan: every modal/view NOT covered by a11y.spec.ts.
// Each test drives the UI to open one surface (no state injection — real
// user flows only) and runs axe against it with the same filter as the
// baseline gate (color-contrast excluded; see ACCESSIBILITY.md).
//
// Surfaces: Smart Select, Bulk Edit, Encrypted Share, Share Codes result,
// Password Prompt (protection), Advanced Chart Settings, the Add-form's
// Manage Categories dialog, the rename-confirm dialog, Label Import (via a
// share code), the PDF statement column mapper, and the onboarding overlay.

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function assertNoUnexpectedViolations(violations: { id: string }[]) {
  const unexpected = violations.filter((v) => v.id !== 'color-contrast');
  expect(unexpected).toEqual([]);
}

async function scan(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  assertNoUnexpectedViolations(results.violations);
}

// Demo data + dismiss the deferred master-password choice, same flow as the
// baseline gate. Loading demo data auto-switches the app to the Chart tab,
// so click back to Transactions afterwards (Simple view).
async function seedDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Transactions' }).click();
  await page.getByRole('button', { name: 'Load Demo Data' }).click();
  await page.getByRole('button', { name: 'Continue without' }).click();
  await page.getByRole('tab', { name: 'Transactions' }).click();
}

// The "Manage categories" button lives inside the (closed by default)
// category details.dropdown — open the summary first, then click it.
async function openManagerFromAddForm(page: Page) {
  await page.getByRole('tab', { name: 'Add' }).click();
  await page.locator('summary[aria-label="Choose a category"]').click();
    // getByLabel would also match the manager dialog itself (its
    // aria-labelledby name) — scope to the button.
    await page.getByRole('button', { name: 'Manage categories' }).click();
}

// Switch the Transactions view pill to Advanced (default is Simple).
async function advancedView(page: Page) {
  await page.getByRole('tab', { name: 'Advanced' }).click();
}

test.describe('deep accessibility scan — modals & views', () => {
  test('Smart Select modal', async ({ page }) => {
    await seedDemo(page);
    await advancedView(page);
    await page.getByRole('button', { name: /Smart Select/ }).click();
    await expect(page.getByRole('heading', { name: 'Smart Select' })).toBeVisible();
    await scan(page);
  });

  test('Bulk Edit modal', async ({ page }) => {
    await seedDemo(page);
    await advancedView(page);
    // Two copies per row (mobile card + desktop table); only one is visible
    // at a time — pick the visible one.
    await page.locator('input[type="checkbox"][aria-label^="Select transaction"]:visible').first().click();
    await page.getByRole('button', { name: /Bulk Edit/ }).click();
    await expect(page.getByRole('heading', { name: /Bulk Edit/ })).toBeVisible();
    await scan(page);
  });

  test('Encrypted Share modal then Share Codes result modal', async ({ page }) => {
    await seedDemo(page);
    await page.getByRole('tab', { name: 'Import' }).click();
    await page.getByRole('button', { name: /Generate Share Code/ }).click();
    await expect(page.getByRole('heading', { name: 'Encrypt Share Data' })).toBeVisible();
    await scan(page);
    // Encryption is off by default, so Generate is enabled without a password.
    await page.getByRole('button', { name: 'Generate Share Codes' }).click();
    await expect(page.getByRole('heading', { name: 'Share Codes Generated' })).toBeVisible();
    await scan(page);
  });

  test('Password Prompt modal (enable protection)', async ({ page }) => {
    await page.goto('/');
    // Settings cog → expand the Security sub-menu → Password protection toggle.
    await page.locator('summary:has-text("Settings")').first().click();
    await page.locator('details.dropdown summary:has-text("Security")').click();
    await page.locator('#hdrPasswordProtection').click({ force: true });
    await expect(page.getByRole('heading', { name: /Set a master password/ })).toBeVisible();
    await scan(page);
    // Cancel without setting anything.
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('Advanced chart settings modal', async ({ page }) => {
    await seedDemo(page);
    await page.getByRole('tab', { name: 'Chart' }).click();
    await page.getByLabel('Open advanced settings').click();
    await expect(page.getByRole('heading', { name: 'Advanced Settings' })).toBeVisible();
    await scan(page);
  });

  test('Manage Categories dialog (Add form)', async ({ page }) => {
    await page.goto('/');
    await openManagerFromAddForm(page);
    await expect(page.getByRole('heading', { name: /Manage Categories/ })).toBeVisible();
    await scan(page);
  });

  test('Rename confirmation dialog (Add form manager)', async ({ page }) => {
    await seedDemo(page); // guarantees categories with usage counts > 0
    await openManagerFromAddForm(page);
    await expect(page.getByRole('heading', { name: /Manage Categories/ })).toBeVisible();
    await page.getByRole('button', { name: /^Rename/ }).first().click();
    const renameInput = page.locator('input[placeholder^="Rename"]');
    await renameInput.fill('Renamed Target');
    // The confirm button next to the rename input (icon-only).
    await renameInput.locator('xpath=following-sibling::button[1]').click();
    await expect(page.getByRole('heading', { name: /Update .* References/ })).toBeVisible();
    await scan(page);
  });

  test('Label Import modal (via share code import)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Import' }).click();
    const payload = {
      t: [
        {
          id: 'a1', date: '2026-01-15', type: 'spending', amount: 12.5,
          category: 'Groceries', tags: ['deep-scan'], description: 'Test item',
        },
      ],
    };
    await page.locator('#importUrl').fill(`tx:${btoa(JSON.stringify(payload))}`);
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Label this import/ })).toBeVisible();
    await scan(page);
  });

  test('PDF statement column mapper', async ({ page }) => {
    const fixture = join(ROOT, 'test-results', 'pdf-fixtures', 'cba-style.pdf');
    if (!existsSync(fixture)) {
      execSync('node scripts/make-test-statement.mjs', { cwd: ROOT });
    }
    await page.goto('/');
    await page.getByRole('tab', { name: 'Import' }).click();
    await page.locator('#csvUpload').setInputFiles(fixture);
    await expect(page.getByRole('heading', { name: /Map Statement Columns/ })).toBeVisible({ timeout: 30_000 });
    await scan(page);
  });

  test('Onboarding overlay (Get Started)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Get Started Now' }).click();
    await expect(page.getByRole('heading', { name: /get your data in/i })).toBeVisible();
    await scan(page);
  });
});
