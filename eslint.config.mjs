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

// ESLint flat config (SOC 2 CC8.1 change-management: static lint gate wired
// into `npm run verify` and CI). TypeScript + Vue SFCs via typescript-eslint
// and eslint-plugin-vue "flat/recommended".

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "public/ocr/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "sbom.cyclonedx.json",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/essential"],

  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        // Parse <script lang="ts"> blocks with the TS parser.
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
        sourceType: "module",
      },
    },
  },

  {
    rules: {
      // Pragmatic baseline for an existing codebase adopted as a gate:
      // unused vars are errors unless intentionally prefixed with _.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // `any` is allowed in a few parser/interop spots; keep it a warning so
      // new code is nudged toward types without blocking merges.
      "@typescript-eslint/no-explicit-any": "warn",
      "vue/multi-word-component-names": "off",
    },
  },

  // TypeScript/Vue: vue-tsc already reports undefined identifiers and ESLint's
  // no-undef does not understand type positions — disable it there.
  {
    files: ["**/*.ts", "**/*.vue"],
    rules: { "no-undef": "off" },
  },

  // Build/tooling scripts run under Node (tailwind.config.js is CJS-style).
  {
    files: ["scripts/**/*.{mjs,js}", "*.config.js", "postcss.config.js"],
    languageOptions: { globals: { ...globals.node } },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },

  // Legacy-debt downgrades — adopted-codebase gate, tighten over time:
  // - vue/no-mutating-props: established pattern in modal components.
  // - ban-ts-comment: pdfdiag harness opts out of type-checking deliberately.
  {
    rules: {
      "vue/no-mutating-props": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
    },
  },
);
