# Security Policy

mybffpt is a **client-side-only** application — there is no server, no account
system, and no backend to compromise. Nearly all security-relevant behavior
lives in the browser: how data is stored, how it's encrypted when shared, and
what the page is allowed to load.

## Reporting a Vulnerability

Please report suspected vulnerabilities using **[GitHub Security
Advisories](https://github.com/54x1/mybffpt/security/advisories/new)** on this
repository, rather than a public issue. This allows a fix to be prepared before
details are disclosed publicly.

What counts as a security issue here:

- A way to bypass or weaken the encrypted share-code protection (AES-256-GCM)
- A way to read another user's `localStorage` data cross-origin, or leak it
  off-device without the user initiating a share/export
- A Content-Security-Policy bypass (e.g. a way to execute injected script
  despite the CSP below)
- Any dependency vulnerability with a known exploit path reachable from this
  app's actual usage of that dependency

General bugs, UI issues, or feature requests should go through regular
[GitHub Issues](https://github.com/54x1/mybffpt/issues) instead.

## Data Handling

- All transaction data is stored in the browser's `localStorage`. Nothing is
  transmitted to a server — there isn't one.
- Users may optionally set a master password, which encrypts local data using
  **PBKDF2-SHA256 at 600,000 iterations** to derive an AES-256-GCM key. 600k
  iterations meets current OWASP guidance for PBKDF2-SHA256 password hashing.
- Share codes / exported links use the same PBKDF2 → AES-256-GCM scheme
  (`src/utils/secureStorage.ts`, `src/utils/share.ts`) when password-protected;
  unprotected exports are plaintext by design (the user has explicitly chosen
  not to encrypt).

## Content Security Policy

Both `index.html` and `index.dev.html` set:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';
```

`style-src` allows `'unsafe-inline'` because Tailwind/DaisyUI and Chart.js/D3
inject inline styles at runtime for theming and chart rendering; there is no
inline `<script>` allowance. This is a known, accepted trade-off — tightening
it further would require moving all dynamic styling to CSS custom properties
set via `style.setProperty`, which is not currently planned.

## Transport Security (HSTS)

`Strict-Transport-Security` is a response header set by whatever serves the
built static files in production (e.g. your static host or reverse proxy) — it
cannot be meaningfully set by the Vite dev server, which serves over plain
HTTP. If you deploy mybffpt, ensure your hosting layer sends
`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (or
your host's equivalent) over HTTPS.

## Dependency Security

- `npm run security:audit` runs `npm audit --audit-level=high` and is part of
  `npm run verify`.
- Known overrides: `nanoid` is pinned to `>=3.3.18` in `package.json` to
  resolve [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8).
  Future advisory fixes follow the same pattern: add a targeted `overrides`
  entry rather than broadly bumping unrelated dependencies.
- Dependency updates are automated via Dependabot (`.github/dependabot.yml`).
