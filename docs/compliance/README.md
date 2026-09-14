# SOC 2 readiness pack

**Status:** control design implemented in code, CI, and written policy as of
**2026-09-08**. **Not yet audited.** A SOC 2 report is an opinion issued by an
independent CPA firm; nothing in a repository can grant it.

## What SOC 2 Type 1 is

SOC 2 is an attestation under the AICPA Trust Services Criteria (TSC). A
**Type 1** report states whether the *design* of a service organisation's
controls is suitable to meet the criteria **as of a point in time**. (Type 2
additionally tests *operating effectiveness* over a period, typically 6 to 12
months, and needs evidence that the controls ran throughout that period.)

The organisation being audited is the project maintainer acting as the service
organisation, not the source code. This pack gives the maintainer everything
that lives in code or documents; the remaining steps are organisational and
are listed at the bottom.

## Scope

- **Service:** the mybffpt web application, as built from this repository and
  served over HTTPS by the static host recorded in
  [`VENDOR_REGISTER.md`](VENDOR_REGISTER.md).
- **System boundary:** the GitHub repository, GitHub Actions CI/CD, release
  artefacts, and the static hosting layer. The user's own device and browser
  are *outside* the boundary: user data never leaves them, so the user
  operates the complementary controls listed in
  [`SYSTEM_DESCRIPTION.md`](SYSTEM_DESCRIPTION.md) section 8.
- **TSC categories proposed for the report:** Security (mandatory Common
  Criteria), Availability, Confidentiality, Privacy. Processing Integrity is
  also mapped for completeness. The maintainer and auditor agree the final
  scope; reducing it only removes rows from the control matrix.

## Contents

| Document | Purpose |
|---|---|
| [`SYSTEM_DESCRIPTION.md`](SYSTEM_DESCRIPTION.md) | The "system description" section of a SOC 2 report (AICPA DC 200 structure) |
| [`CONTROL_MATRIX.md`](CONTROL_MATRIX.md) | Every TSC criterion mapped to a control, its implementation, evidence, and status |
| [`RISK_REGISTER.md`](RISK_REGISTER.md) | Identified risks, ratings, treatments, and owners |
| [`VENDOR_REGISTER.md`](VENDOR_REGISTER.md) | Subservice organisations and third parties, with the assurance relied on |
| [`DATA_CLASSIFICATION.md`](DATA_CLASSIFICATION.md) | Data classes and handling rules |
| [`EVIDENCE_GUIDE.md`](EVIDENCE_GUIDE.md) | What to collect, from where, for each control; plus the GitHub settings that must be enabled by hand |
| [`AUDIT_2026-09-08.md`](AUDIT_2026-09-08.md) | The internal audit that produced this pack: findings, severity, remediation, follow-ups |
| [`../policies/`](../policies/) | The written policies the controls implement |
| [`../DEPLOYMENT.md`](../DEPLOYMENT.md) | Hosting-layer controls (HTTPS, HSTS, headers) |

## Remaining steps to a Type 1 report (cannot be done from code)

1. **Enable the GitHub repository settings** in
   [`EVIDENCE_GUIDE.md`](EVIDENCE_GUIDE.md) section 1: two-factor
   authentication, branch protection with required reviews and status checks,
   signed commits, secret scanning, Dependabot alerts, private vulnerability
   reporting, code scanning. Each is a designed control that is currently
   *documented* but not *verified* (this audit ran without network access).
2. **Record the hosting provider** in the vendor register and verify the
   response headers per `docs/DEPLOYMENT.md`.
3. **Approve the policies.** Each file in `docs/policies/` has an approval
   line for the maintainer to sign and date. Unapproved policies do not count
   as designed controls.
4. **Tag and publish the current release** per `RELEASE.md`, with a signed tag,
   source tarball, and SBOM, so the release control has at least one instance.
5. **Close the follow-ups** in `AUDIT_2026-09-08.md` that need network access
   (pin GitHub Actions to commit SHAs, add ESLint).
6. **Engage a CPA firm**, agree the as-of date and TSC scope, and hand over
   this pack plus the evidence collected under the guide.

## Review cadence

- Policies: reviewed and re-approved annually (next due **2027-09-08**) or on
  any material change.
- Risk register: reviewed quarterly and after any security incident.
- Control matrix: updated in the same pull request as any change to CI,
  security-relevant code, or hosting.
