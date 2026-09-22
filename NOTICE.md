# NOTICE

mybffpt is licensed under the **GNU Affero General Public License v3.0 or
later** (AGPL-3.0-or-later). See [LICENSE](LICENSE) for the full text.

Per AGPL-3.0 §4, this file records that no source files in this repository
have been modified from a third-party original — all `src/` code is
original work of this project's contributors. If that ever changes (e.g. a
vendored/modified third-party file is added), it must be noted here with a
description of the change, per §4(b).

## Derived Design

- `src/utils/pdf.ts` and `src/utils/pdfStatement.ts` are original TypeScript
  implementations written for this project. They implement parsing *strategies*
  (physical layout reconstruction à la `pdftotext -layout`, transaction-line
  anchoring, amount-column geometry inference) designed by the **monopoly**
  project ([benjamin-awd/monopoly](https://github.com/benjamin-awd/monopoly),
  AGPL-3.0), whose design was also studied via
  [StatementSensei](https://github.com/benjamin-awd/StatementSensei). No source
  code was copied; both projects share the AGPL-3.0 license, so even derivative
  works would remain compatible with this project's license.

## Third-Party Software

Third-party packages retain their own licenses; they are not relicensed under
the AGPL. The complete, versioned dependency inventory and the license texts
for production dependencies are in
[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md). A plain-text copy is
included at the root of every production build.

Run `npm run license:notices` after dependency changes. CI runs
`npm run license:notices:check` and fails if the generated notices are stale,
a production dependency lacks a license file, or a dependency introduces an
unreviewed license expression.
