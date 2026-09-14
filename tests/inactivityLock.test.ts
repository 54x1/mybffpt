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

// Session-termination control (SOC 2 CC6.1): an unlocked, password-protected
// store must lock itself after STAY_UNLOCKED_INACTIVITY_MS of inactivity,
// whether the tab is idle in the foreground or was backgrounded.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  startInactivityWatch,
  stopInactivityWatch,
  hasExceededInactivityTimeout,
} from "../src/utils/inactivityLock";
import { STAY_UNLOCKED_INACTIVITY_MS, LS_KEYS } from "../src/utils/constants";

function setHidden(hidden: boolean, dispatch = true) {
  Object.defineProperty(document, "hidden", { value: hidden, configurable: true });
  if (dispatch) document.dispatchEvent(new Event("visibilitychange"));
}

describe("inactivityLock — session-termination control", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    setHidden(false, false);
  });

  afterEach(() => {
    stopInactivityWatch();
    vi.useRealTimers();
    delete (document as any).hidden; // restore jsdom's prototype getter
  });

  it("fires after the idle timeout with no user activity", () => {
    const onTimeout = vi.fn();
    startInactivityWatch(onTimeout);
    vi.advanceTimersByTime(STAY_UNLOCKED_INACTIVITY_MS - 1);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("resets the idle timer on user activity", () => {
    const onTimeout = vi.fn();
    startInactivityWatch(onTimeout);
    vi.advanceTimersByTime(STAY_UNLOCKED_INACTIVITY_MS - 1000);
    window.dispatchEvent(new Event("keydown"));
    vi.advanceTimersByTime(STAY_UNLOCKED_INACTIVITY_MS - 1000);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("fires when the tab returns from background after the timeout", () => {
    const onTimeout = vi.fn();
    startInactivityWatch(onTimeout);
    setHidden(true);
    expect(sessionStorage.getItem(LS_KEYS.lastHiddenAt)).not.toBeNull();
    vi.advanceTimersByTime(STAY_UNLOCKED_INACTIVITY_MS + 1);
    expect(hasExceededInactivityTimeout()).toBe(true);
    setHidden(false);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("does not fire when the tab returns before the timeout", () => {
    const onTimeout = vi.fn();
    startInactivityWatch(onTimeout);
    setHidden(true);
    vi.advanceTimersByTime(1000);
    setHidden(false);
    expect(onTimeout).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(LS_KEYS.lastHiddenAt)).toBeNull();
  });

  it("stopInactivityWatch clears timers, listeners, and bookkeeping", () => {
    const onTimeout = vi.fn();
    startInactivityWatch(onTimeout);
    setHidden(true);
    stopInactivityWatch();
    expect(sessionStorage.getItem(LS_KEYS.lastHiddenAt)).toBeNull();
    vi.advanceTimersByTime(STAY_UNLOCKED_INACTIVITY_MS * 2);
    setHidden(false);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("uses the latest callback when started again", () => {
    const first = vi.fn();
    const second = vi.fn();
    startInactivityWatch(first);
    startInactivityWatch(second);
    vi.advanceTimersByTime(STAY_UNLOCKED_INACTIVITY_MS);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
