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

/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Security response headers served by the dev server *and* `vite preview`, so
// local runs behave like production. Production hosting must send the same
// set plus HSTS and the CSP: see public/_headers and docs/DEPLOYMENT.md. (The
// CSP itself ships as a <meta> tag in index.html so it applies on every host.)
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // App needs none of these browser features; deny by default.
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
  // Strict-Transport-Security is a production-hosting-layer concern
  // (the dev server serves plain HTTP) — see docs/DEPLOYMENT.md.
}

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0', // Listen on all interfaces for Tailscale access
    port: 3000,
    strictPort: false,
    // Restrict Host header to Tailscale MagicDNS names instead of `true`,
    // which would disable DNS-rebinding protection entirely
    allowedHosts: ['.ts.net'],
    headers: { ...SECURITY_HEADERS }
  },
  preview: {
    headers: { ...SECURITY_HEADERS }
  },
  build: {
    sourcemap: false,
    target: 'es2020'
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    exclude: [
      'tests/**/*.spec.ts', // Exclude Playwright E2E specs
      'src/main.test.ts', // Vue entry point, not a test file
      'node_modules/**'
    ]
  }
})
