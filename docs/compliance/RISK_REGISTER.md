# Risk register

**Owner:** Project Maintainer (54x1) · **Last review:** 2026-09-08 · **Next review:** 2026-12-08 (quarterly) or after any incident.

Rating = Likelihood (1 to 3) x Impact (1 to 3). 6 to 9 High, 3 to 4 Medium, 1 to 2 Low. Treatment: Mitigate / Accept / Transfer / Avoid.

| ID | Risk | L | I | Rating | Treatment | Controls in place | Residual / follow-up | Status |
|---|---|---|---|---|---|---|---|---|
| R01 | User financial data stored in plaintext when the user declines a master password | 2 | 3 | 6 High | Accept (user choice) + Mitigate | Opt-in encryption offered on first run and in Settings; About page shows plaintext vs encrypted state; CUEC guidance in PRIVACY.md | Residual accepted: local-first design; the maintainer never holds the data | Open, accepted |
| R02 | "Stay unlocked on this device" stores the raw AES key in `localStorage` | 2 | 3 | 6 High | Accept (explicit user opt-in) | UI states the key is stored in plaintext; "session" mode and "off" mode lock after 5 min inactivity; default is "off" | Residual accepted; documented in SECURITY.md | Open, accepted |
| R03 | Cross-site scripting leading to theft of stored data | 1 | 3 | 3 Med | Mitigate | CSP `script-src 'self'`, no `v-html`, escaped tooltip HTML, no `eval`; `tests/csp.test.ts` guards the CSP; CodeQL | `style-src 'unsafe-inline'` accepted for Tailwind/Chart.js | Open, mitigated |
| R04 | Compromised or malicious npm dependency (supply chain) | 2 | 3 | 6 High | Mitigate | Lockfile + `npm ci --ignore-scripts`; `npm audit` on push and weekly; Dependabot; licence allow-list; SBOM; CSP blocks exfiltration at runtime | Residual: a malicious update could still corrupt data locally. Consider `npm audit signatures` when registry access is available | Open, mitigated |
| R05 | Compromised GitHub Action (mutable `@vN` tag re-pointed) | 1 | 3 | 3 Med | Mitigate | `permissions: contents: read`; `persist-credentials: false`; Dependabot for actions; only first-party `actions/*` and `github/*` used | Follow-up F20: pin to commit SHAs (needs network) | Open |
| R06 | Maintainer GitHub account compromise (single admin) | 1 | 3 | 3 Med | Mitigate | CODEOWNERS; branch protection + required reviews + signed commits (to be enabled, EVIDENCE_GUIDE s.1); 2FA | Follow-up: enable settings and capture evidence | Open |
| R07 | Hosting misconfiguration: no HTTPS redirect or missing HSTS/headers | 2 | 2 | 4 Med | Mitigate | `public/_headers`; `docs/DEPLOYMENT.md` per-host config and curl verification step in RELEASE.md | Follow-up: record provider and verify | Open |
| R08 | Loss of the sole maintainer (bus factor 1) | 1 | 2 | 2 Low | Accept + Mitigate | Public AGPL source; signed release tags with source tarballs; policies and runbooks in-repo | Residual accepted for a volunteer project; BUSINESS_CONTINUITY_PLAN.md | Open, accepted |
| R09 | Share code / export leaked by the user | 2 | 3 | 6 High | Mitigate (user-side) | Optional AES-256-GCM password; expiry (30/60/90 days); payload in URL fragment; FAQ guidance | Residual accepted: user action outside boundary | Open, accepted |
| R10 | App served over plain HTTP: plaintext fallback | 1 | 3 | 3 Med | Mitigate | Warning banner; Web Share/crypto gated on secure context; DEPLOYMENT.md requires HTTPS | | Open, mitigated |
| R11 | Weak user-chosen master password | 2 | 2 | 4 Med | Mitigate | Minimum 8 characters (was 4); PBKDF2-SHA256 600k iterations | Follow-up: strength meter / breached-password check is a possible enhancement | Open, mitigated |
| R12 | Data loss when the user clears browser site data | 2 | 2 | 4 Med | Mitigate (user-side) | Export/backup formats (JSON/CSV/QIF); FAQ and PRIVACY.md advise backup first | User-owned data, no server copy by design | Open, accepted |
| R13 | Vulnerability in an unchanged dependency goes unnoticed between pushes | 2 | 2 | 4 Med | Mitigate | Weekly scheduled audit + CodeQL; Dependabot alerts | | Open, mitigated |
| R14 | Unreviewed or unlogged change reaches production | 1 | 3 | 3 Med | Mitigate | PR template; CODEOWNERS; CI required; CHANGELOG; release checklist; branch protection (to enable) | Direct pushes to `dev` observed before 2026-09-08; branch protection closes this | Open |
| R15 | Licence non-compliance from a dependency with an incompatible licence | 1 | 2 | 2 Low | Mitigate | `license:notices:check` allow-list in CI; NOTICE.md | | Open, mitigated |

## Risk-acceptance sign-off

Risks marked "accepted" are accepted by the maintainer as documented
trade-offs of a local-first, serverless design. Re-evaluated at each review.

Accepted by: ____________________ (Project Maintainer) Date: __________
