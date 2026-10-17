# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Credit-card statement imports: CSV uploads are now automatically detected as
  credit-card statements (card-specific headers like "balance owed" or
  "minimum payment due", card-number columns, Westpac `Data_export` split-column
  exports identified via the short numeric card-ID account column plus a balance
  column, filename hints, and row shape — mostly-positive amounts with a few
  repayment rows). The label modal shows the detection with its reasons and a
  toggle to confirm or override it.
- Credit-card sign logic: in card mode purchases/fees/interest are recorded as
  spending regardless of the sign the bank exported, repayments become income
  under the "Transfers" category (so they never inflate income or spending),
  and refunds/chargebacks stay income. Every card row is tagged
  `credit card` so card activity stays separable in reports and filters.
- Internal-transfer pairing: after each import, same-day equal-amount rows
  from two different sources where BOTH descriptions read as money movement
  (TFR, TF/DR, EFT, "transfer to/from", BPAY) are paired into a single logical
  transfer — category "Transfers" plus an `internal transfer` tag. This fixes
  the double-count when Westpac exports e.g. a $500 everyday→loan payment as
  one withdrawal and one deposit across two statements. Matching is strict:
  coincidental merchant/deposit amount matches are never paired, pairing is
  1:1 and idempotent, and it runs over the whole ledger so the two sides may
  arrive in different files on different days.
- Combined multi-account exports: when one CSV mixes accounts (e.g. a Westpac
  export containing the card plus everyday and loan accounts), credit-card sign
  logic applies per-row only to the detected card account(s); deposit and loan
  rows keep normal bank-sign behaviour.

### Fixed
- Importing a credit-card statement no longer inverts every transaction
  (purchases counted as income, repayments as spending).

### Dependencies
- Routine minor/patch upgrades across dev and runtime dependencies
  (`npm update`). Tailwind 4, daisyUI 5, TypeScript 7, jsdom 30 and vitest 5
  majors are deliberately held back (breaking changes); the remaining
  `npm audit` highs are transitive through tailwindcss 3's build chain only.
- `vue-tsc` pinned to 3.3.11: 3.3.12+ narrows template ref types from their
  initial value, producing false TS2367 errors on the tab comparisons in
  `App.vue`. Revisit when upstream fixes or documents the behaviour change.

### Security
- Master password minimum length raised from 4 to 8 characters (NIST SP 800-63B
  minimum). Existing passwords keep working until changed.
- The 5-minute inactivity lock now also applies when auto-unlock is set to
  "Ask every time" (previously only in "this session/tab" mode), so an unlocked
  tab left open no longer stays unlocked indefinitely.
- Content-Security-Policy tightened with `form-action 'self'` and
  `frame-src 'none'`.
- Production security headers (HSTS, CSP, COOP/CORP, X-Frame-Options, etc.)
  shipped as `public/_headers` for Netlify/Cloudflare Pages; equivalents for
  other hosts documented in `docs/DEPLOYMENT.md`.
- `vite preview` now serves the same security headers as the dev server.

### Added
- In-browser OCR for image-based (scanned) PDF bank statements: when a PDF has
  no selectable text, the app offers to rasterize each page and recognize it
  locally with tesseract.js, then feeds the reconstructed layout into the
  existing column mapper. Fully client-side — runtime assets are self-hosted
  from `public/ocr` (no CDN), so nothing leaves the device and the CSP is
  unchanged. Assets are copied by `scripts/copy-ocr-assets.mjs` (postinstall,
  plus an explicit CI step for `--ignore-scripts` installs).
- SOC 2 readiness pack under `docs/compliance/` (system description, control
  matrix, risk register, vendor register, data classification, evidence guide,
  audit record) and written policies under `docs/policies/`.
- `PRIVACY.md` privacy notice.
- CodeQL static-analysis workflow and a weekly scheduled dependency/licence
  audit workflow.
- CycloneDX SBOM generation (`npm run sbom`) uploaded as a CI artifact.
- `CODEOWNERS`, pull-request template, and issue templates.
- Unit tests for the inactivity lock and for CSP/header consistency.
- This changelog.

### Changed
- About page now backs its privacy claims with verifiable proof (no-server,
  CSP-enforced, local-by-construction imports, standard Web Crypto, published
  SBOM) and a per-library table explaining what every runtime dependency does
  and that none of them access the network; added an OCR-specific FAQ entry.
- CI runs with a read-only `GITHUB_TOKEN`, cancels superseded runs, and installs
  dependencies with `npm ci --ignore-scripts`.
- Dependabot now also tracks GitHub Actions and no longer ignores major
  versions (majors are grouped into one PR so security updates that require a
  major bump are not suppressed).
- `SECURITY.md` now states supported versions, response targets, and the
  coordinated-disclosure window.
- AGPL SPDX licence headers added to workflow, Dependabot, issue-form,
  CODEOWNERS, and hosting-header files; `npm run license:check` now also
  scans `.mjs` and YAML files.

## [1.0.0] - 2026-08-26

### Added
- Initial public release under AGPL-3.0-or-later: client-side Vue 3 budget
  tracker with CSV import for major Australian banks, categorisation, tagging,
  charts and forecasts, optional AES-256-GCM encryption at rest (PBKDF2-SHA256,
  600,000 iterations), password-protected share codes and exports, WCAG 2.1 AA
  accessibility target, and 28 selectable themes.

[Unreleased]: https://github.com/54x1/mybffpt/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/54x1/mybffpt/releases/tag/v1.0.0
