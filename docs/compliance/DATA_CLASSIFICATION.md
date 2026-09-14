# Data classification

**Owner:** Project Maintainer (54x1) · **Effective:** 2026-09-08 · Supports TSC C1.1 (identify and maintain confidential information) and P3/P4.

| Class | Definition | Examples | Where it may exist | Handling |
|---|---|---|---|---|
| **Restricted** | Personal financial data belonging to a user | Imported bank transactions, categories, tags, notes, share codes, export files | **User's device only.** Never in the repository, CI, issues, or the maintainer's possession | Encrypted at rest when the user sets a master password (AES-256-GCM). Never requested from users; issue templates warn against pasting it. Any accidental disclosure into the repo or an issue is a security incident. |
| **Confidential** | Information that would help an attacker or is under embargo | Unpublished vulnerability reports, advisory drafts, CI secrets (none currently), maintainer credentials | GitHub Security Advisories (private), the maintainer's password manager | Shared only with the reporter and the maintainer until the fix is released. Never committed. Secret scanning enabled on the repository. |
| **Internal** | Work in progress not yet published | Unmerged branches, draft release notes, CI logs | GitHub | Public repository, so treat as effectively public: no secrets or Restricted data may appear here. |
| **Public** | Everything intentionally published | Source code, docs, policies, SBOMs, releases, this pack | GitHub, the deployed site | Freely distributable under AGPL-3.0-or-later. |

## Rules

1. The project **never collects, stores, or processes Restricted data**. The
   application architecture (no server, CSP-enforced no egress) makes this a
   technical property, not just a policy.
2. Test fixtures and demo data must be synthetic. Real statements, even
   anonymised, must not be committed.
3. Confidential data is kept in GitHub's private advisory workflow, not in
   email or chat, so there is an audit trail.
4. Encryption keys are user-derived and exist only in the user's browser.
   There are no project-held keys or secrets today; if any are introduced (for
   example a deploy token), they go in GitHub Actions encrypted secrets with
   least-privilege scope and are listed in the vendor register.
5. Disposal: see `docs/policies/DATA_RETENTION_AND_DISPOSAL_POLICY.md`.
