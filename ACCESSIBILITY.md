# Accessibility

mybffpt targets **WCAG 2.1 AA**. This document records the current commitment, what's covered, known limitations, and how to report an issue.

## What's already in place

- **Modals**: all 9 dialogs use native `<dialog>` + `showModal()`, which gives focus trapping, Escape-to-close, and top-layer stacking for free. All carry explicit `aria-modal="true"` and `aria-labelledby`. Focus now returns to whatever triggered the dialog when it closes (`src/composables/useDialogA11y.ts`).
- **Toasts**: the toast stack (`App.vue`) uses `aria-live="polite"`, `aria-atomic="true"`, and `role="status"`/`role="alert"` (errors) per toast.
- **Charts**: `ChartsSection.vue` gives Chart.js canvases and the D3 bubble map a dynamic `aria-label`/`aria-describedby`, plus a real `<table>` "Balance sheet" fallback view for a structured non-visual alternative.
- **Motion**: both the Chart.js entrance animation and the D3 zoom transition check `prefers-reduced-motion` and drop their duration to `0` when set. `style.css` also disables CSS transitions/animations globally under the same media query.
- **Keyboard**: a "Skip to main content" link, visible focus rings (`.focus-ring`), and tab/tabpanel wiring (`role="tab"`/`role="tabpanel"`/`aria-controls`/`aria-selected`) across the main navigation.

## Fixed during this pass

Running `@axe-core/playwright` against the app surfaced (and this pass fixed):

- **Unlabeled FAQ toggles** (`AboutSection.vue`): the 6 collapse checkboxes in the Security & Privacy FAQ had no accessible name. Each now has `aria-labelledby` pointing at its `collapse-title`.
- **Dangling `aria-controls`**: the "Transactions" and "Chart" tab buttons reference `panel-transactions`/`panel-chart`, but on a fresh install (zero transactions) those panels don't render — `EmptyStateHero` takes their place without carrying the matching `id`/`role="tabpanel"`. Fixed by giving `EmptyStateHero` an `active-tab` prop and rendering the correct `id`/`aria-labelledby` for whichever tab it's standing in for.
- **Keyboard-unreachable chart-type switcher** (`ChartsSection.vue`): the 7 chart-type buttons are `<label>`s wrapping a `display:none` (`hidden`) radio input — `display:none` removes an element from both the tab order and the accessibility tree, so these were mouse/touch-only. Changed the input's class from `hidden` to `sr-only` (visually hidden, still focusable/keyboard-operable), added a `:has()`-based focus ring in `style.css` so keyboard focus is visible on the label, and removed the `aria-pressed` attribute each label also carried (invalid on a non-widget `<label>`; native radio `:checked` state already conveys the same thing and axe flagged it as a critical `aria-allowed-attr` violation).
- **Two low-contrast text elements**: the header's small-caps tagline (`text-base-content/40` → `/70`) and the "no tags selected" placeholder in the tag picker (`opacity-60` → `opacity-80`), both now clear 4.5:1.

## Known limitation — theme color contrast

Automated scanning found that the **`cupcake` theme's `primary`/`link-primary` color** (`#65c3c8`) has a contrast ratio of only **1.93:1** against the light background (`#faf7f5`) for normal-weight text — well under the 4.5:1 AA threshold. This shows up on the About page's source-code link and likely recurs anywhere else `link-primary`/`text-primary` is used on a light background across the app's other themes.

The same root cause shows up in the chart category/tag badges (`getCategoryColor()` in `src/utils/themeColors.ts`): selected badges pair fixed white text with a theme token color (`primary`, `warning`, `success`, etc.) at 88% opacity, and several of those pairings — `warning` (`#ffbe00`) against white is the worst, at 1.66:1 — fall well short of 4.5:1. A proper fix likely means computing per-swatch text color from background luminance (black vs. white) rather than hardcoding white, but that's a visual change to a widely-visible chart legend across 28 themes and deserves its own pass with actual visual QA, not a blind patch here.

This isn't a one-line fix: `primary` and the other semantic tokens are brand colors used throughout the UI (buttons, badges, accents, links), and DaisyUI ships 28 selectable themes here, each with its own palette. Changing token values, or how text color is chosen against them, is a design decision, not a code fix, and needs a per-theme contrast audit (step 31 in the original audit plan) before anything changes. Tracked as open follow-up work; not fixed in this pass.

**Also noted, not fixed**: two ~200ms opacity/stroke-width hover transitions in the D3 bubble-map chart (`ChartsSection.vue`, mouseenter/mouseleave) aren't gated by `prefers-reduced-motion`, unlike the chart's entrance animation and zoom transition. Low priority — brief hover feedback, not auto-playing or large-scale motion — but listed here for completeness.

## Automated testing

`npm run a11y` runs `@axe-core/playwright` (`tests/e2e/a11y.spec.ts`) against: the default About view, the empty-transactions state, the main/chart view with demo data loaded, the add-transaction form, and the export modal. It's part of `npm run verify` and the CI workflow.

This doesn't cover all 9 modals — each has its own precondition to reach (a selection, an open tag picker, an active import) — so it establishes the pattern on the most-visited surfaces rather than being exhaustive. Extending it to the remaining modals is straightforward follow-up: seed the relevant state, open the modal, scan.

## Not automatable

An automated scanner doesn't catch everything. Two things still need a human pass and aren't claimed as done here:

- A full keyboard-only walkthrough of the app (add transaction, edit, export, share, theme switch)
- A screen reader smoke test (NVDA or VoiceOver) on modals, toasts, and the charts section

## Reporting an accessibility issue

Open a [GitHub Issue](https://github.com/54x1/mybffpt/issues) describing the problem, the page/component, and (if possible) the assistive technology or automated tool that surfaced it.
