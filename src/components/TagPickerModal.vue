<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <dialog v-if="tagPicker.open" ref="dialogRef" class="modal" aria-modal="true" aria-labelledby="tagPickerHeading"
    @close="$emit('close')">
    <div class="modal-box w-full max-w-2xl p-0 md:max-h-[80vh]">
      <!-- Sticky search/header -->
      <div class="p-3 bg-base-200 sticky top-0 z-10">
        <div class="flex items-center justify-between gap-2">
          <h3 id="tagPickerHeading" class="font-bold text-lg">Select Tags</h3>
          <button type="button" class="btn btn-ghost btn-sm" @click="dialogRef?.close()" aria-label="Close">
            ✕
          </button>
        </div>
        <div class="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <input ref="inputRef" v-model="tagPicker.q" type="text"
            class="input input-bordered input-sm w-full" placeholder="Search or create…" autocomplete="off"
            @keydown.enter.prevent="$emit('create-from-query')" />
          <button type="button" class="btn btn-primary btn-sm" @click="$emit('create-from-query')"
            :disabled="!tagPicker.q.trim()">
            Add
          </button>
        </div>
        <p class="text-xs opacity-60 mt-1">
          {{ filteredTagList.length }} match{{
            filteredTagList.length === 1 ? "" : "es"
          }}
        </p>
      </div>

      <!-- Scrollable list -->
      <div class="px-3 pb-3 max-h-[70vh] md:max-h-[60vh] overflow-y-auto overscroll-contain"
        style="-webkit-overflow-scrolling: touch" @scroll.passive="onTagScroll" ref="scrollRef">
        <ul class="menu bg-base-100 rounded-box shadow divide-y divide-base-300">
          <li v-for="t in tagSlice" :key="t" class="py-1">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" class="checkbox checkbox-sm" :checked="tagPicker.selected.has(t)"
                @change="toggleTagPick(t, ($event.target as HTMLInputElement).checked)" />
              <span class="truncate">{{ t }}</span>
            </label>
          </li>
        </ul>

        <div v-if="!tagSlice.length" class="p-4 text-center opacity-70">
          No tags yet. Type above to add.
        </div>

        <div v-if="tagSlice.length < filteredTagList.length" class="text-center text-xs opacity-60 mt-3">
          Loading more…
        </div>
      </div>

      <div class="p-3 flex justify-between items-center border-t border-base-300">
        <div class="text-xs opacity-70">
          Selected: {{ tagPicker.selected.size }}
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn btn-ghost btn-sm" @click="dialogRef?.close()">
            Cancel
          </button>
          <button type="button" class="btn btn-primary btn-sm" @click="$emit('apply')">
            Apply
          </button>
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from "vue";
import { useDialogA11y } from "../composables/useDialogA11y";

interface TagPickerState {
  open: boolean;
  q: string;
  visible: number;
  selected: Set<string>;
}

const props = defineProps<{
  tagPicker: TagPickerState;
  filteredTagList: string[];
  tagSlice: string[];
}>();

defineEmits<{
  (e: "close"): void;
  (e: "create-from-query"): void;
  (e: "apply"): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const scrollRef = ref<HTMLElement | null>(null);
const dialogRef = ref<HTMLDialogElement | null>(null);

// `<dialog>` stays invisible until `.showModal()` is called explicitly — the
// `v-if` above only controls whether the element exists in the DOM, not
// whether it renders. Re-open it every time `tagPicker.open` flips true,
// after Vue has created the element.
const { openDialog } = useDialogA11y(dialogRef);
watch(
  () => props.tagPicker.open,
  (open) => {
    if (open) nextTick(openDialog);
  }
);

// Selection toggles (mutates the shared reactive state)
function toggleTagPick(name: string, checked: boolean) {
  if (checked) props.tagPicker.selected.add(name);
  else props.tagPicker.selected.delete(name);
}

// Infinite scroll-ish load
function onTagScroll() {
  const el = scrollRef.value;
  if (!el) return;
  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 32;
  if (nearBottom && props.tagPicker.visible < props.filteredTagList.length) {
    props.tagPicker.visible += 120;
  }
}

function focusInput() {
  inputRef.value?.focus();
}

defineExpose({ focusInput });
</script>
