<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <dialog v-if="bulkEdit.open" ref="dialogRef" class="modal" aria-modal="true" aria-labelledby="bulkEditHeading"
    @close="$emit('cancel')">
    <div class="modal-box w-full max-w-xl">
      <h3 id="bulkEditHeading" class="font-bold text-lg">
        🛠️ Bulk Edit ({{ selectedCount }} selected)
      </h3>
      <p class="text-xs text-base-content/60 mt-1">
        Leave a field on "(no change)" to skip it — only the fields you set
        below are applied to all {{ selectedCount }} selected transaction{{
          selectedCount === 1 ? "" : "s"
        }}.
      </p>

      <div class="mt-4 space-y-4">
        <!-- Category & Type -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="form-control">
            <label class="label" for="beCategory">
              <span class="label-text">Set Category</span>
            </label>
            <select id="beCategory" v-model="bulkEdit.category" class="select select-bordered select-sm">
              <option value="">(no change)</option>
              <option v-for="c in categories" :key="c" :value="c">
                {{ c }}
              </option>
            </select>
          </div>

          <div class="form-control">
            <span class="label-text mb-1">Set Type</span>
            <div class="flex flex-wrap gap-3 items-center h-full">
              <label class="inline-flex gap-2 items-center cursor-pointer">
                <input type="radio" name="beType" value="" v-model="bulkEdit.type" class="radio radio-xs" />
                <span>(no change)</span>
              </label>
              <label class="inline-flex gap-2 items-center cursor-pointer">
                <input type="radio" name="beType" value="income" v-model="bulkEdit.type" class="radio radio-xs" />
                <span>Income</span>
              </label>
              <label class="inline-flex gap-2 items-center cursor-pointer">
                <input type="radio" name="beType" value="spending" v-model="bulkEdit.type" class="radio radio-xs" />
                <span>Spending</span>
              </label>
            </div>
          </div>
        </div>

        <div class="divider my-0 text-xs text-base-content/50">Tags</div>

        <!-- Tags: add / remove -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Add tags -->
          <div class="form-control">
            <label class="label pb-1">
              <span class="label-text text-success font-medium">+ Add tags</span>
            </label>
            <details ref="addTagDropdownRef" class="dropdown w-full" @toggle="onAddTagsToggle">
              <summary
                class="btn btn-sm w-full justify-start flex-wrap gap-1.5 min-h-[2.5rem] h-auto py-1.5 font-normal"
                aria-haspopup="listbox" :aria-expanded="addTagsOpen">
                <span v-if="bulkEdit.addTags.length === 0" class="opacity-60">Add tags…</span>
                <span v-for="tag in bulkEdit.addTags" :key="tag" class="badge badge-success gap-1.5">
                  {{ tag }}
                  <span role="button" tabindex="0" class="hover:scale-125 transition-transform"
                    aria-label="Don't add this tag" @click.stop.prevent="unpickAddTag(tag)"
                    @keydown.enter.stop.prevent="unpickAddTag(tag)">
                    ✕
                  </span>
                </span>
              </summary>

              <div
                class="dropdown-content z-[60] bg-base-100 shadow-xl rounded-lg w-full sm:w-72 mt-2 border border-base-300 overflow-hidden">
                <div class="p-2 bg-base-200 border-b border-base-300">
                  <input ref="addTagSearchRef" v-model.trim="addTagQuery" type="text"
                    class="input input-bordered input-sm w-full" placeholder="Search or add tag…" autocomplete="off"
                    @keydown.enter.prevent="onAddTagEnter" />
                </div>

                <ul role="listbox" class="menu flex-nowrap max-h-48 overflow-y-auto p-2">
                  <li v-for="tag in filteredAddTagOptions" :key="tag">
                    <button type="button" role="option"
                      class="justify-between min-h-[2.25rem] rounded-lg hover:bg-success hover:text-success-content"
                      :class="{ 'bg-success/10 font-semibold': isPendingAdd(tag) }" :aria-selected="isPendingAdd(tag)"
                      @click="toggleAddTagOption(tag)">
                      <span class="truncate flex items-center gap-2">
                        <input type="checkbox" class="checkbox checkbox-xs pointer-events-none"
                          :checked="isPendingAdd(tag)" aria-hidden="true" />
                        {{ tag }}
                      </span>
                    </button>
                  </li>
                  <li v-if="filteredAddTagOptions.length === 0 && !addTagQuery"
                    class="p-3 text-center text-sm opacity-60">
                    No tags yet
                  </li>
                </ul>

                <div v-if="addTagQuery && !tagExists(addTagQuery)" class="p-2 border-t border-base-300">
                  <button type="button" class="btn btn-success btn-sm btn-block" @click="pickAddTag(addTagQuery)">
                    + Add "{{ addTagQuery }}"
                  </button>
                </div>
              </div>
            </details>
          </div>

          <!-- Remove tags -->
          <div class="form-control">
            <span class="label pb-1">
              <span class="label-text text-error font-medium">− Remove tags</span>
            </span>
            <div v-if="selectionTags.length" class="flex flex-wrap gap-1.5">
              <button v-for="tag in selectionTags" :key="tag" type="button" class="badge cursor-pointer" :class="bulkEdit.removeTags.includes(tag)
                ? 'badge-error'
                : 'badge-outline hover:badge-error'
                " :aria-pressed="bulkEdit.removeTags.includes(tag)" @click="toggleRemoveTag(tag)">
                {{ tag }}
              </button>
            </div>
            <p v-else class="text-xs text-base-content/50">
              Selected transactions have no tags to remove.
            </p>
            <p v-if="selectionTags.length" class="text-xs text-base-content/50 mt-2">
              Click a tag to mark it for removal.
            </p>
          </div>
        </div>

        <div class="divider my-0 text-xs text-base-content/50">Description</div>

        <!-- Description edit -->
        <div class="form-control">
          <label class="label" for="beDesc">
            <span class="label-text">Description</span>
          </label>
          <div class="join">
            <select v-model="bulkEdit.descMode" class="select select-bordered select-sm join-item"
              aria-label="Description mode">
              <option value="none">(no change)</option>
              <option value="replace">Replace</option>
              <option value="prepend">Prepend</option>
              <option value="append">Append</option>
            </select>
            <input id="beDesc" v-model="bulkEdit.descText" type="text"
              class="input input-bordered input-sm join-item flex-1" placeholder="Text…"
              :disabled="bulkEdit.descMode === 'none'" />
          </div>
        </div>

        <!-- Optional: date shift -->
        <div class="form-control">
          <label class="label" for="beShift">
            <span class="label-text">Shift Date (days)</span>
          </label>
          <input id="beShift" v-model.number="bulkEdit.shiftDays" type="number"
            class="input input-bordered input-sm w-32" placeholder="0" />
          <p class="text-xs text-base-content/60 mt-1">
            Positive numbers move dates forward.
          </p>
        </div>

        <!-- Advanced text tools (collapsed by default to keep the common path short) -->
        <details class="collapse collapse-arrow bg-base-200/60 rounded-lg">
          <summary class="collapse-title text-sm font-medium min-h-0 py-2.5">
            More text tools (find & replace, cleanup, auto-categorize rule)
          </summary>
          <div class="collapse-content space-y-3">
            <!-- Smart: Find & Replace -->
            <div class="form-control">
              <label class="label" for="beFind">
                <span class="label-text">Find & Replace (case-insensitive)</span>
              </label>
              <div class="join">
                <input id="beFind" v-model="bulkEdit.findText" type="text"
                  class="input input-bordered input-sm join-item w-40" placeholder="Find…" />
                <input v-model="bulkEdit.replaceWith" type="text"
                  class="input input-bordered input-sm join-item flex-1" placeholder="Replace with…" />
                <label class="label cursor-pointer join-item px-3 gap-2 text-xs">
                  <input type="checkbox" class="checkbox checkbox-xs" v-model="bulkEdit.replaceAll" />
                  <span>Replace all</span>
                </label>
              </div>
            </div>

            <!-- Smart: Description cleanup -->
            <div class="form-control">
              <span class="label-text mb-1">Description cleanup</span>
              <div class="flex flex-wrap items-center gap-3 text-sm">
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" class="checkbox checkbox-xs" v-model="bulkEdit.trimWhitespace" />
                  <span>Trim</span>
                </label>
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" class="checkbox checkbox-xs" v-model="bulkEdit.collapseSpaces" />
                  <span>Collapse spaces</span>
                </label>
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" class="checkbox checkbox-xs" v-model="bulkEdit.titleCase" />
                  <span>Title Case</span>
                </label>
              </div>
            </div>

            <!-- Smart: Save keyword -> category rule -->
            <div class="form-control">
              <span class="label-text mb-1">Save keyword -> category rule</span>
              <div class="flex items-center gap-2">
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" class="checkbox checkbox-xs" v-model="bulkEdit.saveRule" />
                  <span class="text-sm">Save rule</span>
                </label>
                <input :disabled="!bulkEdit.saveRule" v-model="bulkEdit.ruleKeyword" type="text"
                  class="input input-bordered input-sm flex-1" :placeholder="suggestedKeyword || 'Keyword…'" />
              </div>
              <p class="text-xs mt-1 text-base-content/60">
                Also set <strong>Category</strong> above. Future imports matching
                the keyword are auto-categorized.
              </p>
            </div>
          </div>
        </details>
      </div>

      <div class="modal-action items-center">
        <span v-if="changeSummary" class="text-xs text-base-content/60 mr-auto">
          {{ changeSummary }}
        </span>
        <button type="button" class="btn btn-ghost" @click="dialogRef?.close()">
          Cancel
        </button>
        <button type="button" class="btn btn-primary" :disabled="selectedCount === 0 || !hasChanges"
          @click="$emit('apply')">
          Apply changes
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from "vue";
import { norm, eqi } from "../utils/text";
import type { TransactionType, DescMode } from "../utils/types";
import { useDialogA11y } from "../composables/useDialogA11y";

const dialogRef = ref<HTMLDialogElement | null>(null);
const { openDialog } = useDialogA11y(dialogRef);

interface BulkEditState {
  open: boolean;
  category: string;
  type: "" | TransactionType;
  descMode: DescMode;
  descText: string;
  findText: string;
  replaceWith: string;
  replaceAll: boolean;
  trimWhitespace: boolean;
  collapseSpaces: boolean;
  titleCase: boolean;
  shiftDays: number | null;
  saveRule: boolean;
  ruleKeyword: string;
  addTags: string[];
  removeTags: string[];
}

const props = defineProps<{
  bulkEdit: BulkEditState;
  categories: string[];
  selectedCount: number;
  suggestedKeyword: string;
  tagList: string[];
  selectionTags: string[];
  /** Same sanitize/normalize/register routine used when adding a tag from the
   *  transaction form, so a tag typed here comes out identical either way. */
  registerTag: (name: string) => string;
}>();

// `<dialog>` stays invisible until `.showModal()` is called explicitly — the
// `v-if` above only controls whether the element exists in the DOM, not
// whether it renders. Re-open it every time `bulkEdit.open` flips true,
// after Vue has created the element.
watch(
  () => props.bulkEdit.open,
  (open) => {
    if (open) nextTick(openDialog);
  }
);

// ── Add tags ──
// Mirrors the Add Transaction form's tag combobox (details.dropdown + search
// + checkbox list + "Add '{query}'"), so picking tags to add in bulk looks
// and behaves the same way as tagging a single transaction. Unlike that form,
// picking a tag here does not close the dropdown — bulk-adding several tags
// in one sitting is the common case. It still closes via the app-wide
// outside-click/Escape handlers that manage every `details.dropdown`.
const addTagDropdownRef = ref<HTMLDetailsElement | null>(null);
const addTagSearchRef = ref<HTMLInputElement | null>(null);
const addTagsOpen = ref(false);
const addTagQuery = ref("");

const filteredAddTagOptions = computed(() => {
  const q = norm(addTagQuery.value);
  const list = [...props.tagList].sort((a, b) => a.localeCompare(b));
  if (!q) return list;
  return list
    .filter((t) => norm(t).includes(q))
    .sort((a, b) => {
      const A = norm(a), B = norm(b);
      const ap = A.startsWith(q) ? 0 : 1;
      const bp = B.startsWith(q) ? 0 : 1;
      return ap - bp || A.localeCompare(B);
    });
});

function tagExists(name: string) {
  const n = norm(name);
  return props.tagList.some((t) => norm(t) === n);
}

function isPendingAdd(tag: string) {
  return props.bulkEdit.addTags.some((x) => eqi(x, tag));
}

function onAddTagsToggle(e: Event) {
  const el = e.target as HTMLDetailsElement;
  addTagsOpen.value = !!el?.open;
  if (addTagsOpen.value) nextTick(() => addTagSearchRef.value?.focus());
}

function pickAddTag(name: string) {
  const canonical = props.registerTag(name);
  if (!canonical) return;
  if (!props.bulkEdit.addTags.some((x) => eqi(x, canonical))) {
    props.bulkEdit.addTags.push(canonical);
  }
  // A tag can't be both added and removed at once.
  props.bulkEdit.removeTags = props.bulkEdit.removeTags.filter(
    (x) => !eqi(x, canonical)
  );
  addTagQuery.value = "";
}

function unpickAddTag(tag: string) {
  props.bulkEdit.addTags = props.bulkEdit.addTags.filter((x) => x !== tag);
}

function toggleAddTagOption(tag: string) {
  if (isPendingAdd(tag)) {
    unpickAddTag(tag);
  } else {
    pickAddTag(tag);
  }
}

function onAddTagEnter() {
  const q = addTagQuery.value.trim();
  if (!q) return;
  const exact = filteredAddTagOptions.value.find((t) => eqi(t, q));
  if (exact) {
    toggleAddTagOption(exact);
    addTagQuery.value = "";
    return;
  }
  pickAddTag(q);
}

// ── Remove tags ──
function toggleRemoveTag(tag: string) {
  if (props.bulkEdit.removeTags.includes(tag)) {
    props.bulkEdit.removeTags = props.bulkEdit.removeTags.filter(
      (x) => x !== tag
    );
    return;
  }
  props.bulkEdit.removeTags = [...props.bulkEdit.removeTags, tag];
  // A tag can't be both added and removed at once.
  props.bulkEdit.addTags = props.bulkEdit.addTags.filter((x) => !eqi(x, tag));
}

// ── Summary + apply gating ──
const hasChanges = computed(() => {
  const b = props.bulkEdit;
  return !!(
    b.category ||
    b.type ||
    (b.descMode !== "none" && b.descText) ||
    b.findText ||
    b.shiftDays ||
    b.addTags.length ||
    b.removeTags.length
  );
});

const changeSummary = computed(() => {
  const b = props.bulkEdit;
  const parts: string[] = [];
  if (b.category) parts.push(`category → ${b.category}`);
  if (b.type) parts.push(`type → ${b.type}`);
  if (b.descMode !== "none" && b.descText) parts.push("description edited");
  if (b.findText) parts.push("find & replace");
  if (b.shiftDays) parts.push(`date shift ${b.shiftDays > 0 ? "+" : ""}${b.shiftDays}d`);
  if (b.addTags.length) parts.push(`+${b.addTags.length} tag${b.addTags.length === 1 ? "" : "s"}`);
  if (b.removeTags.length) parts.push(`−${b.removeTags.length} tag${b.removeTags.length === 1 ? "" : "s"}`);
  return parts.join(" · ");
});

defineEmits<{
  (e: "cancel"): void;
  (e: "apply"): void;
}>();
</script>
