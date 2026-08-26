<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <!-- Phase 2: Share Code Modal -->
  <dialog ref="dialogRef" class="modal" aria-modal="true" aria-labelledby="shareCodeModalHeading" @close="$emit('close')">
    <div class="modal-box w-full max-w-2xl">
      <h3 id="shareCodeModalHeading" class="font-bold text-lg mb-4">
        🔗 Share Codes Generated
      </h3>

      <div class="space-y-4">
        <!-- Batch Info -->
        <div class="alert alert-info text-sm" v-if="shareBatchCount > 1">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-5 w-5" fill="none"
            viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Your data was split into {{ shareBatchCount }} batches ({{ maxShareTx }} transactions each).
            Share all codes to transfer complete data.
          </span>
        </div>

        <!-- Share Codes List -->
        <div v-for="(code, index) in shareCodes" :key="index" class="space-y-2">
          <div class="flex justify-between items-center">
            <label class="label">
              <span class="label-text font-semibold">
                {{ shareBatchCount > 1 ? `Batch ${index + 1} of ${shareBatchCount}` : 'Share Code' }}
              </span>
            </label>
            <span class="text-xs opacity-60">
              {{ code.length }} chars
            </span>
          </div>
          <div class="join">
            <input :value="code" readonly class="input input-bordered join-item flex-1 font-mono text-xs" />
            <button type="button" class="btn btn-sm join-item" @click="$emit('copy', code)">
              Copy
            </button>
          </div>
        </div>

        <!-- Phase 4: Expiration Info -->
        <div class="alert alert-warning text-sm" v-if="shareExpirationDays > 0">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-5 w-5" fill="none"
            viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            These codes will expire in {{ shareExpirationDays }} days
            ({{ new Date(Date.now() + shareExpirationDays * 24 * 60 * 60 * 1000).toLocaleDateString() }}).
          </span>
        </div>
      </div>

      <div class="modal-action">
        <button type="button" class="btn" @click="dialogRef?.close()">
          Close
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useDialogA11y } from "../composables/useDialogA11y";

const dialogRef = ref<HTMLDialogElement | null>(null);
const { openDialog } = useDialogA11y(dialogRef);
onMounted(openDialog);

defineProps<{
  shareBatchCount: number;
  shareCodes: string[];
  shareExpirationDays: number;
  maxShareTx: number;
}>();

defineEmits<{
  (e: "copy", text: string): void;
  (e: "close"): void;
}>();
</script>
