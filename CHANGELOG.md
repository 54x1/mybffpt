# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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
