# Deployment hardening

mybffpt is a static site: `npm run build` produces `dist/`, which any static
host can serve. The application's own security controls (CSP, encryption at
rest, no network egress) are in the bundle, but two things **must** come from
the hosting layer and are part of the SOC 2 control design
(CC6.6 / CC6.7 in `docs/compliance/CONTROL_MATRIX.md`):

1. **HTTPS only.** Web Crypto (`crypto.subtle`) is only available in a secure
   context. Over plain HTTP (other than `localhost`) the app falls back to
   plaintext storage and shows a warning banner. Redirect all HTTP to HTTPS.
2. **Security response headers**, including HSTS, which cannot be set from a
   `<meta>` tag.

The required header set is the one in [`public/_headers`](../public/_headers),
copied verbatim into `dist/_headers` by the build.

## Per-host instructions

### Netlify / Cloudflare Pages
Nothing to do: both read `dist/_headers`. Enable "Always use HTTPS"
(Cloudflare) or "Force HTTPS" (Netlify) in the dashboard.

### Vercel
Add a `vercel.json` at the repo root with a `headers` entry for `/(.*)` listing
every header from `public/_headers`. Vercel enforces HTTPS by default.

### nginx
```nginx
server {
    listen 443 ssl http2;
    # ... certificate config ...
    root /var/www/mybffpt/dist;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; frame-src 'none'" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" always;
    add_header X-Permitted-Cross-Domain-Policies "none" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;
    location / { try_files $uri $uri/ /index.html; }
}
server { listen 80; return 301 https://$host$request_uri; }
```

### Apache (`.htaccess`)
Use `Header always set <Name> "<value>"` for each header above and a
`RewriteRule` to force HTTPS.

### GitHub Pages
GitHub Pages cannot set custom response headers. The CSP still applies via the
`<meta>` tag, but **HSTS, COOP/CORP, and X-Frame-Options will be missing**.
Put Cloudflare (or another CDN that can inject headers) in front, or use a host
that supports headers. Record the choice in
`docs/compliance/VENDOR_REGISTER.md`.

## Verification (after every deployment change)

```bash
curl -sI https://<your-host>/ | grep -iE "strict-transport|content-security|x-frame|x-content-type|referrer|permissions|cross-origin"
```
Every header above should be present. Also confirm `http://<your-host>/`
returns a 301/308 to HTTPS. Keep the output as evidence (see
`docs/compliance/EVIDENCE_GUIDE.md`).

## Source availability (AGPL section 13)

If you deploy a **modified** build, you must offer users the corresponding
source. The simplest way is to link the exact commit or a source tarball from
the About page or footer. See `RELEASE.md`.
