<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
        <section v-if="activeTab === 'chart'" :id="'panel-chart'" role="tabpanel" :aria-labelledby="'tab-chart'"
          class="space-y-4 md:space-y-6" tabindex="0" aria-live="polite">
          <!-- Import Success Banner -->
          <div v-if="lastImportSummary" class="alert alert-success shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-5 w-5" fill="none"
              viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="flex-1">
              <h3 class="font-semibold">Import Complete!</h3>
              <p class="text-sm">{{ lastImportSummary }}</p>
            </div>
            <button type="button" class="btn btn-sm btn-circle btn-ghost" @click="$emit('dismiss-import-summary')"
              aria-label="Dismiss import summary">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Chart Display - At top, most prominent -->
          <div class="card bg-base-100 shadow-xl chart-card">
            <div class="card-body p-4 md:p-6">
              <!-- Chart Title with context -->
              <div class="flex flex-col xs:flex-row xs:items-center xs:justify-between mb-3 xs:mb-2 gap-1">
                <div>
                  <h2 id="chartHeading" class="text-lg xs:text-base font-semibold text-base-content">
                    Financial Overview
                  </h2>
                  <p class="text-xs xs:text-[11px] text-base-content/50 mt-0.5">
                    {{ chartPeriodLabel }} · {{ chartConfig.groupBy }} · {{ filteredTransactions.length }} transactions
                  </p>
                </div>
              </div>

              <!-- Quick Presets bar: date range presets + group-by badge + settings gear -->
              <div class="flex flex-wrap items-center gap-1.5 sm:gap-1 mb-3 sm:mb-2">
                <div class="flex flex-wrap gap-1 flex-1">
                  <button type="button" v-for="preset in dynamicDatePresets" :key="preset.label"
                    class="btn btn-xs btn-outline btn-square min-h-[28px] h-[28px] px-8 text-[11px] focus-ring target-min"
                    :class="{ 'btn-primary': isSelectedPreset(preset) }"
                    :title="preset.start ? preset.start + ' → ' + preset.end : 'No date limit'"
                    @click="applyDatePreset(preset)">
                    {{ preset.label }}
                  </button>
                </div>
                <label class="flex items-center gap-1" title="Group by: chart x-axis period">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-2.5 sm:w-2.5" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <select v-model="chartConfig.groupBy"
                    class="select select-bordered select-xs h-[28px] min-h-[28px] text-xs sm:text-[11px] focus-ring"
                    aria-label="Group chart by period">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </label>
                <button class="btn btn-xs btn-ghost gap-1 min-w-[35px] min-h-[35px]"
                  @click="showAdvancedFilters = true" aria-label="Open advanced settings" title="Open chart settings">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>

              <!-- Row 2: Chart Type Selectors - 2-row 4-col grid on mobile, single row on larger screens -->
              <div class="flex justify-center mb-3 sm:mb-2">
                <div class="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-1 w-full max-w-md" role="group"
                  aria-label="Chart type">
                  <label class="btn btn-sm btn-square sm:btn-auto mx-auto gap-0.5 h-[40px] w-[40px] sm:min-h-0"
                    :class="[chartConfig.type === 'bar' ? 'btn-primary' : 'btn-ghost hover:bg-base-200']"
                    aria-label="Bar chart"
                    title="Bar chart: compare income, spending, and net across periods">
                    <input type="radio" name="chartType" value="bar" v-model="chartConfig.type"
                      class="sr-only chart-type-radio" />
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-4 sm:w-4" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span class="text-[11px] sm:text-[10px]">Bar</span>
                  </label>
                  <label class="btn btn-sm btn-square sm:btn-auto mx-auto gap-0.5 h-[40px] w-[40px] sm:min-h-0"
                    :class="[chartConfig.type === 'line' ? 'btn-primary' : 'btn-ghost hover:bg-base-200']"
                    aria-label="Line chart"
                    title="Line chart: track trends and movement over time">
                    <input type="radio" name="chartType" value="line" v-model="chartConfig.type"
                      class="sr-only chart-type-radio" />
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-4 sm:w-4" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span class="text-[11px] sm:text-[10px]">Line</span>
                  </label>
                  <label class="btn btn-sm btn-square sm:btn-auto mx-auto gap-0.5 h-[40px] w-[40px] sm:min-h-0"
                    :class="[chartConfig.type === 'pie' ? 'btn-primary' : 'btn-ghost hover:bg-base-200']"
                    aria-label="Pie chart"
                    title="Pie chart: compare spending share by category or tag">
                    <input type="radio" name="chartType" value="pie" v-model="chartConfig.type"
                      class="sr-only chart-type-radio" />
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-4 sm:w-4" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    <span class="text-[11px] sm:text-[10px]">Pie</span>
                  </label>
                  <label class="btn btn-sm btn-square sm:btn-auto mx-auto gap-0.5 h-[40px] w-[40px] sm:min-h-0"
                    :class="[chartConfig.type === 'doughnut' ? 'btn-primary' : 'btn-ghost hover:bg-base-200']"
                    aria-label="Doughnut chart"
                    title="Doughnut chart: a ring view of the same spending breakdown">
                    <input type="radio" name="chartType" value="doughnut" v-model="chartConfig.type"
                      class="sr-only chart-type-radio" />
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-4 sm:w-4" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    </svg>
                    <span class="text-[11px] sm:text-[10px]">Donut</span>
                  </label>
                  <label class="btn btn-sm btn-square sm:btn-auto mx-auto gap-0.5 h-[40px] w-[40px] sm:min-h-0"
                    :class="[chartConfig.type === 'radar' ? 'btn-primary' : 'btn-ghost hover:bg-base-200']"
                    aria-label="Radar chart"
                    title="Radar chart: compare category totals across months">
                    <input type="radio" name="chartType" value="radar" v-model="chartConfig.type"
                      class="sr-only chart-type-radio" />
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-4 sm:w-4" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M7 12l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                    <span class="text-[11px] sm:text-[10px]">Radar</span>
                  </label>
                  <label class="btn btn-sm btn-square sm:btn-auto mx-auto gap-0.5 h-[40px] w-[40px] sm:min-h-0"
                    :class="[chartConfig.type === 'scatter' ? 'btn-primary' : 'btn-ghost hover:bg-base-200']"
                    aria-label="Scatter chart"
                    title="Scatter chart: inspect transaction spread over time">
                    <input type="radio" name="chartType" value="scatter" v-model="chartConfig.type"
                      class="sr-only chart-type-radio" />
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-4 sm:w-4" fill="currentColor"
                      viewBox="0 0 24 24">
                      <circle cx="6" cy="6" r="2" />
                      <circle cx="18" cy="8" r="2" />
                      <circle cx="10" cy="16" r="2" />
                      <circle cx="16" cy="14" r="2" />
                    </svg>
                    <span class="text-[11px] sm:text-[10px]">Scatter</span>
                  </label>
                  <label class="btn btn-sm btn-square sm:btn-auto mx-auto gap-0.5 h-[40px] w-[40px] sm:min-h-0"
                    :class="[chartConfig.type === 'bubbleHierarchy' ? 'btn-primary' : 'btn-ghost hover:bg-base-200']"
                    aria-label="Bubble map chart"
                    title="Bubble map chart: explore the category and tag hierarchy">
                    <input type="radio" name="chartType" value="bubbleHierarchy" v-model="chartConfig.type"
                      class="sr-only chart-type-radio" />
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-4 sm:w-4" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="3" />
                      <circle cx="6" cy="7" r="2" />
                      <circle cx="18" cy="8" r="2" />
                      <circle cx="8" cy="17" r="2" />
                      <circle cx="16" cy="16" r="2" />
                      <path stroke-linecap="round" stroke-width="1.5"
                        d="M8.5 8.5L10.5 10.5M13.5 10.5L15.5 9.5M10 13.5L9 15.5M14 13.5L15 14.5" />
                    </svg>
                    <span class="text-[11px] sm:text-[10px]">Bubble</span>
                  </label>
                  <button type="button"
                    class="btn btn-sm btn-square sm:btn-auto mx-auto gap-0.5 h-[40px] w-[40px] sm:min-h-0 chart-view-toggle"
                    :class="[showBalanceTable ? 'btn-primary' : 'btn-ghost hover:bg-base-200']"
                    :aria-pressed="showBalanceTable" aria-label="Balance sheet table"
                    title="Balance sheet table: show rows and columns" @click="chartConfig.type = 'table'">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-4 sm:w-4" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 9h16M4 15h16M9 4v16M15 4v16" />
                    </svg>
                    <span class="text-[11px] sm:text-[10px]">Table</span>
                  </button>
                </div>
              </div>

              <!-- Row 3: Category Series Selector (all chart types) - Color-coded compact badges -->
              <div class="flex flex-wrap justify-center gap-1.5 xs:gap-1 mb-2 xs:mb-2">
                <button type="button" class="btn btn-xs btn-ghost gap-0.5 xs:btn-sm-xs"
                  :class="{ 'btn-primary': selectedCategoriesChart.length === 0 || selectedCategoriesChart.length === chartCategories.length }"
                  @click="selectedCategoriesChart.length === 0 || selectedCategoriesChart.length === chartCategories.length ? unselectAllCategoriesChart() : selectAllCategoriesChart()"
                  title="Select/Deselect all categories">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 xs:h-2.5 xs:w-2.5" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-[10px] xs:text-[9px]">All ({{ selectedCategoriesChart.length ||
                    chartCategories.length }}/{{
                    chartCategories.length }})</span>
                </button>
                <button v-for="cat in visibleChartCategories" :key="cat" type="button"
                  class="badge badge-sm xs:badge-xs p-3 cursor-pointer focus-ring target-min transition-all hover:scale-105 border-2"
                  :class="{ 'opacity-100 ring-1': selectedCategoriesChart.includes(cat), 'opacity-40 badge-outline': !selectedCategoriesChart.includes(cat) }"
                  :style="{ backgroundColor: selectedCategoriesChart.includes(cat) ? getCategoryColor(cat) : 'transparent', borderColor: getCategoryColor(cat), color: selectedCategoriesChart.includes(cat) ? '#fff' : 'inherit' }"
                  @click="toggleCategoryForChart(cat)"
                  :title="selectedCategoriesChart.includes(cat) ? `Deselect ${cat}` : `Select ${cat}`">
                  {{ cat }}
                </button>
                <button v-if="chartCategories.length > BADGE_INITIAL_SHOW" type="button"
                  class="badge badge-sm badge-ghost cursor-pointer hover:badge-neutral transition-all"
                  @click="showAllCategoryBadges = !showAllCategoryBadges"
                  :title="showAllCategoryBadges ? 'Show fewer categories' : `Show ${chartCategories.length - BADGE_INITIAL_SHOW} more categories`">
                  {{ showAllCategoryBadges ? '↑ Less' : `+${chartCategories.length - BADGE_INITIAL_SHOW} more` }}
                </button>
              </div>

              <!-- Chart Display -->
              <div class="relative bg-base-200 rounded-lg p-4 xs:p-3" role="region" aria-label="Chart area">
                <div v-if="showBalanceTable" class="flex flex-col gap-3">
                  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 pb-3">
                    <div>
                      <h3 class="text-sm font-semibold tracking-wide uppercase">Balance Sheet Summary</h3>
                      <p class="text-xs text-base-content/60">Grouped by {{ balanceTablePeriod }} — shared with the
                        chart's group-by setting.
                      </p>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                      <div class="join join-horizontal" role="tablist" aria-label="Balance sheet period">
                        <button v-for="period in balanceTablePeriodOptions" :key="period.value" type="button" role="tab"
                          class="join-item btn btn-xs"
                          :class="balanceTablePeriod === period.value ? 'btn-active' : 'btn-ghost'"
                          :aria-selected="balanceTablePeriod === period.value"
                          @click="balanceTablePeriod = period.value">
                          {{ period.label }}
                        </button>
                      </div>
                      <span class="badge badge-outline">{{ balanceSheetTotals.count }} transactions</span>
                    </div>
                  </div>

                  <!-- Mobile Card View -->
                  <div class="lg:hidden space-y-2" role="table" aria-label="Balance sheet summary">
                    <!-- Column Headers -->
                    <div class="sr-only" role="row">
                      <span role="columnheader">Period</span>
                      <span role="columnheader">Income</span>
                      <span role="columnheader">Spending</span>
                      <span role="columnheader">Net</span>
                    </div>
                    <div v-for="row in balanceSheetRows" :key="row.key" role="row"
                      class="card bg-base-100 shadow-sm border border-base-300">
                      <div class="card-body p-3 gap-2">
                        <div class="flex items-center justify-between">
                          <span role="cell" class="font-semibold text-sm">{{ row.label }}</span>
                          <span role="cell" class="font-bold" :class="row.balance >= 0 ? 'text-success' : 'text-error'">
                            {{ row.balance >= 0 ? '+' : '-' }}${{ Math.abs(row.balance).toLocaleString('en-US', {
                              minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                          </span>
                        </div>
                        <div class="flex justify-between text-xs">
                          <span role="cell" class="text-success">Income: ${{ row.income.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2 }) }}</span>
                          <span role="cell" class="text-error">Spending: ${{ row.spending.toLocaleString('en-US', {
                            minimumFractionDigits:
                            2, maximumFractionDigits: 2 }) }}</span>
                        </div>
                      </div>
                    </div>
                    <div v-if="balanceSheetRows.length === 0" role="row" class="text-center text-base-content/60 py-8">
                      <span role="cell">No transactions match the current chart filters.</span>
                    </div>
                    <!-- Total Row -->
                    <div role="row" class="card bg-base-200 shadow-sm border border-primary/20">
                      <div class="card-body p-3">
                        <div class="flex items-center justify-between">
                          <span role="cell" class="font-bold">Total</span>
                          <span role="cell" class="font-bold"
                            :class="balanceSheetTotals.balance >= 0 ? 'text-success' : 'text-error'">
                            {{ balanceSheetTotals.balance >= 0 ? '+' : '-' }}${{
                              Math.abs(balanceSheetTotals.balance).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                            maximumFractionDigits: 2 }) }}
                          </span>
                        </div>
                        <div class="flex justify-between text-xs">
                          <span role="cell" class="text-success">Income: ${{ balanceSheetTotals.income.toLocaleString('en-US', {
                            minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                          <span role="cell" class="text-error">Spending: ${{ balanceSheetTotals.spending.toLocaleString('en-US', {
                            minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Desktop Table View -->
                  <div class="hidden lg:block overflow-x-auto rounded-box border border-base-300 bg-base-100 shadow-sm">
                    <table class="table table-zebra table-sm" aria-label="Balance sheet summary">
                      <thead>
                        <tr>
                          <th scope="col">Period</th>
                          <th scope="col" class="text-right">Income</th>
                          <th scope="col" class="text-right">Spending</th>
                          <th scope="col" class="text-right">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in balanceSheetRows" :key="row.key">
                          <td class="font-medium">{{ row.label }}</td>
                          <td class="text-right text-success font-semibold">${{ row.income.toLocaleString('en-US', {
                            minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                          <td class="text-right text-error font-semibold">${{ row.spending.toLocaleString('en-US', {
                            minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                          <td class="text-right font-semibold"
                            :class="row.balance >= 0 ? 'text-success' : 'text-error'">
                            {{ row.balance >= 0 ? '+' : '-' }}${{ Math.abs(row.balance).toLocaleString('en-US', {
                              minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                          </td>
                        </tr>
                        <tr v-if="balanceSheetRows.length === 0">
                          <td colspan="4" class="text-center text-base-content/60 py-8">
                            No transactions match the current chart filters.
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr>
                          <th scope="row">Total</th>
                          <th class="text-right text-success">${{ balanceSheetTotals.income.toLocaleString('en-US', {
                            minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</th>
                          <th class="text-right text-error">${{ balanceSheetTotals.spending.toLocaleString('en-US', {
                            minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</th>
                          <th class="text-right"
                            :class="balanceSheetTotals.balance >= 0 ? 'text-success' : 'text-error'">
                            {{ balanceSheetTotals.balance >= 0 ? '+' : '-' }}${{
                              Math.abs(balanceSheetTotals.balance).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                            maximumFractionDigits: 2 }) }}
                          </th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
                <div v-else class="chart-canvas-area">
                  <!-- Loading Skeleton -->
                  <div v-if="chartLoading"
                    class="absolute inset-0 z-10 flex items-center justify-center bg-base-200/80 rounded-lg backdrop-blur-sm"
                    aria-live="polite">
                    <div class="flex flex-col items-center gap-2">
                      <span class="loading loading-spinner loading-md text-primary"></span>
                      <span class="text-xs text-base-content/60">Loading chart...</span>
                    </div>
                  </div>
                  <div v-if="chartConfig.type === 'bubbleHierarchy'" ref="bubbleHierarchyContainer"
                    class="relative w-full max-h-[400px] xs:max-h-[240px] md:max-h-[450px] lg:max-h-[500px] xl:max-h-[600px]"
                    style="min-height: 200px; aspect-ratio: 16/9;" role="img" :aria-label="getChartAriaLabel()"
                    :aria-describedby="'chartHeading'">
                    <svg ref="bubbleHierarchySvg" class="w-full h-full"></svg>
                  </div>
                  <div v-else-if="chartData.labels.length === 0"
                    class="flex flex-col items-center justify-center py-10 text-center text-base-content/60 gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <template v-if="transactions.length === 0">
                      <p class="font-semibold text-sm">No transactions yet</p>
                      <p class="text-xs">Add your first transaction to see your financial overview.</p>
                      <button type="button" class="btn btn-sm btn-primary mt-1" @click="$emit('tab', 'add')">Add
                        Transaction</button>
                    </template>
                    <template v-else>
                      <p class="font-semibold text-sm">No data matches the current filters</p>
                      <p class="text-xs">Try selecting more categories, adjusting the date range, or resetting filters.
                      </p>
                      <div class="flex gap-2 mt-1">
                        <button type="button" class="btn btn-sm btn-ghost"
                          @click="selectAllCategoriesChart(); resetDateFilter()">Reset filters</button>
                        <button type="button" class="btn btn-sm btn-ghost" @click="showAdvancedFilters = true">Open
                          settings</button>
                      </div>
                    </template>
                  </div>
                  <canvas v-else ref="chartCanvas" role="img" :aria-label="getChartAriaLabel()"
                    :aria-describedby="'chartHeading'"
                    class="w-full max-h-[400px] xs:max-h-[240px] md:max-h-[450px] lg:max-h-[500px] xl:max-h-[600px]"></canvas>
                  <!-- External tooltip: rendered as HTML above the canvas so custom plugin overlays can't cover it.
                       Tied to the same condition as the canvas so it unmounts (and its stale opacity/content
                       resets) whenever the chart itself disappears, instead of floating over the empty state. -->
                  <div v-if="chartConfig.type !== 'bubbleHierarchy' && chartData.labels.length > 0" ref="chartTooltipEl"
                    class="absolute z-[1000] pointer-events-none opacity-0 transition-opacity duration-150 ease"
                    style="padding: 12px; border-radius: 8px; max-width: 300px; font-size: 12px;"
                    :style="chartTooltipStyle">
                  </div>
                </div>
              </div>

              <!-- Date Range Info -->
              <div class="flex justify-between items-center mt-3 text-sm text-base-content/60 xs:text-xs">
                <span class="truncate">{{ chartFilteredForStats.length }} transactions • {{ formatDateRange() }}</span>
                <div class="flex items-center gap-1">
                  <button v-if="!showBalanceTable && chartData.labels.length > 0" type="button"
                    class="btn btn-ghost btn-xs gap-1" @click="downloadChartAsPng" title="Download chart as PNG"
                    aria-label="Download chart image as PNG">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    PNG
                  </button>
                  <button class="btn btn-ghost btn-xs xs:btn-sm-xs" @click="resetDateFilter">Reset Date</button>
                </div>
              </div>

            </div>
          </div>

          <!-- Summary Stats - Below chart for quick reference -->
          <div class="stats stats-vertical lg:stats-horizontal shadow-lg w-full xs:stats-md">
            <div class="stat">
              <div class="stat-figure text-success xs:stat-figure-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 xs:h-4 xs:w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
              <div class="stat-title xs:text-xs">Total Income</div>
              <div class="stat-value text-success xs:text-base">${{ chartTotalIncome.toLocaleString('en-US', {
                minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
              <div class="stat-desc xs:text-[10px]">{{ incomeTransactions.length }} transactions</div>
            </div>
            <div class="stat">
              <div class="stat-figure text-error xs:stat-figure-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 xs:h-4 xs:w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
              <div class="stat-title xs:text-xs">Total Spending</div>
              <div class="stat-value text-error xs:text-base">${{ chartTotalExpenses.toLocaleString('en-US', {
                minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
              <div class="stat-desc xs:text-[10px]">{{ expenseTransactions.length }} transactions</div>
            </div>
            <div class="stat">
              <div class="stat-figure" :class="chartNetBalance >= 0 ? 'text-success' : 'text-error'">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 xs:h-4 xs:w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div class="stat-title xs:text-xs">Net Balance</div>
              <div class="stat-value" :class="chartNetBalance >= 0 ? 'text-success' : 'text-error'">
                {{ chartNetBalance >= 0 ? '+' : '-' }}${{ Math.abs(chartNetBalance).toLocaleString('en-US', {
                  minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </div>
              <div class="stat-desc" :class="chartNetBalance >= 0 ? 'text-success' : 'text-error'"
                :aria-live="'polite'">{{
                  chartNetBalance >= 0 ? 'Surplus' : 'Deficit' }}</div>
            </div>
            <div class="stat">
              <div class="stat-figure text-warning xs:stat-figure-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 xs:h-4 xs:w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div class="stat-title xs:text-xs">Savings Rate</div>
              <div v-if="chartSavingsRate !== null" class="stat-value xs:text-base"
                :class="chartSavingsRate >= 20 ? 'text-success' : chartSavingsRate >= 0 ? 'text-warning' : 'text-error'">
                {{ chartSavingsRate.toFixed(2) }}%
              </div>
              <div v-else class="stat-value text-base-content/30 xs:text-base">—</div>
              <div class="stat-desc xs:text-[10px]">of income saved</div>
            </div>
          </div>

          <!-- Additional Insights Row -->
          <div class="stats stats-vertical lg:stats-horizontal shadow-lg w-full xs:stats-md">
            <div class="stat">
              <div class="stat-figure text-info xs:stat-figure-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 xs:h-4 xs:w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 7h6m0 10v-3m0 3V7m6 6v-3m0 3V7" />
                </svg>
              </div>
              <div class="stat-title xs:text-xs">Avg Transaction</div>
              <div class="stat-value text-info xs:text-base">${{ chartAvgTransaction.toLocaleString('en-US', {
                minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
              <div class="stat-desc xs:text-[10px]">{{ chartFilteredForStats.length }} total transactions</div>
            </div>
            <div class="stat">
              <div class="stat-figure text-secondary xs:stat-figure-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 xs:h-4 xs:w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V5a2 2 0 012-2z" />
                </svg>
              </div>
              <div class="stat-title xs:text-xs">Top Category</div>
              <div class="stat-value xs:text-base">{{ chartTopCategory }}</div>
              <div class="stat-desc xs:text-[10px]">by transaction count</div>
            </div>
            <div class="stat">
              <div class="stat-figure text-accent xs:stat-figure-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 xs:h-4 xs:w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="stat-title xs:text-xs">Date Range</div>
              <div class="stat-value xs:text-base">{{ chartDateRangeLabel }}</div>
              <div class="stat-desc xs:text-[10px]">{{ chartDateSpan }}</div>
            </div>
            <div class="stat">
              <div class="stat-figure text-warning xs:stat-figure-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 xs:h-4 xs:w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div class="stat-title xs:text-xs">Income vs Spending</div>
              <div class="stat-value xs:text-base">
                {{ chartIncomeSpendingRatio }}
              </div>
              <div class="stat-desc xs:text-[10px]">ratio</div>
            </div>
          </div>



          <!-- Advanced Settings Modal Popup -->
          <AdvancedSettingsModal v-model:show-advanced-filters="showAdvancedFilters"
            v-model:chart-filter-display-mode="chartFilterDisplayMode"
            v-model:chart-selection-mode="chartSelectionMode" :date-filter="dateFilter" :chart-config="chartConfig"
            :selected-date-preset="selectedDatePreset" :transaction-date-range="transactionDateRange"
            :dynamic-date-presets="dynamicDatePresets" :chart-categories="chartCategories"
            :selected-categories-chart="selectedCategoriesChart" :available-tags-for-chart="availableTagsForChart"
            :selected-tags-chart="selectedTagsChart" :is-selected-preset="isSelectedPreset"
            :apply-date-preset="applyDatePreset" :format-chart-date="formatChartDate"
            :toggle-category-for-chart="toggleCategoryForChart" :select-all-categories-chart="selectAllCategoriesChart"
            :unselect-all-categories-chart="unselectAllCategoriesChart" :toggle-tag-for-chart="toggleTagForChart"
            :select-all-available-tags-for-chart="selectAllAvailableTagsForChart"
            :unselect-all-tags-for-chart="unselectAllTagsForChart" :reset-chart-settings="resetChartSettings" />
        </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import AdvancedSettingsModal from './AdvancedSettingsModal.vue';
import { buildTimeSeriesBuckets, type ChartGroupBy } from '../utils/chartBuckets';
import type { Chart, ChartData, ChartOptions, ChartType, ScriptableContext } from 'chart.js';
import type { Transaction } from '../utils/types';
import { eqi, containsCaseIns, sortAlpha, dedupeCI } from '../utils/text';
import { toLocalISO, todayLocalISO, parseDateGuess, startOfFortnight, startOfQuarter } from '../utils/dates';
import {
  cssVarToRGB, withAlpha, themeColor, invalidateColorCaches, themePalette,
  getCategoryColor, formatChartTooltipTitle, resolveTooltipColor,
} from '../utils/themeColors';
import { useToasts } from '../composables/useToasts';
import { useDateFormat } from '../composables/useDateFormat';
import { useTheme } from '../composables/useTheme';
import { devLog, devWarn, devError } from '../utils/debug';

// The parent owns transactions + the shared search/stats computeds; ChartsSection owns
// all chart-only state, the Chart.js/D3 lifecycle, the balance table, and the stats
// tiles. It is kept always-mounted (no v-if on the parent tag) so chart UI state
// persists across tab switches exactly as it did when this lived in the parent; the
// root <section v-if="activeTab === 'chart'"> gates only the DOM.
const props = defineProps<{
  transactions: Transaction[];
  activeTab: string;
  filteredTransactions: Transaction[];
  baseFilteredBySearch: Transaction[];
  netBalance: number;
  totalIncome: number;
  totalExpenses: number;
  lastImportSummary: string;
}>();

const emit = defineEmits<{
  (e: 'tab', id: string): void;
  (e: 'dismiss-import-summary'): void;
}>();

// Read-only prop aliases keep the extracted chart code byte-for-byte: the moved blocks
// reference transactions.value / activeTab.value / netBalance.value etc. unchanged.
const transactions = computed(() => props.transactions);
const activeTab = computed(() => props.activeTab);
const filteredTransactions = computed(() => props.filteredTransactions);
const baseFilteredBySearch = computed(() => props.baseFilteredBySearch);
const netBalance = computed(() => props.netBalance);
const totalIncome = computed(() => props.totalIncome);
const totalExpenses = computed(() => props.totalExpenses);
const lastImportSummary = computed(() => props.lastImportSummary);

const { pushToast } = useToasts();
const { formatDate } = useDateFormat();
const { currentTheme, themeVersion } = useTheme();

// Duplicated small pure helpers (their canonical copies stay in App.Dev.vue because
// non-chart code there also uses them).
function addMonthsClamped(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const target = new Date(dt.getFullYear(), dt.getMonth() + months, 1);
  const last = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0
  ).getDate();
  const day = Math.min(d, last);
  target.setDate(day);
  return toLocalISO(target);
}

function currencyFmt(n: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    // Fallback if currency isn't available in the runtime
    return `$${n.toFixed(2)}`;
  }
}

// Called by App.Dev's prepareNextImport() after an import completes, before it
// switches to the chart tab, so freshly-imported data shows on an unbounded range.
function resetDateForImport() {
  dateFilter.value = { start: '', end: '' };
  selectedDatePreset.value = 'All Time';
}
defineExpose({ resetDateForImport });

// ===================== extracted chart machinery =====================
type BalanceTablePeriod = "day" | "week" | "fortnight" | "month" | "quarter" | "year";

const balanceTablePeriodOptions: { value: BalanceTablePeriod; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "fortnight", label: "Fortnight" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

const groupByToTablePeriod: Record<ChartGroupBy, BalanceTablePeriod> = {
  daily: "day",
  weekly: "week",
  fortnightly: "fortnight",
  monthly: "month",
  quarterly: "quarter",
  yearly: "year",
};

const tablePeriodToGroupBy: Record<BalanceTablePeriod, ChartGroupBy> = {
  day: "daily",
  week: "weekly",
  fortnight: "fortnightly",
  month: "monthly",
  quarter: "quarterly",
  year: "yearly",
};

// Single source of truth: the table period mirrors chartConfig.groupBy in both directions
const balanceTablePeriod = computed<BalanceTablePeriod>({
  get: () => groupByToTablePeriod[chartConfig.value.groupBy],
  set: (period) => {
    chartConfig.value.groupBy = tablePeriodToGroupBy[period];
  },
});

// Helper to check if a preset is currently selected
function isSelectedPreset(preset: { label: string; start: string; end: string }) {
  return dateFilter.value.start === preset.start && dateFilter.value.end === preset.end;
}

// Format ISO date for display (simple helper for chart calendar)
function formatChartDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Charts
const dateFilter = ref<{ start: string; end: string }>({ start: '', end: '' });
const selectedDatePreset = ref('All Time');
const chartConfig = ref({
  type: 'bar' as 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'scatter' | 'bubbleHierarchy' | 'table',
  groupBy: 'monthly' as ChartGroupBy,
});

const showBalanceTable = computed(() => chartConfig.value.type === 'table');

// Reset series toggles to show all when switching back to time-series charts
watch(chartConfig, (newCfg, oldCfg) => {
  const pieishTypes = ['pie', 'doughnut', 'radar', 'scatter', 'bubbleHierarchy', 'table'];
  const timeSeriesTypes = ['line', 'bar'];
  if (oldCfg && pieishTypes.includes(oldCfg.type) && timeSeriesTypes.includes(newCfg.type)) {
    seriesToggles.value = { income: true, spending: true, balance: true, allTimeCumulativeNetBalance: true };
  }
}, { deep: true });

const seriesToggles = ref({ income: true, spending: true, balance: true, allTimeCumulativeNetBalance: true });
const selectedCategories = ref<string[]>([]);
// Chart tab state
const chartSelectionMode = ref<'or' | 'and'>('or');
const selectedCategoriesChart = ref<string[]>([]);
const selectedTagsChart = ref<string[]>([]);
const chartFilterDisplayMode = ref<'both' | 'categories' | 'tags'>('both');
const chartCanvas = ref<HTMLCanvasElement | null>(null);
const chartTooltipEl = ref<HTMLDivElement | null>(null);
const showAdvancedFilters = ref(false);



// Dynamic date range from transaction data
const transactionDateRange = computed(() => {
  if (transactions.value.length === 0) return { earliest: '', latest: '' };
  let earliest = transactions.value[0].date;
  let latest = transactions.value[0].date;
  for (let i = 1; i < transactions.value.length; i++) {
    const d = transactions.value[i].date;
    if (d < earliest) earliest = d;
    if (d > latest) latest = d;
  }
  return { earliest, latest };
});

// Dynamic date presets anchored to the current date
const dynamicDatePresets = computed(() => {
  const { earliest, latest } = transactionDateRange.value;
  const presets: { label: string; start: string; end: string }[] = [
    { label: 'All Time', start: '', end: '' },
  ];

  if (earliest) {
    const today = todayLocalISO();
    // Last 3 months up to today
    const threeMonthsAgo = addMonthsClamped(today, -3);
    presets.push({ label: 'Last 3 months', start: threeMonthsAgo, end: today });
    // Last 6 months
    const sixMonthsAgo = addMonthsClamped(today, -6);
    presets.push({ label: 'Last 6 months', start: sixMonthsAgo, end: today });
    // Last year
    const oneYearAgo = addMonthsClamped(today, -12);
    presets.push({ label: 'Last year', start: oneYearAgo, end: today });
    // Year to Date (YTD): Jan 1 of the current year through today
    const now = new Date();
    const ytdStart = `${now.getFullYear()}-01-01`;
    presets.push({ label: 'YTD', start: ytdStart, end: today });
    // This calendar year (Jan 1 - Dec 31)
    presets.push({ label: 'This year', start: ytdStart, end: `${now.getFullYear()}-12-31` });
    // This financial year (July-June for AU)
    const currentFY = now.getMonth() >= 6
      ? now.getFullYear()
      : now.getFullYear() - 1;
    presets.push({ label: 'This FY', start: `${currentFY}-07-01`, end: `${currentFY + 1}-06-30` });
    // Since first transaction
    presets.push({ label: 'Since first', start: earliest, end: latest });
  }

  return presets;
});

// Computed tooltip style to avoid calling cssVarToRGB/themeColor on every Vue render cycle
// These are expensive (getComputedStyle + canvas getImageData) and should be cached
const chartTooltipStyle = computed(() => ({
  backgroundColor: withAlpha(cssVarToRGB('--b2'), 0.97),
  color: cssVarToRGB('--bc'),
  borderColor: withAlpha(themeColor('primary'), 0.3),
  borderWidth: '1.5px',
}));

// Tags available based on selected categories (dependency logic)
const availableTagsForChart = computed(() => {
  if (selectedCategoriesChart.value.length === 0) {
    // No categories selected → show all tags
    return chartTags.value;
  }
  // Only show tags from transactions in selected categories
  const tagSet = new Set<string>();
  transactions.value.forEach(t => {
    if (selectedCategoriesChart.value.some(c => eqi(c, t.category))) {
      t.tags.forEach(tag => tagSet.add(tag));
    }
  });
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
});

// Watch for category deselection and clear invalid tags
watch(selectedCategoriesChart, (newCats) => {
  const available = availableTagsForChart.value;
  selectedTagsChart.value = selectedTagsChart.value.filter(tag =>
    available.some(a => eqi(a, tag))
  );
}, { deep: true });
// let chartInstance: Chart | null = null;
const bubbleHierarchyContainer = ref<HTMLDivElement | null>(null);
const bubbleHierarchySvg = ref<SVGSVGElement | null>(null);

onUnmounted(() => {
  // Destroy chart instance to prevent memory leaks
  if (chartInstance) {
    try { chartInstance.destroy(); } catch (e) { /* ignore */ }
    chartInstance = null;
  }
  // Clear pending render timeout
  if (renderTimeoutId) {
    clearTimeout(renderTimeoutId);
    renderTimeoutId = null;
  }
  pendingRenderChart = false;
  chartRenderPromise = null;
  // Clean up bubble hierarchy SVG (no async needed, direct DOM removal)
  if (bubbleHierarchySvg.value) {
    bubbleHierarchySvg.value.innerHTML = '';
  }
  bubbleHierarchyInstance = null;
});

type BalanceTableRow = {
  key: string;
  label: string;
  income: number;
  spending: number;
  balance: number;
  count: number;
  order: number;
};

function formatBalanceTableDate(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getBalanceBucket(dateValue: string | Date, period: BalanceTablePeriod): BalanceTableRow {
  const iso = typeof dateValue === "string" ? parseDateGuess(dateValue) : toLocalISO(dateValue);
  const parsed = iso ? new Date(`${iso}T00:00:00`) : new Date(dateValue);
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  const monthLabel = new Intl.DateTimeFormat("en-AU", {
    month: "short",
    year: "numeric",
  }).format(local);

  if (period === "day") {
    return {
      key: `${year}-${month}-${day}`,
      label: formatBalanceTableDate(local),
      income: 0,
      spending: 0,
      balance: 0,
      count: 0,
      order: local.getTime(),
    };
  }

  if (period === "week") {
    const mondayOffset = (local.getDay() + 6) % 7;
    const start = new Date(local);
    start.setDate(local.getDate() - mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return {
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
      label: `Week of ${formatBalanceTableDate(start)}`,
      income: 0,
      spending: 0,
      balance: 0,
      count: 0,
      order: start.getTime(),
    };
  }

  if (period === "fortnight") {
    const start = startOfFortnight(local);
    return {
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
      label: `Fortnight of ${formatBalanceTableDate(start)}`,
      income: 0,
      spending: 0,
      balance: 0,
      count: 0,
      order: start.getTime(),
    };
  }

  if (period === "quarter") {
    const start = startOfQuarter(local);
    const quarter = Math.floor(local.getMonth() / 3) + 1;
    return {
      key: `${year}-Q${quarter}`,
      label: `Q${quarter} ${year}`,
      income: 0,
      spending: 0,
      balance: 0,
      count: 0,
      order: start.getTime(),
    };
  }

  if (period === "year") {
    const start = new Date(year, 0, 1);
    return {
      key: `${year}`,
      label: `${year}`,
      income: 0,
      spending: 0,
      balance: 0,
      count: 0,
      order: start.getTime(),
    };
  }

  const start = new Date(year, local.getMonth(), 1);
  return {
    key: `${year}-${month}`,
    label: monthLabel,
    income: 0,
    spending: 0,
    balance: 0,
    count: 0,
    order: start.getTime(),
  };
}

const balanceSheetRows = computed(() => {
  const buckets = new Map<string, BalanceTableRow>();
  const source = activeTab.value === 'chart' ? chartFilteredTransactions.value : filteredTransactions.value;

  for (const tx of source) {
    const bucketSeed = getBalanceBucket(tx.date, balanceTablePeriod.value);
    const existing = buckets.get(bucketSeed.key) ?? { ...bucketSeed };

    existing.count += 1;
    if (tx.type === "income") {
      existing.income += tx.amount;
    } else {
      existing.spending += tx.amount;
    }
    existing.balance = existing.income - existing.spending;

    buckets.set(existing.key, existing);
  }

  return [...buckets.values()].sort((a, b) => a.order - b.order);
});

const balanceSheetTotals = computed(() => {
  const income = balanceSheetRows.value.reduce((sum, row) => sum + row.income, 0);
  const spending = balanceSheetRows.value.reduce((sum, row) => sum + row.spending, 0);
  return {
    income,
    spending,
    balance: income - spending,
    count: activeTab.value === 'chart' ? chartFilteredTransactions.value.length : filteredTransactions.value.length,
  };
});

// Chart view applies the chart date range on top of the same base, then applies category/tag filters
// LAZY: Only evaluate when on chart tab to avoid filtering 200k+ transactions unnecessarily
const chartFilteredTransactions = computed(() => {
  if (activeTab.value !== 'chart') return [];
  const { start, end } = dateFilter.value;
  let base = baseFilteredBySearch.value.filter(
    (t) => (!start || t.date >= start) && (!end || t.date <= end)
  );

  // Apply category/tag filtering (same logic as chartData)
  if (chartSelectionMode.value === 'or') {
    if (selectedCategoriesChart.value.length > 0 && selectedTagsChart.value.length > 0) {
      base = base.filter(t =>
        containsCaseIns(selectedCategoriesChart.value, t.category) ||
        t.tags.some(tag => selectedTagsChart.value.some(selectedTag => eqi(tag, selectedTag)))
      );
    } else if (selectedCategoriesChart.value.length > 0) {
      base = base.filter(t => containsCaseIns(selectedCategoriesChart.value, t.category));
    } else if (selectedTagsChart.value.length > 0) {
      base = base.filter(t =>
        t.tags.some(tag => selectedTagsChart.value.some(selectedTag => eqi(tag, selectedTag)))
      );
    }
  } else if (chartSelectionMode.value === 'and') {
    if (selectedCategoriesChart.value.length > 0 && selectedTagsChart.value.length > 0) {
      base = base.filter(t =>
        containsCaseIns(selectedCategoriesChart.value, t.category) &&
        selectedTagsChart.value.every(selectedTag => t.tags.some(tag => eqi(tag, selectedTag)))
      );
    } else if (selectedCategoriesChart.value.length > 0) {
      base = base.filter(t => containsCaseIns(selectedCategoriesChart.value, t.category));
    } else if (selectedTagsChart.value.length > 0) {
      base = base.filter(t =>
        selectedTagsChart.value.some(selectedTag => t.tags.some(tag => eqi(tag, selectedTag)))
      );
    }
  }

  return base;
});

// Chart-specific stats (only evaluated when chart tab is mounted via v-if)
const chartFilteredForStats = computed(() => {
  if (typeof chartFilteredTransactions !== 'undefined') {
    return chartFilteredTransactions.value;
  }
  return filteredTransactions.value;
});
const incomeTransactions = computed(() =>
  chartFilteredForStats.value.filter((t) => t.type === "income")
);
const expenseTransactions = computed(() =>
  chartFilteredForStats.value.filter((t) => t.type === "spending")
);
const chartTotalIncome = computed(() =>
  incomeTransactions.value.reduce((s, t) => s + t.amount, 0)
);
const chartTotalExpenses = computed(() =>
  expenseTransactions.value.reduce((s, t) => s + t.amount, 0)
);
const chartNetBalance = computed(() => chartTotalIncome.value - chartTotalExpenses.value);
const chartSavingsRate = computed(() => {
  if (chartTotalIncome.value <= 0) return null;
  return (chartNetBalance.value / chartTotalIncome.value) * 100;
});

// Additional chart stats
const chartAvgTransaction = computed(() => {
  const count = chartFilteredForStats.value.length;
  if (count === 0) return 0;
  const total = chartFilteredForStats.value.reduce((s, t) => s + t.amount, 0);
  return total / count;
});

const chartTopCategory = computed(() => {
  const counts: Record<string, number> = {};
  for (const t of chartFilteredForStats.value) {
    counts[t.category] = (counts[t.category] || 0) + 1;
  }
  let top = '—';
  let max = 0;
  for (const [cat, cnt] of Object.entries(counts)) {
    if (cnt > max) {
      max = cnt;
      top = cat;
    }
  }
  return top;
});

const chartDateRangeLabel = computed(() => {
  const txs = chartFilteredForStats.value;
  if (txs.length === 0) return '—';
  const dates = txs.map(t => t.date).filter(Boolean).sort();
  if (dates.length === 0) return '—';
  const fmt = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  };
  if (dates[0] === dates[dates.length - 1]) return fmt(dates[0]);
  return `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;
});

const chartDateSpan = computed(() => {
  const txs = chartFilteredForStats.value;
  if (txs.length < 2) return '';
  const dates = txs.map(t => t.date).filter(Boolean).sort();
  const start = new Date(dates[0]).getTime();
  const end = new Date(dates[dates.length - 1]).getTime();
  const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
  const years = (days / 365.25).toFixed(1);
  return `${years} years`;
});

const chartIncomeSpendingRatio = computed(() => {
  if (chartTotalExpenses.value === 0) return chartTotalIncome.value > 0 ? '∞ : 1' : '—';
  const ratio = chartTotalIncome.value / chartTotalExpenses.value;
  return `${ratio.toFixed(1)} : 1`;
});

// WCAG 1.3.1: Accessible chart description for screen readers
function getChartAriaLabel() {
  const type = chartConfig.value.type;
  const count = filteredTransactions.value.length;
  const balance = netBalance.value >= 0 ? 'surplus' : 'deficit';
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Financial ${type} chart showing ${count} transactions with ${balance} of $${fmt(Math.abs(netBalance.value))}. Income: $${fmt(totalIncome.value)}, Spending: $${fmt(totalExpenses.value)}.`;
}

const chartPeriodLabel = computed(() => {
  const { start, end } = dateFilter.value;
  if (!start && !end) return 'All Time';
  const fmt = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end)}`;
});


// Charts
// LAZY: Only extract categories/tags when on chart tab (saves O(n) iteration on 200k+ transactions)
const chartCategories = computed(() => {
  if (activeTab.value !== 'chart') return [];
  const s = new Set<string>();
  transactions.value.forEach((t) => s.add(t.category));
  // Stable order keeps palette assignment consistent across pie/donut/radar/scatter/bubble views.
  return [...s]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return Array.from(s).sort();
});

const showAllCategoryBadges = ref(false);
const BADGE_INITIAL_SHOW = 6;
const visibleChartCategories = computed(() =>
  showAllCategoryBadges.value ? chartCategories.value : chartCategories.value.slice(0, BADGE_INITIAL_SHOW)
);

const chartTags = computed(() => {
  if (activeTab.value !== 'chart') return [];
  const s = new Set<string>();
  transactions.value.forEach((t) => t.tags.forEach(tag => s.add(tag)));
  // Stable order keeps tag-driven diagram colors consistent too.
  return [...s]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return Array.from(s).sort();
});


// LAZY: Only compute chart data when on chart tab
const chartData = computed(() => {
  // React to themeVersion (incremented after CSS propagates) so colors re-bake
  const _v = themeVersion.value;
  if (activeTab.value !== 'chart' || showBalanceTable.value) return { labels: [], datasets: [] };
  // Bubble hierarchy uses D3.js, not Chart.js - return empty to prevent Chart.js rendering
  if (chartConfig.value.type === 'bubbleHierarchy') {
    return { labels: [], datasets: [] };
  }

  const sourceList = typeof chartFilteredTransactions !== 'undefined'
    ? chartFilteredTransactions.value
    : filteredTransactions.value;

  let base = sourceList;

  if (chartSelectionMode.value === 'or') {
    // OR mode: must have selected category OR selected tag
    if (selectedCategoriesChart.value.length > 0 && selectedTagsChart.value.length > 0) {
      // Both categories and tags selected: include if matches either
      base = base.filter(t =>
        containsCaseIns(selectedCategoriesChart.value, t.category) ||
        t.tags.some(tag => selectedTagsChart.value.some(selectedTag => eqi(tag, selectedTag)))
      );
    } else if (selectedCategoriesChart.value.length > 0) {
      // Only categories selected: filter by categories
      base = base.filter(t => containsCaseIns(selectedCategoriesChart.value, t.category));
    } else if (selectedTagsChart.value.length > 0) {
      // Only tags selected: filter by tags
      base = base.filter(t =>
        t.tags.some(tag => selectedTagsChart.value.some(selectedTag => eqi(tag, selectedTag)))
      );
    }
  } else if (chartSelectionMode.value === 'and') {
    // AND mode: must have ALL selected categories AND ALL selected tags
    if (selectedCategoriesChart.value.length > 0 && selectedTagsChart.value.length > 0) {
      base = base.filter(t =>
        containsCaseIns(selectedCategoriesChart.value, t.category) &&
        selectedTagsChart.value.every(selectedTag => t.tags.some(tag => eqi(tag, selectedTag)))
      );
    } else if (selectedCategoriesChart.value.length > 0) {
      // Only categories selected
      base = base.filter(t => containsCaseIns(selectedCategoriesChart.value, t.category));
    } else if (selectedTagsChart.value.length > 0) {
      // Only tags selected
      base = base.filter(t =>
        selectedTagsChart.value.some(selectedTag => t.tags.some(tag => eqi(tag, selectedTag)))
      );
    }
  }

  // ── Pie / Doughnut ──
  if (chartConfig.value.type === 'pie' || chartConfig.value.type === 'doughnut') {
    const displayMode = chartFilterDisplayMode.value;
    const byGroup: Record<string, number> = {};

    if (displayMode === 'tags') {
      // Group by tags only
      base.forEach(t => {
        if (t.type === 'spending') {
          t.tags.forEach(tag => {
            byGroup[tag] = (byGroup[tag] || 0) + t.amount;
          });
        }
      });
    } else if (displayMode === 'both') {
      // Group by category with tag subtotals
      base.forEach(t => {
        if (t.type === 'spending') {
          const catKey = t.category;
          byGroup[catKey] = (byGroup[catKey] || 0) + t.amount;
        }
      });
    } else {
      // Default: categories only
      base.forEach(t => {
        if (t.type === 'spending') {
          byGroup[t.category] = (byGroup[t.category] || 0) + t.amount;
        }
      });
    }

    const labels = Object.keys(byGroup).sort((a, b) => byGroup[b] - byGroup[a]);
    const data = labels.map(k => byGroup[k]);

    // Unified category color mapping: same category = same color across ALL chart types
    const spendingColors = labels.map(cat => getCategoryColor(cat));

    const datasetLabel = displayMode === 'tags' ? 'Spending by Tag' : 'Spending by Category';

    return {
      labels,
      datasets: [{
        label: datasetLabel,
        data,
        backgroundColor: spendingColors,
        borderColor: themeColor("base1"),
        borderWidth: 2,
        hoverOffset: 10,
      }],
    };
  }

  // ── Radar ──
  if (chartConfig.value.type === 'radar') {
    const byMonth: Record<string, Record<string, number>> = {};

    base.forEach(t => {
      const d = typeof t.date === 'string' ? new Date(t.date) : t.date;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[monthKey]) byMonth[monthKey] = {};
      const cat = t.category || 'Uncategorized';
      byMonth[monthKey][cat] = (byMonth[monthKey][cat] || 0) + t.amount;
    });

    const allCategories = Array.from(
      new Set(Object.values(byMonth).flatMap(m => Object.keys(m)))
    ).sort();

    const months = Object.keys(byMonth).sort();
    const datasets = allCategories
      .filter((_) => months.length > 0) // Only include if we have months
      .slice(0, 8) // Limit to 8 categories for readability
      .map((cat) => {
        // Unified category color: same category = same color across ALL chart types
        const color = getCategoryColor(cat);
        return {
          label: cat,
          data: months.map(m => byMonth[m][cat] || 0),
          borderColor: color,
          backgroundColor: withAlpha(color, 0.2),
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: color,
          tension: 0.3,
        };
      });

    return {
      labels: months,
      datasets,
    };
  }

  // ── Scatter ──
  if (chartConfig.value.type === 'scatter') {
    const spendingPoints = base
      .filter(t => t.type === 'spending')
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((t) => {
        const d = typeof t.date === 'string' ? new Date(t.date) : new Date(t.date);
        return {
          x: d.getTime(),
          y: t.amount,
          // Store category for color coding
          category: t.category,
        };
      });

    const incomePoints = base
      .filter(t => t.type === 'income')
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((t) => {
        const d = typeof t.date === 'string' ? new Date(t.date) : new Date(t.date);
        return {
          x: d.getTime(),
          y: t.amount,
          category: t.category,
        };
      });

    // Group spending by category for better visualization
    const spendingByCategory: Record<string, any[]> = {};
    spendingPoints.forEach(p => {
      const cat = p.category || 'Uncategorized';
      if (!spendingByCategory[cat]) spendingByCategory[cat] = [];
      spendingByCategory[cat].push({ x: p.x, y: p.y });
    });

    const datasets = [];

    // Unified category color mapping: same category = same color across ALL chart types
    Object.entries(spendingByCategory).forEach(([cat, points]) => {
      const color = getCategoryColor(cat);
      datasets.push({
        label: cat,
        data: points,
        backgroundColor: withAlpha(color, 0.6),
        borderColor: color,
        pointRadius: Math.min(5, Math.max(3, 100 / points.length)), // Dynamic sizing based on data density
        pointHoverRadius: 8,
        pointStyle: 'circle' as const,
        pointBorderWidth: 2,
      });
    });

    if (incomePoints.length > 0) {
      datasets.push({
        label: 'Income',
        data: incomePoints.map(p => ({ x: p.x, y: p.y })),
        backgroundColor: withAlpha(themeColor("success"), 0.7),
        borderColor: themeColor("success"),
        pointRadius: 6,
        pointHoverRadius: 9,
        pointStyle: 'triangle' as const,
        pointBorderWidth: 2,
      });
    }

    // Generate labels as dates (every 10th unique date to avoid clutter)
    const allDates = [...spendingPoints, ...incomePoints].map(p => p.x);
    const uniqueDates = Array.from(new Set(allDates)).sort((a, b) => a - b);
    const labelDates = uniqueDates.filter((_, i) => i % Math.max(1, Math.floor(uniqueDates.length / 10)) === 0);

    return {
      labels: labelDates.map(d => {
        const dateObj = new Date(d);
        return typeof dateObj === 'string' ? dateObj : toLocalISO(dateObj);
      }),
      datasets,
    };
  }

  // ── Line / Bar (time series) ──
  const buckets = buildTimeSeriesBuckets(base, chartConfig.value.groupBy, {
    rangeStart: dateFilter.value.start || undefined,
    rangeEnd: dateFilter.value.end || undefined,
  });
  const { labels, income, spending, balance, cumulative } = buckets;

  // Calculate Y-axis range from only VISIBLE datasets for dynamic scaling
  // This ensures the scale adjusts when datasets are toggled on/off via the legend
  const visibleData: number[] = [];
  if (seriesToggles.value.income) visibleData.push(...income);
  if (seriesToggles.value.spending) visibleData.push(...spending);
  if (seriesToggles.value.balance) visibleData.push(...balance);
  if (seriesToggles.value.allTimeCumulativeNetBalance) visibleData.push(...cumulative);

  const allValues = visibleData.filter(v => typeof v === 'number' && isFinite(v));
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const dataRange = dataMax - dataMin || 1;
  const padding = dataRange * 0.15; // 15% padding above/below
  let yMin = dataMin - padding;
  let yMax = dataMax + padding;
  // Ensure zero is included if data crosses zero or is close to it
  if (dataMin < 0 && dataMax > 0) {
    yMin = Math.min(yMin, 0);
    yMax = Math.max(yMax, 0);
  } else if (dataMin >= 0) {
    yMin = Math.min(yMin, 0); // Always show baseline
  }

  const t = chartConfig.value.type;
  const datasets: any[] = [];

  // Dynamic theme-aware colors: tie into DaisyUI theme selection
  const incomeColor = themeColor('success');          // green from theme
  const spendingColor = themeColor('error');          // red from theme
  const balanceColor = themeColor('primary');         // blue from theme
  const cumulativeColor = themeColor('secondary');    // purple from theme

  datasets.push({
    label: "Income",
    data: income,
    type: t,
    hidden: !seriesToggles.value.income,
    tension: 0.25,
    borderWidth: t === 'bar' ? 2 : 3,
    backgroundColor: t === 'bar' ? withAlpha(incomeColor, 0.85) : withAlpha(incomeColor, 0.12),
    borderColor: incomeColor,
    pointRadius: t === 'line' ? 3 : 0,
    pointHoverRadius: t === 'line' ? 6 : 0,
    pointBackgroundColor: t === 'line' ? themeColor('base1') : undefined,
    pointBorderColor: incomeColor,
    pointBorderWidth: t === 'line' ? 2 : 0,
    pointStyle: t === 'line' ? 'circle' : undefined,
    borderRadius: t === 'bar' ? 4 : undefined,
    categoryPercentage: t === 'bar' ? 1.0 : undefined,
    barPercentage: t === 'bar' ? 0.9 : undefined,
  });

  datasets.push({
    label: "Spending",
    data: spending,
    type: t,
    hidden: !seriesToggles.value.spending,
    tension: 0.25,
    borderWidth: t === 'bar' ? 2 : 3,
    backgroundColor: t === 'bar' ? withAlpha(spendingColor, 0.85) : withAlpha(spendingColor, 0.12),
    borderColor: spendingColor,
    pointRadius: t === 'line' ? 3 : 0,
    pointHoverRadius: t === 'line' ? 6 : 0,
    pointBackgroundColor: t === 'line' ? themeColor('base1') : undefined,
    pointBorderColor: spendingColor,
    pointBorderWidth: t === 'line' ? 2 : 0,
    pointStyle: t === 'line' ? 'rect' : undefined,
    borderRadius: t === 'bar' ? 4 : undefined,
    categoryPercentage: t === 'bar' ? 1.0 : undefined,
    barPercentage: t === 'bar' ? 0.9 : undefined,
  });

  datasets.push({
    label: "Period Net",
    data: balance,
    type: t,
    hidden: !seriesToggles.value.balance,
    borderWidth: t === 'bar' ? 2 : 3,
    pointRadius: t === 'line' ? 3 : 0,
    pointHoverRadius: t === 'line' ? 6 : 0,
    tension: 0.25,
    fill: false,
    backgroundColor: t === 'bar' ? withAlpha(balanceColor, 0.85) : withAlpha(balanceColor, 0.12),
    borderColor: balanceColor,
    pointBackgroundColor: t === 'line' ? themeColor('base1') : undefined,
    pointBorderColor: balanceColor,
    pointBorderWidth: t === 'line' ? 2 : 0,
    pointStyle: t === 'line' ? 'triangle' : undefined,
    borderRadius: t === 'bar' ? 4 : undefined,
    categoryPercentage: t === 'bar' ? 1.0 : undefined,
    barPercentage: t === 'bar' ? 0.9 : undefined,
  });

  datasets.push({
    label: "Cumulative Net",
    data: cumulative,
    type: "line",
    hidden: !seriesToggles.value.allTimeCumulativeNetBalance,
    borderWidth: 0, // Hide Chart.js line - will be redrawn by plugin at boundary positions
    pointRadius: 0, // Hide Chart.js points - will be redrawn by plugin
    pointHoverRadius: 0,
    tension: 0.2,
    fill: false,
    borderColor: cumulativeColor,
    backgroundColor: withAlpha(cumulativeColor, 0.1),
  });

  return { labels, datasets, yMin, yMax };

});


// Chart instance management
let chartInstance: Chart | null = null;
let chartRenderPromise: Promise<void> | null = null;
let pendingRenderChart = false;
let renderTimeoutId: ReturnType<typeof setTimeout> | null = null;
const RENDER_DEBOUNCE_MS = 150; // Debounce time between chart re-renders
const chartLoading = ref(false); // Loading state for skeleton overlay

/**
 * Debounced render wrapper to prevent rapid successive renders
 */
async function debouncedRenderChart() {
  // Clear any pending timeout
  if (renderTimeoutId) {
    clearTimeout(renderTimeoutId);
    renderTimeoutId = null;
  }

  // If a render is already in progress, mark as pending
  if (chartRenderPromise) {
    pendingRenderChart = true;
    return;
  }

  // Schedule render after debounce delay
  renderTimeoutId = setTimeout(async () => {
    renderTimeoutId = null;
    await renderChart();
  }, RENDER_DEBOUNCE_MS);
}

/**
 * Renders the chart with proper race condition handling.
 * Uses debouncing and promise tracking to prevent "Canvas already in use" errors.
 */
async function renderChart() {
  // If a render is already in progress, mark as pending and return
  // The pending render will be handled after the current one completes
  if (chartRenderPromise) {
    pendingRenderChart = true;
    return;
  }

  // Balance table mode replaces the chart surface entirely.
  if (showBalanceTable.value) {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    chartLoading.value = false;
    return;
  }

  // Skip Chart.js rendering for bubble hierarchy (uses D3.js instead)
  if (chartConfig.value.type === 'bubbleHierarchy') {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    chartLoading.value = false;
    return;
  }

  // Guard BEFORE creating the render promise: this path returns synchronously,
  // and inside the async IIFE its `finally` would run before the
  // `chartRenderPromise =` assignment, leaving a forever-"in progress" promise
  // that blocks all future renders.
  if (!chartCanvas.value || chartData.value.labels.length === 0) {
    // Destroy if no data
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    chartLoading.value = false;
    return;
  }

  chartRenderPromise = (async () => {
    try {
      // Destroy previous instance with proper cleanup
      // Ensure complete cleanup before reusing canvas
      if (chartInstance) {
        chartLoading.value = true;
        try {
          chartInstance.destroy();
          chartInstance = null;
        } catch (e) {
          devWarn('Chart destroy error:', e);
          chartInstance = null;
        }
        await nextTick();
        await new Promise(r => setTimeout(r, 50)); // Reduced delay for faster chart switching
      }

      // Dynamic import (works without build tooling)
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      const data = JSON.parse(JSON.stringify(chartData.value));
      const type = chartConfig.value.type;
      const isPieish = type === 'pie' || type === 'doughnut';
      const isRadar = type === 'radar';
      const isScatter = type === 'scatter';

      data.datasets = data.datasets.map((ds: any) => ({
        ...ds,
        type: ds.type ?? chartConfig.value.type,
      }));

      // Custom crosshair plugin for x-axis highlighting (end-of-month positioning)
      const crosshairPlugin: any = {
        id: 'crosshair',
        afterDraw: (chart: any) => {
          if (isPieish || isRadar || isScatter) return;
          const ctx = chart.ctx;
          const activePoints = chart.tooltip?._active;
          if (!activePoints || activePoints.length === 0) return;

          const xScale = chart.scales?.x;
          const yScale = chart.scales?.y;
          if (!xScale || !yScale) return;

          // Theme-aware crosshair: use secondary token for visual distinction from segment lines
          const crosshairColor = themeColor('secondary');

          const activeIndex = activePoints[0].index;
          const datasetMeta = chart.getDatasetMeta(0);
          if (!datasetMeta || !datasetMeta.data || !datasetMeta.data[activeIndex]) return;

          // Calculate end-of-month position (midpoint between current and next data point)
          const currentPoint = datasetMeta.data[activeIndex];
          let endOfMonthX = currentPoint.x;

          if (activeIndex + 1 < datasetMeta.data.length) {
            const nextPoint = datasetMeta.data[activeIndex + 1];
            endOfMonthX = (currentPoint.x + nextPoint.x) / 2;
          } else {
            // Last data point - use right edge of chart area
            endOfMonthX = xScale.right - 5;
          }

          const topY = yScale.top;
          const bottomY = yScale.bottom;

          // Draw vertical crosshair line at end of month
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(endOfMonthX, topY);
          ctx.lineTo(endOfMonthX, bottomY);
          ctx.lineWidth = 2;
          ctx.strokeStyle = withAlpha(crosshairColor, 0.6);
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.restore();

          // Highlight x-axis label background
          const label = xScale.ticks?.[activeIndex]?.label;
          if (label) {
            ctx.save();
            ctx.font = 'bold 10px sans-serif';
            const textWidth = ctx.measureText(label).width + 8;
            const labelY = xScale.bottom + 5;
            ctx.fillStyle = withAlpha(crosshairColor, 0.2);
            ctx.beginPath();
            ctx.roundRect(currentPoint.x - textWidth / 2, labelY - 2, textWidth, 14, 3);
            ctx.fill();
            ctx.restore();
          }
        },
      };

      // Custom plugin to draw vertical lines at month boundaries
      const monthEndLinesPlugin: any = {
        id: 'monthEndLines',
        afterDraw: (chart: any) => {
          if (isPieish || isRadar || isScatter) return;

          const xScale = chart.scales?.x;
          const yScale = chart.scales?.y;
          if (!xScale || !yScale) return;

          const ctx = chart.ctx;
          const datasetMeta = chart.getDatasetMeta(0);
          if (!datasetMeta || !datasetMeta.data) return;

          const groupBy = chartConfig.value.groupBy;
          ctx.save();
          // Theme-aware segment lines: use primary token for better theme integration
          ctx.strokeStyle = withAlpha(themeColor('primary'), 0.35);
          ctx.lineWidth = 1.5;

          // Anchor the boundary guides to the actual chart edges so the first marker
          // starts on the y-axis line and the last marker ends at the plot edge.
          // Draw left edge as SOLID line (not dashed) with higher visibility
          const leftEdgeX = xScale.left;
          ctx.setLineDash([]);
          ctx.strokeStyle = withAlpha(themeColor('primary'), 0.6);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(leftEdgeX, yScale.top);
          ctx.lineTo(leftEdgeX, yScale.bottom);
          ctx.stroke();

          // Draw vertical lines between months (dashed) - slightly more subtle than left edge
          ctx.strokeStyle = withAlpha(themeColor('primary'), 0.35);
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          for (let i = 0; i < datasetMeta.data.length - 1; i++) {
            const currentPoint = datasetMeta.data[i];
            const nextPoint = datasetMeta.data[i + 1];
            const currentLabel = data.labels?.[i] ?? '';
            const nextLabel = data.labels?.[i + 1] ?? '';

            // Detect month boundary based on groupBy setting
            let isMonthBoundary = false;
            if (groupBy === 'daily' || groupBy === 'weekly' || groupBy === 'fortnightly') {
              // Check if the month changed between these two points
              const currentMonth = currentLabel.split('-')[1];
              const nextMonth = nextLabel.split('-')[1];
              isMonthBoundary = currentMonth !== nextMonth;
            } else if (groupBy === 'monthly') {
              // Every point is a month, so draw lines between all points
              isMonthBoundary = true;
            } else if (groupBy === 'quarterly') {
              // Draw lines between quarters
              isMonthBoundary = true;
            } else if (groupBy === 'yearly') {
              // Draw lines between years
              isMonthBoundary = true;
            }

            if (isMonthBoundary) {
              const lineX = (currentPoint.x + nextPoint.x) / 2;
              ctx.beginPath();
              ctx.moveTo(lineX, yScale.top);
              ctx.lineTo(lineX, yScale.bottom);
              ctx.stroke();
            }
          }

          // Draw right edge segment line (after the last data point)
          const rightEdgeX = xScale.right;
          ctx.beginPath();
          ctx.moveTo(rightEdgeX, yScale.top);
          ctx.lineTo(rightEdgeX, yScale.bottom);
          ctx.stroke();

          ctx.restore();
        },
      };

      // Custom plugin to draw all-time net balance line and dots at the month boundary lines
      const endOfMonthBalancePlugin: any = {
        id: 'endOfMonthBalance',
        afterDraw: (chart: any) => {
          if (isPieish || isRadar || isScatter) return;

          const xScale = chart.scales?.x;
          const yScale = chart.scales?.y;
          if (!xScale || !yScale) return;

          // Use chart.data directly to ensure we have current data
          if (!chart.data || !Array.isArray(chart.data.datasets)) return;

          // Find the cumulative net dataset index
          const cumulativeIdx = chart.data.datasets.findIndex((ds: any) => ds.label === 'Cumulative Net');
          if (cumulativeIdx === -1) return;

          // Skip drawing if the cumulative net dataset is hidden (via legend toggle)
          const cumulativeDataset = chart.data.datasets[cumulativeIdx];
          if (cumulativeDataset.hidden) return;

          // CRITICAL: Use the FIRST dataset meta (bars) for X coordinates to ensure
          // cumulative dots align perfectly with segment boundary lines drawn by monthEndLinesPlugin
          const barMeta = chart.getDatasetMeta(0);
          if (!barMeta || !barMeta.data) return;

          const ctx = chart.ctx;
          ctx.save();

          // Theme-aware cumulative color (secondary/purple from DaisyUI theme)
          const cumulativeColor = themeColor('secondary');
          const dotRadius = 5; // Slightly larger for better visibility

          // Calculate boundary positions for all points using bar X positions.
          // Each dot sits directly on the segment boundary line at the end of each month,
          // positioned at the right side of the bars.
          const linePoints: { x: number, y: number }[] = [];
          for (let i = 0; i < barMeta.data.length; i++) {
            const barPoint = barMeta.data[i];
            let dotX: number;

            if (i + 1 < barMeta.data.length) {
              const nextBarPoint = barMeta.data[i + 1];
              // Position exactly on the month boundary line (right side of bars)
              dotX = (barPoint.x + nextBarPoint.x) / 2;
            } else {
              // Last point: position at the right edge of the chart area
              dotX = xScale.right - 5;
            }

            const cumulativeValue = Number(cumulativeDataset?.data?.[i]);
            const lineY = !isNaN(cumulativeValue) ? yScale.getPixelForValue(cumulativeValue) : barPoint.y;
            const clampedY = Math.max(yScale.top + 5, Math.min(yScale.bottom - 5, lineY));

            linePoints.push({ x: dotX, y: clampedY });
          }

          // Draw the cumulative net line connecting all boundary points (dashed)
          if (linePoints.length > 1) {
            ctx.beginPath();
            ctx.setLineDash([8, 4]);
            ctx.strokeStyle = withAlpha(cumulativeColor, 0.7);
            ctx.lineWidth = 3;
            ctx.moveTo(linePoints[0].x, linePoints[0].y);
            for (let i = 1; i < linePoints.length; i++) {
              ctx.lineTo(linePoints[i].x, linePoints[i].y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Draw dots at each boundary point (positioned at actual cumulative value)
          for (const { x: dotX, y: dotY } of linePoints) {
            // Outer glow effect - more visible
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotRadius + 5, 0, Math.PI * 2);
            ctx.fillStyle = withAlpha(cumulativeColor, 0.1);
            ctx.fill();

            // Inner glow
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotRadius + 3, 0, Math.PI * 2);
            ctx.fillStyle = withAlpha(cumulativeColor, 0.18);
            ctx.fill();

            // Main dot - more vibrant
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
            ctx.fillStyle = withAlpha(cumulativeColor, 0.95);
            ctx.strokeStyle = themeColor('base1'); // white border adapts to theme
            ctx.lineWidth = 2.5;
            ctx.fill();
            ctx.stroke();
          }

          ctx.restore();
        },
      };

      // WCAG 2.3.3: Respect prefers-reduced-motion for chart animations
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Canvas may have unmounted during the awaits above (e.g. switch to table view)
      if (!chartCanvas.value) return;
      chartInstance = new Chart(chartCanvas.value.getContext('2d')!, {
        type: chartConfig.value.type as any,
        data,
        plugins: [crosshairPlugin, monthEndLinesPlugin, endOfMonthBalancePlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: prefersReducedMotion ? 0 : 300,
            easing: 'easeOutQuart',
            delay: (context: any) => {
              // Stagger animation - capped to avoid long waits on large datasets (scatter 100k+)
              const stagger = context.dataIndex * 20 + (context.datasetIndex || 0) * 40;
              return Math.min(stagger, prefersReducedMotion ? 0 : 600);
            },
          },
          transitions: {
            active: {
              animation: {
                duration: prefersReducedMotion ? 0 : 200,
              },
            },
          },
          interaction: isPieish || isRadar
            ? { mode: 'nearest', axis: 'xy' }
            : { mode: 'index', axis: 'x' },
          plugins: {
            legend: {
              display: !isPieish || data.datasets.length > 1,
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 12,
                font: { size: 11 },
              },
              onClick: (e: any, legendItem: any, legend: any) => {
                if (isPieish || isRadar || isScatter) return;
                const label = (legendItem as any).text;
                const map: Record<string, keyof typeof seriesToggles.value> = {
                  'Income': 'income',
                  'Spending': 'spending',
                  'Period Net': 'balance',
                  'Cumulative Net': 'allTimeCumulativeNetBalance',
                };
                const key = map[label];
                if (key) {
                  seriesToggles.value[key] = !seriesToggles.value[key];
                }
                return false; // Prevent default Chart.js behavior
              },
            },
            title: {
              display: false,
            },
            tooltip: {
              mode: isPieish || isRadar ? 'nearest' : 'index',
              intersect: false,
              // Render tooltip as external HTML element so it floats above canvas-drawn plugins
              external: (context: any) => {
                const el = chartTooltipEl.value;
                if (!el) return;
                const tooltipModel = context.tooltip;
                // Show/hide based on tooltip visibility
                if (tooltipModel.opacity === 0) {
                  el.style.opacity = '0';
                  return;
                }
                el.style.opacity = '1';
                // Position tooltip relative to chart container with boundary clamping
                const chartRect = (context.chart.canvas as HTMLCanvasElement).getBoundingClientRect();
                const containerRect = el.parentElement?.getBoundingClientRect();
                if (containerRect) {
                  let left = tooltipModel.caretX - containerRect.left + chartRect.left;
                  let top = tooltipModel.caretY - containerRect.top + chartRect.top;
                  // Clamp tooltip to stay within viewport
                  const tooltipW = 280; // approximate max width
                  const tooltipH = 150; // approximate max height
                  left = Math.max(4, Math.min(left, containerRect.width - tooltipW));
                  top = Math.max(4, Math.min(top, containerRect.height - tooltipH));
                  el.style.left = left + 'px';
                  el.style.top = top + 'px';
                }
                // Build HTML content from tooltip data
                const title = tooltipModel.title || [];
                const body = tooltipModel.body || [];
                const footer = tooltipModel.footer || [];
                const labelColors = tooltipModel.labelColors || [];
                // Escape at the sink: tooltip text derives from transaction data
                // (categories/descriptions), which can contain user/imported markup
                const esc = (s: unknown): string => String(s)
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#39;');
                // Only allow plausible CSS color values from Chart.js labelColors
                const safeColor = (c: unknown): string =>
                  typeof c === 'string' && /^(#[0-9a-fA-F]{3,8}|(rgb|rgba|hsl|hsla|oklch)\([^;<>"']*\)|[a-zA-Z]+)$/.test(c) ? c : '';
                let html = '';
                if (title.length > 0) {
                  html += `<div style="font-weight:700;font-size:13px;margin-bottom:6px;">${esc(title.join(' '))}</div>`;
                }
                // body is an array of objects { before, lines, after }
                body.forEach((section: any, idx: number) => {
                  const lines = section.lines || [];
                  lines.forEach((lineText: string, lineIdx: number) => {
                    const colorInfo = labelColors[(idx * lines.length) + lineIdx] || {};
                    const color = safeColor(colorInfo.border_color || colorInfo.backgroundColor || '');
                    html += `<div style="display:flex;align-items:center;gap:6px;margin:5px 0;">`;
                    if (color) {
                      html += `<span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${color};flex-shrink:0;"></span>`;
                    }
                    html += `<span>${esc(lineText)}</span></div>`;
                  });
                });
                if (footer.length > 0) {
                  html += `<div style="font-weight:600;font-size:12px;margin-top:6px;opacity:0.65;">${esc(footer.join('\n'))}</div>`;
                }
                el.innerHTML = html;
              },
              // Canvas tooltip is hidden; external HTML tooltip handles all visual rendering
              // This prevents duplicate tooltips (canvas + HTML) from appearing simultaneously
              backgroundColor: 'transparent',
              titleColor: 'transparent',
              bodyColor: 'transparent',
              footerColor: 'transparent',
              displayColors: false,
              borderColor: 'transparent',
              borderWidth: 0,
              maxWidth: 300,
              bodySpacing: 10,
              titleSpacing: 6,
              // Note: Chart.js v4 handles boundary detection internally
              // Custom position callback causes recursion with circular context references
              callbacks: {
                title: (items: any[]) => {
                  if (!items.length) return '';
                  const first = items[0];
                  if (isPieish) {
                    // Show the slice category name as title, not generic dataset label
                    return first.label || first.dataset?.label || 'Spending breakdown';
                  }
                  if (isScatter) {
                    const rawX = first.parsed?.x ?? first.raw?.x;
                    if (typeof rawX === 'number' && isFinite(rawX)) {
                      return new Date(rawX).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                    }
                  }
                  return formatChartTooltipTitle(first.label || '');
                },
                label: (ctx: any) => {
                  if (isPieish) {
                    const value = ctx.parsed ?? 0;
                    const total = ctx.dataset.data.reduce((a: number, b: number) => a + Math.abs(Number(b) || 0), 0);
                    const pct = total > 0 ? ((Math.abs(value) / total) * 100).toFixed(2) : '0.00';
                    const categoryLabel = ctx.label || ctx.dataset?.label || 'Slice';
                    return `${categoryLabel}: ${currencyFmt(Number(value))} (${pct}% of total)`;
                  } else if (isRadar) {
                    const value = ctx.parsed?.r ?? 0;
                    return `${ctx.dataset.label}: ${currencyFmt(Number(value))}`;
                  } else if (isScatter) {
                    const y = ctx.parsed?.y ?? 0;
                    const xValue = ctx.parsed?.x ?? ctx.raw?.x;
                    const dateStr = typeof xValue === 'number'
                      ? new Date(xValue).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                      : '';
                    return `${ctx.dataset.label}: ${currencyFmt(Number(y))}${dateStr ? ` on ${dateStr}` : ''}`;
                  } else {
                    const value = ctx.parsed?.y ?? ctx.parsed;
                    const absValue = Math.abs(Number(value));
                    const sign = Number(value) >= 0 ? '+' : '-';
                    // Use consistent currency formatting with 2 decimal places
                    return `${ctx.dataset.label}: ${sign}${currencyFmt(absValue)}`;
                  }
                },
                footer: (items: any[]) => {
                  if (isPieish) {
                    const total = items[0]?.dataset?.data?.reduce((a: number, b: number) => a + Math.abs(Number(b) || 0), 0) ?? 0;
                    return `Visible total: ${currencyFmt(total)}`;
                  }
                  if (items.length < 2) return '';
                  const lines: string[] = [];
                  // Show net for periods with income + spending
                  const income = items.find((i: any) => i.dataset.label === 'Income');
                  const spending = items.find((i: any) => i.dataset.label === 'Spending');
                  if (income && spending) {
                    const net = income.parsed.y - spending.parsed.y;
                    const sign = net >= 0 ? '+' : '-';
                    lines.push(`Period Net: ${sign}${currencyFmt(Math.abs(net))}`);
                  }
                  // Show Cumulative Net if available
                  const cumulativeNet = items.find((i: any) => i.dataset.label === 'Cumulative Net');
                  if (cumulativeNet) {
                    const balance = cumulativeNet.parsed.y;
                    const sign = balance >= 0 ? '+' : '-';
                    lines.push(`Cumulative Net: ${sign}${currencyFmt(Math.abs(balance))}`);
                  }
                  return lines.join('\n');
                },
                labelColor: (ctx: any) => {
                  const color = resolveTooltipColor(ctx);
                  return {
                    borderColor: color,
                    backgroundColor: color,
                    borderWidth: 0,
                    borderRadius: 4,
                  };
                },
                labelPointStyle: (_ctx: any) => ({
                  pointStyle: isScatter ? 'circle' : 'rectRounded',
                  rotation: 0,
                }),
              },
            },
          },
          scales:
            chartConfig.value.type === "pie" ||
              chartConfig.value.type === "doughnut"
              ? {}
              : chartConfig.value.type === "radar"
                ? {
                  r: {
                    beginAtZero: true,
                    grid: { color: withAlpha(themeColor('primary'), 0.12) },
                    ticks: {
                      callback: (v: any) => "$" + Number(v).toFixed(0),
                      font: { size: 10 },
                      color: withAlpha(cssVarToRGB("--bc"), 0.7),
                    },
                  },
                }
                : chartConfig.value.type === "scatter"
                  ? {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (v: any) => "$" + Number(v).toFixed(0),
                        font: { size: 10 },
                        color: withAlpha(cssVarToRGB("--bc"), 0.7),
                      },
                      grid: { color: withAlpha(themeColor('primary'), 0.1) },
                      title: {
                        display: true,
                        text: 'Amount ($)',
                        font: { size: 11, weight: '600' },
                        color: withAlpha(themeColor('primary'), 0.8),
                      },
                    },
                    x: {
                      type: 'linear',
                      position: 'bottom',
                      ticks: {
                        font: { size: 10 },
                        color: withAlpha(cssVarToRGB("--bc"), 0.7),
                        callback: (v: any) => {
                          // Format timestamp as date
                          const d = new Date(v);
                          return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
                        },
                      },
                      grid: { color: withAlpha(themeColor('primary'), 0.1) },
                      title: {
                        display: true,
                        text: 'Date',
                        font: { size: 11, weight: '600' },
                        color: withAlpha(themeColor('primary'), 0.8),
                      },
                    },
                  }
                  : {
                    y: {
                      suggestedMin: typeof data.yMin === 'number' ? data.yMin : undefined,
                      suggestedMax: typeof data.yMax === 'number' ? data.yMax : undefined,
                      ticks: {
                        callback: (v: any) => {
                          const abs = Math.abs(v);
                          const sign = v < 0 ? '-' : '';
                          if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
                          if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(0)}k`;
                          return `${sign}$${Number(v).toFixed(0)}`;
                        },
                        font: { size: 10 },
                        maxTicksLimit: 8,
                        color: withAlpha(cssVarToRGB("--bc"), 0.7),
                      },
                      grid: {
                        color: withAlpha(themeColor('primary'), 0.1),
                        drawBorder: false,
                      },
                      border: {
                        display: false,
                      },
                    },
                    x: {
                      ticks: {
                        font: { size: 10 },
                        maxRotation: 30,
                        minRotation: 0,
                        maxTicksLimit: 8,
                        autoSkip: true,
                        skipBlank: true,
                        align: 'center',
                        color: withAlpha(cssVarToRGB("--bc"), 0.7),
                      },
                      grid: {
                        display: false,
                      },
                      border: {
                        display: false,
                      },
                    },
                  },
        },
      });
      chartLoading.value = false;
    } catch (e) {
      devError('Chart render error:', e);
      chartLoading.value = false;
    } finally {
      chartRenderPromise = null;
      // If a render was requested while this one was running, trigger it now
      if (pendingRenderChart) {
        pendingRenderChart = false;
        await debouncedRenderChart();
      }
    }
  })();
}

// Single watcher for all chart-related changes
watch(
  [chartData, chartConfig, seriesToggles, selectedCategoriesChart, selectedTagsChart, chartSelectionMode, dateFilter, showBalanceTable],
  () => {
    if (activeTab.value === 'chart') {
      nextTick(() => {
        if (showBalanceTable.value) {
          if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
          }
          chartLoading.value = false;
        } else if (chartConfig.value.type === 'bubbleHierarchy') {
          renderBubbleHierarchy();
        } else {
          debouncedRenderChart();
        }
      });
    }
  },
  { deep: true }
);

// Re-render when switching to chart tab (ensures categories are selected)
watch(activeTab, (tab) => {
  if (tab === 'chart') {
    ensureAllCatsSelected();
    // Data may have changed while another tab was active (e.g. CSV import) —
    // the master watcher skips renders when the chart tab is hidden, so render now.
    nextTick(() => {
      if (showBalanceTable.value) return;
      if (chartConfig.value.type === 'bubbleHierarchy') {
        renderBubbleHierarchy();
      } else {
        debouncedRenderChart();
      }
    });
  }
});

// Auto-select categories when they change
watch(chartCategories, () => {
  // Auto-select all categories if none selected (first visit)
  if (selectedCategoriesChart.value.length === 0 && chartCategories.value.length > 0) {
    selectedCategoriesChart.value = [...chartCategories.value];
  }
});

// Re-render on theme change
// Wait for CSS custom properties to propagate after data-theme attribute changes
watch(currentTheme, () => {
  // Invalidate caches immediately so stale RGB values aren't used during transition
  invalidateColorCaches();
  if (activeTab.value === 'chart') {
    nextTick(() => {
      // Small delay ensures getComputedStyle() picks up new CSS custom property values
      // from the newly applied DaisyUI theme before cssVarToRGB() reads them
      setTimeout(() => {
        // Increment version so chartData re-evaluates with fresh colors
        themeVersion.value++;
        if (chartConfig.value.type === 'bubbleHierarchy') {
          renderBubbleHierarchy();
        } else {
          debouncedRenderChart();
        }
      }, 100);
    });
  }
});

// ========= Hierarchical Bubble Map (D3.js) =========
const bubbleHierarchyData = computed(() => {
  if (chartConfig.value.type !== "bubbleHierarchy") return null;

  // Use the same category filter as other charts (selectedCategoriesChart)
  const base =
    selectedCategoriesChart.value.length > 0
      ? filteredTransactions.value.filter((t) =>
        containsCaseIns(selectedCategoriesChart.value, t.category)
      )
      : filteredTransactions.value;

  const categoryMap: Record<
    string,
    {
      total: number;
      tags: Record<string, { total: number; count: number }>;
      untagged: { total: number; count: number };
    }
  > = {};

  base.forEach((t) => {
    const cat = t.category || "Uncategorized";
    if (!categoryMap[cat]) {
      categoryMap[cat] = {
        total: 0,
        tags: {},
        untagged: { total: 0, count: 0 },
      };
    }

    const amount = Math.abs(t.amount);
    categoryMap[cat].total += amount;

    if (t.tags && t.tags.length > 0) {
      t.tags.forEach((tag: string) => {
        if (!categoryMap[cat].tags[tag]) {
          categoryMap[cat].tags[tag] = { total: 0, count: 0 };
        }
        categoryMap[cat].tags[tag].total += amount;
        categoryMap[cat].tags[tag].count += 1;
      });
    } else {
      categoryMap[cat].untagged.total += amount;
      categoryMap[cat].untagged.count += 1;
    }
  });

  const children = Object.entries(categoryMap).map(([category, data]) => {
    const tagChildren = Object.entries(data.tags).map(([tag, tagData]) => ({
      name: tag,
      value: tagData.total,
      count: tagData.count,
      type: "tag",
      category,
    }));

    if (data.untagged.count > 0) {
      tagChildren.push({
        name: "Untagged",
        value: data.untagged.total,
        count: data.untagged.count,
        type: "untagged",
        category,
      });
    }

    return {
      name: category,
      value: data.total,
      type: "category",
      children: tagChildren,
    };
  });

  return { name: "All Transactions", children };
});

let bubbleHierarchyInstance: any = null;

async function renderBubbleHierarchy() {
  if (!bubbleHierarchySvg.value || !bubbleHierarchyData.value) return;

  try {
    const d3 = await import("d3");

    if (bubbleHierarchyInstance) {
      d3.select(bubbleHierarchySvg.value).selectAll("*").remove();
    }

    const container = bubbleHierarchyContainer.value;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Use full container size for better centering
    const svg = d3
      .select(bubbleHierarchySvg.value)
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height)
      .style("display", "block")
      .style("margin", "0 auto");

    // Clear previous content
    svg.selectAll("*").remove();

    // Pack layout with proper padding. Typed `any`: d3.pack() mutates the
    // hierarchy in place, adding x/y/r — properties the base HierarchyNode<T>
    // type doesn't know about, and every downstream use here treats nodes
    // dynamically anyway.
    const pack = d3
      .pack()
      .size([width, height])
      .padding((d: any) => (d.depth === 0 ? 20 : 6));
    const root: any = pack(
      d3
        .hierarchy(bubbleHierarchyData.value)
        .sum((d: any) => d.value || 0)
        .sort((a: any, b: any) => (b.value || 0) - (a.value || 0)) as any
    );

    const categoryNames: string[] = Array.from(
      new Set(
        root
          .descendants()
          .filter((d: any) => d.depth === 1)
          .map((d: any) => d.data.name)
      )
    );

    // Unified label color mapping keeps category/tag colors stable across charts.
    const colorMap: Record<string, string> = {};
    categoryNames.forEach((name: string) => {
      colorMap[name] = getCategoryColor(name);
    });

    let focus = root;
    let view: any;

    // Create centered group without offset transform
    const g = svg.append("g");

    const node = g
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", (d: any) => `translate(${d.x},${d.y})`)
      .style("cursor", (d: any) => (d.children ? "pointer" : "default"))
      .on("click", (event, d: any) => {
        if (focus !== d && d.children) {
          zoomToNode(event, d);
          event.stopPropagation();
        }
      });

    node
      .append("circle")
      .attr("r", (d: any) => d.r)
      .attr("fill", (d: any) => {
        if (d.depth === 0) return "transparent";
        if (d.depth === 1) return colorMap[d.data.name] || themeColor("primary");
        if (d.data.type === "untagged") return themeColor("neutral", 0.75);
        const parentColor = colorMap[d.parent.data.name] || themeColor("primary");
        return withAlpha(parentColor, 0.75);
      })
      .attr("stroke", (d: any) =>
        d.depth === 0 ? "none" : themeColor("base1")
      )
      .attr("stroke-width", 2)
      .attr("opacity", 0.9)
      .on("click", (event, d: any) => {
        if (focus !== d && d.children) {
          zoomToNode(event, d);
          event.stopPropagation();
        }
      })
      .on("mouseenter", function (event, d: any) {
        if (d.depth === 0) return;
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 1)
          .attr("stroke-width", d.children ? 4 : 3)
          .attr(
            "stroke",
            d.children ? themeColor("primary") : themeColor("base1")
          );
      })
      .on("mouseleave", function (event, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 0.85)
          .attr("stroke-width", 2)
          .attr("stroke", themeColor("base1"));
      });

    const textColor = themeColor("baseContent");
    // Theme-aware text shadow for better readability on colored bubbles
    const textShadowColor = themeColor("neutral", 0.6);

    const label = node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .style("font-size", (d: any) => `${Math.min(d.r / 3, 24)}px`)
      .style("font-weight", (d: any) => (d.depth === 1 ? "600" : "400"))
      .style("fill", textColor)
      .style("pointer-events", "none")
      .style("user-select", "none")
      .style("text-shadow", `0 1px 2px ${textShadowColor}`);

    // Sanitize helper for bubble labels: strip HTML/control chars, trim, truncate
    function sanitizeLabel(s: string, maxLen: number): string {
      const cleaned = s.replace(/[&<>'"]/g, (m) => {
        const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return map[m] || m;
      }).replace(/[\x00-\x1F\x7F]/g, '').trim();
      return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '…' : cleaned;
    }

    label
      .append("tspan")
      .attr("x", 0)
      .text((d: any) => {
        if (d.depth === 0 || d.r < 20) return "";
        return sanitizeLabel(d.data.name, d.r < 40 ? 10 : 24);
      });

    label
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "1.2em")
      .style("font-size", (d: any) => `${Math.min(d.r / 4, 16)}px`)
      .style("opacity", 0.9)
      .text((d: any) => {
        if (d.depth === 0 || d.r < 30) return "";
        return currencyFmt(d.value || 0);
      });

    label
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "1.1em")
      .style("font-size", (d: any) => `${Math.min(d.r / 5, 12)}px`)
      .style("opacity", 0.8)
      .text((d: any) => {
        if (d.depth === 0 || !d.data.count || d.r < 40) return "";
        return `${d.data.count} tx`;
      });

    // Theme-aware tooltip colors: use DaisyUI tokens for consistency
    const tooltipBg = withAlpha(cssVarToRGB("--b2"), 0.97); // base2 background
    const tooltipText = cssVarToRGB("--bc"); // base-content
    const tooltipBorder = withAlpha(themeColor('primary'), 0.35); // primary border
    // Remove existing tooltip to prevent DOM bloat
    d3.select(bubbleHierarchyContainer.value).selectAll('.bubble-tooltip').remove();
    const tooltip = d3
      .select(bubbleHierarchyContainer.value)
      .append("div")
      // DaisyUI card-like tooltip with proper spacing, rounded corners, and shadow
      .attr("class", "bubble-tooltip absolute shadow-xl rounded-xl p-3 text-sm pointer-events-none opacity-0 z-20 max-w-xs border backdrop-blur-sm")
      // WCAG 2.2 AA compliant: theme-aware dark background with light text for high contrast
      .style("background-color", tooltipBg)
      .style("color", tooltipText)
      .style("border-color", tooltipBorder)
      .style("transition", "opacity 0.15s ease");

    // Boundary-aware tooltip positioning helper (uses getBoundingClientRect for robust coordinate conversion)
    function positionBubbleTooltip(mouseX: number, mouseY: number): { left: number; top: number } | null {
      const tooltipNode = tooltip.node();
      if (!tooltipNode || !container) return null;

      const tooltipWidth = tooltipNode.offsetWidth || 200;
      const tooltipHeight = tooltipNode.offsetHeight || 120;

      const containerRect = container.getBoundingClientRect();
      let left = mouseX - containerRect.left + 15;
      let top = mouseY - containerRect.top - 15;

      // Adjust if tooltip would go off-right edge
      if (left + tooltipWidth > containerRect.width - 10) {
        left = mouseX - containerRect.left - tooltipWidth - 15;
      }

      // Adjust if tooltip would go off-bottom edge
      if (top + tooltipHeight > containerRect.height - 10) {
        top = mouseY - containerRect.top - tooltipHeight - 15;
      }

      // Clamp to container bounds to prevent overflow
      left = Math.max(10, Math.min(left, containerRect.width - tooltipWidth - 10));
      top = Math.max(10, Math.min(top, containerRect.height - tooltipHeight - 10));

      return { left, top };
    }

    node
      .on("mouseenter", function (event: any, d: any) {
        if (d.depth === 0) return;

        const nodeColor =
          d.depth === 1
            ? (colorMap[d.data.name] || themeColor("primary"))
            : d.data.type === "untagged"
              ? themeColor("neutral", 0.75)
              : withAlpha(colorMap[d.parent?.data?.name] || themeColor("primary"), 0.75);
        const nodeKind =
          d.depth === 1
            ? "Category"
            : d.data.type === "untagged"
              ? "Uncategorized"
              : "Tag";
        const share = root.value ? ((d.value || 0) / root.value) * 100 : 0;
        const parentName = d.depth > 1 ? d.parent?.data?.name : "";

        // Theme-aware tooltip colors using DaisyUI tokens
        const accentColor = themeColor('primary');       // Primary for names
        const labelColor = withAlpha(cssVarToRGB("--bc"), 0.65); // Muted for labels
        const textColor = cssVarToRGB("--bc");          // Full for values
        const borderColor = withAlpha(cssVarToRGB("--bc"), 0.2); // Subtle separator

        // Escape at the sink: category/tag names derive from user/imported transaction data
        // Also strip control characters and normalize whitespace for safety
        const esc = (s: unknown): string => String(s)
          .replace(/[&<>'"]/g, (m) => {
            const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
            return map[m] || m;
          })
          .replace(/[\x00-\x1F\x7F]/g, '') // Strip control characters
          .replace(/\s+/g, ' ')            // Normalize whitespace
          .trim();

        // Build tooltip with DaisyUI-inspired structure
        // Header: colored indicator + name + kind badge
        let html = `<div class="flex items-start gap-2 mb-2">`;
        html += `<span class="mt-1 h-3 w-3 rounded-full border border-white/20 flex-shrink-0" style="background-color: ${nodeColor}"></span>`;
        html += `<div class="min-w-0"><div class="font-bold text-base leading-tight truncate" style="color: ${accentColor}" title="${esc(d.data.name)}">${esc(d.data.name)}</div>`;
        html += `<div class="text-[10px] uppercase tracking-widest font-medium" style="color: ${labelColor}">${nodeKind}</div></div></div>`;

        // Details section with DaisyUI divider
        if (parentName) {
          html += `<div class="text-xs mb-1"><span class="font-semibold" style="color: ${labelColor}">Category:</span> <span class="text-base-content" style="color: ${textColor}">${esc(parentName)}</span></div>`;
        }
        html += `<div class="text-sm font-medium"><span style="color: ${labelColor}">Amount:</span> <span class="font-mono" style="color: ${textColor}">${currencyFmt(d.value || 0)}</span></div>`;
        if (root.value) {
          html += `<div class="text-sm"><span style="color: ${labelColor}">Share:</span> <span class="badge badge-sm badge-ghost" style="color: ${textColor}">${share.toFixed(2)}%</span></div>`;
        }
        if (d.data.count) {
          html += `<div class="text-sm"><span style="color: ${labelColor}">Transactions:</span> <span class="font-mono" style="color: ${textColor}">${d.data.count}</span></div>`;
        }

        // Footer hint for categories
        if (d.data.type === "category") {
          const tagCount = d.children ? d.children.length : 0;
          html += `<div class="text-xs mt-2 pt-2 border-t" style="color: ${labelColor}; border-color: ${borderColor}">💡 Click to see ${tagCount} group${tagCount !== 1 ? "s" : ""}</div>`;
        }

        tooltip
          .html(html)
          .style("opacity", 1)
          .style("border-color", withAlpha(nodeColor, 0.35));

        // Position tooltip with boundary awareness
        const pos = positionBubbleTooltip(event.pageX, event.pageY);
        if (pos) {
          tooltip
            .style("left", `${pos.left}px`)
            .style("top", `${pos.top}px`);
        }
      })
      .on("mousemove", function (event: any) {
        // Update position on mouse move for better tracking
        const pos = positionBubbleTooltip(event.pageX, event.pageY);
        if (pos) {
          tooltip
            .style("left", `${pos.left}px`)
            .style("top", `${pos.top}px`);
        }
      })
      .on("mouseleave", function () {
        tooltip.style("opacity", 0);
      });

    function zoomTo(v: any) {
      const k = Math.min(width, height) / v[2];
      view = v;

      // Center the zoom by accounting for aspect ratio
      const cx = width / 2;
      const cy = height / 2;

      // Only scale labels — parent <g> already handles translate, so don't double-translate
      label.attr("transform", (d: any) => {
        const scale = Math.min((k * d.r) / Math.min(width, height), 1);
        return `scale(${scale})`;
      });

      node.attr(
        "transform",
        (d: any) => {
          const x = cx + (d.x - v[0]) * k;
          const y = cy + (d.y - v[1]) * k;
          return `translate(${x},${y})`;
        }
      );
      node.select("circle").attr("r", (d: any) => d.r * k);
    }

    function zoomToNode(event: any, d: any) {
      focus = d;
      // WCAG 2.3.3: Respect prefers-reduced-motion for D3 transitions
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      g.transition()
        .duration(prefersReducedMotion ? 0 : 750)
        .ease(d3.easeCubicInOut)
        .tween("zoom", () => {
          const i = d3.interpolateZoom(view, [
            focus.x,
            focus.y,
            focus.r * 2 + 50,
          ]);
          return (t: number) => zoomTo(i(t));
        });

      node.style("cursor", (n: any) => {
        if (n === d || !n.children) return "default";
        return "pointer";
      });
    }

    zoomTo([root.x, root.y, root.r * 2]);

    svg.on("click", (event) => {
      if (focus !== root) {
        zoomToNode(event, root);
      }
    });

    bubbleHierarchyInstance = { svg, tooltip };
    devLog("Bubble hierarchy rendered");
  } catch (error) {
    devError("Error rendering bubble hierarchy:", error);
    pushToast("Failed to load bubble hierarchy", "error");
  }
}

// Legacy chart system removed - use main renderChart() with chartRenderPromise protection instead

watch(
  () => chartConfig.value.type,
  (t, prevT) => {
    if (t === "pie" || t === "doughnut") {
      // Only spending for share charts
      seriesToggles.value = { income: false, spending: true, balance: false, allTimeCumulativeNetBalance: false };
      // Ensure all categories are selected so the pie/doughnut has data
      if (selectedCategories.value.length === 0) {
        selectedCategories.value = [...chartCategories.value];
      }
    } else {
      // Always reset to all-true when switching FROM pie/doughnut TO time-series
      const pieishTypes = ['pie', 'doughnut', 'radar', 'scatter', 'bubbleHierarchy', 'table'];
      if (prevT && pieishTypes.includes(prevT)) {
        seriesToggles.value = { income: true, spending: true, balance: true, allTimeCumulativeNetBalance: true };
      } else if (
        !seriesToggles.value.income &&
        !seriesToggles.value.spending &&
        !seriesToggles.value.balance
      ) {
        // Sensible defaults for time series / bubble - only if all are off
        seriesToggles.value = { income: true, spending: true, balance: true, allTimeCumulativeNetBalance: true };
      }
      // Keep user selection if any; otherwise prefill
      if (selectedCategories.value.length === 0) {
        selectedCategories.value = [...chartCategories.value];
      }
    }
  },
  { immediate: true }
);

function yExtent(): [number, number] {
  const t = chartConfig.value.type;
  if (t !== "line" && t !== "bar") return [0, 0];

  const ds: any[] = (chartData.value as any).datasets || [];
  let min = 0,
    max = 0;

  for (const d of ds) {
    for (const v of d.data as number[]) {
      if (typeof v !== "number" || !isFinite(v)) continue;
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }

  if (min === 0 && max === 0) return [0, 1]; // empty protection
  const pad = Math.max(1, (max - min) * 0.05);
  return [min - pad, max + pad];
}

function makeOptions(): ChartOptions {
  const type = chartConfig.value.type;

  // Get theme colors
  const grid = withAlpha(cssVarToRGB("--bc"), 0.2);
  const ticks = cssVarToRGB("--bc");
  const neutralBG = themeColor("neutral", 0.95);
  const borderColor = cssVarToRGB("--bc");
  const titleColor = themeColor("neutralContent");
  const bodyColor = themeColor("neutralContent");

  const base: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    plugins: {
      legend: {
        display: true,
        labels: {
          usePointStyle: type !== "bar",
          color: ticks,
        },
        onClick: (e, legendItem, legend) => {
          // Only wire toggles for time-series chart types
          if (!['bar', 'line', 'radar', 'scatter'].includes(type)) return;

          const label = (legendItem as any).text;
          const chart = legend.chart;

          // Map legend label → seriesToggles key
          const map: Record<string, keyof typeof seriesToggles.value> = {
            'Income': 'income',
            'Spending': 'spending',
            'Period Net': 'balance',
            'Cumulative Net': 'allTimeCumulativeNetBalance',
          };

          const key = map[label];
          if (key) {
            // Toggle the series visibility
            seriesToggles.value[key] = !seriesToggles.value[key];

            // Sync the legend internal hidden state so the visual state matches
            const datasetIndex = (legendItem as any).datasetIndex;
            if (datasetIndex != null) {
              const meta = chart.getDatasetMeta(datasetIndex);
              if (meta) {
                meta.hidden = !seriesToggles.value[key];
              }
            }

            // Update the chart to reflect the change immediately
            chart.update();
          }
        },
      },
      tooltip: {
        backgroundColor: neutralBG,
        borderColor,
        borderWidth: 1,
        titleColor,
        bodyColor,
        callbacks: {
          label: (ctx) => {
            if (type === "pie" || type === "doughnut") {
              const label = ctx.label || "";
              const val = Array.isArray(ctx.parsed)
                ? ctx.parsed[0]
                : (ctx.parsed as number);
              return `${label}: $${val.toFixed(2)}`;
            }
            const label = ctx.dataset?.label || "";
            const y = (ctx.parsed as any)?.y ?? 0;
            return `${label}: $${Number(y).toFixed(2)}`;
          },
        },
      },
    },
  };

  if (type === "line" || type === "bar") {
    base.scales = {
      x: {
        type: "category",
        ticks: { autoSkip: true, maxRotation: 0, color: ticks },
        grid: { color: grid },
        border: { color: grid },
      },
      y: {
        type: "linear",
        ticks: {
          callback: (v) => `$${Number(v).toFixed(2)}`,
          color: ticks
        },
        grid: { color: grid },
        border: { color: grid },
      },
    };
  }

  return base;
}
// function makeOptions(): ChartOptions {
//   const type = chartConfig.value.type;

//   // theme colors resolved from CSS vars (plain strings)
//   const grid = withAlpha(cssVarToRGB("--bc"), 0.2);
//   const ticks = cssVarToRGB("--bc");
//   const neutralBG = themeColor("neutral", 0.95);
//   const borderColor = cssVarToRGB("--bc");
//   const titleColor = themeColor("neutralContent");
//   const bodyColor = themeColor("neutralContent");

//   const base: ChartOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//     animation: { duration: 250 },
//     plugins: {
//       legend: {
//         display: true,
//         labels: { usePointStyle: type !== "bar", color: ticks },
//       },
//       tooltip: {
//         backgroundColor: neutralBG,
//         borderColor,
//         borderWidth: 1,
//         titleColor,
//         bodyColor,
//         callbacks: {
//           title: (items) => {
//             if (!items?.length) return "";
//             if (type === "bubble") {
//               const labels = (chartData.value as any).labels as
//                 | string[]
//                 | undefined;
//               const xi = (items[0].raw as any)?.x ?? 0;
//               return labels?.[xi] ?? "";
//             }
//             return items[0].label ?? "";
//           },
//           label: (ctx) => {
//             if (type === "pie" || type === "doughnut") {
//               const label = ctx.label || "";
//               const val = Array.isArray(ctx.parsed)
//                 ? ctx.parsed[0]
//                 : (ctx.parsed as number);
//               return `${label}: ${currencyFmt(val || 0)}`;
//             }
//             if (type === "bubble") {
//               const labels = (chartData.value as any).labels as
//                 | string[]
//                 | undefined;
//               const yCats = (chartData.value as any).yCats as
//                 | string[]
//                 | undefined;
//               const raw = ctx.raw as any; // { x, y, r, amt }
//               const xi = raw?.x ?? 0;
//               const yi = raw?.y ?? 0;
//               return `${yCats?.[yi] ?? ""}: ${currencyFmt(raw?.amt || 0)} @ ${
//                 labels?.[xi] ?? ""
//               }`;
//             }
//             const label = ctx.dataset?.label || "";
//             const y = (ctx.parsed as any)?.y ?? 0;
//             return `${label}: ${currencyFmt(Number(y))}`;
//           },
//         },
//       },
//       // backgroundColor on root is fine, but optional:
//       // decors: we can skip setting chart.options.backgroundColor to avoid touching proxies
//     },
//   };

//   if (type === "line" || type === "bar") {
//     const [min, max] = yExtent();
//     base.scales = {
//       x: {
//         type: "category",
//         ticks: { autoSkip: true, maxRotation: 0, color: ticks },
//         grid: { color: grid, borderColor: grid },
//       },
//       y: {
//         type: "linear",
//         suggestedMin: min,
//         suggestedMax: max,
//         ticks: { callback: (v) => currencyFmt(Number(v)), color: ticks },
//         grid: { color: grid, borderColor: grid },
//       },
//     };
//   } else if (type === "bubble") {
//     const yCats = (chartData.value as any).yCats as string[] | undefined;
//     base.scales = {
//       x: {
//         type: "category",
//         ticks: {
//           callback: (_: any, i: number) =>
//             (chartData.value as any).labels?.[i] ?? "",
//           maxRotation: 0,
//           autoSkip: true,
//           color: ticks,
//         },
//         grid: { color: grid, borderColor: grid },
//       },
//       y: {
//         type: "category",
//         ticks: {
//           autoSkip: false,
//           callback: (_: any, i: number) => yCats?.[i] ?? "",
//           color: ticks,
//         },
//         grid: { color: grid, borderColor: grid },
//       },
//     };
//   }

//   return base;
// }

function makeData(type: ChartType): ChartData {
  if (type === "pie" || type === "doughnut") {
    const cd: any = chartData.value;
    const labels = cd.labels || [];
    const data = cd.datasets?.[0]?.data || [];
    // Unified category color mapping: same category = same color across ALL chart types
    const colors = labels.map((cat: string) => getCategoryColor(cat));
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: themeColor("base1"),
          borderWidth: 1,
        },
      ],
    };
  }

  if (type === "bubble") {
    const cd: any = chartData.value;
    const base = themeColor("primary");
    return {
      labels: cd.labels,
      datasets: [
        {
          label: "Spending (bubble size)",
          data: cd.datasets?.[0]?.data || [],
          parsing: { xAxisKey: "x", yAxisKey: "y" },
          borderColor: withAlpha(base, 1),
          backgroundColor: withAlpha(base, 0.7),
          radius: (ctx: ScriptableContext<"bubble">) => {
            const r = Number((ctx.raw as any)?.r ?? 3);
            return Math.max(3, Math.min(24, r));
          },
        },
      ],
    };
  }

  // line / bar
  const cd: any = chartData.value;
  return {
    labels: cd.labels,
    datasets: (cd.datasets || []).map((d: any, i: number) => {
      const palette = themePalette(8);
      const name = String(d.label || "").toLowerCase();
      const base = name.includes("income")
        ? themeColor("success")
        : name.includes("spend")
          ? themeColor("error")
          : name.includes("balance")
            ? themeColor("primary")
            : palette[i % palette.length];

      return {
        ...d,
        type,
        borderWidth: type === "bar" ? 0 : 2,
        tension: type === "line" ? 0.25 : 0,
        pointRadius: type === "line" ? 2 : 0,
        borderColor: withAlpha(base, 1),
        backgroundColor: withAlpha(base, type === "line" ? 0.12 : 0.8),
      };
    }),
  };
}

// function makeData(type: ChartType): ChartData {
//   if (type === "pie" || type === "doughnut") {
//     const cd: any = chartData.value;
//     const labels = cd.labels || [];
//     const data = cd.datasets?.[0]?.data || [];
//     const colors = themePalette(labels.length || 6);
//     return {
//       labels,
//       datasets: [
//         {
//           data,
//           backgroundColor: colors,
//           borderColor: themeColor("base1"),
//           borderWidth: 1,
//         },
//       ],
//     };
//   }

//   if (type === "bubble") {
//     const cd: any = chartData.value;
//     const base = themeColor("primary");
//     return {
//       labels: cd.labels,
//       datasets: [
//         {
//           label: "Spending (bubble size)",
//           data: cd.datasets?.[0]?.data || [],
//           parsing: { xAxisKey: "x", yAxisKey: "y" },
//           borderColor: withAlpha(base, 1),
//           backgroundColor: withAlpha(base, 0.7),
//           radius: (ctx: ScriptableContext<"bubble">) => {
//             const r = Number((ctx.raw as any)?.r ?? 3);
//             return Math.max(3, Math.min(24, r));
//           },
//         },
//       ],
//     };
//   }

//   // line / bar
//   const cd: any = chartData.value;
//   return {
//     labels: cd.labels,
//     datasets: (cd.datasets || []).map((d: any, i: number) => {
//       const palette = themePalette(8);
//       const name = String(d.label || "").toLowerCase();
//       const base = name.includes("income")
//         ? themeColor("success")
//         : name.includes("spend")
//         ? themeColor("error")
//         : name.includes("balance")
//         ? themeColor("primary")
//         : palette[i % palette.length];

//       return {
//         ...d,
//         type,
//         borderWidth: type === "bar" ? 0 : 2,
//         tension: type === "line" ? 0.25 : 0,
//         pointRadius: type === "line" ? 2 : 0,
//         borderColor: withAlpha(base, 1),
//         backgroundColor: withAlpha(base, type === "line" ? 0.12 : 0.8),
//       };
//     }),
//   };
// }

function applyDatePreset(p: { label: string; start: string; end: string }) {
  selectedDatePreset.value = p.label;
  dateFilter.value.start = p.start;
  dateFilter.value.end = p.end;
}
function resetDateFilter() {
  selectedDatePreset.value = "All Time";
  dateFilter.value = { start: "", end: "" };
}

// Reset all chart settings to defaults
function resetChartSettings() {
  // Reset date filter
  resetDateFilter();

  // Reset selection mode
  chartSelectionMode.value = 'or';

  // Reset series toggles
  seriesToggles.value = {
    income: true,
    spending: true,
    balance: true,
    allTimeCumulativeNetBalance: true,
  };

  // Reset category/tag selections
  ensureAllCatsSelected();
  selectedTagsChart.value = [];

  // Reset filter display mode (pie/doughnut only)
  chartFilterDisplayMode.value = 'both';

  // Reset group by
  chartConfig.value.groupBy = 'monthly';

  pushToast('Chart settings reset to defaults', 'success', 2000);
}

function formatDateRange() {
  const { start, end } = dateFilter.value;
  if (!start && !end) return "All Time";
  if (start && !end) return `${formatDate(start)} → …`;
  if (!start && end) return `… → ${formatDate(end)}`;
  return `${formatDate(start)} → ${formatDate(end)}`;
}

function toggleCategory(cat: string) {
  const i = selectedCategories.value.findIndex((c) => eqi(c, cat));
  if (i >= 0) selectedCategories.value.splice(i, 1);
  else selectedCategories.value.push(cat);
  selectedCategories.value = sortAlpha(dedupeCI(selectedCategories.value));
}
function selectAllCategories() {
  selectedCategories.value = chartCategories.value.slice();
}
function unselectAllCategories() {
  selectedCategories.value = [];
}

// Chart tag selection helpers
function toggleTagForChart(tag: string) {
  const i = selectedTagsChart.value.findIndex((t) => eqi(t, tag));
  if (i >= 0) selectedTagsChart.value.splice(i, 1);
  else selectedTagsChart.value.push(tag);
  selectedTagsChart.value = sortAlpha(dedupeCI(selectedTagsChart.value));
}

function selectAllTagsForChart() {
  selectedTagsChart.value = chartTags.value.slice();
}

function selectAllAvailableTagsForChart() {
  selectedTagsChart.value = availableTagsForChart.value.slice();
}

function unselectAllTagsForChart() {
  selectedTagsChart.value = [];
}

// Chart category selection helpers (similar to toggleTagForChart)
function toggleCategoryForChart(cat: string) {
  const i = selectedCategoriesChart.value.findIndex((c) => eqi(c, cat));
  if (i >= 0) selectedCategoriesChart.value.splice(i, 1);
  else selectedCategoriesChart.value.push(cat);
  // Sort alphabetically without duplicate issues
  selectedCategoriesChart.value = sortAlpha(selectedCategoriesChart.value);
}

function selectAllCategoriesChart() {
  selectedCategoriesChart.value = chartCategories.value.slice();
}

function unselectAllCategoriesChart() {
  selectedCategoriesChart.value = [];
}

function downloadChartAsPng() {
  if (!chartCanvas.value) return;
  const canvas = chartCanvas.value as HTMLCanvasElement;
  const link = document.createElement('a');
  link.download = `financial-chart-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function ensureAllCatsSelected() {
  if (selectedCategoriesChart.value.length === 0 && chartCategories.value.length) {
    selectedCategoriesChart.value = [...chartCategories.value];
  }
}

// Initialize tag selection when switching to chart tab
onMounted(() => {
  ensureAllCatsSelected();

  // Auto-select all categories on first visit if none selected
  if (selectedCategoriesChart.value.length === 0 && chartCategories.value.length > 0) {
    selectedCategoriesChart.value = [...chartCategories.value];
  }
  // Do NOT auto-select tags — leave them empty so category filtering works correctly
  // Tags will only be selected when user explicitly enables tag filtering

  // Render chart on initial load (activeTab defaults to "chart")
  nextTick(() => {
    renderChart();
  });
});

// Auto-select newly created categories when they're added
watch(chartCategories, (newCats) => {
  // Auto-select newly created categories that aren't already selected
  const currentCats = new Set(selectedCategoriesChart.value);
  const newCatsAdded: string[] = [];
  newCats.forEach(cat => {
    if (!currentCats.has(cat)) {
      selectedCategoriesChart.value.push(cat);
      newCatsAdded.push(cat);
    }
  });

  // Only re-sort if we actually added something
  if (newCatsAdded.length > 0) {
    selectedCategoriesChart.value = sortAlpha(selectedCategoriesChart.value);
  }
});
</script>
