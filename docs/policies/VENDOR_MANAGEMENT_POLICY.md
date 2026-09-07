# Vendor Management Policy

**Policy owner:** Project Maintainer (54x1) · **Version:** 1.0 · **Effective:** 2026-09-08 · **Review:** annually (next 2027-09-08)
**Approved by:** ____________________ (Project Maintainer) **Date:** __________
**Criteria:** CC9.2, CC6.8, CC3.2

## 1. Register

Every third party the project depends on is listed in
`docs/compliance/VENDOR_REGISTER.md` with the service used, data shared,
criticality, the assurance relied on, and the review action. Production npm
dependencies are inventoried collectively there and individually in
`THIRD_PARTY_LICENSES.md` and the CI SBOM.

## 2. Onboarding a vendor or dependency

Before adoption the maintainer records, in the pull request that introduces
it:

1. What it is for and why a platform API or existing dependency cannot do it.
2. What data it would receive. The answer for anything at runtime must be
   "none": a runtime vendor would need a CSP change, which is prohibited by
   the Secure Development Policy without a risk-register entry and a policy
   update.
3. For infrastructure vendors (hosting, CI): the vendor's SOC 2 Type 2 or
   ISO 27001 status, region, and the account security settings applied (2FA,
   least privilege).
4. For npm packages: licence on the allow-list, maintenance activity,
   install scripts (must be none or justified), and current advisories.

## 3. Ongoing review

- Annually: obtain or re-check the current SOC 2 / ISO report for GitHub and
  the hosting provider; note any exceptions relevant to this project in the
  register; confirm the hosting headers per `docs/DEPLOYMENT.md`.
- Weekly (automated): `npm audit`, licence allow-list check, Dependabot for
  npm and GitHub Actions.
- On any vendor incident announcement: assess impact under the Incident
  Response Plan.

## 4. Offboarding

Remove the dependency or account, revoke credentials and tokens, delete the
register row (the git history keeps the record), and regenerate third-party
notices.

## 5. Subservice organisations and the SOC 2 report

GitHub and the hosting provider are subservice organisations presented using
the carve-out method: their controls are excluded from the report's scope
and relied on through their own reports. The complementary subservice
organisation controls the project relies on are: physical and environmental
security of infrastructure, network availability, and the integrity of the
managed CI runners and package registry.
