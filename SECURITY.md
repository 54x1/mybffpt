# Security Policy

mybffpt is a **client-side-only** application: there is no server, no account
system, and no backend. Nearly all security-relevant behaviour lives in the
browser: how data is stored, how it is encrypted when shared, and what the
page is allowed to load. The formal policies behind this document are in
[`docs/policies/`](docs/policies/); the SOC 2 control mapping is in
[`docs/compliance/CONTROL_MATRIX.md`](docs/compliance/CONTROL_MATRIX.md).

## Supported versions

| Version | Supported |
|---|---|
| Latest release on `main` | Yes |
| Older releases | No; upgrade to the latest release |

## Reporting a vulnerability

Report suspected vulnerabilities privately via **[GitHub Security
Advisories](https://github.com/54x1/mybffpt/security/advisories/new)**, not a
public issue, so a fix can be prepared before details are disclosed.

Include: affected version or commit, steps to reproduce, impact, and (if you
have one) a suggested fix. Do not include real financial data.

### Response targets

| Stage | Target |
|---|---|
| Acknowledge receipt | 3 business days |
| Triage and assign severity (CVSS v3.1) | 7 calendar days |
| Fix released: Critical / High | 7 / 30 days from triage |
| Fix released: Medium / Low | 90 days / next scheduled release |
| Coordinated public disclosure | On release of the fix, or 90 days after report, whichever is first |

Reporters are credited in the advisory and `CHANGELOG.md` unless they ask not
to be. The full process is in
[`docs/policies/INCIDENT_RESPONSE_PLAN.md`](docs/policies/INCIDENT_RESPONSE_PLAN.md).

### In scope

- Bypassing or weakening the encrypted share-code / export protection
  (AES-256-GCM) or the encrypted-at-rest store
- Reading another origin's `localStorage`, or leaking data off-device without
  the user initiating a share or export
- A Content-Security-Policy bypass (executing injected script despite the CSP)
- A dependency vulnerability with an exploit path reachable from this app's
  actual usage
- Weaknesses in the CI/CD pipeline or release process that could let
  unreviewed code ship

### Out of scope

General bugs, UI issues, or feature requests: use
[GitHub Issues](https://github.com/54x1/mybffpt/issues). Attacks that require
physical access to an unlocked device, or a compromised browser/extension, are
documented risks (see `docs/compliance/RISK_REGISTER.md`), not vulnerabilities.

## Data handling

- All transaction data is stored in the browser's `localStorage`. Nothing is
  transmitted to a server; there is none.
- Users may optionally set a master password (**minimum 8 characters**), which
  encrypts local data with AES-256-GCM using a key derived by
  **PBKDF2-SHA256 at 600,000 iterations** (current OWASP guidance).
- An unlocked, password-protected store **locks itself after 5 minutes of
  inactivity** (idle or backgrounded) unless the user has explicitly chosen
  "Stay unlocked on this device", which the UI describes as storing the key
  in plaintext in the browser.
- Share codes, share links, and exported files use the same PBKDF2 to
  AES-256-GCM scheme (`src/utils/share.ts`, `src/utils/secureStorage.ts`)
  when password-protected; unprotected exports are plaintext by design.
- Share links carry the payload in the URL fragment, which browsers never
  send to servers. Imports are size-capped and expiry-checked before parsing.

## Content Security Policy

`index.html` sets, and `public/_headers` repeats as a response header:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; object-src 'none'; base-uri 'self';
frame-ancestors 'none'; form-action 'self'; frame-src 'none'
```

`style-src` allows `'unsafe-inline'` because Tailwind/DaisyUI and Chart.js/D3
inject inline styles at runtime for theming and chart rendering; there is no
inline `<script>` allowance. This is a known, accepted trade-off recorded in
the risk register. `tests/csp.test.ts` fails CI if the meta tag and the header
file drift apart or if `script-src` is ever loosened.

## Transport security and response headers

HTTPS is required: Web Crypto is only available in a secure context, and the
app falls back to plaintext storage (with a visible warning) over plain HTTP.
`Strict-Transport-Security`, `X-Frame-Options`, COOP/CORP and the other
response headers are shipped in `public/_headers` (Netlify / Cloudflare Pages)
and documented for other hosts in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
The dev server and `vite preview` send the same non-HSTS headers.

## Dependency and supply-chain security

- `npm ci --ignore-scripts` in CI installs exactly the lockfile with dependency
  lifecycle scripts disabled.
- `npm run security:audit` (`npm audit --audit-level=high`) runs on every push
  and PR, and weekly on a schedule so new advisories against unchanged code
  are caught (`.github/workflows/security-schedule.yml`).
- CodeQL static analysis runs on every push/PR and weekly
  (`.github/workflows/codeql.yml`).
- A CycloneDX SBOM (`npm run sbom`) is produced and stored as a CI artifact.
- Third-party licences are inventoried and checked against an allow-list
  (`npm run license:notices:check`).
- Dependabot tracks npm packages and GitHub Actions weekly. Advisory fixes use
  a targeted `overrides` entry (e.g. `nanoid >=3.3.18` for
  GHSA-2v37-7h3g-55p8) rather than broad bumps.
