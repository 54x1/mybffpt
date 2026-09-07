# Release Checklist

Releases are the change-management gate between reviewed code on `main` and
what users run (see `docs/policies/CHANGE_MANAGEMENT_POLICY.md`). Every step
produces evidence; keep the links.

1. Confirm the `main` branch CI run (CI, CodeQL) is green for the commit you
   intend to release. Do not release from a red or skipped run.
2. Bump the version in `package.json` (follows
   [Semantic Versioning](https://semver.org/)).
3. Move the `[Unreleased]` section in [CHANGELOG.md](CHANGELOG.md) to a new
   dated version heading; start a fresh empty `[Unreleased]` section above it.
   Security fixes go under a `### Security` heading and reference the advisory.
4. Regenerate the third-party inventory and licence texts after dependency
   changes:
   ```bash
   npm run license:notices
   ```
5. Run the full verification suite locally and confirm it is clean:
   ```bash
   npm run verify
   ```
6. Confirm `dist/THIRD_PARTY_LICENSES.txt` and `dist/_headers` are present in
   the build output.
7. Commit the version bump, changelog, and any regenerated notices via a pull
   request (never a direct push to `main`).
8. Tag the merge commit with a **signed** tag and push it:
   ```bash
   git tag -s vX.Y.Z -m "mybffpt vX.Y.Z"
   git push origin vX.Y.Z
   ```
9. Create a GitHub release from the tag and attach:
   - a **source tarball**
     (`git archive --format=tar.gz -o mybffpt-X.Y.Z-source.tar.gz vX.Y.Z`),
     required by AGPL section 13 so corresponding source is always available;
   - the **SBOM** for the release commit (`npm run sbom`, or download the
     `sbom-cyclonedx-<sha>` artifact from the CI run);
   - the built `dist/` as a zip, if you publish builds.
10. Copy the relevant `CHANGELOG.md` section into the GitHub release notes.
11. Deploy the release build and verify the hosting headers per
    [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md); keep the `curl -I` output with
    the release evidence.
