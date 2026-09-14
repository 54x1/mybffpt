# Incident Response Plan

**Policy owner:** Project Maintainer (54x1) · **Version:** 1.0 · **Effective:** 2026-09-08 · **Review:** annually (next 2027-09-08) and after every incident
**Approved by:** ____________________ (Project Maintainer) **Date:** __________
**Criteria:** CC7.3, CC7.4, CC7.5, CC2.3

## 1. What counts as an incident

| Type | Examples |
|---|---|
| Vulnerability report | A reporter finds a CSP bypass, crypto weakness, or data-leak path |
| Supply-chain compromise | A dependency or GitHub Action is found to be malicious or hijacked |
| Account or pipeline compromise | Maintainer GitHub or hosting account compromised; unauthorised commit, workflow run, or deployment |
| Unauthorised change in production | The deployed site differs from the tagged release (defacement, injected script) |
| Data disclosure inside the boundary | Real user financial data or a secret committed to the repository or posted in an issue |
| Availability | The hosting provider is down beyond its SLA, or the site serves a broken build |

## 2. Roles

**Incident lead:** the Project Maintainer, who also owns communication and the
post-mortem. There is no deputy; if the maintainer is unavailable for more
than five business days during an active incident, the Business Continuity
Plan's succession note applies.

## 3. Reporting routes

- External reporters: private GitHub Security Advisory
  (<https://github.com/54x1/mybffpt/security/advisories/new>), as published in
  `SECURITY.md`.
- Automated: failed `CI` / `Scheduled security checks` / `CodeQL` runs,
  Dependabot alerts, GitHub secret-scanning alerts, hosting-provider alerts.
- Users: GitHub Issues for anything that is not sensitive.

## 4. Procedure

1. **Acknowledge** within 3 business days (reporter) or 1 business day
   (automated alert or suspected compromise). Open a private advisory or a
   private note to track the incident; record the time of detection.
2. **Triage** within 7 days: confirm, assign CVSS severity, determine whether
   users could be affected (for this application that means: could the
   deployed code have exfiltrated or corrupted data on users' devices?).
3. **Contain** immediately for High/Critical:
   - Account compromise: rotate credentials, revoke all personal access
     tokens, deploy keys and OAuth apps, force re-authentication, review the
     audit log for changes.
   - Malicious dependency or Action: pin or remove it, re-run CI from a clean
     state, and redeploy the last known-good tagged release.
   - Unauthorised production change: redeploy the last known-good tag; keep
     a copy of the tampered artefact for analysis.
   - Data or secret committed: remove it, rewrite history if the repository
     is the only copy, rotate the secret, and treat the data as disclosed.
4. **Eradicate and fix** via the emergency path in the Change Management
   Policy: pull request, green CI, signed tag, release.
5. **Recover**: deploy, verify headers and behaviour per `docs/DEPLOYMENT.md`,
   and confirm the fix with the reporter where applicable.
6. **Disclose**: publish the GitHub Security Advisory with CVSS, affected
   versions, and fix version; add a `### Security` changelog entry; because
   there are no user accounts, also add a notice to the README and the in-app
   About page for any incident that could have affected users' devices, with
   plain-language guidance (for example "export your data, clear site data,
   reload the latest version, and change your master password").
   Coordinated disclosure with a reporter is 90 days from report or on fix
   release, whichever is first.
7. **Post-mortem** within 10 business days: timeline, root cause, what
   worked, what did not, and actions with owners and dates. Update the risk
   register and, if needed, the policies. A redacted summary may be published.

## 5. Evidence to preserve

Advisory thread, GitHub audit log export, Actions run logs and artefacts,
the tampered or vulnerable artefact, timestamps for each step above, and the
post-mortem. Retained per the Data Retention Policy.

## 6. Exercises

At least annually the maintainer walks through one scenario from section 1
on paper (tabletop), records the date, scenario, gaps found, and resulting
changes. The first exercise is due by **2026-12-08**.
