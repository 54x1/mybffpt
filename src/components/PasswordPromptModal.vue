<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <dialog ref="dialogRef" class="modal" aria-modal="true" aria-labelledby="passwordPromptHeading" @close="$emit('close')">
    <div class="modal-box w-full max-w-md">
      <h3 id="passwordPromptHeading" class="font-bold text-lg mb-4">
        🔐 {{ title }}
      </h3>

      <div class="space-y-4">
        <div class="form-control">
          <label class="label" for="promptPassword">
            <span class="label-text">Password</span>
          </label>
          <input id="promptPassword" v-model="password" type="password" class="input input-bordered"
            placeholder="Enter password" autocomplete="off" @keyup.enter="submit" />
        </div>

        <div v-if="error" class="alert alert-error text-sm">
          <span>{{ error }}</span>
        </div>

        <div class="alert alert-info text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-5 w-5" fill="none"
            viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>{{ infoText }}</span>
        </div>
      </div>

      <div class="modal-action">
        <button type="button" class="btn btn-ghost" @click="dialogRef?.close()">
          Cancel
        </button>
        <button type="button" class="btn btn-primary" @click="submit" :disabled="!password">
          {{ confirmLabel }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useDialogA11y } from "../composables/useDialogA11y";

const dialogRef = ref<HTMLDialogElement | null>(null);
const { openDialog } = useDialogA11y(dialogRef);
onMounted(openDialog);

const props = defineProps<{
  title?: string;
  /** Label for the primary (submit) button. Defaults to "Decrypt". */
  confirmLabel?: string;
  /** Body text for the info alert. */
  infoText?: string;
}>();

const confirmLabel = computed(() => props.confirmLabel ?? "Decrypt");
const infoText = computed(
  () =>
    props.infoText ??
    "This share code is password-protected. The password is only used to decrypt it locally in your browser and is never stored or sent anywhere."
);

const password = ref("");
const error = ref("");

const emit = defineEmits<{
  (e: "close"): void;
  (e: "submit", password: string): void;
}>();

function submit() {
  if (!password.value) {
    error.value = "Password is required";
    return;
  }
  // Emit the password and let the parent close the modal.
  emit("submit", password.value);
}
</script>
