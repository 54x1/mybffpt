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

import { onBeforeUnmount, watch, type Ref } from "vue";

/**
 * Focus-return-to-trigger for a native <dialog>: remembers whatever had
 * focus when the dialog opens and restores it when the dialog's `close`
 * event fires (Escape, backdrop form submit, or `.close()`). Native <dialog>
 * already gives focus trapping, top-layer stacking, and Escape-to-close for
 * free — this only adds the one thing it doesn't: returning focus on close.
 *
 * Call `openDialog()` wherever the component currently calls
 * `dialogRef.value?.showModal()`.
 */
export function useDialogA11y(dialogRef: Ref<HTMLDialogElement | null>) {
  let triggerEl: HTMLElement | null = null;

  function restoreFocus() {
    triggerEl?.focus?.();
    triggerEl = null;
  }

  function openDialog() {
    triggerEl = document.activeElement as HTMLElement | null;
    dialogRef.value?.showModal();
  }

  watch(
    dialogRef,
    (el, prevEl) => {
      prevEl?.removeEventListener("close", restoreFocus);
      el?.addEventListener("close", restoreFocus);
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    dialogRef.value?.removeEventListener("close", restoreFocus);
  });

  return { openDialog };
}
