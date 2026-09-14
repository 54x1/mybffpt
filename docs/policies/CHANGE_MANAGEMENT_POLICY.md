# Change Management Policy

**Policy owner:** Project Maintainer (54x1) · **Version:** 1.0 · **Effective:** 2026-09-08 · **Review:** annually (next 2027-09-08)
**Approved by:** ____________________ (Project Maintainer) **Date:** __________
**Criteria:** CC8.1, CC2.1, CC5.2

## 1. Scope

Every change to anything inside the system boundary: application source,
dependencies, CI workflows, hosting configuration, policies, and this pack.

## 2. Branch model

- `main`: released code. Deployed to production.
- `dev`: integration branch. Feature branches and forks target `dev`; `dev` is
  merged to `main` by pull request for a release.
- Both branches are protected as described in the Access Control Policy.
  Direct pushes are blocked, including for administrators.

## 3. Standard change procedure

1. Open a pull request using the template. Describe what changed, why, the
   security impact (or "None"), and how to roll back.
2. Automated gates must pass: the `CI` workflow (`npm run verify`: type-check,
   unit tests, licence header check, third-party notice check, production
   build, `npm audit` at high severity, axe-core accessibility scan) and the
   `CodeQL` workflow.
3. Review by a Code Owner (`.github/CODEOWNERS`). Review covers correctness,
   tests, the PR checklist, and, for paths listed as security-sensitive,
   an explicit security read of the diff.
4. `CHANGELOG.md` `[Unreleased]` is updated in the same pull request.
5. Merge with a merge commit (no squash-rewrite of contributor history; no
   force push). The merge commit is signed by GitHub or the maintainer.
6. Dependency updates arrive as Dependabot pull requests and follow the same
   gates; they may be batched by the groups in `.github/dependabot.yml`.

### Single-maintainer compensating controls

When the maintainer authors a change there is no second human reviewer. The
designed compensating controls are: the required CI and CodeQL checks cannot
be bypassed (branch protection applies to administrators); commits are
signed; the pull request, its checklist, and CI logs form a permanent public
record; the audit record and quarterly risk review re-examine security-
sensitive merges. If a second maintainer joins, a second-person review
becomes mandatory for security-sensitive paths.

## 4. Emergency changes

A security fix may be expedited: the same pull-request path is used, but the
maintainer may merge as soon as CI is green without waiting for the normal
review window, and may release immediately. Within five business days the
change is re-read, the changelog and advisory are completed, and the
post-mortem step in the Incident Response Plan is done.

## 5. Releases

Releases follow `RELEASE.md` exactly: green CI on `main`, version bump,
changelog section, signed tag, GitHub release with source tarball and SBOM,
deployment, and header verification. Only tagged commits are deployed to
production.

## 6. Rollback

Revert the merge commit (`git revert -m 1 <sha>`) through a pull request,
tag a patch release, and redeploy. Because the site is static, rollback is
also possible by redeploying the previous tagged build. Users' data lives on
their devices and is unaffected by a rollback.

## 7. Prohibited changes without a policy update and risk-register entry

- Adding a server-side component, telemetry, analytics, or any runtime
  network call.
- Loosening the Content-Security-Policy `script-src` or `object-src`.
- Reducing the master-password minimum length, PBKDF2 iterations, or the
  inactivity timeout.
- Introducing a third-party cryptography library in place of Web Crypto.
- Adding a dependency whose licence is not on the allow-list in
  `scripts/generate-third-party-notices.mjs`.

## 8. Records

The pull request, CI run, CodeQL run, changelog entry, release, and tag are
the change record. They are retained per the Data Retention Policy.
