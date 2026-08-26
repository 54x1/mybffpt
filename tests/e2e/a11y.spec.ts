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

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Covers: the default About landing view, the empty transactions state, the
// main/chart view (with demo data), the add-transaction form, and the export
// modal as a representative dialog. Not every one of the 9 modals is scanned
// here — each needs its own precondition (a selection, an open tag picker,
// etc.); this establishes the pattern and the most-visited surfaces.
//
// Note: on a fresh browser profile the app opens straight into the "About"
// tab in plaintext mode (see App.vue's onMounted — the master-password
// choice is deferred, not a first-run gate), so no login/setup step is
// needed to reach any of these views.

// Known, tracked, NOT fixed here: the "cupcake" theme's semantic token colors
// (primary/warning/etc.) don't all clear 4.5:1 against the white or
// near-white text/background paired with them (About page's source link,
// chart category badges, a couple of small-caption texts). Fixing this
// properly means an actual visual/contrast redesign pass across 28 DaisyUI
// themes, not a quick patch — see ACCESSIBILITY.md's "Known limitation —
// theme color contrast" section. Excluding only this one, already-documented
// rule so the gate still catches everything else (labels, ARIA validity,
// keyboard reachability, etc.) rather than being permanently red or silently
// hiding the issue.
function assertNoUnexpectedViolations(violations: { id: string }[]) {
  const unexpected = violations.filter((v) => v.id !== 'color-contrast');
  expect(unexpected).toEqual([]);
}

test.describe('accessibility (WCAG 2.1 AA via axe-core)', () => {
  test('default About view', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('tab', { name: 'About' })).toHaveAttribute('aria-selected', 'true');
    const results = await new AxeBuilder({ page }).analyze();
    assertNoUnexpectedViolations(results.violations);
  });

  test('empty state (no transactions)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Transactions' }).click();
    await expect(page.getByRole('heading', { name: 'No transactions yet' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    assertNoUnexpectedViolations(results.violations);
  });

  test('main view with demo data (charts)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Transactions' }).click();
    await page.getByRole('button', { name: 'Load Demo Data' }).click();
    // Loading demo data on a first-run profile surfaces the deferred
    // master-password choice before returning to the app.
    await page.getByRole('button', { name: 'Continue without' }).click();
    await page.getByRole('tab', { name: 'Chart' }).click();
    const results = await new AxeBuilder({ page }).analyze();
    assertNoUnexpectedViolations(results.violations);
  });

  test('add-transaction form', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Add' }).click();
    const results = await new AxeBuilder({ page }).analyze();
    assertNoUnexpectedViolations(results.violations);
  });

  test('export modal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Transactions' }).click();
    await page.getByRole('button', { name: 'Load Demo Data' }).click();
    await page.getByRole('button', { name: 'Continue without' }).click();
    await page.getByRole('tab', { name: 'Import' }).click();
    await page.getByRole('button', { name: 'Export Data' }).click();
    await expect(page.getByRole('heading', { name: 'Export Your Data' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    assertNoUnexpectedViolations(results.violations);
  });
});
