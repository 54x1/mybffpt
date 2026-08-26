# Contributing to mybffpt

Thanks for your interest in contributing to myBudget Forecaster! This is a small, client-side, privacy-first project — contributions of any size are welcome.

## Workflow

1. Fork the repository and create a feature branch off `main` (or `dev`, if that's the active development branch).
2. Make your changes, following the code style below.
3. Run the full verification suite before opening a PR:
   ```bash
   npm run verify
   ```
4. Open a pull request against this repository describing what changed and why.

## Commit messages

Use short, imperative-mood summaries (e.g. `Fix CSV parser for Up Bank exports`, not `Fixed` or `Fixes`). Reference the motivation in the body if it isn't obvious from the summary alone.

## Code style

- **TypeScript**: `strict` mode is on (see [tsconfig.json](tsconfig.json)) — no `any` unless there's no reasonable alternative, and prefer explicit types at module boundaries.
- **Vue 3**: use the Composition API (`<script setup lang="ts">`), consistent with the rest of `src/components/`.
- **Formatting**: 2-space indentation, UTF-8, trailing newline — enforced by [.editorconfig](.editorconfig).
- **Licensing**: every new `.ts`, `.vue`, `.css`, `.js`, and `.html` source file must carry the AGPL-3.0-or-later SPDX header block used throughout the codebase (see any existing file under `src/` for the exact text). This is enforced by `npm run license:check`.

## Testing requirements

- Add or update **unit tests** (Vitest, `npm run unit`) for any logic change in `src/utils/` or `src/composables/`.
- Add or update **E2E tests** (Playwright, `npm run test:e2e`) for any user-facing flow change.
- If your change touches a modal, form, or interactive component, run `npm run a11y` and confirm no new axe-core violations.
- All contributed code must pass `npm run verify` before review.

## Licensing of contributions

By submitting a contribution, you agree it will be licensed under the **AGPL-3.0-or-later**, the same license as the rest of the project (see [LICENSE](LICENSE)). Do not submit code, assets, generated material, or data you don't have the rights to license this way. Clearly identify third-party material and preserve its copyright, attribution, modification, and license notices. After any dependency change, run `npm run license:notices` and commit the regenerated notice files.

## Releases

This project uses [Semantic Versioning](https://semver.org/). See [RELEASE.md](RELEASE.md) for the release checklist.

## Accessibility

mybffpt targets **WCAG 2.1 AA**. See [ACCESSIBILITY.md](ACCESSIBILITY.md) for the current commitment, known limitations, and how to report accessibility issues.
