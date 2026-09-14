# Control matrix (Trust Services Criteria to controls)

**As of:** 2026-09-08 · **Owner:** Project Maintainer (54x1) · Update in the same PR as any change to CI, security-relevant code, hosting, or policy.

Status key: **Implemented** = in code/CI/docs in this repository · **Manual** = a GitHub or hosting setting the maintainer must enable and evidence (see `EVIDENCE_GUIDE.md` s.1) · **Follow-up** = tracked in `AUDIT_2026-09-08.md`.

## Common Criteria (Security)

| TSC | Control | Implementation | Evidence | Status |
|---|---|---|---|---|
| CC1.1 Integrity and ethics | Code of conduct; policies state accountability | `CODE_OF_CONDUCT.md`; `INFORMATION_SECURITY_POLICY.md` | Files, approval lines | Implemented |
| CC1.2/1.3 Oversight and structure | Single named owner for every policy and control; CODEOWNERS enforces review | `docs/policies/*` headers; `.github/CODEOWNERS` | Files | Implemented |
| CC1.4/1.5 Competence and accountability | Contributor requirements; maintainer approval of all changes | `CONTRIBUTING.md`; PR template; CODEOWNERS | Merged PRs | Implemented |
| CC2.1 Information quality | Change log, release notes, SBOM per build | `CHANGELOG.md`; `RELEASE.md`; CI SBOM artefact | CI run | Implemented |
| CC2.2 Internal communication | Policies, README, in-repo runbooks | `docs/`, `README.md` | Files | Implemented |
| CC2.3 External communication | Security policy with response targets, privacy notice, support routes, in-app FAQ | `SECURITY.md`; `PRIVACY.md`; `SUPPORT.md`; About page | Files | Implemented |
| CC3.1 to 3.4 Risk assessment | Risk register with ratings, treatments, quarterly review; fraud/abuse and change risks included | `RISK_REGISTER.md`; `RISK_MANAGEMENT_POLICY.md` | Signed register | Implemented |
| CC4.1/4.2 Monitoring and remediation | CI on every change; weekly scheduled audit and CodeQL; annual policy review; audit record with follow-ups | Workflows; `AUDIT_2026-09-08.md` | Actions runs | Implemented |
| CC5.1 to 5.3 Control activities | Policies mapped to technical controls in this matrix; deployment through CI-gated PRs | This document | | Implemented |
| CC6.1 Logical access: identify and authenticate | User: master password min 8 chars, PBKDF2-SHA256 600k to AES-256-GCM; 5-min inactivity lock. Maintainer: GitHub 2FA | `src/utils/secureStorage.ts`; `src/utils/constants.ts`; `src/utils/inactivityLock.ts`; `ACCESS_CONTROL_POLICY.md` | `tests/secureStorage.test.ts`, `tests/inactivityLock.test.ts`; 2FA screenshot | Implemented + Manual |
| CC6.2/6.3 Access provisioning and removal | Single collaborator; contributors have no write access; annual collaborator review; least-privilege CI token | `ACCESS_CONTROL_POLICY.md`; `permissions: contents: read` in workflows | Collaborators page | Implemented + Manual |
| CC6.4/6.5 Physical access and disposal | Not applicable: no project-operated infrastructure; hosting is a subservice org | `VENDOR_REGISTER.md` | Vendor SOC 2 | N/A (carve-out) |
| CC6.6 Boundary protection | CSP `script-src 'self'`, `frame-ancestors 'none'`, `form-action 'self'`; HSTS, X-Frame-Options, COOP/CORP, Permissions-Policy; no runtime egress | `index.html`; `public/_headers`; `vite.config.ts`; `docs/DEPLOYMENT.md` | `tests/csp.test.ts`; `curl -I` output | Implemented + Manual (host verify) |
| CC6.7 Transmission and movement of data | HTTPS-only deployment; share payload in URL fragment; optional AES-256-GCM on share codes and exports | `docs/DEPLOYMENT.md`; `src/utils/share.ts` | `tests/share.test.ts` | Implemented |
| CC6.8 Unauthorised software | Lockfile with integrity hashes; `npm ci --ignore-scripts`; licence allow-list; SBOM; Dependabot for npm and Actions; secret scanning | `package-lock.json`; `ci.yml`; `scripts/generate-third-party-notices.mjs`; `dependabot.yml` | CI logs; SBOM | Implemented + Manual (secret scanning) |
| CC7.1 Vulnerability detection | `npm audit --audit-level=high` on push/PR and weekly; CodeQL `security-extended` on push/PR and weekly; Dependabot alerts | `ci.yml`; `security-schedule.yml`; `codeql.yml`; `VULNERABILITY_MANAGEMENT_POLICY.md` | Actions runs; Security tab | Implemented + Manual (enable code scanning) |
| CC7.2 Anomaly monitoring | GitHub audit log, Actions failure notifications, Dependabot alerts; no runtime telemetry by design | GitHub | Audit log export | Implemented (via subservice) |
| CC7.3 Incident evaluation | Private vulnerability reporting; severity via CVSS; response targets | `SECURITY.md`; `INCIDENT_RESPONSE_PLAN.md` | Advisory list | Implemented + Manual (enable PVR) |
| CC7.4/7.5 Incident response and recovery | Plan with roles, steps, disclosure, post-mortem; fixes ship via the normal PR + release path | `INCIDENT_RESPONSE_PLAN.md`; `RELEASE.md` | Tabletop note | Implemented |
| CC8.1 Change management | PR required; CODEOWNERS review; CI status checks; PR checklist; CHANGELOG; signed tags; rollback = revert | `CHANGE_MANAGEMENT_POLICY.md`; `.github/`; `RELEASE.md` | Branch protection; sample PRs | Implemented + Manual (branch protection) |
| CC9.1 Risk mitigation and BCP | Business continuity plan; public source; reproducible build from tagged source | `BUSINESS_CONTINUITY_PLAN.md` | Restore test note | Implemented |
| CC9.2 Vendor management | Vendor register with assurance relied on; annual report review; runtime vendors prohibited without CSP change | `VENDOR_REGISTER.md`; `VENDOR_MANAGEMENT_POLICY.md` | Vendor SOC 2 reports | Implemented |

## Availability

| TSC | Control | Implementation | Evidence | Status |
|---|---|---|---|---|
| A1.1 Capacity | Static files on a CDN; no server capacity to manage | `SYSTEM_DESCRIPTION.md` | Provider docs | Implemented (subservice) |
| A1.2 Environmental protections, backup, recovery | Source and releases on GitHub; deploy is idempotent from any tag; user data has no server copy by design (user-side backup via export) | `BUSINESS_CONTINUITY_PLAN.md`; `RELEASE.md` | Restore test | Implemented |
| A1.3 Recovery testing | Annual redeploy from a tagged source tarball to a staging URL | `BUSINESS_CONTINUITY_PLAN.md` | Test note | Follow-up (first test due 2026-12-08) |

## Confidentiality

| TSC | Control | Implementation | Evidence | Status |
|---|---|---|---|---|
| C1.1 Identify and protect confidential information | Data classification; Restricted data never enters the boundary; encryption at rest; issue templates forbid real data | `DATA_CLASSIFICATION.md`; `secureStorage.ts`; `.github/ISSUE_TEMPLATE/` | Files, tests | Implemented |
| C1.2 Disposal | User-side deletion is immediate and complete; project retention schedule | `DATA_RETENTION_AND_DISPOSAL_POLICY.md`; "Clear all" + browser site data | Files | Implemented |

## Processing Integrity

| TSC | Control | Implementation | Evidence | Status |
|---|---|---|---|---|
| PI1.1 to 1.3 Inputs, processing, outputs | Typed CSV parser with column inference; size caps on share/JSON imports (20 MB, 8,000 tx); formula-injection guard on CSV export; TypeScript `strict`; unit tests for crypto/storage | `src/utils/csv.ts`; `App.vue` import guards; `tsconfig.json`; tests | CI logs | Implemented; Follow-up F21 (parser unit tests) |
| PI1.4/1.5 Storage integrity | AES-GCM authenticated encryption detects tampering; per-key write queue prevents lost writes | `secureStorage.ts` | `tests/secureStorage.test.ts` | Implemented |

## Privacy

| TSC | Control | Implementation | Evidence | Status |
|---|---|---|---|---|
| P1 Notice | Privacy notice and in-app FAQ | `PRIVACY.md`; `AboutSection.vue` | Files | Implemented |
| P2 Choice and consent | No processing until the user imports; encryption, sharing, and auto-unlock are explicit opt-ins | UI | Screenshots | Implemented |
| P3 Collection | Nothing collected by the project; CSP prevents egress | `index.html` | `tests/csp.test.ts` | Implemented |
| P4 Use, retention, disposal | User-controlled; nothing retained by project | `PRIVACY.md`; retention policy | Files | Implemented |
| P5 Access | Export in JSON/CSV/QIF at any time | App | Screenshot | Implemented |
| P6 Disclosure to third parties | None; no runtime vendors | `VENDOR_REGISTER.md` | Files | Implemented |
| P7 Quality | User edits and bulk-edits data directly | App | Screenshot | Implemented |
| P8 Monitoring and enforcement | Privacy questions and incidents via issues / private advisories | `PRIVACY.md` s.11 | Files | Implemented |
