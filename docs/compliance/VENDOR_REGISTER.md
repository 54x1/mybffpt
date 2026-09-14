# Vendor and subservice-organisation register

**Owner:** Project Maintainer (54x1) · **Last review:** 2026-09-08 · **Next review:** 2027-09-08 · Governed by `docs/policies/VENDOR_MANAGEMENT_POLICY.md`.

Criticality: **High** = a compromise or outage directly affects the service commitments; **Medium** = affects development or release; **Low** = no production impact.

| Vendor | Service used | Data shared | Criticality | Assurance relied on | Review action |
|---|---|---|---|---|---|
| GitHub, Inc. (Microsoft) | Source control, pull-request review, GitHub Actions CI, Dependabot, CodeQL, Security Advisories, releases | Source code (public), CI logs, SBOM artefacts, private vulnerability reports | High | GitHub publishes SOC 2 Type 2 and ISO 27001 reports (available to customers via GitHub's compliance portal) | Obtain the current SOC 2 report annually; confirm no relevant exceptions |
| Static hosting / CDN provider | Serves the built `dist/` over HTTPS with the headers in `public/_headers` | Standard web-server access logs (IP, user agent, path). **No user application data.** | High | **Record here:** provider name, plan, region, and link to its SOC 2 / ISO report. Netlify, Cloudflare, and Vercel all publish SOC 2 Type 2 reports. | Verify headers after each deployment (`docs/DEPLOYMENT.md`); obtain report annually |
| npm registry (GitHub) | Package distribution for build-time dependencies | None (public packages) | Medium | Covered by GitHub's reports; integrity hashes in `package-lock.json`; `npm ci --ignore-scripts` | Weekly `npm audit`; Dependabot |
| Node.js (OpenJS Foundation) | Build/test runtime pinned by `.nvmrc` | None | Medium | Open-source project with a published security release process | Track LTS status; bump `.nvmrc` on security releases |
| Playwright / Chromium (Microsoft, Google) | End-to-end and accessibility testing in CI | None | Low (dev-only) | Open-source | Dependabot |
| Production npm dependencies (Vue, Chart.js, D3, DaisyUI, Tailwind) | Shipped in the browser bundle | None at runtime (CSP forbids network egress) | High | Inventoried with licences in `THIRD_PARTY_LICENSES.md`; CycloneDX SBOM per build; CodeQL scans the bundle sources | `npm audit`, Dependabot, weekly scheduled audit |

## Notes

- No vendor receives user financial data. The only data leaving the system
  boundary is public source code and CI metadata.
- Adding a runtime vendor (analytics, fonts, CDN scripts) is prohibited by the
  Secure Development Policy without a risk assessment and a CSP change, which
  `tests/csp.test.ts` would flag.
