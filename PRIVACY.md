# Privacy Notice

**Effective:** 2026-09-08 · **Owner:** Project Maintainer (54x1) · **Review:** annually, or on any change to data handling

myBudget Forecaster (mybffpt) is a client-side personal finance application.
This notice explains what data the application handles, where it lives, and
what choices you have. It is written against the AICPA Trust Services
Criteria for Privacy (P1–P8) and general good practice; it is not legal advice.

## 1. Summary

- The application runs entirely in your web browser. **There is no server,
  account, database, analytics, telemetry, or tracking.**
- The only personal data the application processes is the data **you** enter
  or import (bank transactions, categories, tags, notes, and preferences).
- That data is stored **only on your device**, in your browser's local
  storage, and leaves it only when you deliberately export a file, copy a
  share code, or use your browser's share function.
- The project maintainer never receives, sees, or can access your data.

## 2. Data we do not collect

We do not collect, transmit, or store: names, email addresses, IP addresses,
device identifiers, usage analytics, crash reports, tracking cookies, or any
of the financial data you import. The application makes no network requests
after the page and its assets have loaded; the Content-Security-Policy in
`index.html` restricts all connections to the application's own origin.

## 3. Data you store on your device

| Data | Where | Encrypted? |
|---|---|---|
| Transactions, custom categories, tags | Browser `localStorage` | Yes, if you set a master password (AES-256-GCM; key derived with PBKDF2-SHA256, 600,000 iterations). Otherwise plaintext. |
| Preferences (theme, date format, view, dismissed tips, recent categories) | Browser `localStorage` | No (non-sensitive UI state). |
| Auto-unlock key (only if you choose "Stay unlocked") | `sessionStorage` (session/tab mode) or `localStorage` (device mode) | No. A deliberate, user-selected trade-off, explained in the UI. |
| Master-password salt and verifier | Browser `localStorage` | Not secret by design; cannot be used to recover the password or the data. |

Nothing above is ever sent to the maintainer or any third party.

## 4. Sharing and exporting

When you generate a share code, share link, or export file, the data is
encoded on your device. You may optionally protect it with a password
(AES-256-GCM). Share links put the payload in the URL **fragment** (`#...`),
which browsers do not send to servers. Once you send a code or file to
someone else, that copy is outside the application's control. Treat share
codes and exports like the bank statements they contain.

## 5. Your choices and rights

- **Access / portability:** export your data at any time as JSON, CSV, or QIF.
- **Correction:** edit or bulk-edit any transaction in the app.
- **Deletion:** use "Clear all transactions", or clear the site data for this
  origin in your browser. Deletion is immediate and permanent; there is no
  server-side copy to purge.
- **Encryption:** turn password protection on or off under Settings > Security.
- **Consent:** no data is processed until you import or enter it. Nothing is
  shared without an explicit action by you.

## 6. Retention

Data is retained on your device until you delete it or clear site data. The
project retains nothing. See
`docs/policies/DATA_RETENTION_AND_DISPOSAL_POLICY.md`.

## 7. Children

The application is not directed at children and collects no data from anyone.

## 8. Third parties

The application loads no third-party scripts, fonts, or resources at runtime.
The hosting provider that serves the static files may keep standard web-server
access logs (IP address, user agent, requested path) under its own privacy
policy; `docs/compliance/VENDOR_REGISTER.md` records which provider is in use.

## 9. Security

See `SECURITY.md` for the security model, how to report a vulnerability, and
response targets.

## 10. Changes to this notice

Material changes are recorded in `CHANGELOG.md` and this file's effective date
is updated. Because the application has no accounts, users cannot be notified
directly; the in-app About page links to the current version.

## 11. Contact

Questions: open a GitHub issue at <https://github.com/54x1/mybffpt/issues>
(do not include personal or financial data). Security or privacy incidents:
<https://github.com/54x1/mybffpt/security/advisories/new>.
