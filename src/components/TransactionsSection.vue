<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <!-- Transactions Section -->
  <section :id="'panel-transactions'" role="tabpanel"
    :aria-labelledby="'tab-transactions'" class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <!-- Header with view toggle -->
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3 sm:gap-0">
        <h2 id="txHeading" class="text-xl md:text-2xl font-bold">
          📋 Transactions ({{ filteredCount }})
        </h2>
        <!-- Progressive Disclosure: TOGGLE -->
        <div class="flex flex-wrap gap-2 items-center">
          <span class="text-xs md:text-sm text-base-content/60">View:</span>
          <!-- Slide pill Simple/Advanced -->
          <div
            class="relative inline-grid grid-cols-2 w-full sm:w-auto items-center rounded-full bg-base-200 p-0.5 sm:p-1"
            role="tablist" aria-label="View mode" @keydown.left.prevent="showAdvancedTransactionsView = false"
            @keydown.right.prevent="showAdvancedTransactionsView = true" tabindex="0">
            <!-- Sliding thumb -->
            <span
              class="absolute inset-y-0.5 sm:inset-y-1 left-0.5 sm:left-1 w-[calc(50%-0.125rem)] sm:w-[calc(50%-0.25rem)] rounded-full bg-primary transition-transform duration-300"
              :style="{
                transform: showAdvancedTransactionsView
                  ? 'translateX(100%)'
                  : 'translateX(0%)',
              }" aria-hidden="true"></span>

            <!-- Simple -->
            <button type="button" role="tab" :aria-selected="!showAdvancedTransactionsView"
              class="relative z-10 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm rounded-full transition-colors"
              :class="!showAdvancedTransactionsView
                ? 'text-primary-content font-semibold'
                : 'text-base-content/70'
                " @click="showAdvancedTransactionsView = false">
              Simple
            </button>

            <!-- Advanced -->
            <button type="button" role="tab" :aria-selected="showAdvancedTransactionsView"
              class="relative z-10 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm rounded-full transition-colors"
              :class="showAdvancedTransactionsView
                ? 'text-primary-content font-semibold'
                : 'text-base-content/70'
                " @click="showAdvancedTransactionsView = true">
              Advanced
            </button>
          </div>
        </div>
      </div>

      <!-- Advanced Controls (Hidden in Simple View) -->
      <div v-if="showAdvancedTransactionsView" class="flex flex-wrap items-center gap-2 mb-4">
        <!-- Smart bulk toolbar -->
        <!-- Income menu -->
        <details class="dropdown">
          <summary class="btn btn-outline btn-xs" aria-haspopup="menu">
            💰 Select Income
          </summary>
          <ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48" role="menu">
            <li>
              <button type="button" role="menuitem" @click="
                $emit('select-by-type-and-close', 'income', 'page', $event);
              $emit('close-closest-details', $event);
              ">
                Current page
              </button>
            </li>
            <li>
              <button type="button" role="menuitem" @click="$emit('select-by-type-and-close', 'income', 'all', $event)">
                All Transactions
              </button>
            </li>
          </ul>
        </details>

        <!-- Spending menu -->
        <details class="dropdown">
          <summary class="btn btn-outline btn-xs" aria-haspopup="menu">
            💸 Select Spending
          </summary>
          <ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48" role="menu">
            <li>
              <button type="button" role="menuitem" @click="
                $emit('select-by-type-and-close', 'spending', 'page', $event)
                ">
                Current page
              </button>
            </li>
            <li>
              <button type="button" role="menuitem" @click="$emit('select-by-type-and-close', 'spending', 'all', $event)">
                All Transactions
              </button>
            </li>
          </ul>
        </details>

        <!-- Large Amounts Selector -->
        <details class="dropdown">
          <summary class="btn btn-outline btn-xs" aria-haspopup="listbox">
            📈 Select Large
          </summary>
          <div class="dropdown-content card card-compact p-2 bg-base-100 shadow w-72">
            <div class="card-body space-y-2">
              <div class="form-control">
                <label class="label" for="thresh">
                  <span class="label-text">Threshold ($)</span>
                </label>
                <input id="thresh" v-model.number="largeSelect.threshold" type="number" min="1"
                  class="input input-bordered input-sm" placeholder="50" />
              </div>
              <div class="form-control">
                <label class="cursor-pointer label" for="smartIqr">
                  <span class="label-text">Use smart threshold (IQR on spending)</span>
                  <input id="smartIqr" v-model="largeSelect.smart" type="checkbox"
                    class="checkbox checkbox-sm" />
                </label>
              </div>
              <div class="form-control">
                <label class="cursor-pointer label" for="pageOnly">
                  <span class="label-text">Scope is current page (else all filtered)</span>
                  <input id="pageOnly" v-model="largeSelect.pageOnly" type="checkbox"
                    class="checkbox checkbox-sm" />
                </label>
              </div>
              <button type="button" class="btn btn-primary btn-sm" @click="$emit('select-large')">
                Apply
              </button>
            </div>
          </div>
        </details>

        <button type="button" class="btn btn-outline btn-xs" @click="openSmartSelect = true">
          🎯 Smart Select
        </button>
        <button type="button" class="btn btn-outline btn-xs" @click="$emit('select-similar')">
          ⚡ Select Similar
        </button>
      </div>

      <!-- Search Input -->
      <div class="mb-4">
        <label class="sr-only" for="txSearch">Search everything</label>
        <input id="txSearch" v-model="searchQuery" type="text" class="input input-bordered input-sm w-full"
          placeholder="Search anything… e.g. 'uber tag:ride type:spending >20 last:30d since:2024-01-01 cat:grocery #family src:nab -starbucks' | amount:50 or $50 for exact match"
          autocomplete="off" />
        <p class="mt-1 text-xs opacity-70">
          Tips: <code>type:income</code> | <code>cat:grocery</code> |
          <code>#work</code> or <code>tag:work</code> | <code>&gt;25</code> |
          <code>last:30d</code> | <code>since:2024-01-01</code> |
          <code>date:2024-01..2024-03</code> | <code>src:nab</code> |
          Amount: <code>$50</code> or <code>amount:50</code> for exact match, <code>&gt;=50</code> or
          <code>&lt;=50</code> for ranges |
          NOT: <code>-pizza</code>
        </p>
        <!-- Active amount filter indicator -->
        <div v-if="activeAmountFilter"
          class="mt-2 inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
          <span>💰</span>
          <span>{{ activeAmountFilter }}</span>
          <button type="button"
            @click="searchQuery = searchQuery.replace(/(amount:\$?\d+(\.\d+)?|\$?\d+(\.\d+)?|>=?\d+(\.\d+)?|<=?\d+(\.\d+)?)\s*/g, '').trim()"
            class="ml-1 focus-ring hover:bg-primary/20 rounded-full px-1"
            aria-label="Remove amount filter">✕</button>
        </div>
      </div>

      <!-- Bulk Actions (Hidden until transactions exist) -->
      <div v-if="
        showAdvancedTransactionsView &&
        filteredCount > 0
      " class="flex flex-wrap justify-between items-center mb-3 gap-2">
        <div class="flex flex-wrap items-center gap-3">
          <!-- Select all: choose scope (current page vs every filtered transaction) -->
          <details class="dropdown">
            <summary class="btn btn-outline btn-xs" aria-haspopup="menu">
              ✅ Select all ▾
            </summary>
            <ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-56 z-10" role="menu">
              <li>
                <button type="button" role="menuitem" @click="onSelectAll('page', $event)">
                  This page ({{ paginatedTransactions.length }})
                </button>
              </li>
              <li>
                <button type="button" role="menuitem" @click="onSelectAll('all', $event)">
                  All matching filters ({{ filteredCount }})
                </button>
              </li>
            </ul>
          </details>
          <label class="label cursor-pointer gap-2 text-sm p-0" for="prioritizeSel">
            <input id="prioritizeSel" type="checkbox" class="checkbox checkbox-xs" v-model="prioritizeSelected" />
            <span>Prioritize selected on top</span>
          </label>
        </div>

        <div class="flex flex-wrap gap-2 items-center">
          <button type="button" class="btn btn-accent btn-xs" :disabled="selectedCount === 0"
            @click="$emit('open-bulk-edit')">
            🛠️ Bulk Edit ({{ selectedCount }} selected)
          </button>
          <button type="button" class="btn btn-ghost btn-xs" :disabled="selectedCount === 0"
            @click="$emit('clear-selection')">
            ✕ Clear Selection
          </button>
          <button type="button" class="btn btn-error btn-xs" @click="$emit('bulk-delete')"
            :disabled="selectedCount === 0">
            🗑️ Delete Selected
          </button>
        </div>
      </div>

      <!-- Pagination (top): sticks below the app header once scrolled past -->
      <div v-if="totalPages > 1"
        class="sticky top-14 z-30 flex justify-center py-2 mb-4 bg-base-100/95 backdrop-blur supports-[backdrop-filter]:bg-base-100/80"
        role="navigation" aria-label="Pagination (top)">
        <div class="btn-group">
          <button type="button" class="btn btn-sm" :disabled="currentPage === 1" @click="currentPage = 1"
            aria-label="First page">
            «
          </button>
          <button type="button" class="btn btn-sm" :disabled="currentPage === 1" @click="currentPage--"
            aria-label="Previous page">
            ‹
          </button>
          <button class="btn btn-sm btn-active" aria-current="page">
            Page {{ currentPage }} / {{ totalPages }}
          </button>
          <button type="button" class="btn btn-sm" :disabled="currentPage === totalPages"
            @click="currentPage = Math.min(totalPages, currentPage + 1)" aria-label="Next page">
            ›
          </button>
          <button type="button" class="btn btn-sm" :disabled="currentPage === totalPages"
            @click="currentPage = totalPages" aria-label="Last page">
            »
          </button>
        </div>
      </div>

      <!-- Table Area -->
      <!-- Mobile Sort Controls (the table headers that provide sorting are lg-only) -->
      <div class="lg:hidden flex items-center gap-2 mb-3">
        <label class="text-sm font-medium shrink-0" for="mobileSortField">Sort by</label>
        <select id="mobileSortField" v-model="sortField" class="select select-bordered select-sm flex-1 min-w-0"
          aria-label="Sort transactions by" @change="currentPage = 1">
          <option value="date">Date</option>
          <option value="type">Type</option>
          <option value="amount">Amount</option>
          <option value="category">Category</option>
          <option value="description">Description</option>
        </select>
        <button type="button" class="btn btn-outline btn-sm shrink-0 gap-1"
          :aria-label="sortOrder === 'asc' ? 'Sorted ascending, tap to sort descending' : 'Sorted descending, tap to sort ascending'"
          @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; currentPage = 1">
          <span aria-hidden="true">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
          {{ sortOrder === 'asc' ? 'Asc' : 'Desc' }}
        </button>
      </div>
      <!-- Mobile Card View -->
      <div class="lg:hidden space-y-3">
        <div v-for="(t, i) in paginatedTransactions" :key="t.id" :id="`tx-${t.id}`"
          class="card bg-base-100 shadow-sm border border-base-300 tx-card-mobile"
          :class="{ 'border-primary': isSelected(t.id), 'bg-base-200': isSelected(t.id) }">
          <div class="card-body p-3 gap-2">
            <!-- Header: Date, Type, Amount -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <input type="checkbox" class="checkbox checkbox-sm" :checked="isSelected(t.id)"
                  @change="$emit('toggle-select-row', t.id)"
                  :aria-label="`Select transaction on ${formatDate(t.date)} for $${t.amount.toFixed(2)}`" />
                <span class="text-sm font-medium">{{ formatDate(t.date) }}</span>
              </div>
              <span class="font-bold" :class="t.type === 'income' ? 'text-success' : 'text-error'">
                {{ t.type === 'income' ? '+' : '-' }}${{ t.amount.toFixed(2) }}
              </span>
            </div>
            <!-- Type Badge -->
            <div class="flex items-center gap-2">
              <span class="badge badge-sm" :class="t.type === 'income' ? 'badge-success' : 'badge-error'">
                {{ t.type === 'income' ? '💰 Income' : '💸 Spending' }}
              </span>
              <span class="badge badge-sm badge-outline">{{ t.category }}</span>
            </div>
            <!-- Description -->
            <p class="text-sm text-base-content/80 line-clamp-2">{{ t.description }}</p>
            <!-- Tags -->
            <div v-if="t.tags?.length" class="flex flex-wrap gap-1">
              <span v-for="tag in t.tags" :key="t.id + '-tg-' + tag" class="badge badge-sm badge-ghost">
                {{ tag }}
              </span>
            </div>
            <!-- Actions -->
            <div class="flex justify-end gap-1 mt-1">
              <button type="button" class="btn btn-ghost btn-xs" @click="$emit('edit-transaction', t)" aria-label="Edit">
                ✏️
              </button>
              <button type="button" class="btn btn-ghost btn-xs" @click="$emit('duplicate-tx', t)" aria-label="Duplicate">
                📄
              </button>
              <button type="button" class="btn btn-ghost btn-xs text-error" @click="$emit('delete-transaction', t.id)"
                aria-label="Delete">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- Desktop Table View -->
      <div class="hidden lg:block overflow-x-auto">
        <div class="grid gap-3 overflow-x-auto">
          <table class="table table-zebra w-full" role="grid" aria-multiselectable="true">
            <caption class="sr-only">
              Transactions table.
              {{
                filteredCount
              }}
              results shown{{
                typeFilter ? " for type " + typeFilter : ""
              }}.
            </caption>
            <colgroup>
              <col style="width: 2.75rem" />
              <col style="width: 9rem" />
              <col style="width: 8rem" />
              <col style="width: 9rem" />
              <col style="width: 12rem" />
              <col />
              <!-- TAGS -->
              <col />
              <!-- DESCRIPTION -->
              <col style="width: 7.25rem" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">
                  <label>
                    <input type="checkbox" class="checkbox checkbox-sm" :checked="allSelected" :indeterminate="someSelectedOnPage && !allSelected
                      " @change="$emit('toggle-select-all')" aria-label="Select all on current page" />
                  </label>
                </th>
                <th scope="col">
                  <button type="button" class="btn btn-ghost btn-xs" @click="updateSort('date')">
                    Date
                    <span aria-hidden="true">{{
                      getSortIcon("date")
                    }}</span>
                  </button>
                </th>
                <th scope="col">
                  <button type="button" class="btn btn-ghost btn-xs" @click="updateSort('type')">
                    Type
                    <span aria-hidden="true">{{
                      getSortIcon("type")
                    }}</span>
                  </button>
                </th>
                <th scope="col">
                  <button type="button" class="btn btn-ghost btn-xs" @click="updateSort('amount')">
                    Amount
                    <span aria-hidden="true">{{
                      getSortIcon("amount")
                    }}</span>
                  </button>
                </th>
                <th scope="col">
                  <button type="button" class="btn btn-ghost btn-xs" @click="updateSort('category')">
                    Category
                    <span aria-hidden="true">{{
                      getSortIcon("category")
                    }}</span>
                  </button>
                </th>
                <th scope="col">Tags</th>
                <th scope="col">
                  <button type="button" class="btn btn-ghost btn-xs" @click="updateSort('description')">
                    Description
                    <span aria-hidden="true">{{
                      getSortIcon('description')
                    }}</span>
                  </button>
                </th>
                <th scope="col" class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(t, i) in paginatedTransactions" :key="t.id" :id="`tx-${t.id}`"
                :aria-selected="isSelected(t.id) ? 'true' : 'false'"
                :class="{ 'bg-base-200': isSelected(t.id) }">
                <td>
                  <label>
                    <input type="checkbox" class="checkbox checkbox-sm" :checked="isSelected(t.id)"
                      @change="$emit('toggle-select-row', t.id)" :aria-label="`Select transaction on ${formatDate(
                        t.date
                      )} for $${t.amount.toFixed(2)}`" />
                    <span class="sr-only" v-if="isSelected(t.id)">
                      Selected
                    </span>
                  </label>
                </td>
                <td>{{ formatDate(t.date) }}</td>
                <td>
                  <span class="badge type-badge" :class="t.type === 'income'
                    ? 'badge-success min-w-[6.5rem]'
                    : 'badge-error min-w-[6.5rem]'
                    ">
                    {{
                      t.type === "income" ? "💰 Income" : "💸 Spending"
                    }}
                  </span>
                </td>
                <td>${{ t.amount.toFixed(2) }}</td>
                <td>
                  <span class="badge badge-outline min-h-[3.5rem] w-[100%] p-3 text-center">{{
                    t.category
                  }}</span>
                </td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    <span v-for="tag in t.tags" :key="t.id + '-tg-' + tag" class="badge sm:badge-ghost">
                      {{ tag }}
                    </span>
                    <span v-if="!t.tags?.length" class="text-base-content/50">
                      —
                    </span> 
                  </div>
                </td>
                <td><p class="break-words">{{ t.description }}</p></td>
                <td class="whitespace-nowrap text-right">
                  <button type="button" class="btn btn-ghost btn-xs" @click="$emit('edit-transaction', t)"
                    aria-label="Edit">
                    ✏️
                  </button>
                  <button type="button" class="btn btn-ghost btn-xs" @click="$emit('duplicate-tx', t)"
                    aria-label="Duplicate">
                    📄
                  </button>
                  <button type="button" class="btn btn-ghost btn-xs text-error" @click="$emit('delete-transaction', t.id)"
                    aria-label="Delete">
                    🗑️
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center mt-6" role="navigation" aria-label="Pagination">
        <div class="btn-group">
          <button type="button" class="btn btn-sm" :disabled="currentPage === 1" @click="currentPage = 1"
            aria-label="First page">
            «
          </button>
          <button type="button" class="btn btn-sm" :disabled="currentPage === 1" @click="currentPage--"
            aria-label="Previous page">
            ‹
          </button>
          <button class="btn btn-sm btn-active" aria-current="page">
            Page {{ currentPage }} / {{ totalPages }}
          </button>
          <button type="button" class="btn btn-sm" :disabled="currentPage === totalPages"
            @click="currentPage = Math.min(totalPages, currentPage + 1)" aria-label="Next page">
            ›
          </button>
          <button type="button" class="btn btn-sm" :disabled="currentPage === totalPages"
            @click="currentPage = totalPages" aria-label="Last page">
            »
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Transaction } from "../utils/types";
import { useDateFormat } from "../composables/useDateFormat";

type SortField = "date" | "type" | "amount" | "category" | "description";
type SortOrder = "asc" | "desc";
type LargeSelect = { threshold: number; smart: boolean; pageOnly: boolean };

const { formatDate } = useDateFormat();

// ── Two-way bound state (owned by the parent's data pipeline) ──
const searchQuery = defineModel<string>("searchQuery", { required: true });
const showAdvancedTransactionsView = defineModel<boolean>(
  "showAdvancedTransactionsView",
  { required: true }
);
const prioritizeSelected = defineModel<boolean>("prioritizeSelected", {
  required: true,
});
const sortField = defineModel<SortField>("sortField", { required: true });
const sortOrder = defineModel<SortOrder>("sortOrder", { required: true });
const currentPage = defineModel<number>("currentPage", { required: true });
const openSmartSelect = defineModel<boolean>("openSmartSelect", {
  required: true,
});
const largeSelect = defineModel<LargeSelect>("largeSelect", { required: true });

const props = defineProps<{
  filteredCount: number;
  paginatedTransactions: Transaction[];
  selectedIds: Set<string>;
  totalPages: number;
  typeFilter: string;
  activeAmountFilter: string;
}>();

const emit = defineEmits<{
  (
    e: "select-by-type-and-close",
    type: "income" | "spending",
    scope: "page" | "all",
    event: Event
  ): void;
  (e: "close-closest-details", event: Event): void;
  (e: "select-large"): void;
  (e: "select-similar"): void;
  (e: "select-all", scope: "page" | "all"): void;
  (e: "open-bulk-edit"): void;
  (e: "clear-selection"): void;
  (e: "bulk-delete"): void;
  (e: "toggle-select-all"): void;
  (e: "toggle-select-row", id: string): void;
  (e: "edit-transaction", t: Transaction): void;
  (e: "duplicate-tx", t: Transaction): void;
  (e: "delete-transaction", id: string): void;
}>();

function onSelectAll(scope: "page" | "all", ev: Event) {
  emit("select-all", scope);
  const details = (ev.target as HTMLElement).closest("details");
  if (details) details.removeAttribute("open");
}

// ── Selection derivations (source of truth: parent's selectedIds) ──
const selectedCount = computed(() => props.selectedIds.size);
const isSelected = (id: string): boolean => props.selectedIds.has(id);
const someSelectedOnPage = computed(() =>
  props.paginatedTransactions.some((t) => props.selectedIds.has(t.id))
);
const allSelected = computed(
  () =>
    props.paginatedTransactions.length > 0 &&
    props.paginatedTransactions.every((t) => props.selectedIds.has(t.id))
);

// ── Sort helpers (only depend on the sort models this component owns) ──
function updateSort(field: SortField) {
  if (sortField.value === field)
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  else {
    sortField.value = field;
    sortOrder.value = "desc";
  }
  currentPage.value = 1;
}

function getSortIcon(field: SortField): string {
  if (sortField.value !== field) return "↕️";
  return sortOrder.value === "asc" ? "↑" : "↓";
}
</script>
