<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <dialog ref="dialogRef" class="modal" aria-modal="true" aria-labelledby="smartSelectHeading" @close="$emit('close')">
    <div class="modal-box w-full max-w-lg">
      <h3 id="smartSelectHeading" class="font-bold text-lg">
        🎯 Smart Select
      </h3>
      <div class="py-2 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="form-control">
          <label class="label" for="ssCategory">
            <span class="label-text">Category</span>
          </label>
          <select id="ssCategory" v-model="smartSelect.category" class="select select-bordered select-sm">
            <option value="">Any</option>
            <option v-for="c in categories" :value="c" :key="c">
              {{ c }}
            </option>
          </select>
        </div>

        <div class="form-control">
          <label class="label" for="ssType">
            <span class="label-text">Type</span>
          </label>
          <select id="ssType" v-model="smartSelect.type" class="select select-bordered select-sm">
            <option value="">Any</option>
            <option value="income">💰 Income</option>
            <option value="spending">💸 Spending</option>
          </select>
        </div>

        <div class="form-control">
          <label class="label" for="ssMin">
            <span class="label-text">Min Amount</span>
          </label>
          <input id="ssMin" v-model.number="smartSelect.min" type="number" step="0.01"
            class="input input-bordered input-sm" />
        </div>

        <div class="form-control">
          <label class="label" for="ssMax">
            <span class="label-text">Max Amount</span>
          </label>
          <input id="ssMax" v-model.number="smartSelect.max" type="number" step="0.01"
            class="input input-bordered input-sm" />
        </div>

        <div class="form-control">
          <label class="label" for="ssFrom">
            <span class="label-text">From</span>
          </label>
          <DatePicker id="ssFrom" v-model="smartSelect.from" aria-label="selection start date"
            :max="smartSelect.to" />
        </div>

        <div class="form-control">
          <label class="label" for="ssTo">
            <span class="label-text">To</span>
          </label>
          <DatePicker id="ssTo" v-model="smartSelect.to" aria-label="selection end date" :min="smartSelect.from" />
        </div>

        <div class="form-control md:col-span-2">
          <label class="label" for="ssContains">
            <span class="label-text">Description contains</span>
          </label>
          <input id="ssContains" v-model="smartSelect.contains" type="text" class="input input-bordered input-sm" />
        </div>
      </div>

      <div class="modal-action">
        <button type="button" class="btn btn-primary" @click="$emit('apply')">
          Select
        </button>
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
import DatePicker from "./DatePicker.vue";
import type { TransactionType } from "../utils/types";
import { useDialogA11y } from "../composables/useDialogA11y";

const dialogRef = ref<HTMLDialogElement | null>(null);
const { openDialog } = useDialogA11y(dialogRef);
onMounted(openDialog);

interface SmartSelectState {
  category: string;
  type: "" | TransactionType;
  min: number | null;
  max: number | null;
  from: string;
  to: string;
  contains: string;
}

defineProps<{
  smartSelect: SmartSelectState;
  categories: string[];
}>();

defineEmits<{
  (e: "apply"): void;
  (e: "close"): void;
}>();
</script>
