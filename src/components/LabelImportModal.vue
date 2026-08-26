<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <dialog v-if="labelImport.open" ref="dialogRef" class="modal" aria-modal="true" aria-labelledby="labelImportHeading"
    @close="$emit('cancel')">
    <div class="modal-box w-full max-w-md">
      <h3 id="labelImportHeading" class="font-bold text-lg">
        📝 Label this import
      </h3>
      <p class="mt-2 text-sm text-base-content/70">
        Give this CSV a name so you can filter and report on it later.
        <span v-if="labelImport.filename">
          (<strong>{{ labelImport.filename }}</strong>)
        </span>
      </p>

      <div class="form-control mt-4">
        <label class="label" for="importLabel">
          <span class="label-text">Name / Description</span>
        </label>
        <input id="importLabel" v-model="labelImport.label" type="text" class="input input-bordered"
          placeholder="e.g. NAB Credit Card – 2025 Q2" required />
      </div>

      <div class="form-control mt-3">
        <label class="label" for="importNote">
          <span class="label-text">Notes (optional)</span>
        </label>
        <input id="importNote" v-model="labelImport.note" type="text" class="input input-bordered"
          placeholder="Anything to remember about this file" />
      </div>

      <div class="mt-4 text-sm text-base-content/70">
        Ready to import
        <strong>{{ labelImport.imported.length }}</strong> transaction{{
          labelImport.imported.length === 1 ? "" : "s"
        }}
      </div>

      <!-- Tag selection for this import -->
      <div class="form-control mt-3">
        <label class="label" for="importTags">
          <span class="label-text">Tags (optional)</span>
          <span class="label-text-alt">{{ labelImport.tagsSelected.length }} selected</span>
        </label>

        <div class="join w-full">
          <input id="importTags" v-model="labelImport.tagsQuery" type="text"
            class="input input-bordered join-item flex-1" placeholder="Type a tag then press "
            @keydown.enter.prevent="$emit('add-tag-from-query')" />
          <button type="button" class="btn join-item" @click="$emit('add-tag-from-query')"
            :disabled="!labelImport.tagsQuery.trim()">
            ＋
          </button>
        </div>

        <!-- Selected as chips -->
        <div class="mt-2 flex flex-wrap gap-2">
          <span v-for="tg in labelImport.tagsSelected" :key="`sel-${tg}`" class="badge badge-primary gap-1">
            <span class="capitalize">{{ tg }}</span>
            <button type="button" class="btn btn-ghost btn-xs" @click="$emit('toggle-tag', tg)" aria-label="Remove tag">
              ✕
            </button>
          </span>
          <span v-if="!labelImport.tagsSelected.length" class="text-xs opacity-60">No tags</span>
        </div>

        <!-- Existing tags to click/toggle -->
        <div class="mt-3 border border-base-300 rounded-lg p-2 max-h-48 overflow-auto">
          <button v-for="tg in labelImportFilteredTags" :key="`opt-${tg}`" type="button" class="badge badge-ghost m-1"
            :class="{
              'badge-primary': labelImport.tagsSelected.some((t) =>
                eqi(t, tg)
              ),
            }" @click="$emit('toggle-tag', tg)">
            {{ tg }}
          </button>
          <div v-if="!labelImportFilteredTags.length" class="text-xs opacity-60 p-2">
            No tags yet
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button type="button" class="btn" @click="dialogRef?.close()">
          Cancel
        </button>
        <button type="button" class="btn btn-primary" :disabled="!labelImport.label.trim()"
          @click="$emit('confirm')">
          Import
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from "vue";
import { eqi } from "../utils/text";
import type { Transaction } from "../utils/types";
import { useDialogA11y } from "../composables/useDialogA11y";

const dialogRef = ref<HTMLDialogElement | null>(null);
const { openDialog } = useDialogA11y(dialogRef);

interface LabelImportState {
  open: boolean;
  filename: string;
  label: string;
  note: string;
  imported: Transaction[];
  tagsSelected: string[];
  tagsQuery: string;
}

const props = defineProps<{
  labelImport: LabelImportState;
  labelImportFilteredTags: string[];
}>();

// `<dialog>` stays invisible until `.showModal()` is called explicitly — the
// `v-if` above only controls whether the element exists in the DOM, not
// whether it renders. Re-open it every time `labelImport.open` flips true
// (each import), after Vue has created the element.
watch(
  () => props.labelImport.open,
  (open) => {
    if (open) nextTick(openDialog);
  }
);

defineEmits<{
  (e: "cancel"): void;
  (e: "confirm"): void;
  (e: "add-tag-from-query"): void;
  (e: "toggle-tag", tag: string): void;
}>();
</script>
