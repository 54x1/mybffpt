# Accessibility

mybffpt targets **WCAG 2.1 AA**. This document records the current commitment, what's covered, known limitations, and how to report an issue.

## What's already in place

- **Modals**: all 12 dialogs use native `<dialog>` + `showModal()`, which gives focus trapping, Escape-to-close, and top-layer stacking for free. All carry explicit `aria-modal="true"` and `aria-labelledby`. Focus now returns to whatever triggered the dialog when it closes (`src/composables/useDialogA11y.ts`) — as of the 2026-09-22 deep audit this includes the two Add-form manager/rename dialogs that the first pass missed.
- **Toasts**: the toast stack (`App.vue`) uses `aria-live="polite"`, `aria-atomic="true"`, and `role="status"`/`role="alert"` (errors) per toast.
- **Charts**: `ChartsSection.vue` gives Chart.js canvases and the D3 bubble map a dynamic `aria-label`/`aria-describedby`, plus a real `<table>` "Balance sheet" fallback view for a structured non-visual alternative.
- **Motion**: both the Chart.js entrance animation and the D3 zoom transition check `prefers-reduced-motion` and drop their duration to `0` when set. `style.css` also disables CSS transitions/animations globally under the same media query.
- **Keyboard**: a "Skip to main content" link, visible focus rings (`.focus-ring`), and tab/tabpanel wiring (`role="tab"`/`role="tabpanel"`/`aria-controls`/`aria-selected`) across the main navigation. The onboarding overlay moves focus into itself when it opens.

## Fixed during this pass

Running `@axe-core/playwright` against the app surfaced (and this pass fixed):

- **Unlabeled FAQ toggles** (`AboutSection.vue`): the 6 collapse checkboxes in the Security & Privacy FAQ had no accessible name. Each now has `aria-labelledby` pointing at its `collapse-title`.
- **Dangling `aria-controls`**: the "Transactions" and "Chart" tab buttons reference `panel-transactions`/`panel-chart`, but on a fresh install (zero transactions) those panels don't render — `EmptyStateHero` takes their place without carrying the matching `id`/`role="tabpanel"`. Fixed by giving `EmptyStateHero` an `active-tab` prop and rendering the correct `id`/`aria-labelledby` for whichever tab it's standing in for.
- **Keyboard-unreachable chart-type switcher** (`ChartsSection.vue`): the 7 chart-type buttons are `<label>`s wrapping a `display:none` (`hidden`) radio input — `display:none` removes an element from both the tab order and the accessibility tree, so these were mouse/touch-only. Changed the input's class from `hidden` to `sr-only` (visually hidden, still focusable/keyboard-operable), added a `:has()`-based focus ring in `style.css` so keyboard focus is visible on the label, and removed the `aria-pressed` attribute each label also carried (invalid on a non-widget `<label>`; native radio `:checked` state already conveys the same thing and axe flagged it as a critical `aria-allowed-attr` violation).
- **Two low-contrast text elements**: the header's small-caps tagline (`text-base-content/40` → `/70`) and the "no tags selected" placeholder in the tag picker (`opacity-60` → `opacity-80`), both now clear 4.5:1.

## Fixed during the 2026-09-22 deep audit

A deeper pass (`tests/e2e/a11y-deep.spec.ts`, full record in
[`docs/compliance/AUDIT_A11Y_2026-09-22.md`](docs/compliance/AUDIT_A11Y_2026-09-22.md))
scanned every modal and view the baseline gate missed and fixed:

- **Dangling `aria-controls` during onboarding** (`AppHeader.vue`, axe-critical): while the tour overlay is open, no tab panel is mounted, so every header tab's `aria-controls="panel-*"` referenced a nonexistent element. The attribute is now omitted while the overlay is showing (new `tourOpen` prop).
- **Unlabeled share-code input** (`ShareCodeModal.vue`, axe-serious): the readonly code field in the Share Codes result modal had no accessible name — added `aria-label="Share code"`.
- **Two Add-form dialogs missed by the dialog pass** (`AddTransactionForm.vue`): "Manage Categories/Tags" and "Update References?" lacked `aria-modal`, `aria-labelledby`, and focus-return. All three now in place via `useDialogA11y`.
- **Space activation missing** (`BulkEditModal.vue`, WCAG 2.1.1): the tag-removal `role="button"` span handled Enter but not Space. Both now work.
- **Onboarding overlay never took focus** (`OnboardingHero.vue`): it is a custom fixed-position `role="dialog"` (not native `<dialog>`) and nothing focused it on open, so screen readers/keyboard users stayed behind the overlay. The dialog element itself is now `tabindex="-1"` and focused in `onMounted`. Converting it to a native `<dialog>` (free focus trap) remains a follow-up.

## Known limitation — theme color contrast

Automated scanning found that the **`cupcake` theme's `primary`/`link-primary` color** (`#65c3c8`) has a contrast ratio of only **1.93:1** against the light background (`#faf7f5`) for normal-weight text — well under the 4.5:1 AA threshold. This shows up on the About page's source-code link and likely recurs anywhere else `link-primary`/`text-primary` is used on a light background across the app's other themes.

The same root cause shows up in the chart category/tag badges (`getCategoryColor()` in `src/utils/themeColors.ts`): selected badges pair fixed white text with a theme token color (`primary`, `warning`, `success`, etc.) at 88% opacity, and several of those pairings — `warning` (`#ffbe00`) against white is the worst, at 1.66:1 — fall well short of 4.5:1. A proper fix likely means computing per-swatch text color from background luminance (black vs. white) rather than hardcoding white, but that's a visual change to a widely-visible chart legend across 28 themes and deserves its own pass with actual visual QA, not a blind patch here.

This isn't a one-line fix: `primary` and the other semantic tokens are brand colors used throughout the UI (buttons, badges, accents, links), and DaisyUI ships 28 selectable themes here, each with its own palette. Changing token values, or how text color is chosen against them, is a design decision, not a code fix, and needs a per-theme contrast audit (step 31 in the original audit plan) before anything changes. Tracked as open follow-up work; not fixed in this pass.

**Also noted, not fixed**: two ~200ms opacity/stroke-width hover transitions in the D3 bubble-map chart (`ChartsSection.vue`, mouseenter/mouseleave) aren't gated by `prefers-reduced-motion`, unlike the chart's entrance animation and zoom transition. Low priority — brief hover feedback, not auto-playing or large-scale motion — but listed here for completeness.

## Known gaps — composite-widget keyboard patterns (2026-09-22 audit)

These are functional-but-unpolished: every control is reachable and operable with Tab/Enter/Escape, but they don't implement the ARIA Authoring Practices Guide arrow-key patterns that screen-reader users expect. Each is a component rewrite rather than an attribute fix, so they're documented instead of blind-patched:

- **Filter-Logic radiogroup** (`AdvancedSettingsModal.vue`): `role="radio"` buttons without roving tabindex/arrow keys — Tab visits each radio individually.
- **Header date-format/theme pickers** (`AppHeader.vue`): `role="listbox"` buttons without arrow-key navigation.
- **Transactions dropdown menus** (`TransactionsSection.vue`): `details.dropdown` with `role="menu"`/`menuitem` but no menu-pattern arrow keys (native `<summary>` still gives Enter/Space open, Escape close).
- **Dead code**: `TagPickerModal.vue` is unreachable — nothing in the app ever opens it (`tagPicker.open` is only ever set to `false`). Flagged for deletion in a cleanup pass.

axe does not detect any of these (they're interaction-pattern gaps, not DOM violations), which is exactly why the manual walkthrough below still matters.

## Automated testing

`npm run a11y` runs `@axe-core/playwright` against **every user-facing surface** and is part of `npm run verify` and the CI workflow:

- `tests/e2e/a11y.spec.ts` (baseline): default About view, empty-transactions state, main/chart view with demo data, add-transaction form, export modal.
- `tests/e2e/a11y-deep.spec.ts` (added 2026-09-22): Smart Select, Bulk Edit, Encrypted Share → Share Codes result, Password Prompt, Advanced chart settings, Manage Categories, Rename confirmation, Label Import, PDF statement column mapper, and the onboarding overlay. Each test seeds the exact precondition for its modal, so regressions in any dialog fail CI.

All 15 scans pass with only `color-contrast` excluded (the documented theme limitation above) — every other axe violation fails the build.

## Not automatable

An automated scanner doesn't catch everything. Two things still need a human pass and aren't claimed as done here:

- A full keyboard-only walkthrough of the app (add transaction, edit, export, share, theme switch)
- A screen reader smoke test (NVDA or VoiceOver) on modals, toasts, and the charts section

## Reporting an accessibility issue

Open a [GitHub Issue](https://github.com/54x1/mybffpt/issues) describing the problem, the page/component, and (if possible) the assistive technology or automated tool that surfaced it.
