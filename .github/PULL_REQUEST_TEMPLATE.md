## Summary

<!-- What changed and why. Link the issue if there is one. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Dependency update
- [ ] Documentation / policy
- [ ] CI / build / tooling

## Change-management checklist (docs/policies/CHANGE_MANAGEMENT_POLICY.md)

- [ ] `npm run verify` passes locally (type-check, unit, license checks, build, audit, a11y)
- [ ] Unit tests added or updated for logic changes in `src/utils/` or `src/composables/`
- [ ] E2E / a11y tests updated for user-facing flow changes
- [ ] `CHANGELOG.md` `[Unreleased]` section updated
- [ ] No secrets, credentials, or real financial data in the diff
- [ ] Third-party notices regenerated after any dependency change (`npm run license:notices`)

## Security impact

<!-- Does this touch storage, encryption, import/export parsing, the CSP, headers, or CI?
     If yes, describe the risk and how it was tested. If no, write "None". -->

## Rollback

<!-- How is this reverted if it causes a problem? Usually: revert the merge commit. -->
