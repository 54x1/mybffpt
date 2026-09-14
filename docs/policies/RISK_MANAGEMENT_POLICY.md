# Risk Management Policy

**Policy owner:** Project Maintainer (54x1) · **Version:** 1.0 · **Effective:** 2026-09-08 · **Review:** annually (next 2027-09-08)
**Approved by:** ____________________ (Project Maintainer) **Date:** __________
**Criteria:** CC3.1, CC3.2, CC3.3, CC3.4, CC9.1

## 1. Objective

Identify, rate, treat, and monitor risks to the project's service commitments
(security, availability, confidentiality, privacy, processing integrity) so
that controls are proportionate and accepted risks are explicit.

## 2. Method

- **Identify** from: the architecture, the threat types in the Incident
  Response Plan, dependency and vendor changes, audit findings, incidents,
  and changes in the business or legal environment (for example a new
  hosting provider or a new bank CSV format).
- **Rate** likelihood and impact each from 1 (low) to 3 (high). Rating is
  the product: 6 to 9 High, 3 to 4 Medium, 1 to 2 Low.
- **Treat** by Mitigate (add or strengthen a control), Accept (document why
  and the compensating control), Transfer (to a vendor with assurance), or
  Avoid (do not do the thing). Fraud and misuse scenarios, including misuse
  of maintainer access, are considered explicitly (CC3.3).
- **Record** in `docs/compliance/RISK_REGISTER.md` with an owner, status,
  and follow-up.

## 3. Cadence and triggers

Quarterly review (next **2026-12-08**), and immediately after any incident,
audit, major dependency or vendor change, or change to the system boundary
(for example adding any server-side component, which is otherwise
prohibited).

## 4. Acceptance authority

Only the Project Maintainer may accept a risk, by signing the register. High
risks accepted rather than mitigated must state the compensating control and
be re-affirmed at every review.

## 5. Link to controls

Each mitigated risk names the control(s) that treat it; each control in
`docs/compliance/CONTROL_MATRIX.md` therefore traces to at least one risk or
criterion. Audit findings (`docs/compliance/AUDIT_*.md`) feed the register.
