# Evidence guide

How to collect the evidence an auditor will ask for, control by control. For a
Type 1 report the evidence shows the control *exists and is designed* as of
the report date: a screenshot or export dated on or shortly before that date
is enough. Store evidence in a private location (not this public repository).

## 1. GitHub settings that must be enabled by hand

These are designed controls that this audit could not verify (no network
access). Enable each, then capture a dated screenshot of the settings page.

| Setting | Where | Control |
|---|---|---|
| Two-factor authentication on the maintainer account | Account > Password and authentication | CC6.1 |
| Branch protection (or a ruleset) on `main` **and** `dev`: require a pull request, require review from Code Owners, require status checks `verify` and `CodeQL` to pass, require signed commits, block force pushes and deletions, include administrators | Repository > Settings > Branches (or Rules) | CC8.1, CC6.1 |
| Dependabot alerts and Dependabot security updates | Settings > Code security and analysis | CC7.1 |
| Secret scanning + push protection | Settings > Code security and analysis | CC6.1, CC6.8 |
| Code scanning (CodeQL) default or via the workflow in this repo | Settings > Code security and analysis | CC7.1 |
| Private vulnerability reporting | Settings > Code security and analysis | CC7.3, CC2.3 |
| Actions permissions: allow only actions by GitHub and verified creators; default workflow token permissions read-only | Settings > Actions > General | CC6.3, CC8.1 |
| Collaborators list (should be only the maintainer) | Settings > Collaborators | CC6.2, CC6.3 |
| Commit signature verification: local `git config commit.gpgsign true` with a key registered on GitHub | Account > SSH and GPG keys | CC8.1 |

## 2. Evidence by control area

| Area | Evidence | Source |
|---|---|---|
| Policies approved (CC1, CC5) | Each policy file with the approval line filled in, plus the commit that added it | `docs/policies/*.md`, git log |
| Risk assessment (CC3) | `RISK_REGISTER.md` with review date and sign-off | this directory |
| Change management (CC8.1) | Three sample merged PRs showing review, green CI, and the PR checklist; branch-protection screenshot; `CHANGELOG.md`; a signed release tag (`git tag -v vX.Y.Z`) | GitHub PRs, releases |
| CI controls (CC7.1, CC8.1) | URLs of a green `CI` run and a `CodeQL` run for the release commit; the SBOM artefact from that run; a `Scheduled security checks` run | GitHub Actions |
| Dependency management (CC6.8, CC9.2) | Dependabot alerts page (zero open high/critical); a merged Dependabot PR; `THIRD_PARTY_LICENSES.md` | GitHub Security tab, repo |
| Boundary protection (CC6.6, CC6.7) | `curl -sI https://<host>/` output showing HSTS, CSP and the other headers; `http://` redirect check; the passing `tests/csp.test.ts` in CI logs | Terminal, CI |
| Encryption and session control (CC6.1, C1.1) | Passing `tests/secureStorage.test.ts`, `tests/share.test.ts`, `tests/inactivityLock.test.ts` in CI logs; `src/utils/secureStorage.ts` constants (PBKDF2 600k, AES-256-GCM, min length 8) | CI, repo |
| Vulnerability disclosure (CC2.3, CC7.3) | `SECURITY.md`; screenshot of private vulnerability reporting enabled; advisory list (empty is fine) | Repo, Security tab |
| Incident response (CC7.4, CC7.5) | `INCIDENT_RESPONSE_PLAN.md`; a tabletop-exercise note (date, scenario, outcome) | `docs/policies/`, private notes |
| Vendor management (CC9.2) | `VENDOR_REGISTER.md`; downloaded GitHub and hosting-provider SOC 2 reports (or their trust-portal summaries) | Vendor portals |
| Availability (A1.2, A1.3) | Hosting provider status page / SLA; a record of the last deployment and a restore test (redeploy from a tagged source tarball) | Provider, `BUSINESS_CONTINUITY_PLAN.md` |
| Privacy (P1 to P8) | `PRIVACY.md`; in-app About > Security & Privacy FAQ screenshot; CSP proving no egress | Repo, app |
| Monitoring (CC4.1) | Calendar entries or issues for the quarterly risk review and annual policy review | Issue tracker |

## 3. Suggested evidence folder layout (private)

```
evidence/2026-09-08/
  01-github-settings/   screenshots
  02-ci-runs/           run URLs + SBOM json
  03-headers/           curl output
  04-policies/          signed PDFs or the commit hash
  05-vendors/           SOC 2 reports
  06-reviews/           risk review + tabletop notes
```
