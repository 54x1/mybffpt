/*
 * mybffpt — myBudget Forecaster
 * Copyright (C) 2026 54x1
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of mybffpt, free software licensed under the GNU Affero
 * General Public License v3.0 or later. See the LICENSE file in the project
 * root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
 */

// Boundary-protection controls (SOC 2 CC6.6 / CC6.7): the Content-Security-
// Policy must be present, strict, and identical between the <meta> tag that
// ships in the bundle and the hosting-layer header file, and the hosting
// header file must carry HSTS and the other response headers.

import { describe, it, expect } from "vitest";
import html from "../index.html?raw";
import headersFile from "../public/_headers?raw";

function parseCsp(csp: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const part of csp.split(";")) {
    const t = part.trim();
    if (!t) continue;
    const [name, ...vals] = t.split(/\s+/);
    m.set(name, vals.join(" "));
  }
  return m;
}

/** `Name: value` lines from public/_headers (comments and the path line skipped). */
function parseHeaders(text: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("/")) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    m.set(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
  }
  return m;
}

const metaCsp = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1];
const hostHeaders = parseHeaders(headersFile);
const headerCsp = hostHeaders.get("Content-Security-Policy");

describe("Content-Security-Policy", () => {
  it("is declared in index.html", () => {
    expect(metaCsp).toBeDefined();
  });

  it("is declared in public/_headers", () => {
    expect(headerCsp).toBeDefined();
  });

  it("is identical in index.html and public/_headers", () => {
    expect(parseCsp(metaCsp!)).toEqual(parseCsp(headerCsp!));
  });

  it.each([
    ["default-src", "'self'"],
    ["script-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["frame-ancestors", "'none'"],
    ["form-action", "'self'"],
    ["frame-src", "'none'"],
  ])("sets %s to %s", (directive, value) => {
    expect(parseCsp(metaCsp!).get(directive)).toBe(value);
  });

  it("never allows inline, eval, or remote script", () => {
    const scriptSrc = parseCsp(metaCsp!).get("script-src")!;
    expect(scriptSrc).not.toMatch(/unsafe-inline|unsafe-eval|https?:|\*/);
  });
});

describe("hosting security headers (public/_headers)", () => {
  it.each([
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "X-Permitted-Cross-Domain-Policies",
    "Cross-Origin-Opener-Policy",
    "Cross-Origin-Resource-Policy",
  ])("sets %s", (name) => {
    const value = hostHeaders.get(name);
    expect(value, name + " missing from public/_headers").toBeDefined();
    expect(value).not.toBe("");
  });

  it("HSTS max-age is at least one year and includes subdomains", () => {
    const hsts = hostHeaders.get("Strict-Transport-Security") ?? "";
    const maxAge = Number(hsts.match(/max-age=(\d+)/)?.[1] ?? 0);
    expect(maxAge).toBeGreaterThanOrEqual(31_536_000);
    expect(hsts).toContain("includeSubDomains");
  });

  it("denies framing at both the CSP and X-Frame-Options layers", () => {
    expect(hostHeaders.get("X-Frame-Options")).toBe("DENY");
    expect(parseCsp(headerCsp!).get("frame-ancestors")).toBe("'none'");
  });
});
