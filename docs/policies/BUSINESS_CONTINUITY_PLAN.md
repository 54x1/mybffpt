# Business Continuity and Disaster Recovery Plan

**Policy owner:** Project Maintainer (54x1) · **Version:** 1.0 · **Effective:** 2026-09-08 · **Review:** annually (next 2027-09-08) and after any recovery test
**Approved by:** ____________________ (Project Maintainer) **Date:** __________
**Criteria:** A1.2, A1.3, CC9.1

## 1. Objectives

| Asset | Recovery time objective | Recovery point objective |
|---|---|---|
| Deployed site | 1 business day | Last tagged release (zero data loss: the site is stateless) |
| Source repository | 1 business day | Zero (git is fully distributed; every clone is a complete backup) |
| User data | Not applicable to the project: it lives on the user's device and is backed up by the user via export | User-controlled |

## 2. Scenarios and procedures

**Hosting provider outage or account loss.** Deploy the last tagged release
(`git checkout vX.Y.Z && npm ci --ignore-scripts && npm run build`) to an
alternate static host that supports response headers (see
`docs/DEPLOYMENT.md`), verify headers, and update DNS. Because the app is
static and stateless, nothing else needs restoring.

**GitHub outage.** Development pauses; the deployed site is unaffected. The
maintainer's local clone and any contributor forks are complete copies.
After recovery, verify that `main`, `dev`, and tags match the local clone.

**Repository deletion, corruption, or malicious history rewrite.** Restore
from the maintainer's clone or a fork (`git push --mirror`), re-apply branch
protection, rotate credentials, and handle as an incident.

**Maintainer unavailable.** The project is AGPL-licensed with public source,
signed tags, source tarballs, an SBOM per release, and these runbooks, so any
competent party can rebuild and redeploy it. Users are never dependent on the
maintainer for access to their own data (export is always available). A
succession note naming a trusted person who may be granted repository access
should be kept privately by the maintainer; if none exists, the project
remains usable as deployed and forkable by anyone.

**Deployed build broken by a bad release.** Redeploy the previous tag
(rollback in the Change Management Policy).

## 3. Backups

- Source: GitHub plus at least one up-to-date local clone; release source
  tarballs attached to GitHub releases.
- Build reproducibility: `.nvmrc`, `package-lock.json`, and
  `npm ci --ignore-scripts` make any tagged release rebuildable.
- User data: the application offers JSON/CSV/QIF export and the FAQ and
  privacy notice tell users to back up before clearing site data.

## 4. Testing

Annually, and first by **2026-12-08**: check out the latest tag on a clean
machine or container, build, deploy to a staging URL on the current or an
alternate host, run `curl -sI` to verify headers, and load the app. Record
the date, steps, elapsed time against the RTO, and any gaps. Keep the record
with the audit evidence.
