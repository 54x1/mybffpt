# System description: mybffpt

**As of:** 2026-09-08 · **Owner:** Project Maintainer (54x1) · Structured after the AICPA description criteria (DC 200) for SOC 2 reports.

## 1. Services provided

mybffpt ("myBudget Forecaster") is a free, open-source (AGPL-3.0-or-later)
personal-finance web application. Users import bank-statement CSV files or
enter transactions by hand, then categorise, tag, chart, and forecast their
spending. The application is delivered as static files (HTML, JavaScript, CSS)
and executes entirely in the user's browser.

## 2. Principal service commitments

- **Security:** the delivered code is what was reviewed and built by CI; it
  cannot load or execute code from other origins; user data is encrypted at
  rest when the user sets a master password.
- **Availability:** the static site is served from a CDN-backed host; there is
  no application server to fail. The source is publicly mirrored on GitHub.
- **Confidentiality / Privacy:** the application never transmits user data.
  There is no account, server, analytics, or telemetry.
- **Processing integrity:** imports are parsed with validated, size-capped
  parsers; the type system and unit tests guard the calculation paths.

## 3. System requirements

Users need a modern browser with Web Crypto (any current Chrome, Firefox,
Safari, or Edge) and must access the site over HTTPS for encryption features.

## 4. Components

| Layer | Component | Notes |
|---|---|---|
| Infrastructure | GitHub (repository, Actions, Dependabot, CodeQL, Security Advisories) | Subservice organisation; see VENDOR_REGISTER |
| Infrastructure | Static hosting / CDN | Provider recorded in VENDOR_REGISTER; must serve `public/_headers` equivalents |
| Software | Vue 3, TypeScript, Vite, Tailwind/DaisyUI, Chart.js, D3 | Inventoried in `THIRD_PARTY_LICENSES.md` and the CI SBOM |
| Software | Web Crypto API (browser-native) | PBKDF2-SHA256 600k iterations, AES-256-GCM; no third-party crypto library |
| People | Project maintainer (single individual) | Sole reviewer, releaser, and administrator |
| People | External contributors | Contribute only via pull request; no direct write access |
| Procedures | Policies in `docs/policies/`, `CONTRIBUTING.md`, `RELEASE.md`, `SECURITY.md` | |
| Data | User financial data | On the user's device only; outside the system boundary |
| Data | Source code, CI logs, SBOMs, advisories | Inside the boundary |

## 5. System boundary

Inside: the GitHub repository and its settings, GitHub Actions workflows and
their artefacts, release tags and assets, and the static hosting configuration.
Outside: the user's device, browser profile, and anything the user exports or
shares. The maintainer has no technical ability to reach user data.

## 6. Data flow

1. Maintainer or contributor opens a pull request. CI (type-check, unit tests,
   licence checks, build, dependency audit, accessibility scan, CodeQL) runs
   with a read-only token.
2. Maintainer reviews and merges. `main` is built and deployed to the static
   host over HTTPS with the security headers in `public/_headers`.
3. User loads the site. The CSP forbids any script or connection to another
   origin. All processing, storage, encryption, and export happen in the
   browser. No request carries user data anywhere.

## 7. Incidents

No security incidents have been recorded as of the date above. Incidents are
handled under `docs/policies/INCIDENT_RESPONSE_PLAN.md` and logged in the
private security-advisory space on GitHub.

## 8. Complementary user-entity controls (CUECs)

Because user data stays on the user's device, the following controls are the
user's responsibility and are communicated in the in-app FAQ, `PRIVACY.md`,
and the unlock screen:

- Access the application only over HTTPS (encryption is unavailable otherwise).
- Set a master password of at least 8 characters and do not choose "Stay
  unlocked on this device" on a shared machine.
- Protect the device with an OS login and keep the browser up to date.
- Password-protect share codes and exports that contain real data, and share
  the password over a separate channel.
- Export a backup before clearing browser site data.

## 9. Subservice organisations

GitHub, Inc. (source control, CI, vulnerability management) and the static
hosting provider. Both are relied on using the carve-out method; their own
SOC 2 reports are obtained annually per the vendor-management policy.
