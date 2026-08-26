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

// --- DaisyUI → Chart.js color helpers ---
// Theme color token mapping
export type Token =
  | "primary"
  | "primaryContent"
  | "secondary"
  | "secondaryContent"
  | "accent"
  | "accentContent"
  | "neutral"
  | "neutralContent"
  | "base1"
  | "base2"
  | "base3"
  | "baseContent"
  | "info"
  | "success"
  | "warning"
  | "error";

export const TOKEN_VAR: Record<Token, string> = {
  primary: "--p",
  primaryContent: "--pc",
  secondary: "--s",
  secondaryContent: "--sc",
  accent: "--a",
  accentContent: "--ac",
  neutral: "--n",
  neutralContent: "--nc",
  base1: "--b1",
  base2: "--b2",
  base3: "--b3",
  baseContent: "--bc",
  info: "--in",
  success: "--su",
  warning: "--wa",
  error: "--er",
};

// Read CSS custom properties directly from :root (document.documentElement)
// DaisyUI 4.x stores theme tokens as OKLCH values (e.g., "75.46% 0.183 346.81")
// Uses Canvas 2D pixel rendering to convert OKLCH to RGB
// PERFORMANCE: Cache resolved RGB values per theme version to avoid redundant
// getComputedStyle() + canvas getImageData() on every render/hover/animation frame.
let _canvas: HTMLCanvasElement | null = null;
let _ctx: CanvasRenderingContext2D | null = null;

function getCanvas(): CanvasRenderingContext2D {
  if (!_canvas) {
    _canvas = document.createElement("canvas");
    _canvas.width = 1;
    _canvas.height = 1;
    _ctx = _canvas.getContext("2d", { willReadFrequently: true });
  }
  return _ctx!;
}

// Cache: varName -> resolved RGB string, invalidated on theme change
let _cssVarCache: Map<string, string> | null = null;

export function cssVarToRGB(varName: string): string {
  // Fast path: return cached value if cache is still valid
  if (_cssVarCache?.has(varName)) return _cssVarCache.get(varName)!;

  const rootStyles = getComputedStyle(document.documentElement);
  const value = rootStyles.getPropertyValue(varName).trim();
  if (!value) {
    _cssVarCache?.set(varName, "rgb(0,0,0)");
    return "rgb(0,0,0)";
  }

  // If the value is already an RGB/RGBA string, return it directly
  if (value.startsWith('rgb')) {
    _cssVarCache?.set(varName, value);
    return value;
  }

  // Use Canvas pixel rendering to convert OKLCH to RGB
  // Modern browsers keep OKLCH internally, so fillStyle returns OKLCH as-is
  // Drawing a pixel and reading the image data gives us actual RGB values
  const ctx = getCanvas();
  ctx.fillStyle = `oklch(${value})`;
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  const rgb = `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
  _cssVarCache?.set(varName, rgb);
  return rgb;
}

export function withAlpha(rgbOrRgba: string, alpha = 1): string {
  const m = rgbOrRgba.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i
  );
  if (!m) return rgbOrRgba;
  const r = +m[1], g = +m[2], b = +m[3];
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Cache: "token:alpha" -> resolved color string, invalidated on theme change
let _themeColorCache: Map<string, string> | null = null;

export function themeColor(token: Token, alpha = 1): string {
  const cacheKey = `${token}:${alpha}`;
  if (_themeColorCache?.has(cacheKey)) return _themeColorCache.get(cacheKey)!;
  const result = withAlpha(cssVarToRGB(TOKEN_VAR[token]), alpha);
  _themeColorCache?.set(cacheKey, result);
  return result;
}

// Invalidate caches when theme changes (called by the theme watcher)
export function invalidateColorCaches() {
  _cssVarCache = new Map();
  _themeColorCache = new Map();
}

export function themePalette(n: number): string[] {
  // Expanded seed palette: 8 vibrant, high-contrast tokens (no neutral)
  // Ordered for maximum hue diversity across the spectrum
  const seeds: Token[] = [
    "primary",    // Blue
    "success",    // Green
    "warning",    // Yellow
    "error",      // Red
    "info",       // Cyan
    "secondary",  // Purple
    "accent",     // Pink
    "neutral",    // Slate (last position, only for >8 categories)
  ];
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const seedIdx = i % seeds.length;
    const cycle = Math.floor(i / seeds.length);

    if (cycle === 0) {
      // First cycle: base theme colors with slight opacity for WCAG contrast
      out.push(themeColor(seeds[seedIdx], 0.88));
    } else {
      // Subsequent cycles: 45° hue rotation for better separation
      const baseRGB = cssVarToRGB(TOKEN_VAR[seeds[seedIdx]]);
      const rotated = shiftHue(baseRGB, cycle * 45);
      // Gentler alpha decay: 0.88 → 0.78 (vs 0.65 before)
      out.push(withAlpha(rotated, Math.max(0.78, 0.88 - cycle * 0.05)));
    }
  }
  return out;
}

export function normalizeChartLabel(label: string): string {
  return label.trim().toLowerCase();
}

export function hashChartLabel(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hue = ((h % 360) + 360) % 360 / 360;

  if (s === 0) {
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const hue2rgb = (p0: number, q0: number, t0: number) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p0 + (q0 - p0) * 6 * t;
    if (t < 1 / 2) return q0;
    if (t < 2 / 3) return p0 + (q0 - p0) * (2 / 3 - t) * 6;
    return p0;
  };

  return {
    r: Math.round(hue2rgb(p, q, hue + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hue) * 255),
    b: Math.round(hue2rgb(p, q, hue - 1 / 3) * 255),
  };
}

// Global category-to-palette-index map (persisted across renders)
const categoryPaletteMap = new Map<string, number>();
let categoryPaletteCounter = 0;

export function getCategoryPaletteIndex(label: string): number {
  const normalized = normalizeChartLabel(label);
  if (!normalized) return 0;
  if (!categoryPaletteMap.has(normalized)) {
    categoryPaletteMap.set(normalized, categoryPaletteCounter++);
  }
  return categoryPaletteMap.get(normalized)!;
}

export function stableLabelColor(label: string, alpha = 1): string {
  const normalized = normalizeChartLabel(label);
  if (!normalized) return themeColor("primary", alpha);

  // Use theme-aware palette: each category gets a persistent index into themePalette
  const idx = getCategoryPaletteIndex(label);
  // themePalette generates colors from DaisyUI theme tokens
  // We need enough colors for all categories, so request idx+1 colors and take the last one
  const palette = themePalette(idx + 1);
  return withAlpha(palette[idx], alpha);
}

// ── Unified Category / Tag Color Map ──
// Deterministic label→color mapping so the same category or tag stays the same
// color across pie, radar, scatter, bubble, and bubble hierarchy diagrams.
export function getCategoryColor(category: string): string {
  return stableLabelColor(category);
}

export function formatChartTooltipTitle(label: string): string {
  if (!label) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    const d = new Date(`${label}T00:00:00`);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [year, month] = label.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }
  if (/^\d{4}-Q\d$/.test(label)) {
    const [year, quarter] = label.split("-Q");
    return `Q${quarter} ${year}`;
  }
  return label;
}

export function resolveTooltipColor(ctx: any): string {
  const background = ctx.dataset?.backgroundColor;
  if (Array.isArray(background)) {
    return background[ctx.dataIndex] ?? background[0] ?? themeColor("primary");
  }

  const border = ctx.dataset?.borderColor;
  if (Array.isArray(border)) {
    return border[ctx.dataIndex] ?? border[0] ?? themeColor("primary");
  }
  return border ?? background ?? themeColor("primary");
}

// Shift hue of an RGB color by degrees (0-360)
export function shiftHue(rgb: string, degrees: number): string {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return rgb;
  let r = +m[1] / 255, g = +m[2] / 255, b = +m[3] / 255;

  // RGB to HSL
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  // Shift hue
  h = (h + degrees / 360) % 1;
  if (h < 0) h += 1;

  // HSL to RGB
  const hue2rgb = (p: number, q: number, t: number) => {
    let u = t < 0 ? t + 1 : t;
    let v = u > 1 ? u - 1 : u;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}
