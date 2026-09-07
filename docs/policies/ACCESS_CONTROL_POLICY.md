# Access Control Policy

**Policy owner:** Project Maintainer (54x1) · **Version:** 1.0 · **Effective:** 2026-09-08 · **Review:** annually (next 2027-09-08)
**Approved by:** ____________________ (Project Maintainer) **Date:** __________
**Criteria:** CC6.1, CC6.2, CC6.3, CC6.6

## 1. Maintainer and contributor accounts

1. The GitHub account that administers the repository must have two-factor
   authentication enabled (hardware key or authenticator app; SMS is not
   acceptable). Evidence: account security settings screenshot.
2. Accounts are individual. Shared accounts, shared tokens, and password reuse
   are prohibited. Credentials live in a password manager.
3. Commits to protected branches are signed (`git config commit.gpgsign true`)
   with a key registered on the account, so authorship is verifiable.
4. Contributors have **no write access**. They contribute by fork and pull
   request only. Direct collaborator access is granted only to additional
   maintainers, by the existing maintainer, and is recorded in the pull
   request or issue that approved it.
5. Access is reviewed at least annually (Settings > Collaborators) and removed
   within one business day when a person leaves the project. Removal revokes
   any personal access tokens and deploy keys they created.

## 2. Repository and branch protection

Both `main` and `dev` are protected: pull request required, review from Code
Owners required, status checks `verify` (CI) and `CodeQL` required to pass,
signed commits required, force pushes and deletions blocked, and the rules
apply to administrators. Bypass is not permitted; an emergency change follows
the expedited path in the Change Management Policy, still via pull request.

## 3. Automation and tokens

1. The default `GITHUB_TOKEN` in every workflow is read-only
   (`permissions: contents: read`). A job that needs more declares it
   explicitly and minimally in its own `permissions` block (for example
   `security-events: write` for CodeQL).
2. `actions/checkout` runs with `persist-credentials: false`.
3. Repository Actions settings allow only actions authored by GitHub or
   verified creators, and set the default workflow token to read-only.
4. Any future secret (for example a deploy token) is stored as a GitHub
   Actions encrypted secret, scoped to the narrowest environment, listed in
   `docs/compliance/VENDOR_REGISTER.md`, and rotated at least annually or on
   suspicion of exposure. No secret may appear in source, workflow files, CI
   logs, or issues. Secret scanning with push protection is enabled.

## 4. Hosting provider access

The hosting account is held by the maintainer, protected by 2FA, and limited
to the deployment of this project. Deploy credentials, if any, follow
section 3.

## 5. User-side authentication and session control (application design)

The application has no accounts. Access to a user's own data on their device
is protected as follows, and these parameters may only be weakened through
the Change Management Policy with a risk-register entry:

| Control | Parameter | Where |
|---|---|---|
| Master password minimum length | 8 characters (NIST SP 800-63B) | `src/utils/constants.ts` `MIN_MASTER_PASSWORD_LENGTH` |
| Key derivation | PBKDF2-SHA256, 600,000 iterations, 16-byte random salt | `src/utils/secureStorage.ts` |
| Encryption at rest | AES-256-GCM, 12-byte random IV per write | `src/utils/secureStorage.ts` |
| Password verification | Encrypted verifier; wrong password fails closed | `src/utils/secureStorage.ts` |
| Session termination | Store locks after 5 minutes idle or backgrounded, in "Ask every time" and "This session/tab" modes | `src/utils/inactivityLock.ts`, `STAY_UNLOCKED_INACTIVITY_MS` |
| Persistent auto-unlock ("This device") | Explicit opt-in; UI states the key is stored in plaintext in the browser; default is off | `App.vue` unlock screen, About page |
| Lock on demand | "Lock app" clears the in-memory key and decrypted data | `App.vue` `handleLock` |
| Insecure context | Encryption unavailable over plain HTTP; app shows a warning and runs in plaintext | `App.vue` `storeMode === "insecure"` |

Unit tests (`tests/secureStorage.test.ts`, `tests/inactivityLock.test.ts`)
are the design evidence; they run on every pull request.

## 6. Key management

The project holds no cryptographic keys. User keys are derived from the user's
password in the browser and are never transmitted. There is nothing for the
maintainer to escrow, rotate, or recover; a forgotten master password means
the encrypted data is unrecoverable, which the unlock screen states.
