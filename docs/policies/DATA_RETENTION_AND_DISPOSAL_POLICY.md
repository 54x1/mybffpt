# Data Retention and Disposal Policy

**Policy owner:** Project Maintainer (54x1) · **Version:** 1.0 · **Effective:** 2026-09-08 · **Review:** annually (next 2027-09-08)
**Approved by:** ____________________ (Project Maintainer) **Date:** __________
**Criteria:** C1.2, P4, CC6.5

## 1. Principle

The project retains as little as possible. User financial data is never held
by the project, so there is nothing of that class to retain or dispose of on
the project's side.

## 2. Retention schedule

| Data | Held where | Retention | Disposal |
|---|---|---|---|
| Source code, history, tags, releases | GitHub, maintainer clones | Indefinite (public, AGPL) | Not disposed; part of the public record |
| CI run logs and artefacts (Playwright reports, SBOMs) | GitHub Actions | 90 days (SBOM) / 14 days (failure reports), then auto-deleted | Automatic |
| Security advisories and incident records | GitHub Security Advisories, maintainer's private notes | Indefinite; private until published, then public | Not disposed |
| Audit evidence packs | Maintainer's private encrypted storage | 7 years after the report they support, or as the auditor requires | Secure delete after retention |
| Policy and register history | This repository | Indefinite via git history | Not disposed |
| Hosting access logs | Hosting provider | Provider default (record in the vendor register) | Provider-managed |
| Issue and PR content | GitHub | Indefinite | Sensitive content (see section 4) is removed on discovery |
| **User financial data** | **User's browser only** | **User-controlled** | "Clear all transactions" or clearing site data removes it immediately and completely; there is no server copy |

## 3. Local copies

Maintainer working clones may hold only public data. The `dist/`, test
output, and `*.log` files are git-ignored and may be deleted at any time.
Local Playwright reports are regenerated on each run.

## 4. Sensitive content that must not be retained

Real bank data, share codes, export files, or secrets found in the
repository, an issue, or a pull request are an incident: they are removed
(history rewritten if the repository is the only copy), the secret is
rotated, and the event is recorded under the Incident Response Plan.

## 5. Disposal methods

- GitHub data: deletion through the GitHub UI or API; note that forks may
  retain public content.
- Maintainer devices: full-disk encryption is required; local evidence is
  removed with the operating system's secure-delete tooling when retention
  ends.
- No physical media or paper records are used.
