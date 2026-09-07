# Secure Development Policy

**Policy owner:** Project Maintainer (54x1) · **Version:** 1.0 · **Effective:** 2026-09-08 · **Review:** annually (next 2027-09-08)
**Approved by:** ____________________ (Project Maintainer) **Date:** __________
**Criteria:** CC6.6, CC6.8, CC7.1, CC8.1, PI1.1

## 1. Architecture rules

1. The application is client-side only. No server component, account system,
   analytics, telemetry, or runtime network request may be added.
2. The Content-Security-Policy in `index.html` and `public/_headers` is a
   control, not a suggestion. `script-src` stays `'self'`; `object-src`
   `'none'`; `frame-ancestors` `'none'`; `form-action` `'self'`;
   `frame-src` `'none'`. `tests/csp.test.ts` enforces this and must not be
   weakened to make a change pass.
3. Cryptography uses the browser's Web Crypto API only: PBKDF2-SHA256 at
   600,000 iterations or more, AES-256-GCM with a fresh random IV per
   encryption, random 16-byte salts. No home-grown or third-party crypto.

## 2. Coding standards

- TypeScript `strict` mode; no `any` without justification at the boundary.
- No `v-html`, `eval`, `new Function`, `document.write`, or `innerHTML` with
  data that has not been escaped by a reviewed helper.
- All external input (CSV files, share codes, JSON imports, clipboard, URL
  fragments) is treated as untrusted: size-capped before decoding, parsed
  with the existing validated helpers, and normalised field-by-field into
  typed objects (never spread or merged wholesale, to avoid prototype
  pollution).
- Exports that can be opened in spreadsheets keep the formula-injection guard.
- Console output in production is limited to the `DEBUG_IMPORT`-gated helpers
  in `src/utils/debug.ts`; nothing logs user data.
- Every source file carries the AGPL SPDX header (`npm run license:check`).
- `sourcemap: false` in production builds.

## 3. Dependencies

- Add a dependency only if it is actively maintained, has an allow-listed
  licence, and cannot reasonably be replaced by platform APIs.
- `package-lock.json` is committed; CI installs with `npm ci --ignore-scripts`.
  A dependency that requires install scripts needs a risk-register entry.
- Vulnerabilities are fixed by the narrowest change: a targeted `overrides`
  entry or a patch bump, not a broad upgrade, unless the upgrade is itself
  the fix.
- After any dependency change run `npm run license:notices` and commit the
  result; CI fails if it is stale.
- No dependency may be loaded from a CDN at runtime.

## 4. Testing

- Logic in `src/utils/` and `src/composables/` has unit tests (Vitest).
- User-facing flows have Playwright E2E coverage; interactive components are
  scanned with axe-core.
- Security controls have dedicated tests that act as design evidence:
  `secureStorage.test.ts`, `share.test.ts`, `inactivityLock.test.ts`,
  `csp.test.ts`. A change to a control updates its test in the same PR.

## 5. Security review triggers

A pull request touching any path in `.github/CODEOWNERS` marked as
security-sensitive (storage, crypto, share/import/export, `index.html`,
`vite.config.ts`, `public/_headers`, workflows, policies) requires the
"Security impact" section of the PR template to be filled in and is read
specifically for: data leaving the device, weakened crypto parameters, new
sinks, CSP or header changes, and token permission changes.

## 6. Secrets

There are no secrets in this project today. If one is introduced it goes in
GitHub Actions encrypted secrets, never in source, and secret scanning with
push protection stays enabled. Test fixtures use synthetic data only; real
bank statements must never be committed, even anonymised.

## 7. Tooling

Static analysis: TypeScript compiler (`vue-tsc`) and CodeQL
(`security-extended`). Adding ESLint with `eslint-plugin-vue` and
`@typescript-eslint` is an open follow-up (`AUDIT_2026-09-08.md` F19).
