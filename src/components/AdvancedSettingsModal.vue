<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
          <dialog v-if="showAdvancedFilters" id="advancedSettingsModal" class="modal modal-bottom sm:modal-middle"
            ref="dialogRef" role="dialog" aria-modal="true" aria-labelledby="advancedSettingsTitle"
            @close="showAdvancedFilters = false">
            <form method="dialog" class="modal-box max-w-2xl advanced-modal-box">
              <!-- Modal Header (sticky on mobile) -->
              <div class="flex justify-between items-center mb-2 advanced-modal-header">
                <h3 id="advancedSettingsTitle" class="font-bold text-lg flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  Advanced Settings
                </h3>
                <button type="button" class="btn btn-sm btn-circle btn-ghost focus-ring target-min"
                  @click="dialogRef?.close()" aria-label="Close advanced settings">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <!-- Scrollable Content Area -->
              <div class="advanced-modal-content flex-1 overflow-y-auto">
                <p class="text-sm text-base-content/60 mb-3">Customize chart appearance, filters, and data series.
                  Sections
                  collapse to save space.</p>

                <!-- Collapsible: Date & Time Range -->
                <details class="collapse collapse-arrow bg-base-200/50 mb-2 rounded-lg" open>
                  <summary class="collapse-title font-semibold flex items-center gap-2 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Date & Time Range
                    <span class="badge badge-sm badge-info ml-auto">{{ selectedDatePreset || 'Custom' }}</span>
                  </summary>
                  <div class="collapse-content space-y-4">
                    <!-- Quick Presets (dynamic from transaction data) -->
                    <div>
                      <label class="label cursor-pointer">
                        <span class="label-text font-medium text-xs">Quick Presets</span>
                        <span v-if="transactionDateRange.earliest" class="label-text-alt text-[10px] opacity-60">
                          ({{ formatChartDate(transactionDateRange.earliest) }} → {{
                            formatChartDate(transactionDateRange.latest) }})
                        </span>
                      </label>
                      <div class="flex flex-wrap gap-1.5">
                        <button type="button" v-for="preset in dynamicDatePresets" :key="preset.label"
                          class="btn btn-xs btn-outline focus-ring target-min"
                          :class="{ 'btn-primary': isSelectedPreset(preset) }" @click="applyDatePreset(preset)">
                          {{ preset.label }}
                        </button>
                      </div>
                    </div>

                    <!-- Custom Range -->
                    <div>
                      <label class="label">
                        <span class="label-text font-medium text-xs">Custom Range</span>
                      </label>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <!-- From Date -->
                        <div>
                          <label class="label" for="chartStartDate">
                            <span class="label-text text-xs">From</span>
                          </label>
                          <DatePicker id="chartStartDate" v-model="dateFilter.start" aria-label="chart start date"
                            :max="dateFilter.end" />
                        </div>

                        <!-- To Date -->
                        <div>
                          <label class="label" for="chartEndDate">
                            <span class="label-text text-xs">To</span>
                          </label>
                          <DatePicker id="chartEndDate" v-model="dateFilter.end" aria-label="chart end date"
                            :min="dateFilter.start" />
                        </div>
                      </div>
                      <p class="text-[10px] text-base-content/50 mt-1.5">
                        💡 Leave empty for unlimited range.
                      </p>
                    </div>
                  </div>
                </details>

                <!-- Collapsible: Group By (chart x-axis / table period) -->
                <details class="collapse collapse-arrow bg-base-200/50 mb-2 rounded-lg" open>
                  <summary class="collapse-title font-semibold flex items-center gap-2 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Group By
                    <span class="badge badge-sm badge-primary ml-auto capitalize">{{ chartConfig.groupBy }}</span>
                  </summary>
                  <div class="collapse-content">
                    <label class="label" for="chartGroupBy">
                      <span class="label-text font-medium text-xs">Time period for the chart x-axis and balance sheet
                        rows</span>
                    </label>
                    <select id="chartGroupBy" v-model="chartConfig.groupBy"
                      class="select select-bordered select-sm w-full focus-ring">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </details>

                <!-- Collapsible: Filter Display Mode (Pie/Doughnut only) -->
                <details v-if="chartConfig.type === 'pie' || chartConfig.type === 'doughnut'"
                  class="collapse collapse-arrow bg-base-200/50 mb-2 rounded-lg" open>
                  <summary class="collapse-title font-semibold flex items-center gap-2 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    </svg>
                    Filter Display Mode
                    <span class="badge badge-sm badge-accent ml-auto">{{ chartFilterDisplayMode === 'both' ? 'Both' :
                      chartFilterDisplayMode === 'categories' ? 'Categories' : 'Tags' }}</span>
                  </summary>
                  <div class="collapse-content">
                    <div class="join border-base-300 rounded-lg overflow-hidden" role="radiogroup"
                      aria-label="Filter display mode">
                      <button type="button" class="join-item btn btn-sm flex-1 focus-ring target-min"
                        :class="{ 'btn-primary': chartFilterDisplayMode === 'both', 'btn-ghost': chartFilterDisplayMode !== 'both' }"
                        role="radio" :aria-checked="chartFilterDisplayMode === 'both'"
                        @click="chartFilterDisplayMode = 'both'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 21a18 18 0 0018 0" />
                        </svg>
                        Both
                      </button>
                      <button type="button" class="join-item btn btn-sm flex-1 focus-ring target-min"
                        :class="{ 'btn-primary': chartFilterDisplayMode === 'categories', 'btn-ghost': chartFilterDisplayMode !== 'categories' }"
                        role="radio" :aria-checked="chartFilterDisplayMode === 'categories'"
                        @click="chartFilterDisplayMode = 'categories'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Categories
                      </button>
                      <button type="button" class="join-item btn btn-sm flex-1 focus-ring target-min"
                        :class="{ 'btn-primary': chartFilterDisplayMode === 'tags', 'btn-ghost': chartFilterDisplayMode !== 'tags' }"
                        role="radio" :aria-checked="chartFilterDisplayMode === 'tags'"
                        @click="chartFilterDisplayMode = 'tags'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Tags
                      </button>
                    </div>
                    <p class="text-[10px] text-base-content/50 mt-2">Choose what the pie/doughnut chart groups by. Tags
                      depend
                      on selected categories.</p>
                  </div>
                </details>

                <!-- Collapsible: Filter Logic -->
                <details class="collapse collapse-arrow bg-base-200/50 mb-2 rounded-lg">
                  <summary class="collapse-title font-semibold flex items-center gap-2 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-warning" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filter Logic
                    <span class="badge badge-sm badge-ghost ml-auto">{{ chartSelectionMode === 'or' ? 'OR' : 'AND'
                      }}</span>
                  </summary>
                  <div class="collapse-content">
                    <div class="join border-base-300 rounded-lg overflow-hidden" role="radiogroup"
                      aria-label="Filter mode">
                      <button type="button" class="join-item btn btn-sm flex-1 focus-ring target-min"
                        :class="{ 'btn-primary': chartSelectionMode === 'or', 'btn-ghost': chartSelectionMode !== 'or' }"
                        role="radio" :aria-checked="chartSelectionMode === 'or'" @click="chartSelectionMode = 'or'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Match Any (OR)
                      </button>
                      <button type="button" class="join-item btn btn-sm flex-1 focus-ring target-min"
                        :class="{ 'btn-primary': chartSelectionMode === 'and', 'btn-ghost': chartSelectionMode !== 'and' }"
                        role="radio" :aria-checked="chartSelectionMode === 'and'" @click="chartSelectionMode = 'and'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 13h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Match All (AND)
                      </button>
                    </div>
                    <p class="text-[10px] text-base-content/50 mt-2">OR: show items matching any selected filter. AND:
                      show
                      items matching all selected filters.</p>
                  </div>
                </details>

                <!-- Collapsible: Categories -->
                <details v-if="chartFilterDisplayMode === 'both' || chartFilterDisplayMode === 'categories'"
                  class="collapse collapse-arrow bg-base-200/50 mb-2 rounded-lg">
                  <summary class="collapse-title font-semibold flex items-center gap-2 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Categories
                    <span class="badge badge-sm badge-primary ml-auto">{{ selectedCategoriesChart.length }}/{{
                      chartCategories.length }}</span>
                  </summary>
                  <div class="collapse-content">
                    <div
                      class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 border border-base-300 rounded-lg bg-base-100"
                      role="listbox" aria-multiselectable="true">
                      <button v-for="category in chartCategories" :key="category" type="button"
                        class="badge badge-md badge-outline cursor-pointer focus-ring target-min transition-all hover:scale-105"
                        :class="{ 'badge-primary': selectedCategoriesChart.includes(category) }" role="option"
                        :aria-selected="selectedCategoriesChart.includes(category)"
                        @click="toggleCategoryForChart(category)">{{
                        category }}</button>
                    </div>
                    <div class="mt-2 flex gap-2">
                      <button type="button" class="btn btn-xs btn-ghost focus-ring target-min"
                        @click="selectAllCategoriesChart()">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>Select All</button>
                      <button type="button" class="btn btn-xs btn-ghost focus-ring target-min"
                        @click="unselectAllCategoriesChart()">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                        </svg>Clear</button>
                    </div>
                  </div>
                </details>

                <!-- Collapsible: Tags -->
                <details v-if="chartFilterDisplayMode === 'both' || chartFilterDisplayMode === 'tags'"
                  class="collapse collapse-arrow bg-base-200/50 mb-2 rounded-lg">
                  <summary class="collapse-title font-semibold flex items-center gap-2 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-secondary" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Tags
                    <span class="badge badge-sm badge-secondary ml-auto">{{ selectedTagsChart.length }}/{{
                      availableTagsForChart.length }}</span>
                  </summary>
                  <div class="collapse-content space-y-3">
                    <p class="text-xs text-base-content/60">
                      Select tags to include in chart filtering. Click tags to toggle selection.
                    </p>
                    <div
                      class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 border border-base-300 rounded-lg bg-base-100"
                      role="listbox" aria-multiselectable="true" aria-label="Available tags">
                      <button v-for="tag in availableTagsForChart" :key="tag" type="button"
                        class="badge badge-md badge-outline cursor-pointer focus-ring target-min transition-all hover:scale-105"
                        :class="{
                          'badge-secondary text-secondary-content': selectedTagsChart.includes(tag),
                          'opacity-40': selectedTagsChart.length === availableTagsForChart.length
                        }" role="option" :aria-selected="selectedTagsChart.includes(tag)"
                        @click="toggleTagForChart(tag)">
                        {{ tag }}
                      </button>
                      <span v-if="availableTagsForChart.length === 0" class="text-xs text-base-content/50 italic">
                        No tags available. Add tags to transactions first.
                      </span>
                    </div>
                    <div class="flex gap-2">
                      <button type="button" class="btn btn-xs btn-outline focus-ring target-min flex-1"
                        @click="selectAllAvailableTagsForChart">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Select All
                      </button>
                      <button type="button" class="btn btn-xs btn-ghost focus-ring target-min flex-1"
                        @click="unselectAllTagsForChart">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear Selection
                      </button>
                    </div>
                  </div>
                </details>
              </div>

              <!-- Sticky Action Bar -->
              <div
                class="sticky bottom-0 bg-base-100/95 backdrop-blur border-t border-base-300 p-3 -mx-6 flex justify-between gap-2 safe-area-pb advanced-modal-footer"
                style="z-index: 10;">
                <button type="button" class="btn btn-sm btn-outline btn-error focus-ring target-min gap-1"
                  @click="resetChartSettings()">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset All
                </button>
                <button type="button" class="btn btn-sm btn-primary focus-ring target-min gap-1"
                  @click="dialogRef?.close()">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Done
                </button>
              </div>
            </form>
            <form method="dialog" class="modal-backdrop">
              <button>close</button>
            </form>
          </dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import DatePicker from './DatePicker.vue';
import type { ChartGroupBy } from '../utils/chartBuckets';
import { useDialogA11y } from '../composables/useDialogA11y';

const dialogRef = ref<HTMLDialogElement | null>(null);
const { openDialog } = useDialogA11y(dialogRef);

type Preset = { label: string; start: string; end: string };

// Two-way (defineModel) — names match the template identifiers so the extracted
// dialog markup is used verbatim. The parent (ChartsSection) owns the source refs.
const showAdvancedFilters = defineModel<boolean>('showAdvancedFilters', { required: true });
const chartFilterDisplayMode = defineModel<'both' | 'categories' | 'tags'>('chartFilterDisplayMode', { required: true });
const chartSelectionMode = defineModel<'or' | 'and'>('chartSelectionMode', { required: true });

// The <dialog> only exists in the DOM while showAdvancedFilters is true (v-if),
// so showModal() must be called each time it's created, not just on component mount.
watch(showAdvancedFilters, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    openDialog();
  }
});

// Object props are mutated in place (same pattern as AddTransactionForm's newTransaction):
// dateFilter.start/.end and chartConfig.groupBy are v-modelled directly on the shared
// reactive objects, so writes flow back to ChartsSection without extra plumbing.
const props = defineProps<{
  dateFilter: { start: string; end: string };
  chartConfig: { type: string; groupBy: ChartGroupBy };
  selectedDatePreset: string;
  transactionDateRange: { earliest: string; latest: string };
  dynamicDatePresets: Preset[];
  chartCategories: string[];
  selectedCategoriesChart: string[];
  availableTagsForChart: string[];
  selectedTagsChart: string[];
  isSelectedPreset: (p: Preset) => boolean;
  applyDatePreset: (p: Preset) => void;
  formatChartDate: (iso: string) => string;
  toggleCategoryForChart: (c: string) => void;
  selectAllCategoriesChart: () => void;
  unselectAllCategoriesChart: () => void;
  toggleTagForChart: (t: string) => void;
  selectAllAvailableTagsForChart: () => void;
  unselectAllTagsForChart: () => void;
  resetChartSettings: () => void;
}>();

// Expose plain names the extracted template references directly.
const {
  dateFilter, chartConfig, selectedDatePreset, transactionDateRange, dynamicDatePresets,
  chartCategories, selectedCategoriesChart, availableTagsForChart, selectedTagsChart,
  isSelectedPreset, applyDatePreset, formatChartDate, toggleCategoryForChart,
  selectAllCategoriesChart, unselectAllCategoriesChart, toggleTagForChart,
  selectAllAvailableTagsForChart, unselectAllTagsForChart, resetChartSettings,
} = props;
</script>

<style scoped>
/* NOTE: the modal must NOT force overflow: visible — that overrides DaisyUI's
   .modal-box scrolling (overflow-y: auto + max-height) and makes tall content
   unreachable. The old hack existed so the date-picker calendar could escape
   the box, but the calendar is teleported to <body> now and never clips. */
.advanced-modal-content {
  min-height: 0;
  /* Allow flex shrinking */
}

#advancedSettingsModal {
  /* Must beat the chart's external tooltip (z-[1000]) so the modal always
     renders above it, and DaisyUI's default .modal z-index (999). */
  z-index: 10000;
  /* The parent section's space-y-* utility puts margin-top on every child,
     including this fixed-position dialog — which shifts the whole overlay
     down and lets the page show above/below it. */
  margin: 0;
}

.advanced-modal-box {
  position: relative;
  z-index: 10001;
  /* No bottom padding: the sticky footer is clamped to the content box, so
     any padding below it becomes a strip where scrolled content shows through. */
  padding-bottom: 0;
}

/* Mobile: advanced modal full screen with proper scroll */
@media screen and (max-width: 640px) {

  /* Advanced modal: full screen on small devices with proper scroll */
  .advanced-modal-box {
    width: 100vw !important;
    max-width: 100vw !important;
    max-height: 100dvh !important;
    height: 100dvh !important;
    margin: 0 !important;
    border-radius: 0 !important;
    display: flex !important;
    flex-direction: column;
    overflow: hidden;
  }

  /* Sticky header on mobile */
  .advanced-modal-header {
    flex-shrink: 0;
    position: sticky;
    top: 0;
    background: oklch(var(--b1));
    z-index: 5;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  /* Scrollable content area */
  .advanced-modal-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 0.5rem;
  }

  /* Sticky footer on mobile — keep the template's -mx-6 so it bleeds over
     the modal-box padding and spans the full width edge to edge. */
  .advanced-modal-footer {
    flex-shrink: 0;
    position: sticky;
    bottom: 0;
    background: oklch(var(--b1));
    z-index: 5;
  }

  /* Ensure date inputs are easily tappable */
  .advanced-modal-box .input {
    min-height: 2.75rem;
  }

  /* Larger touch targets for buttons in modal */
  .advanced-modal-box .btn-xs {
    min-height: 2.5rem;
  }

  /* Make collapsible sections more compact on mobile */
  .advanced-modal-content .collapse {
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
  }
}
</style>
