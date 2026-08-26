<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <!-- Phase 1: Export Format Modal -->
  <dialog ref="dialogRef" class="modal" aria-modal="true" aria-labelledby="exportModalHeading" @close="$emit('close')">
    <div class="modal-box w-full max-w-md">
      <h3 id="exportModalHeading" class="font-bold text-lg mb-4">
        📤 Export Your Data
      </h3>

      <!-- Format Selection -->
      <div class="space-y-4">
        <div class="form-control">
          <label class="label" for="exportFormat">
            <span class="label-text">Format</span>
          </label>
          <select id="exportFormat" v-model="exportFormat" class="select select-bordered">
            <option value="json">JSON (Recommended)</option>
            <option value="csv">CSV (Spreadsheet)</option>
            <option value="qif">QIF (Quicken)</option>
          </select>
        </div>

        <div class="form-control">
          <label class="label" for="exportPrefix">
            <span class="label-text">Filename Prefix</span>
          </label>
          <input id="exportPrefix" v-model="exportFilenamePrefix" type="text" class="input input-bordered"
            placeholder="financial-export" />
        </div>

        <!-- Optional password protection -->
        <div class="form-control">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" class="checkbox checkbox-sm" v-model="protectExport" />
            <span class="text-sm">Protect with password</span>
          </label>
          <input v-if="protectExport" v-model="exportPassword" type="password" class="input input-bordered mt-2"
            placeholder="Export password" autocomplete="new-password" aria-label="Export password" />
          <p v-if="protectExport" class="text-xs opacity-60 mt-1">
            The exported file will be encrypted. You'll need this password to
            decrypt it.
          </p>
          <div v-if="protectExport && !exportPassword.trim()" class="alert alert-warning text-xs mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-4 w-4" fill="none"
              viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              No password set — the file will be trivially decryptable. Enter a
              password to actually protect it.
            </span>
          </div>
        </div>

        <!-- Format Info -->
        <div class="alert alert-info text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-5 w-5" fill="none"
            viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <template v-if="exportFormat === 'json'">
              Full data with metadata, best for backups.
            </template>
            <template v-else-if="exportFormat === 'csv'">
              Universal spreadsheet format, works with Excel/Google Sheets.
            </template>
            <template v-else>
              Quicken Interchange Format, compatible with many financial apps.
            </template>
          </span>
        </div>

        <!-- Progress Bar -->
        <div v-if="exportInProgress" class="space-y-2">
          <progress class="progress progress-primary w-full" :value="exportProgress" max="100"></progress>
          <p class="text-xs text-center opacity-70">
            Exporting... {{ exportProgress }}%
          </p>
        </div>
      </div>

      <div class="modal-action">
        <button type="button" class="btn btn-ghost" @click="dialogRef?.close()" :disabled="exportInProgress">
          Cancel
        </button>
        <button type="button" class="btn btn-primary" @click="$emit('export')"
          :disabled="exportInProgress || transactionCount === 0">
          <span v-if="!exportInProgress">Export Now</span>
          <span v-else class="loading loading-spinner loading-sm"></span>
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

const exportFormat = defineModel<'json' | 'csv' | 'qif'>("exportFormat", { required: true });
const exportFilenamePrefix = defineModel<string>("exportFilenamePrefix", { required: true });
const protectExport = defineModel<boolean>("protectExport", { required: true });
const exportPassword = defineModel<string>("exportPassword", { required: true });

defineProps<{
  exportInProgress: boolean;
  exportProgress: number;
  transactionCount: number;
}>();

defineEmits<{
  (e: "close"): void;
  (e: "export"): void;
}>();
</script>
