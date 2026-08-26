<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <header class="navbar bg-base-200 shadow-lg sticky top-0 z-50" role="banner">
    <div class="navbar-start">
      <a href="#" class="flex items-center gap-3 min-w-0" @click.prevent="$emit('home')">
        <!-- Favicon logo (coffee cup motif) -->
        <img src="../assets/favicon.svg" class="shrink-0" width="36" height="36" alt="mybudget logo"
          aria-label="mybudget logo" />
        <div class="flex flex-col min-w-0 logo-text">
          <h1 class="text-lg md:text-xl font-normal text-base-content leading-tight tracking-tight">
            <span class="logo-line-1">mybudget</span><span class="logo-line-2 font-semibold"> Forecaster</span>
          </h1>
          <span class="text-[10px] text-base-content/70 font-normal tracking-[0.2em] uppercase hidden lg:inline">
            Finances Personally Tailored
          </span>
        </div>
      </a>
    </div>
    <nav class="navbar-center hidden lg:flex" aria-label="Primary">
      <div class="tabs tabs-boxed gap-1" role="tablist" aria-label="Main sections">
        <button v-for="tab in tabs" :key="tab.id" type="button" role="tab" :id="`tab-${tab.id}`"
          class="tab focus-ring target-min px-4 md:px-5 touch-manip btn-ghost" :class="{ 'tab-active': activeTab === tab.id }"
          @click="$emit('tab', tab.id)" :aria-selected="activeTab === tab.id" :aria-controls="`panel-${tab.id}`"
          :aria-current="activeTab === tab.id ? 'page' : undefined">
          <span aria-hidden="true" class="text-base">{{ tab.icon }}</span>
          <span class="ml-1.5 text-sm font-medium">{{ tab.label }}</span>
        </button>
      </div>
    </nav>

    <div class="navbar-end">
      <div class="flex items-start gap-1.5 flex-wrap min-w-0 mobile-nav-end">
        <!-- Balance badge -->
        <div class="balance-badge" aria-label="Account balance">
          <span class="badge-label">Balance</span>
          <span class="badge-value text-base-content" :aria-label="netBalanceFormatted.ariaLabel">
            <span aria-hidden="true">{{ netBalanceFormatted.sign }}</span>{{ netBalanceFormatted.value }}
          </span>
        </div>
        <!-- Settings cog: date format, theme, and lock consolidated into one panel -->
        <details class="dropdown dropdown-end transition-none mobile-dropdown-wrap">
          <summary class="btn btn-ghost btn-sm md:btn-md gap-1 transition-none" aria-haspopup="true"
            title="Settings">
            ⚙️ <span class="sr-only">Settings</span>
          </summary>
          <div class="dropdown-content z-[60] p-3 shadow bg-base-100 rounded-box w-72 mobile-dropdown-content">
            <!-- Date format sub-menu (plain <details> so the global outside-click
                 handler in App.vue, which only manages details.dropdown[open],
                 leaves it alone) -->
            <details class="mb-2">
              <summary class="cursor-pointer font-medium text-sm select-none">Date format</summary>
              <ul class="menu p-2 mt-1" role="listbox" aria-label="Date format">
                <li v-for="opt in dateFormatOptions" :key="opt.value">
                  <button type="button" role="option" class="justify-between gap-2"
                    :aria-selected="selectedDateFormat === opt.value"
                    :class="{ active: selectedDateFormat === opt.value }" @click="selectedDateFormat = opt.value">
                    <span class="flex flex-col">
                      <span class="font-medium">{{ opt.label }}</span>
                      <span class="text-xs opacity-60">{{ opt.example }}</span>
                    </span>
                    <span v-if="selectedDateFormat === opt.value" aria-hidden="true">✓</span>
                  </button>
                </li>
              </ul>
            </details>
            <!-- Theme sub-menu -->
            <details class="mb-2">
              <summary class="cursor-pointer font-medium text-sm select-none">Theme</summary>
              <ul class="menu p-2 mt-1 flex-nowrap max-h-64 overflow-y-auto" role="listbox" aria-label="Themes">
                <li v-for="theme in availableThemes" :key="theme">
                  <button type="button" role="option" class="justify-between gap-2"
                    :aria-selected="currentTheme === theme" :class="{ active: currentTheme === theme }"
                    @click="onThemeSelect(theme)">
                    <span class="inline-flex items-center gap-2">
                      <!-- Live swatch using DaisyUI theme tokens -->
                      <span :data-theme="theme" class="inline-flex items-center">
                        <span class="h-4 w-4 rounded-full border border-base-300 bg-primary" aria-hidden="true"></span>
                      </span>
                      <span class="capitalize">{{ theme }}</span>
                    </span>
                    <span class="opacity-70" v-if="currentTheme === theme" aria-hidden="true">●</span>
                  </button>
                </li>
              </ul>
            </details>
            <!-- M1: Security sub-menu (password protection + auto-unlock) -->
            <details v-if="securityAvailable" class="mb-2">
              <summary class="cursor-pointer font-medium text-sm select-none">Security</summary>
              <div class="p-2 mt-1 space-y-2">
                <label class="flex items-center justify-between gap-3 cursor-pointer" for="hdrPasswordProtection">
                  <span class="text-sm">Password protection</span>
                  <input id="hdrPasswordProtection" type="checkbox" class="toggle toggle-primary toggle-sm"
                    :class="{ 'pointer-events-none opacity-50': securityBusy }" :checked="passwordProtectionEnabled"
                    :disabled="securityBusy" @change="$emit('toggle-protection')" />
                </label>
                <label v-if="passwordProtectionEnabled" class="flex flex-col gap-1" for="hdrAutoUnlock">
                  <span class="text-sm">Auto-unlock</span>
                  <select id="hdrAutoUnlock" class="select select-bordered select-sm" :value="stayUnlockedMode"
                    @change="$emit('change-stay-unlocked-mode', ($event.target as HTMLSelectElement).value as 'off' | 'session' | 'device')">
                    <option value="off">Ask every time</option>
                    <option value="session">This session/tab</option>
                    <option value="device">This device</option>
                  </select>
                </label>
              </div>
            </details>
            <!-- M1: Lock app (re-locks the encrypted store) -->
            <button v-if="showLock" type="button" class="btn btn-ghost btn-sm w-full justify-start"
              title="Lock app" aria-label="Lock app" @click="$emit('lock')">
              🔒 Lock app
            </button>
          </div>
        </details>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useDateFormat } from "../composables/useDateFormat";
import { useTheme } from "../composables/useTheme";

withDefaults(
  defineProps<{
    tabs: { id: string; label: string; icon: string }[];
    activeTab: string;
    netBalanceFormatted: { sign: string; value: string; ariaLabel: string };
    /** M1: show the Lock button (only when the store is unlocked). */
    showLock?: boolean;
    /** M1: Web Crypto available (password protection can be offered). */
    securityAvailable?: boolean;
    /** M1: password protection currently on (master password set). */
    passwordProtectionEnabled?: boolean;
    /** M1: a protection toggle action is in flight. */
    securityBusy?: boolean;
    /** Stay-unlocked mode (only meaningful when protection is on). */
    stayUnlockedMode?: "off" | "session" | "device";
  }>(),
  {
    securityAvailable: false,
    passwordProtectionEnabled: false,
    securityBusy: false,
    stayUnlockedMode: "off",
  }
);

defineEmits<{
  (e: "home"): void;
  (e: "tab", id: string): void;
  (e: "lock"): void;
  (e: "toggle-protection"): void;
  (e: "change-stay-unlocked-mode", mode: "off" | "session" | "device"): void;
}>();

// Composable singletons — app-wide date-format and theme state.
const { selectedDateFormat, dateFormatOptions } = useDateFormat();
const { currentTheme, availableThemes, setTheme } = useTheme();

function onThemeSelect(theme: string) {
  setTheme(theme); // uses your existing setTheme()
}
</script>

<style scoped>
/* Sticky header with consistent height and reliable positioning */
header.navbar.sticky {
  /* Fixed height - balance widget overflows, doesn't push nav taller */
  min-height: 3.5rem;
  height: 3.5rem;
  /* Set CSS variable for nested sticky elements to use */
  --header-height: 3.5rem;
  /* Prevent header from becoming too tall on mobile */
  max-height: none;
  /* Allow balance widget to overflow past nav boundary */
  overflow: visible;
}

/* Balance badge: anchored to top of nav, always extends below with rounded bottom corners */
.balance-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.05rem;
  padding: 0.3rem 0.75rem 0.55rem;
  /* Sharp top corners, rounded bottom only */
  border-radius: 0 0 0.75rem 0.75rem;
  /* Theme-aware background */
  background-color: oklch(var(--b2));
  /* Shadow starts from nav boundary, casts downward for hanging depth */
  box-shadow:
    0 4px 6px -1px oklch(var(--bc) / 0.15),
    0 10px 15px -3px oklch(var(--bc) / 0.1);
  /* Badge always taller than nav, extending past bottom dynamically */
  min-height: calc(var(--header-height, 3.5rem) + 1.2rem);
  justify-content: flex-end;
  /* Negative bottom margin lets badge overflow the navbar */
  margin-top: 0;
  margin-bottom: -0.7rem;
  transform-origin: top right;
  position: relative;
  z-index: 10;
}

.badge-label {
  /* WCAG 1.4.4/1.4.12: keep caption text at a legible floor at every
     breakpoint (see the media queries below) and use rem so it scales
     with the user's root font-size setting, not just page zoom. */
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  /* Raised from /0.6 so the caption clears 4.5:1 contrast (WCAG 1.4.3)
     against the badge background across themes. */
  color: oklch(var(--bc) / 0.75);
  font-weight: 500;
}

.badge-value {
  font-size: 1.1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Icon-button alignment (settings cog, etc.) — starts at the same 768px
   breakpoint where Tailwind's `md:btn-md` grows the settings button, not at
   the 1024px `lg` breakpoint the tab row uses. Previously these rules only
   applied from 1024px, so between 768px and 1023px the button grew to
   btn-md (48px) while DaisyUI's default `.navbar-end{align-items:center}`
   centered the whole `.mobile-nav-end` row (whose height is set by the
   taller, deliberately-overflowing balance badge) and the unopposed
   Tailwind `items-start` on `.mobile-nav-end` then top-aligned the cog
   inside that shifted row — pushing it a few pixels above the header's top
   edge instead of centering it like the desktop layout does. */
@media screen and (min-width: 768px) {
  /* Allow balance widget to overflow the navbar, but center icon buttons */
  .navbar-end {
    align-items: flex-start;
    padding-top: 0.15rem;
    padding-bottom: 0.15rem;
  }

  /* Vertically center dropdown icon buttons */
  .navbar-end .mobile-nav-end {
    align-items: center;
  }

  /* Restore smooth hover on dropdown buttons. Direct-child combinator so
     the scale effect doesn't also apply to the nested "Date format" /
     "Theme" sub-menu summaries. */
  .mobile-dropdown-wrap > summary {
    transition: background-color 0.2s ease, color 0.2s ease, transform 0.15s ease !important;
  }

  .mobile-dropdown-wrap > summary:hover {
    transform: scale(1.1);
  }

  .mobile-dropdown-wrap > summary:active {
    transform: scale(0.95);
  }
}

/* Desktop tab alignment — vertically center tabs-boxed with logo */
@media screen and (min-width: 1024px) {
  header.navbar.sticky {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    padding: 0 1rem;
  }

  /* Tab row doesn't wrap on medium desktop, better spacing */
  .navbar-center .tabs-boxed {
    white-space: nowrap;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }

  .navbar-center .tabs-boxed .tab {
    padding: 0.25rem 0.6rem 1rem;

  }

  /* Overflow guard for narrow desktop */
  @media screen and (max-width: 1280px) {
    .navbar-center .tabs-boxed .tab {
      padding-left: 0.75rem;
      padding-right: 0.75rem;
      font-size: 0.875rem;
    }
  }
}

/* Mobile header adjustments */
@media screen and (max-width: 767px) {
  /* Mobile nav: compact fixed height so badge extends below */
  header.navbar.sticky {
    height: 3.5rem;
    min-height: 3.5rem;
    max-height: 3.5rem;
    overflow: visible;
    padding: 0 0.75rem;
  }

  /* Allow badge to overflow navbar on mobile */
  .navbar-end {
    align-items: flex-start;
    padding-top: 0.15rem;
    padding-bottom: 0.15rem;
  }

  /* Navbar end container: tighter spacing, proper alignment */
  .navbar-end .mobile-nav-end {
    gap: 0.35rem;
    align-items: center;
  }

  /* Dropdown tap feedback on mobile — same scale as the desktop hover
     state above, so the interaction reads consistently at every size.
     Direct-child combinator, same reason as the desktop rule above. */
  .mobile-dropdown-wrap > summary {
    transition: background-color 0.2s ease, transform 0.15s ease !important;
  }

  .mobile-dropdown-wrap > summary:hover {
    transform: scale(1.1);
  }

  .mobile-dropdown-wrap > summary:active {
    transform: scale(0.95);
  }

  /* Shrink title on mobile to prevent wrapping */
  .navbar-start h1 {
    font-size: 1rem;
  }

  /* Stack logo lines vertically on mobile */
  .navbar-start .logo-line-1,
  .navbar-start .logo-line-2 {
    display: block;
    line-height: 1.2;
  }

  .navbar-start .logo-line-1 {
    font-weight: 400;
  }

  .navbar-start .logo-line-2 {
    font-size: 0.85em;
  }

  /* Balance badge more compact on mobile, still extends past nav.
     max-width is a fixed length, not a percentage: its immediate parent
     (.mobile-nav-end) is shrink-to-fit (no explicit width), and a
     percentage width against an auto-sized ancestor collapses to the
     smallest stable size instead of the intended fraction — which is what
     was clipping the "Balance" label down to a few characters. */
  .balance-badge {
    padding: 0.25rem 0.5rem 0.4rem;
    min-height: calc(var(--header-height, 3.5rem) + 0.7rem);
    flex-shrink: 1;
    max-width: 8.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Mobile balance value still readable with proper padding */
  .balance-badge .badge-value {
    font-size: 0.85rem;
    padding: 0.1rem 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .balance-badge .badge-label {
    font-size: 0.625rem;
  }

  /* Dropdown wrapper: ensure proper positioning context */
  .mobile-dropdown-wrap {
    position: relative;
    flex-shrink: 0;
  }

  /* Dropdown buttons: better touch targets.
     Direct-child combinator only — a plain descendant selector here also
     matches the nested "Date format" / "Theme" sub-menu <summary> elements
     inside .dropdown-content, squashing their text labels into the same
     tiny icon-button square and wrapping "Date format" onto two lines. */
  .mobile-dropdown-wrap > summary {
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
  }

  /* Hide logo text only at very narrow screens where balance overlaps stacked lines */
  @media (max-width: 380px) {
    .navbar-start .logo-text {
      display: none;
    }
  }

  .navbar-start {
    /* DaisyUI's base .navbar-start sets `width: 50%` — with navbar-center
       hidden below `lg`, that pins this box at half the header even though
       its content (icon only, logo text hidden below 380px) is far
       narrower, starving navbar-end of the room the balance badge needs.
       `width: auto` lets flex-basis fall back to content size instead. */
    flex: 0 0 auto;
    width: auto;
    min-width: 0;
  }

  .navbar-end {
    /* Same DaisyUI `width: 50%` applies here too; reset it so flex-grow
       can claim the space navbar-start just gave up. */
    flex: 1 1 auto;
    width: auto;
    justify-content: flex-end;
    min-width: 0;
  }
}

/* Very small screens: compact badge further */
@media (max-width: 420px) {
  .balance-badge {
    padding: 0.15rem 0.4rem 0.3rem;
    min-height: calc(var(--header-height, 3.5rem) + 0.5rem);
    max-width: 7.5rem;
    overflow: hidden;
  }

  .balance-badge .badge-value {
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .balance-badge .badge-label {
    font-size: 0.65rem;
  }
}

/* XS screens (320px-375px): fix top nav alignment */
@media (max-width: 375px) {
  header.navbar.sticky {
    height: 3.25rem;
    min-height: 3.25rem;
    padding: 0 0.5rem;
  }

  .navbar-end .mobile-nav-end {
    gap: 0.2rem;
    align-items: center;
    flex-wrap: nowrap;
  }

  .balance-badge {
    padding: 0.2rem 0.35rem 0.35rem;
    min-height: calc(var(--header-height, 3.25rem) + 0.45rem);
    max-width: 6.5rem;
  }

  .balance-badge .badge-value {
    font-size: 0.75rem;
  }

  .balance-badge .badge-label {
    font-size: 0.625rem;
  }

  .mobile-dropdown-wrap > summary {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 0.9rem;
    padding: 0;
  }

  .navbar-start img {
    width: 28px;
    height: 28px;
  }

  .navbar-start h1 {
    font-size: 0.9rem;
  }
}
</style>
