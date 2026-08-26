<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
        <section :id="'panel-add'" role="tabpanel" :aria-labelledby="'tab-add'"
          ref="addSectionRef" class="card bg-base-100 shadow-xl mb-6" tabindex="0">
          <div class="card-body">
            <div class="flex items-center justify-between gap-2">
              <h2 id="addHeading" class="card-title">
                {{
                  currentlyEditingId
                    ? "✏️ Edit Transaction"
                    : "➕ Add Transaction"
                }}
              </h2>
              <span class="badge badge-ghost" :class="newTransaction.type === 'income'
                ? 'badge-success'
                : 'badge-error'
                " aria-live="polite">
                {{ newTransaction.type === "income" ? "Income" : "Spending" }}
              </span>
            </div>
            <!-- <h2 id="addHeading" class="card-title">➕ Add Transaction</h2> -->
            <form @submit.prevent="addTransaction" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <!-- Date -->
              <div class="form-control relative">
                <label class="label" for="addDate">
                  <span class="label-text">Date</span>
                </label>

                <DatePicker v-model="newTxDateISO" id="addDate" aria-label="transaction date" />
              </div>

              <!-- Type -->
              <div class="form-control">
                <label class="label" for="addType">
                  <span class="label-text">Type</span>
                </label>
                <select id="addType" v-model="newTransaction.type" class="select select-bordered" required>
                  <option value="income">💰 Income</option>
                  <option value="spending">💸 Spending</option>
                </select>
              </div>

              <!-- Amount -->
              <div class="form-control">
                <label class="label" for="addAmount">
                  <span class="label-text">Amount</span>
                </label>
                <div class="join">
                  <span class="join-item btn btn-disabled" aria-hidden="true">$</span>
                  <input id="addAmount" ref="amountInputRef" v-model.number="newTransaction.amount" type="number"
                    step="0.01" min="0.01" placeholder="0.00" class="input input-bordered join-item flex-1"
                    :class="{ 'input-error': amountError }" required inputmode="decimal" @focus="scrollIntoView($event)"
                    @input="clearAmountError" :aria-invalid="!!amountError" aria-describedby="addAmountError" />
                </div>
                <p class="mt-1 text-xs opacity-70">
                  Enter a positive amount. Type switches don’t change the sign.
                </p>
              </div>

              <!-- Category -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Category</span>
                  <button v-if="currentCategory" type="button"
                    class="label-text-alt text-primary hover:underline transition-all" @click="clearCategory"
                    aria-label="Clear selected category">
                    Clear
                  </button>
                </label>

                <details ref="categoryDropdownRef" class="dropdown w-full" @toggle="onCategoryToggle">
                  <summary
                    class="btn w-full justify-between normal-case min-h-[48px] hover:border-primary transition-all duration-200"
                    aria-haspopup="listbox" :aria-expanded="categoryOpen"
                    :aria-label="currentCategory || 'Choose a category'">
                    <span class="capitalize flex items-center gap-2">
                      <span v-if="currentCategory" class="w-2 h-2 rounded-full bg-primary" aria-hidden="true"></span>
                      {{ currentCategory || "Choose a category…" }}
                    </span>
                    <svg class="w-5 h-5 transition-transform duration-200" :class="{ 'rotate-180': categoryOpen }"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>

                  <div
                    class="dropdown-content z-[60] bg-base-100 shadow-xl rounded-lg w-full sm:w-96 mt-2 border border-base-300 overflow-hidden">
                    <!-- Search and Manage Header -->
                    <div class="p-3 bg-base-200 border-b border-base-300">
                      <div class="flex gap-2">
                        <div class="relative flex-1">
                          <input ref="categorySearchRef" v-model.trim="categoryQuery" type="text"
                            class="input input-bordered w-full pr-8 transition-all duration-200 focus:border-primary"
                            placeholder="Search or add…" @keydown.enter.prevent="onCategoryEnter" autocomplete="off" />
                          <svg v-if="!categoryQuery"
                            class="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 opacity-40" fill="none"
                            stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <button v-else type="button"
                            class="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                            @click="categoryQuery = ''" aria-label="Clear search">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <button type="button"
                          class="btn btn-ghost btn-sm min-h-[44px] px-4 hover:bg-primary hover:text-primary-content transition-all duration-200"
                          @click="openManager('category')" aria-label="Manage categories" title="Manage categories">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </div>
                      <p v-if="filteredCategories.length > 0" class="text-xs opacity-60 mt-2">
                        {{ filteredCategories.length }} categor{{
                          filteredCategories.length === 1 ? "y" : "ies"
                        }}
                      </p>
                    </div>

                    <!-- Category List -->
                    <ul role="listbox" class="menu flex-nowrap max-h-64 overflow-y-auto p-2">
                      <li v-for="cat in filteredCategories" :key="cat" class="transition-all duration-150">
                        <button type="button" role="option"
                          class="justify-between min-h-[44px] rounded-lg hover:bg-primary hover:text-primary-content transition-all duration-200"
                          :class="{
                            'bg-primary/10 font-semibold':
                              currentCategory === cat,
                          }" :aria-selected="currentCategory === cat" @click="
                            selectCategory(cat);
                          closeClosestDetails($event);
                          ">
                          <span class="capitalize">{{ cat }}</span>
                          <span v-if="currentCategory === cat" class="flex items-center gap-1">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clip-rule="evenodd" />
                            </svg>
                          </span>
                        </button>
                      </li>

                      <!-- No results state -->
                      <li v-if="filteredCategories.length === 0 && !categoryQuery" class="p-4 text-center opacity-60">
                        <div class="text-sm">No categories yet</div>
                      </li>

                      <!-- Add new category -->
                      <li v-if="categoryQuery && !existsCategory(categoryQuery)"
                        class="mt-2 p-2 border-t border-base-300">
                        <button type="button"
                          class="btn btn-primary btn-block min-h-[44px] gap-2 hover:scale-[1.02] transition-transform duration-200"
                          @click="createCategoryAndSelect(categoryQuery)">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                          </svg>
                          Add "{{ categoryQuery }}"
                        </button>
                      </li>

                      <!-- No results for search -->
                      <li v-if="
                        filteredCategories.length === 0 &&
                        categoryQuery &&
                        existsCategory(categoryQuery)
                      " class="p-4 text-center">
                        <div class="text-sm opacity-60">
                          Category already exists
                        </div>
                      </li>
                    </ul>
                  </div>
                </details>
              </div>

              <!-- Tags -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Tags</span>
                  <button v-if="selectedTags.length > 0" type="button"
                    class="label-text-alt text-primary hover:underline transition-all" @click="clearTags">
                    Clear all
                  </button>
                </label>

                <details ref="tagsDropdownRef" class="dropdown w-full" @toggle="onTagsToggle">
                  <summary
                    class="btn w-full justify-start flex-wrap gap-2 min-h-[44px] h-auto py-2 hover:border-primary transition-all duration-200"
                    aria-haspopup="listbox" :aria-expanded="tagsOpen">
                    <!-- Selected tags as chips -->
                    <div v-if="selectedTags.length === 0" class="opacity-80 flex items-center gap-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Add tags…
                    </div>

                    <div v-else class="flex flex-wrap gap-2 flex-1">
                      <span v-for="tag in selectedTags" :key="tag"
                        class="badge badge-primary gap-2 px-3 py-3 transition-all duration-200 hover:badge-secondary group">
                        <span class="capitalize truncate max-w-[8rem]">{{
                          tag
                        }}</span>
                        <button type="button" class="hover:scale-125 transition-transform duration-150"
                          aria-label="Remove tag" @click.stop="removeTagFromSelection(tag)">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    </div>

                    <svg class="w-4 h-4 ml-auto transition-transform duration-200 shrink-0"
                      :class="{ 'rotate-180': tagsOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>

                  <div
                    class="dropdown-content z-[60] bg-base-100 shadow-xl rounded-lg w-full sm:w-96 mt-2 border border-base-300 overflow-hidden">
                    <!-- Search and Manage Header -->
                    <div class="p-3 bg-base-200 border-b border-base-300">
                      <div class="flex gap-2">
                        <div class="relative flex-1">
                          <input ref="tagsSearchRef" v-model.trim="tagsQuery" type="text"
                            class="input input-bordered w-full pr-8 transition-all duration-200 focus:border-primary"
                            placeholder="Search or add tag…" @keydown.enter.prevent="onTagsEnter" autocomplete="off" />
                          <svg v-if="!tagsQuery" class="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 opacity-40"
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <button v-else type="button"
                            class="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                            @click="tagsQuery = ''" aria-label="Clear search">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <button type="button"
                          class="btn btn-ghost btn-sm min-h-[44px] px-4 hover:bg-primary hover:text-primary-content transition-all duration-200"
                          @click="openManager('tag')" aria-label="Manage tags" title="Manage tags">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </div>
                      <p v-if="filteredTags.length > 0" class="text-xs opacity-60 mt-2">
                        {{ selectedTags.length }} selected ·
                        {{ filteredTags.length }} available
                      </p>
                    </div>

                    <!-- Tags List with Checkboxes -->
                    <ul role="listbox" class="menu flex-nowrap max-h-64 overflow-y-auto p-2">
                      <li v-for="tag in filteredTags" :key="tag" class="transition-all duration-150">
                        <button type="button" role="option"
                          class="justify-between min-h-[44px] rounded-lg hover:bg-primary hover:text-primary-content transition-all duration-200"
                          :class="{
                            'bg-primary/10 font-semibold':
                              selectedTags.includes(tag),
                          }" :aria-selected="selectedTags.includes(tag)" @click="
                            toggleTag(tag);
                          closeClosestDetails($event);
                          ">
                          <span class="capitalize truncate flex items-center gap-2">
                            <input type="checkbox"
                              class="checkbox checkbox-sm pointer-events-none transition-all duration-200"
                              :checked="selectedTags.includes(tag)" aria-hidden="true" />
                            {{ tag }}
                          </span>
                        </button>
                      </li>

                      <!-- No results state -->
                      <li v-if="filteredTags.length === 0 && !tagsQuery" class="p-4 text-center opacity-60">
                        <div class="text-sm">No tags yet</div>
                      </li>
                    </ul>

                    <!-- Footer Actions -->
                    <div class="p-3 border-t border-base-300 bg-base-100">
                      <button v-if="tagsQuery && !existsTag(tagsQuery)"
                        class="btn btn-primary btn-block min-h-[44px] gap-2 hover:scale-[1.02] transition-transform duration-200"
                        type="button" @click="createTagAndToggle(tagsQuery)">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add "{{ tagsQuery }}"
                      </button>

                      <div v-else-if="selectedTags.length > 0" class="text-xs text-center opacity-60">
                        Tip: Click tags to toggle selection
                      </div>
                    </div>
                  </div>
                </details>
              </div>

              <!-- Manager Modal -->
              <dialog ref="managerRef" class="modal modal-bottom sm:modal-middle">
                <div class="modal-box p-0 max-w-[48rem] max-h-[90vh] flex flex-col">
                  <!-- Sticky header with drag handle for mobile -->
                  <div class="p-4 border-b border-base-300 bg-base-200 sticky top-0 z-10">
                    <!-- Mobile drag handle -->
                    <div class="w-12 h-1.5 rounded-full bg-base-300 sm:hidden mx-auto mb-3 opacity-60"></div>

                    <div class="flex items-center gap-3">
                      <div class="p-2 rounded-lg bg-primary/10">
                        <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path v-if="managerType === 'category'" stroke-linecap="round" stroke-linejoin="round"
                            stroke-width="2"
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div class="flex-1">
                        <h3 class="font-bold text-lg">
                          Manage
                          {{
                            managerType === "category" ? "Categories" : "Tags"
                          }}
                        </h3>
                        <p class="text-xs opacity-60 mt-0.5">
                          {{ managerItems.length }} total
                        </p>
                      </div>
                      <form method="dialog">
                        <button class="btn btn-ghost btn-sm btn-circle hover:bg-base-300 transition-all duration-200"
                          @click="closeManager" aria-label="Close">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </form>
                    </div>
                  </div>

                  <!-- Sticky controls -->
                  <div class="p-4 border-b border-base-300 bg-base-100 sticky z-10 space-y-3"
                    style="top: calc(var(--header-height, 3.5rem) + 0.25rem)">
                    <!-- Search -->
                    <div class="relative">
                      <input ref="managerSearchRef" v-model="managerSearch" type="text"
                        class="input input-bordered w-full pl-10 transition-all duration-200 focus:border-primary"
                        :placeholder="`Search ${managerType}s…`" autocomplete="off" />
                      <svg class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" fill="none"
                        stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <button v-if="managerSearch" type="button"
                        class="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                        @click="managerSearch = ''" aria-label="Clear search">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <!-- Add new -->
                    <div class="flex gap-2">
                      <input ref="managerAddRef" v-model.trim="managerNewName" type="text"
                        class="input input-bordered flex-1 transition-all duration-200 focus:border-primary"
                        :placeholder="`Add new ${managerType}…`" @keydown.enter.prevent="managerAdd()"
                        autocomplete="off" />
                      <button
                        class="btn btn-primary min-h-[44px] px-6 gap-2 hover:scale-[1.02] transition-transform duration-200"
                        :disabled="!managerNewName.trim()" @click="managerAdd()">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span class="hidden sm:inline">Add</span>
                      </button>
                    </div>
                  </div>

                  <!-- Virtualized list with enhanced cards -->
                  <div ref="virtViewportRef" class="flex-1 overflow-y-auto overscroll-contain"
                    @scroll.passive="onVirtScroll" style="-webkit-overflow-scrolling: touch">
                    <div :style="{
                      height: virtTotalHeight + 'px',
                      position: 'relative',
                    }">
                      <!-- Empty state -->
                      <div v-if="managerItems.length === 0"
                        class="absolute inset-0 flex items-center justify-center p-8">
                        <div class="text-center max-w-sm">
                          <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-base-200 flex items-center justify-center">
                            <svg class="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                          </div>
                          <h4 class="font-semibold text-lg mb-2">
                            No {{ managerType }}s
                            {{ managerSearch ? "found" : "yet" }}
                          </h4>
                          <p class="text-sm opacity-60">
                            {{
                              managerSearch
                                ? "Try a different search term"
                                : `Add your first ${managerType} above`
                            }}
                          </p>
                        </div>
                      </div>

                      <!-- Item cards -->
                      <template v-for="(item, i) in virtVisibleItems" :key="item">
                        <div class="px-4 py-3 border-b border-base-200 hover:bg-base-100 transition-all duration-150"
                          :style="{
                            position: 'absolute',
                            top: virtItemTop(i) + 'px',
                            left: '0',
                            right: '0',
                            height: rowH + 'px',
                          }">
                          <!-- Normal view -->
                          <div v-if="renameTarget !== item" class="flex items-center gap-3 h-full">
                            <div class="flex-1 min-w-0">
                              <div class="font-medium capitalize truncate flex items-center gap-2">
                                <span>{{ item }}</span>
                                <span v-if="
                                  managerType === 'category' &&
                                  isDefaultCategory(item)
                                " class="badge badge-ghost badge-xs">default</span>
                                <span v-if="
                                  managerType === 'category' &&
                                  isHiddenCategory(item)
                                " class="badge badge-warning badge-xs">hidden</span>
                              </div>

                              <div class="text-xs opacity-60 mt-0.5">
                                {{ getCategoryUsageCount(item) }} transaction{{
                                  getCategoryUsageCount(item) === 1 ? "" : "s"
                                }}
                              </div>
                            </div>

                            <div class="flex gap-2 shrink-0">
                              <button
                                class="btn btn-ghost btn-sm min-h-[36px] gap-1 hover:bg-primary hover:text-primary-content transition-all duration-200"
                                @click="startRename(item)">
                                <!-- icon omitted for brevity -->
                                <span class="hidden sm:inline">Rename</span>
                              </button>

                              <!-- 👇 NEW: Restore only when category is hidden -->
                              <button v-if="
                                managerType === 'category' &&
                                isHiddenCategory(item)
                              " class="btn btn-ghost btn-sm min-h-[36px]" @click="restoreCategory(item)">
                                Restore
                              </button>

                              <button
                                class="btn btn-ghost btn-sm min-h-[36px] gap-1 text-error hover:bg-error hover:text-error-content transition-all duration-200"
                                @click="confirmDelete(item)">
                                <!-- icon omitted for brevity -->
                                <span class="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                          </div>

                          <!-- Rename view -->
                          <div v-else class="flex items-center gap-2 h-full">
                            <input ref="renameInputRef" v-model.trim="renameValue" type="text"
                              class="input input-bordered flex-1 input-sm transition-all duration-200 focus:border-primary"
                              :placeholder="`Rename '${renameTarget}' to…`" @keydown.enter.prevent="confirmRename"
                              @keydown.esc="cancelRename" autocomplete="off" />
                            <button
                              class="btn btn-primary btn-sm min-h-[36px] gap-1 hover:scale-[1.05] transition-transform duration-200"
                              @click="confirmRename" :disabled="!renameValue.trim()">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M5 13l4 4L19 7" />
                              </svg>
                              Save
                            </button>
                            <button class="btn btn-ghost btn-sm min-h-[36px]" @click="cancelRename">
                              Cancel
                            </button>
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>

                  <!-- Footer tip -->
                  <div class="p-3 border-t border-base-300 bg-base-100 text-xs text-center opacity-70">
                    <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Tip: Renaming to an existing {{ managerType }} will merge
                    them
                  </div>
                </div>

                <form method="dialog" class="modal-backdrop">
                  <button @click="closeManager">close</button>
                </form>
              </dialog>

              <!-- Rename Confirmation Modal -->
              <dialog ref="renameConfirmRef" class="modal modal-middle">
                <div class="modal-box max-w-md">
                  <div class="flex items-start gap-3">
                    <div class="p-2 rounded-lg bg-info/10 shrink-0">
                      <svg class="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div class="flex-1">
                      <h3 class="font-bold text-lg">
                        Update {{ managerType }} References?
                      </h3>
                      <p class="text-sm opacity-70 mt-2">
                        Renaming <strong>{{ renameTarget }}</strong> to
                        <strong>"{{ renameValue }}"</strong> will update all
                        transactions with this {{ managerType }}.
                      </p>
                      <p v-if="updateCount > 0" class="text-sm mt-3 p-3 bg-info/10 rounded border-l-4 border-info">
                        This will affect
                        <strong>{{ updateCount }}</strong>
                        transaction{{ updateCount === 1 ? "" : "s" }}.
                      </p>
                    </div>
                  </div>

                  <div class="modal-action">
                    <button class="btn btn-ghost" @click="cancelRename">
                      Cancel
                    </button>
                    <button class="btn btn-primary gap-2" @click="confirmRenameApply">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L9 17" />
                      </svg>
                      Update All
                    </button>
                  </div>
                </div>
                <form method="dialog" class="modal-backdrop">
                  <button @click="cancelRename">close</button>
                </form>
              </dialog>

              <!-- Description -->
              <div class="form-control">
                <label class="label" for="addDesc">
                  <span class="label-text">Description (Optional)</span>
                </label>
                <input id="addDesc" v-model="newTransaction.description" type="text"
                  placeholder="Transaction description" class="input input-bordered" />
              </div>

              <!-- Recurring Transaction -->
              <div class="form-control">
                <label class="label cursor-pointer" for="addRecurring">
                  <span class="label-text">Recurring Transaction</span>
                  <input id="addRecurring" v-model="newTransaction.recurring" type="checkbox" class="checkbox" />
                </label>
                <div v-if="newTransaction.recurring" class="space-y-2 mt-2">
                  <label class="sr-only" for="addFreq">Frequency</label>
                  <select id="addFreq" v-model="newTransaction.frequency"
                    class="select select-bordered select-sm w-full" aria-describedby="recurringHelp">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>

                  <label class="sr-only" for="addRecursions">
                    Number of occurrences
                  </label>
                  <input id="addRecursions" v-model.number="newTransaction.recursions" type="number" min="1" max="365"
                    placeholder="Number of occurrences" class="input input-bordered input-sm w-full"
                    aria-describedby="recurringHelp" />

                  <!-- Live end date display -->
                  <p id="recurringHelp" class="text-xs text-base-content/70" aria-live="polite">
                    Starts
                    <strong>{{ formatDate(newTransaction.date) }}</strong>.
                    <span v-if="derivedEndDateIso">
                      Ends
                      <strong>{{ formatDate(derivedEndDateIso) }}</strong>
                      after
                      <strong>{{
                        Math.max(1, Number(newTransaction.recursions || 1))
                      }}</strong>
                      occurrence{{
                        Math.max(1, Number(newTransaction.recursions || 1)) ===
                          1
                          ? ""
                          : "s"
                      }}
                      ({{ newTransaction.frequency }}).
                    </span>
                  </p>
                </div>
              </div>

              <!-- Apply to similar transactions (edit mode only) -->
              <div v-if="currentlyEditingId && similarCount > 0"
                class="form-control md:col-span-2">
                <button type="button"
                  class="btn btn-ghost btn-sm w-full justify-between normal-case font-medium hover:border-primary"
                  aria-haspopup="listbox" :aria-expanded="showSimilarPicker"
                  @click="showSimilarPicker = !showSimilarPicker">
                  <span class="flex items-center gap-2">
                    Apply to matching transactions
                    <span class="badge badge-sm" :class="applyToSimilarIds.size > 0 ? 'badge-primary' : 'badge-ghost'">
                      {{ applyToSimilarIds.size }}/{{ similarCount }}
                    </span>
                  <svg class="w-4 h-4 shrink-0 transition-transform duration-200"
                    :class="{ 'rotate-180': showSimilarPicker }" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                  </span>

                </button>

                <div v-if="showSimilarPicker"
                  class="mt-2 border border-base-300 rounded-lg overflow-hidden">
                  <div class="flex items-center justify-end px-3 py-2 bg-base-200 border-b border-base-300">
                    <button type="button" class="btn btn-ghost btn-xs" @click="toggleAllSimilar">
                      {{ allSimilarSelected ? "Deselect all" : "Select all" }}
                      ({{ similarCount }})
                    </button>
                  </div>

                  <ul class="max-h-56 overflow-y-auto divide-y divide-base-300 text-xs">
                    <li v-for="t in similarTransactions" :key="t.id" class="flex items-center gap-3 px-3 py-2">
                      <input type="checkbox" class="checkbox checkbox-xs shrink-0"
                        :checked="applyToSimilarIds.has(t.id)" @change="toggleSimilar(t.id)"
                        :aria-label="`Apply to transaction on ${formatDate(t.date)} for $${t.amount.toFixed(2)}`" />
                      <div class="min-w-0 flex-1 cursor-pointer" @click="toggleSimilar(t.id)">
                        <div class="truncate">{{ t.description || "(no description)" }}</div>
                        <div class="opacity-60">
                          {{ formatDate(t.date) }} · currently
                          <span class="capitalize">{{ t.category || "uncategorized" }}</span>
                        </div>
                      </div>
                      <span class="shrink-0 font-medium" :class="t.type === 'income' ? 'text-success' : 'text-error'">
                        {{ t.type === "income" ? "+" : "-" }}${{ t.amount.toFixed(2) }}
                      </span>
                    </li>
                  </ul>
                </div>

                <p v-if="applyToSimilarIds.size > 0" class="text-xs mt-1 opacity-70">
                  {{ applyToSimilarIds.size }} of {{ similarCount }} selected
                </p>
              </div>

              <!-- Submit Buttons -->
              <div class="form-control md:col-span-2 lg:col-span-3">
                <label class="label">
                  <span class="label-text">&nbsp;</span>
                </label>
                <div class="join w-full max-w-md">
                  <button type="submit" class="btn btn-primary join-item flex-1" :disabled="!newTransaction.amount || !newTransaction.category
                    ">
                    {{ currentlyEditingId ? "Update" : "Add" }} Transaction
                  </button>
                  <button type="button" class="btn btn-ghost join-item" @click="resetForm">
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from "vue";
import DatePicker from "./DatePicker.vue";
import type { Transaction } from "../utils/types";
import { norm, eqi, sortAlpha, dedupeCI } from "../utils/text";
import { useToasts } from "../composables/useToasts";
import { useDateFormat } from "../composables/useDateFormat";

type ManagerType = "category" | "tag";

// The parent owns transactions, the canonical category/tag lists + usage counts,
// and all rename/delete application logic. This component owns the Add/Edit form
// UI, the two comboboxes' open/search state, and the Manager modal's virtualized
// list. It emits intents for anything that mutates parent-owned data.
const props = defineProps<{
  currentlyEditingId: string | null;
  newTransaction: Transaction;
  amountError: string;
  allCategories: string[];
  tagList: string[];
  managerType: ManagerType;
  managerItems: string[];
  derivedEndDateIso: string;
  isDefaultCategory: (name: string) => boolean;
  isHiddenCategory: (name: string) => boolean;
  getCategoryUsageCount: (name: string) => number;
  similarTransactions: Transaction[];
}>();

const similarCount = computed(() => props.similarTransactions.length);
const showSimilarPicker = ref(false);
const allSimilarSelected = computed(
  () =>
    similarCount.value > 0 &&
    props.similarTransactions.every((t) => applyToSimilarIds.value.has(t.id))
);

function toggleSimilar(id: string) {
  const next = new Set(applyToSimilarIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  applyToSimilarIds.value = next;
}

function toggleAllSimilar() {
  applyToSimilarIds.value = allSimilarSelected.value
    ? new Set()
    : new Set(props.similarTransactions.map((t) => t.id));
}

const emit = defineEmits<{
  (e: "add-transaction"): void;
  (e: "reset-form"): void;
  (e: "clear-amount-error"): void;
  (e: "create-category", name: string): void;
  (e: "create-tag", name: string): void;
  (e: "open-manager", kind: ManagerType): void;
  (e: "manager-add", name: string): void;
  (
    e: "apply-rename",
    payload: { oldName: string; newName: string; count: number }
  ): void;
  (e: "restore-category", name: string): void;
  (e: "delete-item", name: string): void;
}>();

// Two-way bindings whose setters live in the parent (their side effects —
// last-selected-category persistence, tag sort/dedupe, ISO date validation —
// stay in the parent). managerSearch stays a v-model so the parent's
// managerItems computed keeps recomputing on each keystroke.
const currentCategory = defineModel<string>("currentCategory", {
  required: true,
});
const selectedTags = defineModel<string[]>("selectedTags", { required: true });
const newTxDateISO = defineModel<string>("newTxDateIso", { required: true });
const managerSearch = defineModel<string>("managerSearch", { required: true });
const applyToSimilarIds = defineModel<Set<string>>("applyToSimilarIds", {
  required: true,
});

const { pushToast } = useToasts();
const { formatDate } = useDateFormat();

// Root section + amount input refs are exposed so the parent's addTransaction /
// resetForm / editTransaction focus + scroll logic can reach them.
const addSectionRef = ref<HTMLElement | null>(null);
const amountInputRef = ref<HTMLInputElement | null>(null);

function scrollIntoView(e: FocusEvent) {
  const target = e.target as HTMLElement;
  if (target) {
    nextTick(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
}

function clearAmountError() {
  emit("clear-amount-error");
}

function addTransaction() {
  emit("add-transaction");
}

function resetForm() {
  emit("reset-form");
}

// ---------- Category combobox ----------
const categoryOpen = ref(false);
const categoryDropdownRef = ref<HTMLDetailsElement | null>(null);
const categoryQuery = ref("");
const categorySearchRef = ref<HTMLInputElement | null>(null);

const filteredCategories = computed(() => {
  const q = norm(categoryQuery.value);
  const list = props.allCategories.slice();
  if (!q) return list;
  return list
    .filter((c) => norm(c).includes(q))
    .sort((a, b) => {
      const A = norm(a),
        B = norm(b);
      const ap = A.startsWith(q) ? 0 : 1;
      const bp = B.startsWith(q) ? 0 : 1;
      return ap - bp || A.localeCompare(B);
    });
});

function existsCategory(name: string) {
  const n = norm(name);
  return props.allCategories.some((c) => norm(c) === n);
}

function onCategoryToggle(e: Event) {
  const el = e.target as HTMLDetailsElement;
  categoryOpen.value = !!el?.open;
  if (categoryOpen.value) {
    nextTick(() => categorySearchRef.value?.focus());
  }
}

function closeCategoryDropdown() {
  const el = categoryDropdownRef.value;
  if (el?.hasAttribute("open")) el.removeAttribute("open");
  categoryOpen.value = false;
  categoryQuery.value = "";
}

function selectCategory(cat: string) {
  currentCategory.value = cat;
  closeCategoryDropdown();
}

function clearCategory() {
  currentCategory.value = "";
}

function onCategoryEnter() {
  const q = categoryQuery.value.trim();
  if (!q) return;

  const exact = filteredCategories.value.find((c) => eqi(c, q));
  if (exact) {
    selectCategory(exact);
    return;
  }

  if (existsCategory(q)) {
    pushToast("Category is currently hidden. Please unhide it first.", "info");
    return;
  }

  createCategoryAndSelect(q);
}

function createCategoryAndSelect(name: string) {
  emit("create-category", name);
  closeCategoryDropdown();
}

// ---------- Tags combobox ----------
const tagsOpen = ref(false);
const tagsDropdownRef = ref<HTMLDetailsElement | null>(null);
const tagsQuery = ref("");
const tagsSearchRef = ref<HTMLInputElement | null>(null);

const filteredTags = computed(() => {
  const q = norm(tagsQuery.value);
  const list = sortAlpha(dedupeCI(props.tagList.slice()));
  if (!q) return list;
  return list
    .filter((t) => norm(t).includes(q))
    .sort((a, b) => {
      const A = norm(a),
        B = norm(b);
      const ap = A.startsWith(q) ? 0 : 1;
      const bp = B.startsWith(q) ? 0 : 1;
      return ap - bp || A.localeCompare(B);
    });
});

function existsTag(name: string) {
  const n = norm(name);
  return props.tagList.some((t) => norm(t) === n);
}

function onTagsToggle(e: Event) {
  const el = e.target as HTMLDetailsElement;
  tagsOpen.value = !!el?.open;
  if (tagsOpen.value) {
    nextTick(() => tagsSearchRef.value?.focus());
  }
}

function toggleTag(tag: string) {
  const current = [...selectedTags.value];
  const idx = current.findIndex((t) => eqi(t, tag));

  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(tag);
  }

  selectedTags.value = sortAlpha(dedupeCI(current));
}

function clearTags() {
  selectedTags.value = [];
}

function removeTagFromSelection(tag: string) {
  selectedTags.value = selectedTags.value.filter((t) => !eqi(t, tag));
}

function onTagsEnter() {
  const q = tagsQuery.value.trim();
  if (!q) return;

  const exact = filteredTags.value.find((t) => eqi(t, q));
  if (exact) {
    toggleTag(exact);
    tagsQuery.value = "";
    return;
  }

  if (!existsTag(q)) {
    createTagAndToggle(q);
  }
}

function createTagAndToggle(name: string) {
  emit("create-tag", name);
  tagsQuery.value = "";
}

// ---------- Manager modal ----------
const managerRef = ref<HTMLDialogElement | null>(null);
const managerSearchRef = ref<HTMLInputElement | null>(null);
const managerAddRef = ref<HTMLInputElement | null>(null);
const managerNewName = ref("");

function openManager(kind: ManagerType) {
  emit("open-manager", kind);
  managerSearch.value = "";
  managerNewName.value = "";
  renameTarget.value = null;
  renameValue.value = "";

  nextTick(() => {
    managerRef.value?.showModal?.();
    managerAddRef.value?.focus();
    // The dialog was closed (zero layout box) when virtViewportH was first
    // measured in onMounted, so it was stuck at 0 — re-measure now that the
    // viewport actually has a size, or the virtualized list under-renders
    // rows until the user scrolls or resizes the window.
    const el = virtViewportRef.value;
    if (el) {
      virtViewportH.value = el.clientHeight;
      virtScrollTop.value = el.scrollTop;
    }
  });
}

function closeManager() {
  managerRef.value?.close?.();
  managerSearch.value = "";
  managerNewName.value = "";
  renameTarget.value = null;
  renameValue.value = "";
}

function managerAdd() {
  const n = managerNewName.value.trim();
  if (!n) return;
  emit("manager-add", n);
  managerNewName.value = "";
  managerAddRef.value?.focus();
}

// ---------- Rename ----------
const renameInputRef = ref<HTMLInputElement | null>(null);
const renameTarget = ref<string | null>(null);
const renameValue = ref("");
const renameConfirmRef = ref<HTMLDialogElement | null>(null);
const updateCount = ref(0);

function startRename(name: string) {
  renameTarget.value = name;
  renameValue.value = name;
  nextTick(() => {
    renameInputRef.value?.focus();
    renameInputRef.value?.select();
  });
}

function confirmRename() {
  const oldName = renameTarget.value;
  const newName = renameValue.value.trim();
  if (!oldName || !newName || eqi(oldName, newName)) return;

  // Usage count is exactly the number of transactions this rename touches.
  const affectedCount = props.getCategoryUsageCount(oldName);
  updateCount.value = affectedCount;

  if (affectedCount > 0) {
    renameConfirmRef.value?.showModal?.();
  } else {
    emit("apply-rename", { oldName, newName, count: 0 });
    cancelRename();
  }
}

function confirmRenameApply() {
  const oldName = renameTarget.value;
  const newName = renameValue.value.trim();
  if (oldName && newName) {
    emit("apply-rename", { oldName, newName, count: updateCount.value });
  }
  renameConfirmRef.value?.close?.();
  cancelRename();
}

function cancelRename() {
  renameTarget.value = null;
  renameValue.value = "";
  renameConfirmRef.value?.close?.();
}

function restoreCategory(name: string) {
  emit("restore-category", name);
}

function confirmDelete(name: string) {
  emit("delete-item", name);
}

// ---------- Lightweight virtualization (windowed rendering) ----------
const virtViewportRef = ref<HTMLElement | null>(null);
const rowH = 52; // px per row (matches h in template)
const overscan = 10;

const virtScrollTop = ref(0);
const virtViewportH = ref(0);

let lastScrollUpdate = 0;
let pendingViewportUpdate = false;
let rafId: number | null = null;

function onVirtScroll() {
  const el = virtViewportRef.value;
  if (!el) return;
  lastScrollUpdate = performance.now();
  virtScrollTop.value = el.scrollTop;
  virtViewportH.value = el.clientHeight;
}

function handleViewportChange() {
  if (pendingViewportUpdate) return;
  pendingViewportUpdate = true;

  rafId = requestAnimationFrame(() => {
    pendingViewportUpdate = false;
    const el = virtViewportRef.value;
    if (!el) return;

    const newHeight = el.clientHeight;
    const newScrollTop = el.scrollTop;

    if (newHeight !== virtViewportH.value) {
      virtViewportH.value = newHeight;
    }

    const now = performance.now();
    if (now - lastScrollUpdate >= 50 && newScrollTop !== virtScrollTop.value) {
      virtScrollTop.value = newScrollTop;
    }

    const btmNav = document.querySelector(".btm-nav") as HTMLElement | null;
    if (btmNav) {
      void btmNav.offsetHeight;
    }
  });
}

const virtCount = computed(() => props.managerItems.length);
const virtTotalHeight = computed(() => virtCount.value * rowH);
const virtStartIndex = computed(() =>
  Math.max(0, Math.floor(virtScrollTop.value / rowH) - overscan)
);
const virtVisibleCount = computed(
  () => Math.ceil((virtViewportH.value || 0) / rowH) + overscan * 2
);
const virtEndIndex = computed(() =>
  Math.min(virtCount.value, virtStartIndex.value + virtVisibleCount.value)
);
const virtVisibleItems = computed(() =>
  props.managerItems.slice(virtStartIndex.value, virtEndIndex.value)
);
function virtItemTop(localIndex: number) {
  return (virtStartIndex.value + localIndex) * rowH;
}

function closeClosestDetails(e: Event) {
  const el = (e.target as HTMLElement)?.closest(
    "details[open]"
  ) as HTMLDetailsElement | null;
  el?.removeAttribute("open");
}

onMounted(() => {
  const el = virtViewportRef.value;
  if (el) {
    virtViewportH.value = el.clientHeight;
    virtScrollTop.value = el.scrollTop;
  }
  window.addEventListener("resize", onVirtScroll, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleViewportChange, {
      passive: true,
    });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onVirtScroll);
  if (window.visualViewport) {
    window.visualViewport.removeEventListener("resize", handleViewportChange);
  }
  // Cancel our own pending RAF so it never fires after unmount.
  if (rafId != null) {
    cancelAnimationFrame(rafId);
  }
});

defineExpose({
  addSectionRef,
  amountInputRef,
  categoryDropdownRef,
  virtViewportRef,
});
</script>
