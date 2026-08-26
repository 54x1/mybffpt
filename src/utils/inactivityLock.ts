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

// ===== Stay-unlocked ("session" mode) inactivity lock =====
//
// A backgrounded tab is not the same as a closed one: mobile browsers commonly
// suspend a tab (home button / app-switch) without tearing it down, so its
// sessionStorage — and the auto-unlock key in it — can survive indefinitely.
// This module force-locks after a period of inactivity so "session" mode has
// a bounded exposure window even when the tab never actually closes.
//
// Two independent triggers, since background timers are throttled/suspended
// and can't be trusted alone:
//   - Backgrounding: record a timestamp on visibilitychange→hidden; compare
//     elapsed time on visibilitychange→visible / pageshow (fires even if the
//     page was suspended and JS never ran while hidden).
//   - Foreground idle: a plain timer reset on user interaction, since the tab
//     is active and timers run normally here.

import { LS_KEYS, STAY_UNLOCKED_INACTIVITY_MS } from "./constants";
import { devWarn } from "./debug";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let onTimeoutCb: (() => void) | null = null;
let listenersAttached = false;

function recordHiddenNow(): void {
  try {
    sessionStorage.setItem(LS_KEYS.lastHiddenAt, String(Date.now()));
  } catch (e) {
    devWarn("Failed to record inactivity timestamp:", e);
  }
}

/** True when more time has passed since the tab was last hidden than the timeout allows. */
export function hasExceededInactivityTimeout(): boolean {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(LS_KEYS.lastHiddenAt);
  } catch {
    return false;
  }
  if (!raw) return false;
  const hiddenAt = Number(raw);
  if (!Number.isFinite(hiddenAt)) return false;
  return Date.now() - hiddenAt >= STAY_UNLOCKED_INACTIVITY_MS;
}

function clearHiddenMark(): void {
  try {
    sessionStorage.removeItem(LS_KEYS.lastHiddenAt);
  } catch {
    /* ignore */
  }
}

function resetIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => onTimeoutCb?.(), STAY_UNLOCKED_INACTIVITY_MS);
}

function stopIdleTimer(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function handleVisibilityChange(): void {
  if (document.hidden) {
    recordHiddenNow();
    stopIdleTimer();
  } else {
    if (hasExceededInactivityTimeout()) {
      onTimeoutCb?.();
      return;
    }
    clearHiddenMark();
    resetIdleTimer();
  }
}

function handlePageShow(): void {
  if (hasExceededInactivityTimeout()) onTimeoutCb?.();
}

/**
 * Start watching for inactivity (backgrounding + foreground idle). Call once
 * the store is unlocked in "session" stay-unlocked mode; `onTimeout` should
 * lock the store. Safe to call repeatedly — only the first call attaches
 * listeners, but `onTimeout` is always updated to the latest callback.
 */
export function startInactivityWatch(onTimeout: () => void): void {
  onTimeoutCb = onTimeout;
  if (listenersAttached) return;
  listenersAttached = true;
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pageshow", handlePageShow);
  for (const ev of ACTIVITY_EVENTS) {
    window.addEventListener(ev, resetIdleTimer, { passive: true });
  }
  resetIdleTimer();
}

/** Stop watching and clear any inactivity bookkeeping. */
export function stopInactivityWatch(): void {
  onTimeoutCb = null;
  stopIdleTimer();
  clearHiddenMark();
  if (!listenersAttached) return;
  listenersAttached = false;
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("pageshow", handlePageShow);
  for (const ev of ACTIVITY_EVENTS) {
    window.removeEventListener(ev, resetIdleTimer);
  }
}
