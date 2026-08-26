<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <!-- Phase 3: Encrypted Share Modal -->
  <dialog ref="dialogRef" class="modal" aria-modal="true" aria-labelledby="encryptModalHeading" @close="$emit('close')">
    <div class="modal-box w-full max-w-md">
      <h3 id="encryptModalHeading" class="font-bold text-lg mb-4">
        🔒 Encrypt Share Data
      </h3>

      <div class="space-y-4">
        <div class="form-control">
          <label class="label cursor-pointer" for="encryptToggle">
            <span class="label-text">Encrypt with password</span>
            <input id="encryptToggle" v-model="encryptShareData" type="checkbox" class="toggle toggle-primary" />
          </label>
        </div>

        <template v-if="encryptShareData">
          <div class="form-control">
            <label class="label" for="sharePassword">
              <span class="label-text">Password</span>
            </label>
            <input id="sharePassword" v-model="sharePassword" type="password" class="input input-bordered"
              placeholder="Enter password" />
          </div>

          <div class="form-control">
            <label class="label" for="confirmPassword">
              <span class="label-text">Confirm Password</span>
            </label>
            <input id="confirmPassword" v-model="shareConfirmPassword" type="password" class="input input-bordered"
              placeholder="Confirm password" />
          </div>

          <div v-if="sharePassword && sharePassword !== shareConfirmPassword" class="alert alert-error text-sm">
            <span>Passwords do not match</span>
          </div>

          <div class="alert alert-info text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-5 w-5" fill="none"
              viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>
              Your data will be encrypted with AES-256-GCM. Share the password separately.
            </span>
          </div>
        </template>

        <!-- Phase 4: Expiration Options -->
        <div class="form-control">
          <label class="label" for="expirationSelect">
            <span class="label-text">Expiration</span>
          </label>
          <select id="expirationSelect" v-model="shareExpirationDays" class="select select-bordered">
            <option v-for="opt in shareExpirationOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="modal-action">
        <button type="button" class="btn btn-ghost" @click="dialogRef?.close()">
          Cancel
        </button>
        <button type="button" class="btn btn-primary" @click="$emit('generate')"
          :disabled="encryptShareData && (sharePassword !== shareConfirmPassword || !sharePassword)">
          Generate Share Codes
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

const encryptShareData = defineModel<boolean>("encryptShareData", { required: true });
const sharePassword = defineModel<string>("sharePassword", { required: true });
const shareConfirmPassword = defineModel<string>("shareConfirmPassword", { required: true });
const shareExpirationDays = defineModel<number>("shareExpirationDays", { required: true });

defineProps<{
  shareExpirationOptions: { value: number; label: string }[];
}>();

defineEmits<{
  (e: "close"): void;
  (e: "generate"): void;
}>();
</script>
