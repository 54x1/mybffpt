# Release Checklist

1. Bump the version in `package.json` (follows [Semantic Versioning](https://semver.org/)).
2. Move the `[Unreleased]` section in [CHANGELOG.md](CHANGELOG.md) to a new dated version heading; start a fresh empty `[Unreleased]` section above it.
3. Regenerate the third-party inventory and license texts after dependency
   changes:
   ```bash
   npm run license:notices
   ```
4. Run the full verification suite and confirm it's clean:
   ```bash
   npm run verify
   ```
5. Confirm `dist/THIRD_PARTY_LICENSES.txt` is present in any built artifact.
6. Commit the version bump, changelog, and any regenerated notices.
7. Tag the commit: `git tag vX.Y.Z && git push origin vX.Y.Z`.
8. Create a GitHub release from the tag. Since mybffpt is AGPL-3.0-or-later, attach a **source tarball** (`git archive --format=tar.gz -o mybffpt-X.Y.Z-source.tar.gz vX.Y.Z`) alongside any built artifacts — AGPL §13 requires corresponding source to be available to users, and a source tarball is the simplest way to guarantee that regardless of how/where the app is deployed.
9. Copy the relevant `CHANGELOG.md` section into the GitHub release notes.
