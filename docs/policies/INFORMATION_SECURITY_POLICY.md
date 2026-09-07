# Information Security Policy

**Policy owner:** Project Maintainer (54x1) · **Version:** 1.0 · **Effective:** 2026-09-08 · **Review:** annually (next 2027-09-08) or on material change
**Approved by:** ____________________ (Project Maintainer) **Date:** __________

## 1. Purpose

This policy establishes the maintainer's commitment to protecting the
confidentiality, integrity, and availability of the mybffpt service and the
information within its system boundary, and it is the parent of the policies
listed in section 5. Together they implement the controls mapped in
`docs/compliance/CONTROL_MATRIX.md` against the AICPA Trust Services Criteria.

## 2. Scope

The GitHub repository `54x1/mybffpt` and its settings, the GitHub Actions
workflows and artefacts, release tags and assets, the static hosting
configuration, and the people who administer or contribute to them. User
devices and user data are outside the boundary; the project's obligation
there is to design the application so that data never leaves the device and
to communicate the user's own responsibilities (`PRIVACY.md`,
`docs/compliance/SYSTEM_DESCRIPTION.md` section 8).

## 3. Principles

1. **No data, no breach.** The application is designed so that the project
   never holds user data. This architectural choice is the primary control and
   must not be eroded by adding servers, telemetry, or runtime third parties
   without a documented risk assessment and policy update.
2. **Least privilege.** Accounts, tokens, and workflows get the minimum access
   needed, with a default of read-only.
3. **Defence in depth.** Browser-side controls (CSP, encryption at rest,
   session lock) are backed by hosting-layer controls (HTTPS, HSTS, headers)
   and pipeline controls (review, CI gates, dependency scanning).
4. **Everything through the pipeline.** No change reaches users except via a
   reviewed pull request that passed CI and a recorded release.
5. **Transparency.** Source, policies, and the security posture are public;
   only vulnerability details under embargo and credentials are confidential.

## 4. Roles and responsibilities

| Role | Held by | Responsibilities |
|---|---|---|
| Project Maintainer (system owner, security owner, incident lead) | 54x1 | Approves policies, owns the risk register, reviews and merges all changes, administers GitHub and hosting, responds to incidents, collects audit evidence |
| Contributors | Anyone, via pull request | Follow `CONTRIBUTING.md` and the Secure Development Policy; no direct write access |
| Subservice organisations | GitHub, hosting provider | Provide infrastructure controls evidenced by their own SOC 2 reports (`docs/compliance/VENDOR_REGISTER.md`) |

Because the project has a single maintainer, separation of duties is not
possible. Compensating controls are: mandatory CI status checks that the
maintainer cannot bypass (branch protection includes administrators), signed
commits, a public and immutable change history, Dependabot as an independent
change source, and this pack's annual review. These are stated to the auditor
as designed compensating controls.

## 5. Policy set

| Policy | Covers |
|---|---|
| `ACCESS_CONTROL_POLICY.md` | Accounts, 2FA, repository access, CI tokens, user-side authentication and session lock |
| `CHANGE_MANAGEMENT_POLICY.md` | Pull requests, review, CI gates, releases, rollback |
| `SECURE_DEVELOPMENT_POLICY.md` | Coding rules, dependencies, testing, security review triggers |
| `VULNERABILITY_MANAGEMENT_POLICY.md` | Scanning cadence, severity, remediation targets, exceptions |
| `INCIDENT_RESPONSE_PLAN.md` | Detection, triage, containment, disclosure, post-mortem |
| `VENDOR_MANAGEMENT_POLICY.md` | Vendor register, assurance, onboarding and review |
| `DATA_RETENTION_AND_DISPOSAL_POLICY.md` | What the project keeps, for how long, and how it is disposed of |
| `BUSINESS_CONTINUITY_PLAN.md` | Recovery objectives and procedures |
| `RISK_MANAGEMENT_POLICY.md` | Risk methodology, register, cadence, acceptance |

## 6. Compliance and enforcement

Deviations from these policies are security incidents or findings and are
handled under the Incident Response Plan or recorded in the audit record with
a remediation date. Contributors who do not follow `CONTRIBUTING.md` have
their pull requests declined. Repeated or wilful violations are handled under
`CODE_OF_CONDUCT.md`.

## 7. Exceptions

Exceptions must be written into `docs/compliance/RISK_REGISTER.md` with the
risk accepted, the compensating control, an owner, and an expiry or review
date. Only the maintainer may accept a risk.

## 8. Review

Reviewed annually and after any incident, major dependency change, change of
hosting provider, or addition of a maintainer. Each review is recorded by
updating the version, effective date, and approval line.
