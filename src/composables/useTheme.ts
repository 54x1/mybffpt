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

import { ref } from "vue";
import { LS_KEYS } from "../utils/constants";

// Module-scoped singleton theme state (Vue 3 simple-store pattern)
const currentTheme = ref("cupcake");

// Incremented after CSS custom properties propagate on theme switch,
// so chart data only re-evaluates when new colors are actually readable
const themeVersion = ref(0);

const availableThemes = [
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
];

function setTheme(theme: string) {
  currentTheme.value = theme;
  localStorage.setItem(LS_KEYS.theme, theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export function useTheme() {
  return { currentTheme, themeVersion, availableThemes, setTheme };
}
