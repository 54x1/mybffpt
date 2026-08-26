<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <div class="min-h-[100dvh] bg-base-100 transition-colors duration-300">
    <!-- Skip to main content link (WCAG 2.4.1 Bypass Blocks) -->
    <a href="#main" class="skip-link focus-ring">
      Skip to main content
    </a>
    <!-- Global toasts / announcements -->
    <div class="toast toast-top toast-end z-[70] pointer-events-none" aria-live="polite" aria-atomic="true">
      <div v-for="t in toasts" :key="t.id" class="alert pointer-events-auto" :class="{
        'alert-success': t.kind === 'success',
        'alert-info': t.kind === 'info',
        'alert-warning': t.kind === 'warning',
        'alert-error': t.kind === 'error',
      }" :role="t.kind === 'error' ? 'alert' : 'status'" aria-live="polite" aria-atomic="true">
        <span>{{ t.message }}</span>
        <button class="btn-icon-xs focus-ring" @click="dismissToast(t.id)" aria-label="Dismiss notification">
          ✕
        </button>
      </div>
    </div>

    <!-- M1: First-run choice — protect with a password, or continue without -->
    <div v-if="storeMode === 'choose'" class="min-h-[100dvh] flex items-center justify-center p-4">
      <div class="w-full max-w-sm card bg-base-100 shadow-xl">
        <div class="card-body items-center text-center gap-3">
          <div class="text-4xl" aria-hidden="true">🔐</div>
          <h1 class="card-title">Protect your data?</h1>
          <p class="text-sm opacity-70">
            You can encrypt your transactions, categories and tags with a master
            password. It's optional — you can turn it on or off anytime in
            Settings.
          </p>
          <div class="w-full flex flex-col gap-2">
            <button type="button" class="btn btn-primary w-full" @click="storeMode = 'setup'">
              Set a password
            </button>
            <button type="button" class="btn btn-ghost w-full" @click="handleContinueWithoutPassword()">
              Continue without
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- M1: Lock screen (set / enter master password) -->
    <div v-if="storeMode === 'setup' || storeMode === 'unlock'" class="min-h-[100dvh] flex items-center justify-center p-4">
      <div class="w-full max-w-sm card bg-base-100 shadow-xl">
        <div class="card-body items-center text-center gap-3">
          <div class="text-4xl" aria-hidden="true">🔒</div>
          <h1 class="card-title">
            {{ storeMode === 'setup' ? 'Set a master password' : 'Unlock your data' }}
          </h1>
          <p class="text-sm opacity-70">
            {{ storeMode === 'setup'
              ? 'Your transactions, categories and tags are encrypted on this device with this password.'
              : 'Enter your password to decrypt your data on this device.' }}
          </p>
          <form class="w-full flex flex-col gap-3" @submit.prevent="storeMode === 'setup' ? handleSetMasterPassword() : handleUnlock()">
            <input v-model="masterPassword" type="password" class="input input-bordered w-full"
              :placeholder="storeMode === 'setup' ? 'Choose a password' : 'Password'" autocomplete="current-password"
              aria-label="Master password" />
            <input v-if="storeMode === 'setup'" v-model="confirmMasterPassword" type="password"
              class="input input-bordered w-full" placeholder="Confirm password" autocomplete="new-password"
              aria-label="Confirm master password" />
            <div class="w-full text-left text-xs">
              <label class="label-text font-medium" for="stay-unlocked-mode">Auto-unlock</label>
              <select id="stay-unlocked-mode" class="select select-bordered select-sm w-full mt-1"
                :value="stayUnlockedMode"
                @change="onStayUnlockedModeChange(($event.target as HTMLSelectElement).value as StayUnlockedMode)">
                <option value="off">Ask every time</option>
                <option value="session">Stay unlocked for this session/tab</option>
                <option value="device">Stay unlocked on this device</option>
              </select>
              <p class="opacity-70 mt-1">
                <template v-if="stayUnlockedMode === 'session'">
                  Cleared when you close this tab, or after 5 minutes of inactivity.
                </template>
                <template v-else-if="stayUnlockedMode === 'device'">
                  Your data will be auto-unlocked here. Anyone with access to this
                  browser can read it.
                </template>
                <template v-else>
                  You'll need to enter your password each time you open the app.
                </template>
              </p>
            </div>
            <p v-if="storeError" class="text-sm text-error" role="alert">{{ storeError }}</p>
            <button type="submit" class="btn btn-primary w-full" :disabled="storeBusy">
              {{ storeBusy ? 'Working…' : (storeMode === 'setup' ? 'Set password' : 'Unlock') }}
            </button>
            <button v-if="storeMode === 'setup'" type="button" class="btn btn-ghost btn-sm w-full"
              :disabled="storeBusy" @click="storeMode = 'choose'">
              Back
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- App (only when unlocked / in insecure plaintext mode) -->
    <template v-if="storeMode === 'ready' || storeMode === 'insecure'">
    <!-- M1: insecure-context warning (Web Crypto unavailable → plaintext) -->
    <div v-if="storeMode === 'insecure'" class="alert alert-warning mx-auto max-w-3xl mt-4" role="alert">
      <span>⚠️ Secure storage is unavailable in this browser context. Your data is stored in
        <strong>plaintext</strong>. Use HTTPS or localhost to enable encryption.</span>
    </div>

    <!-- Header -->
    <AppHeader :tabs="tabs" :active-tab="activeTab" :net-balance-formatted="netBalanceFormatted"
      :show-lock="storeMode === 'ready' && passwordProtectionEnabled"
      :security-available="isSecureContextAvailable()" :password-protection-enabled="passwordProtectionEnabled"
      :security-busy="securityBusy" :stay-unlocked-mode="stayUnlockedMode" @home="goHome" @tab="onTab"
      @lock="handleLock" @toggle-protection="handleToggleProtection"
      @change-stay-unlocked-mode="onStayUnlockedModeChange" />

    <!-- Mobile Navigation -->
    <MobileNav :tabs="tabs" :active-tab="activeTab" @select="onTab" />

    <!-- Main -->
    <main id="main" class="container mx-auto p-4 pb-24 lg:pb-6 safe-area-main" role="main">
      <!-- Get Started / Onboarding -->
      <OnboardingHero v-if="showTour" :step="onboardingStep" @import="startImportFromOnboarding"
        @manual-add="startManualAdd" @demo="confirmDemo" @load-demo="loadDemoDataAndFinish" @back="handleTourBack"
        @skip="skipTour" />

      <template v-else>
        <!-- Dismissible Tip Banner -->
        <TipBanner v-if="
          showTips && transactions.length >= 0 && activeTab === 'transactions'
        " @dismiss="dismissTips" />
        <!-- Empty state hero -->
        <EmptyStateHero v-if="
          transactions.length === 0 &&
          !['about', 'add', 'import'].includes(activeTab)
        " :active-tab="activeTab" @import="startImportFromEmptyState" @manual-add="startManualAdd" @load-demo="loadDemoDataAndFinish" />

        <!-- If data exists, show the main content -->
        <template v-if="transactions.length > 0">
          <!-- Transactions Section -->
          <TransactionsSection v-if="activeTab === 'transactions'"
            v-model:search-query="searchQuery"
            v-model:show-advanced-transactions-view="showAdvancedTransactionsView"
            v-model:prioritize-selected="prioritizeSelected"
            v-model:sort-field="sortField"
            v-model:sort-order="sortOrder"
            v-model:current-page="currentPage"
            v-model:open-smart-select="openSmartSelect"
            v-model:large-select="largeSelect"
            :filtered-count="filteredTransactions.length"
            :paginated-transactions="paginatedTransactions"
            :selected-ids="selectedIds"
            :total-pages="totalPages"
            :type-filter="typeFilter"
            :active-amount-filter="activeAmountFilter"
            @select-by-type-and-close="selectByTypeAndClose"
            @close-closest-details="closeClosestDetails"
            @select-large="selectLarge"
            @select-similar="selectSimilar"
            @select-all="selectAllScope"
            @open-bulk-edit="openBulkEdit"
            @clear-selection="clearSelection"
            @bulk-delete="bulkDelete"
            @toggle-select-all="toggleSelectAll"
            @toggle-select-row="toggleSelectRow"
            @edit-transaction="editTransaction"
            @duplicate-tx="duplicateTx"
            @delete-transaction="deleteTransaction" />
        </template>

        <!-- Add Transaction -->
        <AddTransactionForm v-if="activeTab === 'add'" ref="addFormRef"
          :currently-editing-id="currentlyEditingId" :new-transaction="newTransaction" :amount-error="amountError"
          :all-categories="allCategories" :tag-list="tags" :manager-type="managerType" :manager-items="managerItems"
          :derived-end-date-iso="derivedEndDateISO" :is-default-category="isDefaultCategory"
          :is-hidden-category="isHiddenCategory" :get-category-usage-count="getCategoryUsageCount"
          :similar-transactions="similarTransactions"
          v-model:current-category="currentCategory" v-model:selected-tags="selectedTags"
          v-model:new-tx-date-iso="newTxDateISO" v-model:manager-search="managerSearch"
          v-model:apply-to-similar-ids="applyToSimilarIds"
          @add-transaction="addTransaction" @reset-form="cancelAddTransaction" @clear-amount-error="clearAmountError"
          @create-category="createCategoryAndSelect" @create-tag="createTagAndToggle" @open-manager="openManager"
          @manager-add="managerAdd" @apply-rename="applyRename($event.oldName, $event.newName, $event.count)"
          @restore-category="restoreCategory" @delete-item="deleteManagerItem" />

        <!-- Import / Export -->
        <ImportExportSection v-if="activeTab === 'import'" v-model:import-url="importUrl" :share-code="shareCode"
          :share-code-length="shareCodeLength" :share-url-safe-limit="SHARE_URL_SAFE_LIMIT"
          :transaction-count="transactions.length" :export-in-progress="exportInProgress"
          :export-progress="exportProgress" :can-web-share="canWebShare" :import-status="importStatus"
          :import-error="importError" :last-import-summary="lastImportSummary" @file-upload="handleFileUpload"
          @import-url-or-code="importFromUrlOrCode" @import-clipboard="importFromClipboard"
          @clear-all="clearAllTransactions" @copy="copy" @download-json="downloadJson"
          @json-import="handleJsonImport" @encrypted-import="handleEncryptedFileImport"
          @open-export-modal="exportModalOpen = true"
          @generate-share-codes="encryptedShareModalOpen = true" @web-share="webShare(shareUrl)" />

        <!-- Charts Section -->
        <ChartsSection ref="chartsSectionRef" :active-tab="activeTab" :transactions="transactions"
          :filtered-transactions="filteredTransactions" :base-filtered-by-search="baseFilteredBySearch"
          :net-balance="netBalance" :total-income="totalIncome" :total-expenses="totalExpenses"
          :last-import-summary="lastImportSummary" @tab="onTab" @dismiss-import-summary="lastImportSummary = ''" />



        <!-- About Section -->
        <AboutSection v-if="activeTab === 'about'" :version="version" :has-transactions="transactions.length > 0"
          :security-available="isSecureContextAvailable()" :password-protection-enabled="passwordProtectionEnabled"
          :stay-unlocked-mode="stayUnlockedMode" @start-tour="startTourFromAbout" />
      </template>
    </main>

    <!-- Tag Picker Modal -->
    <TagPickerModal ref="tagPickerModalRef" :tag-picker="tagPicker" :filtered-tag-list="filteredTagList"
      :tag-slice="tagSlice" @close="closeTagPicker" @create-from-query="createTagFromQuery"
      @apply="applyPickedTags" />

    <!-- Label Import Modal -->
    <LabelImportModal :label-import="labelImport" :label-import-filtered-tags="labelImportFilteredTags"
      @cancel="cancelLabelImport" @confirm="confirmLabelImport" @add-tag-from-query="addLabelTagFromQuery"
      @toggle-tag="toggleLabelTag" />

    <!-- Smart Select Modal -->
    <SmartSelectModal v-if="openSmartSelect" :smart-select="smartSelect" :categories="categories"
      @apply="applySmartSelect" @close="openSmartSelect = false" />

    <!-- Bulk Edit Modal -->
    <BulkEditModal :bulk-edit="bulkEdit" :categories="categories" :selected-count="selectedCount"
      :suggested-keyword="suggestedKeyword" :tag-list="tags" :selection-tags="selectionTags"
      :register-tag="sanitizeAndRegisterTag" @cancel="bulkEdit.open = false" @apply="applyBulkEdit" />

    <!-- Phase 1: Export Format Modal -->
    <ExportFormatModal v-if="exportModalOpen" v-model:export-format="exportFormat"
      v-model:export-filename-prefix="exportFilenamePrefix" v-model:protect-export="protectExport"
      v-model:export-password="exportPassword" :export-in-progress="exportInProgress"
      :export-progress="exportProgress" :transaction-count="transactions.length" @close="exportModalOpen = false"
      @export="handleExport(exportFormat)" />

    <!-- Phase 2: Share Code Modal -->
    <ShareCodeModal v-if="shareCodeModalOpen" :share-batch-count="shareBatchCount" :share-codes="shareCodes"
      :share-expiration-days="shareExpirationDays" :max-share-tx="MAX_SHARE_TX" @copy="copy"
      @close="shareCodeModalOpen = false" />

    <!-- Phase 3: Encrypted Share Modal -->
    <EncryptedShareModal v-if="encryptedShareModalOpen" v-model:encrypt-share-data="encryptShareData"
      v-model:share-password="sharePassword" v-model:share-confirm-password="shareConfirmPassword"
      v-model:share-expiration-days="shareExpirationDays" :share-expiration-options="shareExpirationOptions"
      @close="encryptedShareModalOpen = false" @generate="generateShareCodesWithBatching" />

    <!-- N3: Password Prompt Modal (replaces window.prompt for encrypted imports) -->
    <PasswordPromptModal v-if="passwordPromptOpen" :title="passwordPromptTitle"
      :info-text="passwordPromptInfo"
      @close="passwordPromptOpen = false" @submit="finishEncryptedImport" />

    <!-- M1: Password Prompt Modal (enable password protection from Settings) -->
    <PasswordPromptModal v-if="protectionPromptOpen" title="Set a master password"
      confirm-label="Set password"
      info-text="Choose a master password to encrypt your transactions, categories and tags on this device. It's only used locally and never stored or sent anywhere."
      @close="protectionPromptOpen = false" @submit="handleProtectionPromptSubmit" />
    </template>
  </div>
</template>
<script setup lang="ts">
import DatePicker from './components/DatePicker.vue';
import MobileNav from './components/MobileNav.vue';
import AboutSection from './components/AboutSection.vue';
import AppHeader from './components/AppHeader.vue';
import OnboardingHero from './components/OnboardingHero.vue';
import TipBanner from './components/TipBanner.vue';
import EmptyStateHero from './components/EmptyStateHero.vue';
import ImportExportSection from './components/ImportExportSection.vue';
import TransactionsSection from './components/TransactionsSection.vue';
import AddTransactionForm from './components/AddTransactionForm.vue';
import ExportFormatModal from './components/ExportFormatModal.vue';
import ShareCodeModal from './components/ShareCodeModal.vue';
import EncryptedShareModal from './components/EncryptedShareModal.vue';
import PasswordPromptModal from './components/PasswordPromptModal.vue';
import ChartsSection from './components/ChartsSection.vue';
import TagPickerModal from './components/TagPickerModal.vue';
import LabelImportModal from './components/LabelImportModal.vue';
import SmartSelectModal from './components/SmartSelectModal.vue';
import BulkEditModal from './components/BulkEditModal.vue';
import { Chart, LineController, BarController, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, PieController, DoughnutController, RadarController, ScatterController, RadialLinearScale, Filler } from 'chart.js';
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
  shallowRef,
} from "vue";
import { buildTimeSeriesBuckets, type ChartGroupBy } from "./utils/chartBuckets";
import type {
  Transaction,
  TransactionType,
  RecurringFrequency,
  ToastKind,
  DescMode,
  InferredCols,
  ParsedQuery,
} from "./utils/types";
import {
  LS_KEYS,
  DEFAULT_CATEGORIES,
  VIBRANT_COLORS,
  VIBRANT_BORDERS,
  INCOME_COLOR,
  SPENDING_COLOR,
  BALANCE_COLOR,
} from "./utils/constants";
import { DEBUG_IMPORT, dbg, dbgw, dbge, dbgg, dbgge, sample } from "./utils/debug";
import {
  isString,
  norm,
  normDesc,
  eqi,
  decodeHtmlEntities,
  containsCaseIns,
  dedupeCI,
  sortAlpha,
  escapeRegExp,
} from "./utils/text";
import { safeLocalStorageGet, safeLocalStorageSet } from "./utils/storage";
import {
  isSecureContextAvailable,
  isEncryptedStorePresent,
  setupMasterPassword,
  unlock as unlockSecureStore,
  lock as lockSecureStore,
  setSecureDisabled,
  secureGet,
  migratePlaintextToEncrypted,
  enablePasswordProtection,
  disablePasswordProtection,
  getStayUnlockedMode,
  setStayUnlockedMode,
  restoreSessionKey,
  exportSessionKey,
  clearSessionKey,
  type StayUnlockedMode,
} from "./utils/secureStorage";
import { startInactivityWatch, stopInactivityWatch, hasExceededInactivityTimeout } from "./utils/inactivityLock";
import {
  toLocalISO,
  todayLocalISO,
  isoToDDMMYYYY,
  ddmmyyyyToISO,
  formatDDMMProgressive,
  finalizeDDMM,
  parseDateGuess,
  endOfMonthISO,
  toISOorEmpty,
  startOfISOWeek,
  startOfFortnight,
  startOfQuarter,
  bucketKeyByGroup,
} from "./utils/dates";
import { autoCategoryFor, autoTagsFor, autoMergeTags } from "./utils/rules";
import {
  parseCSV,
  findIndexByKeywords,
  parseAmountNumber,
  inferColumns,
  scanAmountConvention,
  rowToTransaction,
  stableKey,
} from "./utils/csv";
import { parseSmartQuery, txMatches } from "./utils/query";
import { devWarn, devError } from "./utils/debug";
import {
  encryptSharePayload,
  decryptShareData,
  addExpirationToShareData,
  checkShareCodeExpiration,
  jsonToBase64,
  base64ToBytes,
  encryptFileContent,
  decryptFileContent,
} from "./utils/share";
import {
  DEFAULT_SOURCE,
  validateTransactionSchema,
  normalizeTransaction,
} from "./utils/transactions";
import { useToasts } from "./composables/useToasts";
import { useDateFormat } from "./composables/useDateFormat";
import { useTheme } from "./composables/useTheme";
import {
  type Token,
  TOKEN_VAR,
  cssVarToRGB,
  withAlpha,
  themeColor,
  invalidateColorCaches,
  themePalette,
  normalizeChartLabel,
  hashChartLabel,
  hslToRgb,
  getCategoryPaletteIndex,
  stableLabelColor,
  getCategoryColor,
  formatChartTooltipTitle,
  resolveTooltipColor,
  shiftHue,
} from "./utils/themeColors";

// Shared app-wide state via composables (Vue 3 simple-store pattern)
const { toasts, pushToast, dismissToast } = useToasts();
const chartsSectionRef = ref<any>(null);
const { formatDate } = useDateFormat();
const { currentTheme, themeVersion } = useTheme();

Chart.register(LineController, BarController, PieController, DoughnutController, RadarController, ScatterController, CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);



// ========= Persistence  Theme boot  cross-tab sync =========

function loadPersistedState() {
  const savedView = localStorage.getItem(LS_KEYS.view);
  if (savedView === "true" || savedView === "false") {
    showAdvancedTransactionsView.value = savedView === "true";
  }

  const tipsDismissed =
    (localStorage.getItem(LS_KEYS.tips) || "").trim().toLowerCase() === "true";
  showTips.value = !tipsDismissed;

  // Recently used categories (used by rememberCategory)
  const recent = safeLocalStorageGet(LS_KEYS.recent);
  if (Array.isArray(recent)) {
    const rc = recent.filter(isString).slice(0, 6);
    recentCategories.value = rc;
  }

  // Last selected category for pre-fill
  const lastCat = safeLocalStorageGet("last-selected-category");
  if (isString(lastCat)) {
    lastSelectedCategory.value = lastCat;
  }

  // Theme
  const savedTheme = (localStorage.getItem(LS_KEYS.theme) || "").trim();
  if (savedTheme) {
    currentTheme.value = savedTheme;
  }
  // Ensure the attribute is applied immediately
  document.documentElement.setAttribute("data-theme", currentTheme.value);
}

// M1: load the sensitive (encrypted-at-rest) data. Must be called after the
// store is unlocked (or in insecure/plaintext mode).
async function loadSensitiveData() {
  // Transactions
  const rawTx = await secureGet(LS_KEYS.tx);
  if (Array.isArray(rawTx)) {
    try {
      // Normalize just in case formats changed between versions
      transactions.value = rawTx.map(normalizeTransaction);
      // OPTIMIZED: Extract categories once after load instead of on every computed access
      extractCategoriesFromTransactions();
    } catch (e) {
      devWarn("Failed to load persisted transactions:", e);
    }
  }

  // Custom categories
  const rawCats = await secureGet(LS_KEYS.cats);
  if (Array.isArray(rawCats)) {
    const cats = rawCats.filter(isString).map(decodeHtmlEntities);
    customCategories.value = sortAlpha(dedupeCI(cats));
  }

  // Tags
  const rawTags = await secureGet(LS_KEYS.tags);
  if (Array.isArray(rawTags)) {
    const tg = rawTags.filter(isString).map(decodeHtmlEntities);
    tags.value = sortAlpha(dedupeCI(tg));
  }

  // If user has data, land them on Transactions.
  // If they have no data, start them in Import instead of the empty chart shell.
  if (transactions.value.length > 0) {
    activeTab.value = "chart";
  } else if (!showTour.value) {
    activeTab.value = "about";
  }
}

function storageSync(e: StorageEvent) {
  if (!e.key) return;
  // Only respond to our keys
  if (e.key === LS_KEYS.tx) {
    // M1: sensitive key — decrypt (no-op plaintext read in insecure mode).
    secureGet(LS_KEYS.tx)
      .then((raw) => {
        if (Array.isArray(raw)) {
          transactions.value = raw.map(normalizeTransaction);
          extractCategoriesFromTransactions();
        }
      })
      .catch((err) => devWarn("storageSync tx decrypt failed:", err));
  } else if (e.key === LS_KEYS.cats) {
    secureGet(LS_KEYS.cats)
      .then((raw) => {
        if (Array.isArray(raw)) {
          customCategories.value = sortAlpha(dedupeCI(raw.filter(isString).map(decodeHtmlEntities)));
        }
      })
      .catch((err) => devWarn("storageSync cats decrypt failed:", err));
  } else if (e.key === LS_KEYS.tags) {
    secureGet(LS_KEYS.tags)
      .then((raw) => {
        if (Array.isArray(raw)) {
          tags.value = sortAlpha(dedupeCI(raw.filter(isString).map(decodeHtmlEntities)));
        }
      })
      .catch((err) => devWarn("storageSync tags decrypt failed:", err));
  } else if (e.key === LS_KEYS.recent) {
    const raw = safeLocalStorageGet(LS_KEYS.recent);
    if (Array.isArray(raw)) {
      recentCategories.value = raw.filter(isString).slice(0, 6);
    }
  } else if (e.key === "last-selected-category") {
    const lastCat = safeLocalStorageGet("last-selected-category");
    if (isString(lastCat)) {
      lastSelectedCategory.value = lastCat;
    }
  } else if (e.key === LS_KEYS.theme) {
    const theme = (localStorage.getItem(LS_KEYS.theme) || "").trim();
    if (theme) {
      currentTheme.value = theme;
      document.documentElement.setAttribute("data-theme", theme);
    }
  }
}

onMounted(async () => {
  // Non-sensitive settings load immediately (theme, view, tips, recents…).
  loadPersistedState();
  loadLastRecurringDefaults();
  // In case something else set currentTheme before mount
  document.documentElement.setAttribute("data-theme", currentTheme.value);
  window.addEventListener("storage", storageSync, { passive: true } as any);

  // M1: decide how the sensitive store is handled.
  if (!isSecureContextAvailable()) {
    // Web Crypto unavailable (e.g. plain-HTTP non-localhost). Run in plaintext
    // with a visible warning rather than silently failing.
    setSecureDisabled(true);
    storeMode.value = "insecure";
    await loadSensitiveData();
  } else if (isEncryptedStorePresent()) {
    // Returning user with an encrypted store.
    passwordProtectionEnabled.value = true;
    const mode = getStayUnlockedMode();
    // "session" mode also force-expires after a period of inactivity, even if
    // the tab (and its sessionStorage) never actually closed.
    const inactivityExpired = mode === "session" && hasExceededInactivityTimeout();
    if (mode !== "off" && !inactivityExpired && (await restoreSessionKey())) {
      // Stay-unlocked is on and the persisted key restored → auto-unlock.
      await loadSensitiveData();
      storeMode.value = "ready";
    } else {
      if (inactivityExpired) clearSessionKey();
      storeMode.value = "unlock";
    }
  } else {
    // No encrypted store. Check whether the user already made a choice.
    passwordProtectionEnabled.value = false;
    const choice = localStorage.getItem(LS_KEYS.passwordChoice);
    if (choice === "declined") {
      // User already declined → go straight to the app.
      storeMode.value = "ready";
      await loadSensitiveData();
    } else if (choice === "set") {
      // Defensive: choice says "set" but no encrypted store is present.
      // Offer the choice again.
      storeMode.value = "choose";
    } else {
      // First run: open in plaintext. Onboarding is opt-in via the
      // "Get Started Now" button on the About page; the one-time password
      // choice is offered once onboarding finishes.
      storeMode.value = "ready";
      pendingPasswordChoice.value = true;
    }
  }
});

onUnmounted(() => {
  window.removeEventListener("storage", storageSync);
  stopInactivityWatch();
});

// ========== TYPES ==========








function toggleLabelTag(tag: string) {
  const idx = labelImport.tagsSelected.findIndex((t) => eqi(t, tag));
  if (idx >= 0) labelImport.tagsSelected.splice(idx, 1);
  else labelImport.tagsSelected.push(tag);
  labelImport.tagsSelected = sortAlpha(dedupeCI(labelImport.tagsSelected));
}

function addLabelTagFromQuery() {
  const name = labelImport.tagsQuery.trim();
  if (!name) return;
  if (!existsTag(name)) {
    tags.value = sortAlpha(dedupeCI([...tags.value, name]));
    safeLocalStorageSet(LS_KEYS.tags, tags.value);
  }
  // toggle canonical
  const canonical = tags.value.find((t) => eqi(t, name)) || name;
  toggleLabelTag(canonical);
  labelImport.tagsQuery = "";
}


type ImportJob = {
  file: File;
  rows: Transaction[];
  filename: string;
};

const importQueue = ref<ImportJob[]>([]);
let importingNow = false;






// ========== REACTIVE STATE ==========
// refs for UI
// Add Transaction form (extracted). Parent addTransaction/resetForm/editTransaction
// reach into the child's amount/category/viewport refs via this instance ref.
const addFormRef = ref<InstanceType<typeof AddTransactionForm> | null>(null);

// createCategoryAndSelect is the parent handler for the child's create-category
// intent: it owns the canonical customCategories list + toast; the child closes
// its own dropdown.
function createCategoryAndSelect(name: string) {
  // Sanitize: trim, collapse whitespace, strip leading/trailing punctuation (but keep & and hyphens)
  const trimmed = name.trim().replace(/\s+/g, ' ').replace(/^[^\w&-]+|[^\w&-]+$/g, '');
  if (!trimmed) return;

  // Capitalize first letter of each word (including after &)
  const capitalized = trimmed.replace(/\b\w/g, (c) => c.toUpperCase());

  if (!existsCategory(capitalized)) {
    customCategories.value = sortAlpha(
      dedupeCI([...customCategories.value, capitalized])
    );
    safeLocalStorageSet(LS_KEYS.cats, customCategories.value);
  }

  // Find canonical form and select
  const canonical = allCategories.value.find((c) => eqi(c, capitalized)) || capitalized;
  currentCategory.value = canonical;
  pushToast(`Category "${canonical}" added`, "success");
}

// toggleTag stays in the parent: it is invoked by createTagAndToggle after the
// canonical tag list is updated. The child has its own copy for its template.
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

// Sanitizes a raw tag name (trim, collapse whitespace, strip stray leading/
// trailing punctuation, Title Case, 50-char cap) and ensures it exists in the
// canonical tag list, returning the canonical form ("" if nothing usable was
// entered). This is the single entry point for turning free text into a tag —
// every "add tag" flow (transaction form, bulk edit) routes through it so a
// tag typed in one place always comes out looking the same as in another.
function sanitizeAndRegisterTag(name: string): string {
  let sanitized = name.trim().replace(/\s+/g, ' ').replace(/^[^\w&-]+|[^\w&-]+$/g, '');
  if (!sanitized) return "";

  if (sanitized.length > 50) {
    sanitized = sanitized.slice(0, 50);
    pushToast('Tag name shortened to 50 characters', 'warning');
  }

  // Normalize to title case for consistency
  const normalized = sanitized.replace(/\b\w/g, c => c.toUpperCase());

  if (!existsTag(normalized)) {
    tags.value = sortAlpha(dedupeCI([...tags.value, normalized]));
    safeLocalStorageSet(LS_KEYS.tags, tags.value);
  }

  return tags.value.find((t) => eqi(t, normalized)) || normalized;
}

// createTagAndToggle is the parent handler for the child's create-tag intent:
// it owns the canonical tag list + toast; the child clears its own search query.
function createTagAndToggle(name: string) {
  const canonical = sanitizeAndRegisterTag(name);
  if (!canonical) return;
  toggleTag(canonical);
  pushToast(`Tag "${canonical}" added`, "success");
}

function existsTag(name: string) {
  const n = norm(name);
  return tags.value.some((t) => norm(t) === n);
}

//  manager modal handlers
// The child owns the dialog element + its search/add/rename UI state; the parent
// only owns managerType (drives managerItems + all mutation logic) and the
// managerSearch model (so managerItems recomputes on each keystroke).
function openManager(kind: ManagerType) {
  managerType.value = kind;
  managerSearch.value = "";
}

function managerAdd(n: string) {
  if (!n) return;

  const listRef = getListRef();

  if (!existsInManager(n)) {
    listRef.value = sortAlpha(dedupeCI([...listRef.value, n]));
    safeLocalStorageSet(
      managerType.value === "category" ? LS_KEYS.cats : LS_KEYS.tags,
      listRef.value
    );
    pushToast(
      `${managerType.value === "category" ? "Category" : "Tag"} "${n}" added`,
      "success"
    );
  } else {
    pushToast(
      `${managerType.value === "category" ? "Category" : "Tag"} already exists`,
      "info"
    );
  }
}

// Apply category/tag rename to transactions. `count` (the number of affected
// transactions) is computed by the child and passed through the apply-rename
// intent; it is only used for the toast message.
function applyRename(oldName: string, newName: string, count: number) {
  if (managerType.value === "category") {
    // Update current selection if needed
    if (eqi(currentCategory.value || "", oldName)) {
      currentCategory.value = newName;
    }
    // Update all transactions with this category
    transactions.value = transactions.value.map((t) =>
      eqi(t.category, oldName) ? { ...t, category: newName } : t
    );

    // Ensure newName is in custom list
    if (!existsInManager(newName)) {
      customCategories.value = sortAlpha(
        dedupeCI([...customCategories.value, newName])
      );
    }
    // Remove oldName from custom list if it existed there
    customCategories.value = customCategories.value.filter(
      (x) => !eqi(x, oldName)
    );

    // Hide old default category if needed
    if (isDefaultCategory(oldName) && !isHiddenCategory(oldName)) {
      hiddenCategories.value = sortAlpha(
        dedupeCI([...hiddenCategories.value, oldName])
      );
      safeLocalStorageSet(LS_KEYS.catsHidden, hiddenCategories.value);
    }

    pushToast(
      `Renamed category "${oldName}" → "${newName}" (${count} transaction${count === 1 ? "" : "s"} updated)`,
      "success"
    );
  } else {
    // Update selected tags if needed
    selectedTags.value = selectedTags.value.map((t) =>
      eqi(t, oldName) ? newName : t
    );
    // Update all transactions with this tag
    transactions.value = transactions.value.map((t) => ({
      ...t,
      tags: t.tags.map((tt) => (eqi(tt, oldName) ? newName : tt)),
    }));

    const listRef = getListRef();
    const idx = listRef.value.findIndex((x) => eqi(x, oldName));
    if (idx >= 0) listRef.value[idx] = newName;

    pushToast(
      `Renamed tag "${oldName}" → "${newName}" (${count} transaction${count === 1 ? "" : "s"} updated)`,
      "success"
    );
  }

  // Persist lists
  safeLocalStorageSet(LS_KEYS.cats, customCategories.value);
  safeLocalStorageSet(LS_KEYS.tags, tags.value);
}

function deleteManagerItem(name: string) {
  if (!name) return;

  if (managerType.value === "category") {
    // If it exists in custom list, remove it; otherwise mark default/discovered as hidden.
    const wasCustom = customCategories.value.some((x) => eqi(x, name));
    if (wasCustom) {
      customCategories.value = customCategories.value.filter(
        (x) => !eqi(x, name)
      );
      safeLocalStorageSet(LS_KEYS.cats, customCategories.value);
    } else if (!isHiddenCategory(name)) {
      hiddenCategories.value = sortAlpha(
        dedupeCI([...hiddenCategories.value, name])
      );
      safeLocalStorageSet(LS_KEYS.catsHidden, hiddenCategories.value);
    }

    // Clear from current selection if needed
    if (eqi(currentCategory.value || "", name)) currentCategory.value = "";

    // Reassign existing transactions to a safe default
    transactions.value = transactions.value.map((t) =>
      eqi(t.category, name) ? { ...t, category: "Uncategorized" } : t
    );

    pushToast(`Deleted category "${name}"`, "success");
  } else {
    // Tag delete unchanged
    const listRef = getListRef();
    listRef.value = listRef.value.filter((x) => !eqi(x, name));
    selectedTags.value = selectedTags.value.filter((t) => !eqi(t, name));
    transactions.value = transactions.value.map((t) => ({
      ...t,
      tags: t.tags.filter((tt) => !eqi(tt, name)),
    }));
    safeLocalStorageSet(LS_KEYS.tags, tags.value);
    pushToast(`Deleted tag "${name}"`, "success");
  }
}

function restoreCategory(name: string) {
  hiddenCategories.value = hiddenCategories.value.filter((c) => !eqi(c, name));
  safeLocalStorageSet(LS_KEYS.catsHidden, hiddenCategories.value);
  pushToast(`Restored category "${name}"`, "success");
}

// Usage count helper: CACHED to avoid O(n) scan per virtual row
// Uses a Map that only recomputes when transactions actually change
let _categoryUsageMap = new Map<string, number>();
let _tagUsageMap = new Map<string, number>();

function rebuildUsageCounts() {
  _categoryUsageMap.clear();
  _tagUsageMap.clear();
  const tx = transactions.value;
  for (let i = 0; i < tx.length; i++) {
    const t = tx[i];
    const catKey = t.category.toLowerCase();
    _categoryUsageMap.set(catKey, (_categoryUsageMap.get(catKey) || 0) + 1);
    for (const tag of t.tags) {
      const tagKey = tag.toLowerCase();
      _tagUsageMap.set(tagKey, (_tagUsageMap.get(tagKey) || 0) + 1);
    }
  }
}

function getCategoryUsageCount(name: string): number {
  const key = name.toLowerCase();
  if (managerType.value === "category") {
    return _categoryUsageMap.get(key) || 0;
  } else {
    return _tagUsageMap.get(key) || 0;
  }
}

// Core data
// CRITICAL: shallowRef avoids deep proxy overhead on 100k+ transaction objects
// Each mutation must be done via array operations (push, splice, map assignment)
const transactions = shallowRef<Transaction[]>([]);

// Watch transactions to rebuild usage counts only when needed
// (Must be after transactions declaration)
watch(transactions, () => {
  rebuildUsageCounts();
});

// UI state
const activeTab = ref<"import" | "add" | "chart" | "transactions" | "about">(
  "about"
);
const showTour = ref(false);
const onboardingStep = ref(0);
const showTips = ref(true);
// Tab the user was on before opening the Add tab (for Cancel navigation).
const previousTab = ref<string | null>(null);
activeTab.value = "about";
const dismissTips = () => {
  showTips.value = false;
  localStorage.setItem(LS_KEYS.tips, "true");
};
const version = ref("v1.0");

// Transaction form
const newTransaction = reactive<Transaction>({
  id: '',
  // Must start as a real date: the date input's computed getter only DISPLAYS
  // today as a fallback; an empty model here gets stored as-is and turns every
  // recurring child date into "NaN-NaN-NaN".
  date: todayLocalISO(),
  type: 'spending',
  amount: 0,
  category: '',
  tags: [],
  description: '',
  recurring: false,
  frequency: 'monthly',
  recursions: 1,
  endDate: '',
  source: '',
});

// Load last recurring defaults from localStorage
const loadLastRecurringDefaults = () => {
  try {
    const raw = safeLocalStorageGet(LS_KEYS.recurringDefaults);
    if (raw && typeof raw === 'object') {
      if (typeof raw.recurring === 'boolean') newTransaction.recurring = raw.recurring;
      if (raw.frequency) newTransaction.frequency = raw.frequency;
      if (typeof raw.recursions === 'number') newTransaction.recursions = raw.recursions;
    }
  } catch (e) {
    devWarn('Failed to load recurring defaults:', e);
  }
};

// Save recurring defaults to localStorage whenever they change
watch(
  [() => newTransaction.recurring, () => newTransaction.frequency, () => newTransaction.recursions],
  ([recurring, frequency, recursions]) => {
    // Editing an existing transaction loads its values into the form; those
    // programmatic changes must not overwrite the user's add-form defaults.
    if (currentlyEditingId.value) return;
    safeLocalStorageSet(LS_KEYS.recurringDefaults, {
      recurring,
      frequency,
      recursions
    });
  },
  { deep: true }
);

// Auto-add tags whenever category/description indicate a known merchant
watch(
  [() => newTransaction.category, () => newTransaction.description],
  ([cat, desc], [prevCat, prevDesc]) => {
    if (!cat || !desc) return;
    const detected = autoTagsFor(desc, cat);
    if (!detected.length) return;

    // Merge into the current transaction’s tags
    newTransaction.tags = autoMergeTags(newTransaction.tags, detected);

    // Keep global tag list in sync so the chips/pickers show them
    tags.value = sortAlpha(dedupeCI([...tags.value, ...detected]));
    safeLocalStorageSet(LS_KEYS.tags, tags.value);
  }
);

const currentlyEditingId = ref<string | null>(null);

// When editing, lets the user roll the category/tags change out to whichever
// other transactions (matched by description) they hand-pick from the list
// (e.g. re-tagging one "Uber" row also fixes past "Uber" rows the user checks).
const applyToSimilarIds = ref<Set<string>>(new Set());
const similarTransactions = computed(() => {
  if (!currentlyEditingId.value) return [];
  const targetDesc = normDesc(newTransaction.description);
  if (!targetDesc) return [];
  return transactions.value.filter(
    (t) => t.id !== currentlyEditingId.value && normDesc(t.description) === targetDesc
  );
});

// The candidate list can shrink (user edits the description) or the
// transaction set can change underneath the selection; drop any picks that
// are no longer valid candidates instead of silently applying to stale ids.
watch(similarTransactions, (list) => {
  if (applyToSimilarIds.value.size === 0) return;
  const validIds = new Set(list.map((t) => t.id));
  const pruned = new Set(
    [...applyToSimilarIds.value].filter((id) => validIds.has(id))
  );
  if (pruned.size !== applyToSimilarIds.value.size) {
    applyToSimilarIds.value = pruned;
  }
});

// Date input handling
const addDateTextRef = ref<HTMLInputElement | null>(null);
const newTxDateError = ref("");
const addDatePickerRef = ref<HTMLInputElement | null>(null);
const newTxDateText = ref(isoToDDMMYYYY(newTransaction.date));

// Amount validation
const amountError = ref("");

const newTxDateISO = computed<string>({
  get() {
    return newTransaction.date || todayLocalISO();
  },
  set(v: string) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) newTransaction.date = v;
  },
});

// ========= Universal Date Picker (iOS/Android/Desktop-safe) =========

// Calendar
const addCalOpen = ref(false);
const calViewMonthISO = ref('');
// const newTxDateISO = ref('');
// const newTxDateError = ref('');
// const todayISO = computed(() => toLocalISO(new Date()));
// const addDateTextRef = ref<HTMLInputElement | null>(null);
// const addDatePickerRef = ref<HTMLInputElement | null>(null);
// const amountInputRef = ref<HTMLInputElement | null>(null);
// const addSectionRef = ref<HTMLElement | null>(null);
const hiddenCategories = ref<string[]>([]);

// in loadPersistedState()
const rawHidden = safeLocalStorageGet(LS_KEYS.catsHidden);
if (Array.isArray(rawHidden)) {
  hiddenCategories.value = rawHidden.filter(isString);
}

// persist on change
watch(hiddenCategories, (v) => safeLocalStorageSet(LS_KEYS.catsHidden, v), {
  deep: true,
});

function isDefaultCategory(name: string) {
  return categoryNames.some((c) => eqi(c, name));
}
function isHiddenCategory(name: string) {
  return hiddenCategories.value.some((c) => eqi(c, name));
}

watch(newTxDateISO, (v) => {
  if (v) calViewMonthISO.value = v.slice(0, 7) + "-01";
});

function startOfMonthISO(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return toLocalISO(new Date(y, m - 1, 1));
}
function startOfCalendarGrid(isoFirstOfMonth: string): string {
  const dt = new Date(isoFirstOfMonth);
  const dow = dt.getDay(); // Sun=0..Sat=6
  dt.setDate(1 - dow);
  return toLocalISO(dt);
}
function daysInMonthGrid(
  isoFirstOfMonth: string
): { iso: string; inMonth: boolean; isToday: boolean }[] {
  const first = new Date(isoFirstOfMonth);
  const month = first.getMonth();
  const gridStartISO = startOfCalendarGrid(isoFirstOfMonth);
  const cells: { iso: string; inMonth: boolean; isToday: boolean }[] = [];
  let cursor = new Date(gridStartISO);
  const todayISO = todayLocalISO();
  for (let i = 0; i < 42; i++) {
    const iso = toLocalISO(cursor);
    cells.push({
      iso,
      inMonth: cursor.getMonth() === month,
      isToday: iso === todayISO,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}
const calCells = computed(() =>
  daysInMonthGrid(startOfMonthISO(calViewMonthISO.value))
);

function openAddCalendar() {
  calViewMonthISO.value = newTxDateISO.value
    ? startOfMonthISO(newTxDateISO.value)
    : startOfMonthISO(todayLocalISO());
  addCalOpen.value = true;
}
function closeAddCalendar() {
  addCalOpen.value = false;
}
function calPrevMonth() {
  calViewMonthISO.value = addMonthsClamped(
    startOfMonthISO(calViewMonthISO.value),
    -1
  );
}
function calNextMonth() {
  calViewMonthISO.value = addMonthsClamped(
    startOfMonthISO(calViewMonthISO.value),
    1
  );
}
function pickCalDate(iso: string) {
  newTxDateISO.value = iso;
  newTxDateText.value = isoToDDMMYYYY(iso);
  newTxDateError.value = "";
  addDateTextRef.value?.setCustomValidity?.("");
  addCalOpen.value = false;
}
function clearCalDate() {
  newTxDateISO.value = "";
  newTxDateText.value = "";
  addCalOpen.value = false;
}


watch(newTxDateISO, (iso) => (newTxDateText.value = isoToDDMMYYYY(iso) || ""));

// Categories and tags
const categoryNames = [
  "Salary & Income",
  "Donations",
  "Restaurant & Takeaway",
  "AfterPay",
  "Vehicle Expenses",
  "Transport & Parking",
  "Bills & Services",
  "BNPL",
  "Grocery",
  "Investment",
  "Transfers",
  "Retail Shopping",
  "Flights",
  "Gambling",
  "Accommodation",
  "Attractions & Events",
  "Clothing & Personal Life",
  "Education",
  "Cafes & Coffees",
  "Health & Medical",
  "Subscriptions",
  "Fitness",
  "Hobbies",
  "Home Stuff",
  "Uncategorized",
];

const customCategories = ref<string[]>([]);
const tags = ref<string[]>([]);
const recentCategories = ref<string[]>([]);

// OPTIMIZED: Lazy category extraction - only iterate transactions once on mount/load
// Then incrementally update on transaction changes
// Declared after categoryNames/customCategories to avoid TDZ
const categorySet = new Set<string>(categoryNames);
customCategories.value.forEach((c) => categorySet.add(c));

// categorySet is a plain Set, invisible to Vue's reactivity system — mutating
// it never tells `allCategories` to recompute. This ref is the only thing
// that actually invalidates the computed; bump it after every categorySet
// mutation (see touchCategorySet below).
const categorySetVersion = ref(0);
function touchCategorySet() {
  categorySetVersion.value++;
}

// Extract categories from loaded transactions (called after data load)
function extractCategoriesFromTransactions() {
  transactions.value.forEach((t) => categorySet.add(t.category));
  touchCategorySet();
}

const allCategories = computed(() => {
  categorySetVersion.value; // reactive dependency — see touchCategorySet
  return Array.from(categorySet)
    .filter((c) => !isHiddenCategory(c))
    .sort((a, b) => a.localeCompare(b));
});

// Last selected category for pre-fill
const lastSelectedCategory = ref<string>("");

// Category combobox
const open = ref(false);
const query = ref("");
const activeIndex = ref<number>(0);
const ids = {
  input: `cat-cbx-${Math.random().toString(36).slice(2)}`,
  listbox: `cat-lb-${Math.random().toString(36).slice(2)}`,
  heading: `catmgr-h-${Math.random().toString(36).slice(2)}`,
  tagList: `tag-lb-${Math.random().toString(36).slice(2)}`,
};
// Tag input
const tagInput = ref("");
const openTagSuggest = ref(false);

// Modals
const showManager = ref(false);
const managerMode = ref<"manage" | "add">("manage");
const tagPicker = reactive({
  open: false,
  q: "",
  visible: 120,
  selected: new Set<string>(),
});
const labelImport = reactive({
  open: false,
  filename: "",
  label: "",
  note: "",
  imported: [] as Transaction[],
  tagsSelected: [] as string[],
  // Snapshot of the per-transaction auto-detected tags at prepare time, used
  // to tell "already on these rows" apart from tags the user picks to apply
  // to the whole batch — see confirmLabelImport.
  autoDetectedTags: [] as string[],
  tagsQuery: "",
});
// const openSmartSelect = ref(false);
const bulkEdit = reactive({
  open: false,
  category: "",
  type: "" as "" | TransactionType,
  descMode: "none" as DescMode,
  descText: "",
  findText: "",
  replaceWith: "",
  replaceAll: true,
  trimWhitespace: true,
  collapseSpaces: true,
  titleCase: false,
  shiftDays: null as number | null,
  saveRule: false,
  ruleKeyword: "",
  addTags: [] as string[],
  removeTags: [] as string[],
});

// Transactions view | 'bubbleHierarchy'
const showAdvancedTransactionsView = ref(false);
const searchQuery = ref('');
const typeFilter = ref<TransactionType | ''>('');
const sourceFilter = ref('');
const sortField = ref<'date' | 'type' | 'amount' | 'category' | 'description'>('date');
const sortOrder = ref<'asc' | 'desc'>('desc');
const currentPage = ref(1);
const itemsPerPage = 20;
const selectedIds = ref<Set<string>>(new Set());
const prioritizeSelected = ref(true);
const largeSelect = ref({ threshold: 50, smart: true, pageOnly: false });
const openSmartSelect = ref(false);
const smartSelect = ref({
  category: '',
  type: '' as '' | TransactionType,
  min: null as number | null,
  max: null as number | null,
  from: '',
  to: '',
  contains: '',
});


// Import/Export
const importUrl = ref("");
const importStatus = ref("");
const importError = ref(false);
const lastImportSummary = ref("");
const SHARE_URL_SAFE_LIMIT = 2000;

// ===== EXPORT/SHARE STATE (Phase 1-5) =====
const exportModalOpen = ref(false);
const exportFormat = ref<'json' | 'csv' | 'qif'>('json');
const exportFilenamePrefix = ref('financial-export');
const exportProgress = ref(0);
const exportInProgress = ref(false);
// Optional password protection for the exported file.
const protectExport = ref(false);
const exportPassword = ref('');

// Share code state
const shareCodeModalOpen = ref(false);
const shareBatchCount = ref(0);
const shareBatchIndex = ref(0);
const shareCodes = ref<string[]>([]);

// Encryption state (Phase 3)
const encryptedShareModalOpen = ref(false);
const sharePassword = ref("");
const shareConfirmPassword = ref("");
const encryptShareData = ref(false);

// Password-prompt state (N3) — replaces window.prompt for encrypted imports.
// When an `enc:` code is detected we stash the raw code + import context here,
// open the modal, and finish the import once the user submits a password.
const passwordPromptOpen = ref(false);
const pendingEncryptedCode = ref("");
const pendingImportContext = ref("Share Import");

// Encrypted-file import state — when the user picks a `.enc` export we stash
// the raw bytes + filename here, open the password prompt, and finish the
// import once a password is submitted (see `finishEncryptedImport`).
const pendingEncryptedFile = ref<{ bytes: Uint8Array; filename: string } | null>(null);

// The password prompt is shared by two flows (share-code and encrypted-file).
// These computed props let the single modal render the right copy per flow.
const passwordPromptTitle = computed(() =>
  pendingEncryptedFile.value ? "Decrypt Encrypted Export" : "Decrypt Share Code"
);
const passwordPromptInfo = computed(() =>
  pendingEncryptedFile.value
    ? "This file is password-protected. The password is only used to decrypt it locally in your browser and is never stored or sent anywhere."
    : undefined
);

// ===== M1: master-password lock screen (encrypt ledger at rest) =====
// `storeMode` drives which screen renders:
//   "choose"  → first run, no master password yet (offer one, or skip)
//   "setup"   → user chose to set a password (enter + confirm)
//   "unlock"  → returning user, store is encrypted (enter password)
//   "ready"   → unlocked (or plaintext), app is usable
//   "insecure"→ Web Crypto unavailable; run in plaintext with a warning
const storeMode = ref<"choose" | "setup" | "unlock" | "ready" | "insecure">("choose");
const masterPassword = ref("");
const confirmMasterPassword = ref("");
const storeError = ref("");
const storeBusy = ref(false);

// True when password protection is on (a master password has been set). Drives
// the lock button and the Security settings section. Kept as a ref (not a
// computed) because it reflects localStorage state, which isn't reactive — we
// update it explicitly at every point where protection changes.
const passwordProtectionEnabled = ref(false);

// Stay-unlocked preference. "session" auto-unlocks only for this tab
// (cleared on tab close or inactivity); "device" auto-unlocks persistently.
// The security tradeoff is surfaced in the UI (unlock screen + About → Security).
const stayUnlockedMode = ref<StayUnlockedMode>(getStayUnlockedMode());

async function onStayUnlockedModeChange(mode: StayUnlockedMode) {
  stayUnlockedMode.value = mode;
  setStayUnlockedMode(mode);
  // If we're already unlocked and the user just enabled a stay-unlocked mode,
  // persist the in-memory key so the next load can auto-unlock.
  if (mode !== "off" && storeMode.value === "ready") {
    await exportSessionKey();
  }
}

// Keep the inactivity watch running exactly while "session" mode is active
// and the store is unlocked; tearing it down otherwise (lock, mode change,
// protection turned off) also clears its bookkeeping.
watch([storeMode, stayUnlockedMode], ([mode, stayMode]) => {
  if (mode === "ready" && stayMode === "session") {
    startInactivityWatch(handleInactivityTimeout);
  } else {
    stopInactivityWatch();
  }
});

function handleInactivityTimeout() {
  clearSessionKey();
  handleLock();
}

// ===== Onboarding + first-run password choice ordering =====
// On first run the app opens in plaintext, onboarding shows first, and the
// "Protect your data?" choice is deferred until onboarding finishes. The
// choice is persisted so it's only ever asked once.
const pendingPasswordChoice = ref(false);

function afterOnboarding() {
  localStorage.setItem("hasSeenOnboarding", "true");
  if (pendingPasswordChoice.value && storeMode.value === "ready") {
    pendingPasswordChoice.value = false;
    storeMode.value = "choose";
  }
}

async function handleContinueWithoutPassword() {
  // First-run choice: skip password protection. Data stays in plaintext
  // (no master-password metadata is created), and the user can enable
  // protection later from Settings. Persist the choice so we don't re-ask.
  storeError.value = "";
  localStorage.setItem(LS_KEYS.passwordChoice, "declined");
  pendingPasswordChoice.value = false;
  await loadSensitiveData();
  storeMode.value = "ready";
}

async function handleSetMasterPassword() {
  if (masterPassword.value.length < 4) {
    storeError.value = "Password must be at least 4 characters";
    return;
  }
  if (masterPassword.value !== confirmMasterPassword.value) {
    storeError.value = "Passwords do not match";
    return;
  }
  storeBusy.value = true;
  storeError.value = "";
  try {
    await setupMasterPassword(masterPassword.value);
    // Encrypt any legacy plaintext data that was already stored.
    await migratePlaintextToEncrypted();
    masterPassword.value = "";
    confirmMasterPassword.value = "";
    localStorage.setItem(LS_KEYS.passwordChoice, "set");
    pendingPasswordChoice.value = false;
    await loadSensitiveData();
    storeMode.value = "ready";
    passwordProtectionEnabled.value = true;
    pushToast("Master password set — your data is now encrypted", "success");
  } catch (e) {
    devError("Failed to set master password:", e);
    storeError.value = e instanceof Error ? e.message : "Failed to set password";
  } finally {
    storeBusy.value = false;
  }
}

async function handleUnlock() {
  if (!masterPassword.value) {
    storeError.value = "Enter your password";
    return;
  }
  storeBusy.value = true;
  storeError.value = "";
  try {
    await unlockSecureStore(masterPassword.value);
    masterPassword.value = "";
    await loadSensitiveData();
    storeMode.value = "ready";
  } catch (e) {
    devError("Unlock failed:", e);
    storeError.value = e instanceof Error ? e.message : "Incorrect password";
  } finally {
    storeBusy.value = false;
  }
}

function handleLock() {
  lockSecureStore();
  // Clear in-memory decrypted data so a wrong-password unlock can't reveal it.
  transactions.value = [];
  customCategories.value = [];
  tags.value = [];
  recentCategories.value = [];
  masterPassword.value = "";
  storeError.value = "";
  storeMode.value = "unlock";
}

// ===== M1: toggle password protection from Settings (About → Security) =====
const securityBusy = ref(false);
const protectionPromptOpen = ref(false);

async function handleToggleProtection() {
  if (securityBusy.value) return;
  if (passwordProtectionEnabled.value) {
    // Turning OFF: decrypt back to plaintext, remove the master password.
    securityBusy.value = true;
    try {
      await disablePasswordProtection();
      passwordProtectionEnabled.value = false;
      localStorage.setItem(LS_KEYS.passwordChoice, "declined");
      pushToast("Password protection turned off — data is now stored in plaintext", "info");
    } catch (e) {
      devError("Toggle protection failed:", e);
      pushToast(e instanceof Error ? e.message : "Failed to change protection", "error");
    } finally {
      securityBusy.value = false;
    }
  } else {
    // Turning ON: ask for a new master password via the (reusable) prompt modal.
    protectionPromptOpen.value = true;
  }
}

async function handleProtectionPromptSubmit(password: string) {
  protectionPromptOpen.value = false;
  if (password.length < 4) {
    pushToast("Password must be at least 4 characters", "error");
    return;
  }
  securityBusy.value = true;
  try {
    await enablePasswordProtection(password);
    passwordProtectionEnabled.value = true;
    pushToast("Password protection turned on — your data is now encrypted", "success");
  } catch (e) {
    devError("Enable protection failed:", e);
    pushToast(e instanceof Error ? e.message : "Failed to enable protection", "error");
  } finally {
    securityBusy.value = false;
  }
}

// Expiration state (Phase 4)
const shareExpirationDays = ref<number>(30);
const shareExpirationOptions = [
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
  { value: 0, label: 'No expiration' },
];

// Constants
const MAX_SHARE_TX = 800;
const MAX_SHARE_BATCHES = 10;
// Guards against decoding huge/hostile share payloads (DoS via giant base64 blobs)
const MAX_SHARE_DECODED_CHARS = 20_000_000; // ~20MB of decoded JSON text
const MAX_SHARE_IMPORT_TX = MAX_SHARE_TX * MAX_SHARE_BATCHES;

// ========= page UX helpers (focus  scroll) =========
// The add-form section + amount input live in AddTransactionForm.vue and are
// reached through its exposed instance refs.
const tagInputElRef = ref<HTMLInputElement | null>(null);

function scrollAddIntoView() {
  nextTick(() => {
    addFormRef.value?.addSectionRef?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
function focusAmount() {
  nextTick(() => addFormRef.value?.amountInputRef?.focus());
}
function focusTags() {
  nextTick(() => tagInputElRef.value?.focus());
}



// Theme dropdown control
// ---------- Category & Tags state ----------
// Bind UI directly to the transaction being edited
const currentCategory = computed<string>({
  get() {
    return newTransaction.category || "";
  },
  set(v) {
    newTransaction.category = v || "";
    if (v) rememberCategory(v);
  },
});

const selectedTags = computed<string[]>({
  get() {
    return Array.isArray(newTransaction.tags) ? newTransaction.tags : [];
  },
  set(v) {
    newTransaction.tags = sortAlpha(dedupeCI(v));
  },
});

// existsCategory stays in the parent: it is used by createCategoryAndSelect
// (the create-category intent handler). The category combobox open/search state
// and filteredCategories now live in AddTransactionForm.vue.
function existsCategory(name: string) {
  const n = norm(name);
  return allCategories.value.some((c) => norm(c) === n);
}

// The tags combobox open/search state + filteredTags now live in
// AddTransactionForm.vue (they only drove that region's UI).

// Manager edits customCategories (not defaults) and global tags.
// managerType drives managerItems + all mutation logic; managerSearch is a
// v-model backing so managerItems recomputes as the user types. The dialog
// element, the add-new/rename inputs and the rename state live in the child.
type ManagerType = "category" | "tag";
const managerType = ref<ManagerType>("category");
const managerSearch = ref("");

function getListRef() {
  return managerType.value === "category" ? customCategories : tags;
}
function existsInManager(name: string) {
  const n = norm(name);
  return getListRef().value.some((x) => norm(x) === n);
}
function addToList(name: string) {
  const listRef = getListRef();
  if (!existsInManager(name)) {
    listRef.value = sortAlpha(dedupeCI([...listRef.value, name.trim()]));
    safeLocalStorageSet(LS_KEYS.cats, customCategories.value);
    safeLocalStorageSet(LS_KEYS.tags, tags.value);
  }
}
function removeFromList(name: string) {
  const listRef = getListRef();
  const n = norm(name);
  listRef.value = listRef.value.filter((x) => norm(x) !== n);

  if (managerType.value === "category") {
    // If current selection shows the removed category, clear it
    if (eqi(currentCategory.value || "", name)) currentCategory.value = "";
    // Reassign existing transactions to a safe default
    transactions.value = transactions.value.map((t) =>
      eqi(t.category, name) ? { ...t, category: "Uncategorized" } : t
    );
  } else {
    // Remove tag from any selected chips
    selectedTags.value = selectedTags.value.filter((t) => !eqi(t, name));
    // Strip the tag from all transactions
    transactions.value = transactions.value.map((t) => ({
      ...t,
      tags: t.tags.filter((tt) => !eqi(tt, name)),
    }));
  }

  safeLocalStorageSet(LS_KEYS.cats, customCategories.value);
  safeLocalStorageSet(LS_KEYS.tags, tags.value);
  pushToast(`Deleted ${managerType.value} “${name}”`, "success");
}

watch(showAdvancedTransactionsView, (v) => {
  localStorage.setItem(LS_KEYS.view, String(v));
});

// Persist lists if not already elsewhere
watch(customCategories, (v) => safeLocalStorageSet(LS_KEYS.cats, v), {
  deep: true,
});
watch(tags, (v) => safeLocalStorageSet(LS_KEYS.tags, v), { deep: true });

// Filtered manager items (case-insensitive, prefix weighted)
// OPTIMIZED: Use cached category set to avoid iterating all transactions on every keystroke
let _categorySet = new Set<string>();
// _categorySet is a plain Set, invisible to Vue's reactivity system. This ref
// is what actually invalidates `managerItems` — see the read in that computed.
const _categorySetVersion = ref(0);

function rebuildCategorySet() {
  _categorySetVersion.value++;
  _categorySet.clear();
  categoryNames.forEach((c) => _categorySet.add(c));
  customCategories.value.forEach((c) => _categorySet.add(c));
  // Only iterate transactions when they change, not on every search keystroke
  const tx = transactions.value;
  for (let i = 0; i < tx.length; i++) {
    _categorySet.add(tx[i].category);
  }
}

// Watch transactions to rebuild category set only when needed
watch(transactions, () => {
  rebuildCategorySet();
});

// Custom categories can be created/deleted/renamed outside a transaction
// change (combobox "create new", Manager modal add/delete) — without this,
// categorySet/_categorySet only ever refreshed on transaction mutations,
// so a brand-new category was invisible in both the Add Transaction dropdown
// and the Manager modal (and a deleted one lingered as a ghost entry) until
// the next transaction happened to touch it or the page reloaded.
watch(
  customCategories,
  () => {
    categorySet.clear();
    categoryNames.forEach((c) => categorySet.add(c));
    customCategories.value.forEach((c) => categorySet.add(c));
    extractCategoriesFromTransactions();
    rebuildCategorySet();
  },
  { deep: true }
);

// Initial build
rebuildCategorySet();

const managerItems = computed<string[]>(() => {
  _categorySetVersion.value; // reactive dependency — see rebuildCategorySet
  // Build the source list from cached set
  let src: string[];
  if (managerType.value === "category") {
    // NOTE: We intentionally do NOT filter out hidden categories here
    // so users can search and restore them from the manager.
    src = Array.from(_categorySet);
  } else {
    src = getListRef().value.slice();
  }

  const q = norm(managerSearch.value);
  if (!q) {
    return src.filter((x) => norm(x)).sort((a, b) => a.localeCompare(b));
  }

  // Prefix hits first, then general includes
  return src
    .filter((x) => norm(x).includes(q))
    .sort((a, b) => {
      const A = norm(a);
      const B = norm(b);
      const ap = A.startsWith(q) ? 0 : 1;
      const bp = B.startsWith(q) ? 0 : 1;
      return ap - bp || A.localeCompare(B);
    });
});

const labelImportFilteredTags = computed(() => {
  const q = norm(labelImport.tagsQuery);
  const list = sortAlpha(dedupeCI(tags.value));
  if (!q) return list;
  return list.filter((t) => norm(t).includes(q));
});

// The Manager modal's windowed-list virtualization (viewport ref, scroll/RAF
// plumbing, resize + visualViewport listeners, and their cleanup) now lives in
// AddTransactionForm.vue so the child cancels its own RAF on unmount.


// ---------- Global click-outside / Esc handling for ALL dropdowns ----------
// Shared with TransactionsSection (@close-closest-details). The Add form keeps
// its own copy for its own dropdowns.
function closeClosestDetails(e: Event) {
  const el = (e.target as HTMLElement)?.closest(
    "details[open]"
  ) as HTMLDetailsElement | null;
  el?.removeAttribute("open");
}

function onDocClick(ev: MouseEvent) {
  // Close any open dropdown if click happens outside it
  const target = ev.target as Node;
  // Close any open <details.dropdown> that wasn't clicked inside
  document
    .querySelectorAll<HTMLDetailsElement>("details.dropdown[open]")
    .forEach((d) => {
      if (!d.contains(target)) d.removeAttribute("open");
    });
}

function onDocKeydown(ev: KeyboardEvent) {
  if (ev.key !== "Escape") return;
  document
    .querySelectorAll<HTMLDetailsElement>("details[open]")
    .forEach((d) => d.removeAttribute("open"));
}

onMounted(() => {
  document.addEventListener("click", onDocClick, true);
  document.addEventListener("keydown", onDocKeydown);
});

onUnmounted(() => {
  document.removeEventListener("click", onDocClick, true);
  document.removeEventListener("keydown", onDocKeydown);
});

// ========== COMPUTED PROPERTIES ==========
const tabs = computed(() => {
  const allTabs = [
    { id: "import", label: "Import", icon: "📥" },
    { id: "add", label: "Add", icon: "➕" },
    { id: "chart", label: "Chart", icon: "📊" },
    { id: "transactions", label: "Transactions", icon: "📋" },
    { id: "about", label: "About", icon: "ℹ️" },
  ];
  return allTabs.filter(
    (tab) => tab.id !== "chart" || transactions.value.length > 0
  );
});

// const defaultCategories = computed(() => sortAlpha(dedupeCI(categoryNames)));
// const allCategories = computed(() =>
//   sortAlpha(dedupeCI([...defaultCategories.value, ...customCategories.value]))
// );

// OPTIMIZED: Use pre-computed categorySet instead of re-extracting from all transactions
const categories = computed(() => {
  categorySetVersion.value; // reactive dependency — see touchCategorySet
  return Array.from(categorySet)
    .filter((c) => !isHiddenCategory(c))
    .sort((a, b) => a.localeCompare(b));
});

const trimmedQuery = computed(() => norm(query.value));
const filteredAllCategories = computed(() => {
  const q = trimmedQuery.value.toLowerCase();
  if (!q) return allCategories.value;
  return allCategories.value.filter((c) => c.toLowerCase().includes(q));
});
const showCreateOption = computed(() => {
  const q = trimmedQuery.value;
  return q.length > 0 && !containsCaseIns(allCategories.value, q);
});
const optionId = (i: number) => `${ids.listbox}-opt-${i}`;
const activeId = computed(() => optionId(activeIndex.value));

const tagSuggestionsForInput = computed(() => {
  const q = norm(tagInput.value).toLowerCase();
  const pool = tags.value.filter((t) => !newTransaction.tags.includes(t));
  if (!q) return pool.slice(0, 8);
  return pool.filter((t) => t.toLowerCase().includes(q)).slice(0, 8);
});

const derivedEndDateISO = computed(() => {
  if (!newTransaction.recurring) return "";
  const start = newTransaction.date;
  const freq = newTransaction.frequency || "monthly";
  const recs = Number(newTransaction.recursions || 1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || recs < 1) return "";
  return computeRecurringEndDate(start, freq, recs);
});

// === Performance Optimizations for 100k+ transactions ===
// Debounced search query to avoid full filter+sort on every keystroke
const debouncedSearchQuery = ref(searchQuery.value);
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(searchQuery, (newVal) => {
  currentPage.value = 1;
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  if (newVal === '') {
    // Immediate clear for empty search (good UX)
    debouncedSearchQuery.value = newVal;
    searchDebounceTimer = null;
  } else {
    searchDebounceTimer = setTimeout(() => {
      debouncedSearchQuery.value = newVal;
      searchDebounceTimer = null;
    }, 150);
  }
});

// Memoized query parser - only re-parse when debounced query changes
let lastParsedQueryRaw = null as string | null;
let lastParsedQuery: ParsedQuery | null = null;

function getCachedParsedQuery(raw: string): ParsedQuery {
  if (raw !== lastParsedQueryRaw) {
    lastParsedQueryRaw = raw;
    lastParsedQuery = parseSmartQuery(raw);
  }
  return lastParsedQuery!;
}

// Transaction filtering and selection
// Base = smart search only (NO chart date filter here)
const baseFilteredBySearch = computed(() => {
  const q = debouncedSearchQuery.value;
  if (!q) return transactions.value; // short-circuit: no filter when query is empty
  const f = getCachedParsedQuery(q);
  return transactions.value.filter((t) => txMatches(t, f));
});

watch(
  [debouncedSearchQuery, typeFilter, () => sortField.value, () => sortOrder.value],
  () => {
    currentPage.value = 1;
  }
);

// Table view uses ONLY smart search (+ optional typeFilter), NOT the chart's date range
// CRITICAL OPTIMIZATION: Partial sort for 100k+ transactions
// Instead of sorting ALL indices O(n log n), we use a two-phase approach:
// Phase 1: Build unsorted indices (O(n))
// Phase 2: Sort only the window needed for current page O(w log w) where w ~ 40
// This makes filter changes instant even with 100k+ transactions
const filteredTransactionIndices = computed(() => {
  if (activeTab.value !== 'transactions') return [];
  const list = baseFilteredBySearch.value;
  const type = typeFilter.value;
  const field = sortField.value;
  const order = sortOrder.value === "asc" ? 1 : -1;

  // Build indices of matching transactions (avoids array copy)
  const indices: number[] = [];
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (type && t.type !== type) continue;
    indices.push(i);
  }

  const baseCmp = buildTxComparator(list, field, order);

  // PARTIAL SORT: For large datasets, only sort the page window
  // For small datasets (< 5000), full sort is faster due to lower overhead
  const threshold = 5000;
  if (indices.length > threshold) {
    const offset = (currentPage.value - 1) * itemsPerPage;
    const end = Math.min(offset + itemsPerPage + 20, indices.length);

    // Quickselect: partition so [lo, hi) contains the correct elements
    if (end < indices.length) {
      quickSelectRange(indices, baseCmp, 0, indices.length - 1, offset, end);
    }

    // In-place heapsort only the window [offset, end)
    heapSortRange(indices, baseCmp, offset, end);
  } else {
    // FAST SORT: Direct string comparison for small datasets
    indices.sort(baseCmp);
  }

  return indices;
});

// Build comparator for transaction indices (avoids closure recreation)
function buildTxComparator(
  list: Transaction[],
  field: 'date' | 'type' | 'amount' | 'category' | 'description',
  order: number
): (ai: number, bi: number) => number {
  return (ai: number, bi: number) => {
    const a = list[ai];
    const b = list[bi];
    if (field === "amount") {
      return ((a.amount || 0) - (b.amount || 0)) * order;
    }
    const av = String(a[field] ?? "");
    const bv = String(b[field] ?? "");
    return (av < bv ? -1 : av > bv ? 1 : 0) * order;
  };
}

// Quickselect to partition array so elements in [lo, hi) are the correct ones
// Elements outside [lo, hi) are not guaranteed to be sorted
function quickSelectRange(
  arr: number[],
  cmp: (a: number, b: number) => number,
  left: number,
  right: number,
  lo: number,
  hi: number
) {
  if (left >= right) return;

  // Median-of-3 pivot selection for better worst-case
  const mid = left + ((right - left) >> 1);
  if (cmp(arr[left], arr[mid]) > 0) [arr[left], arr[mid]] = [arr[mid], arr[left]];
  if (cmp(arr[left], arr[right]) > 0) [arr[left], arr[right]] = [arr[right], arr[left]];
  if (cmp(arr[mid], arr[right]) > 0) [arr[mid], arr[right]] = [arr[right], arr[mid]];
  [arr[mid], arr[right]] = [arr[right], arr[mid]];

  const pivot = arr[right];
  let storeIndex = left;
  for (let i = left; i < right; i++) {
    if (cmp(arr[i], pivot) < 0) {
      [arr[storeIndex], arr[i]] = [arr[i], arr[storeIndex]];
      storeIndex++;
    }
  }
  [arr[storeIndex], arr[right]] = [arr[right], arr[storeIndex]];

  if (storeIndex > lo) {
    quickSelectRange(arr, cmp, left, storeIndex - 1, lo, hi);
  }
  if (storeIndex < hi - 1) {
    quickSelectRange(arr, cmp, storeIndex + 1, right, lo, hi);
  }
}

// In-place heapsort for range [lo, hi)
function heapSortRange(
  arr: number[],
  cmp: (a: number, b: number) => number,
  lo: number,
  hi: number
) {
  const n = hi - lo;
  // Build max heap
  for (let i = (n >> 1) - 1; i >= 0; i--) {
    heapify(arr, lo, n, i, cmp);
  }
  // Extract elements one by one
  for (let i = n - 1; i > 0; i--) {
    [arr[lo], arr[lo + i]] = [arr[lo + i], arr[lo]];
    heapify(arr, lo, i, 0, cmp);
  }
}

function heapify(
  arr: number[],
  offset: number,
  heapSize: number,
  root: number,
  cmp: (a: number, b: number) => number
) {
  let largest = root;
  const left = (root << 1) + 1;
  const right = (root << 1) + 2;

  if (left < heapSize && cmp(arr[offset + left], arr[offset + largest]) > 0) {
    largest = left;
  }
  if (right < heapSize && cmp(arr[offset + right], arr[offset + largest]) > 0) {
    largest = right;
  }

  if (largest !== root) {
    [arr[offset + root], arr[offset + largest]] = [arr[offset + largest], arr[offset + root]];
    heapify(arr, offset, heapSize, largest, cmp);
  }
}

// OPTIMIZED: Get sorted count without materializing full array
const filteredTransactionsCount = computed(() => filteredTransactionIndices.value.length);

// Paginated view - only sorts/materializes the current page
const paginatedTransactions = computed(() => {
  const indices = filteredTransactionIndices.value;
  const offset = (currentPage.value - 1) * itemsPerPage;
  const end = offset + itemsPerPage;

  // Slice the indices we need, then map to actual transactions
  const pageIndices = indices.slice(offset, end);
  const list: Transaction[] = new Array(pageIndices.length);
  for (let i = 0; i < pageIndices.length; i++) {
    list[i] = baseFilteredBySearch.value[pageIndices[i]];
  }

  // Per-page selected-first prioritization: within the current page,
  // selected transactions bubble to the top so the user always sees them
  // regardless of which page they're on.
  if (prioritizeSelected.value && selectedIds.value.size > 0) {
    const sel = selectedIds.value;
    list.sort((a, b) => {
      const pa = sel.has(a.id) ? 0 : 1;
      const pb = sel.has(b.id) ? 0 : 1;
      return pa - pb;
    });
  }

  return list;
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredTransactionsCount.value / itemsPerPage))
);

// Legacy compatibility alias (unfiltered count for template bindings)
const filteredTransactions = computed(() => baseFilteredBySearch.value);


// Active amount filter display helper
const activeAmountFilter = computed(() => {
  const f = parseSmartQuery(searchQuery.value);
  if (f.amount !== undefined) return `amount:$${f.amount.toFixed(2)}`;
  if (f.min !== undefined || f.max !== undefined) {
    const parts: string[] = [];
    if (f.min !== undefined) parts.push(`≥$${f.min.toFixed(2)}`);
    if (f.max !== undefined) parts.push(`≤$${f.max.toFixed(2)}`);
    return parts.join(" ");
  }
  return "";
});


// REMOVED: Duplicate declarations of totalPages/pageOffset/paginatedTransactions
// Now using optimized versions defined earlier that sort only current page

const selectedCount = computed(() => selectedIds.value.size);
const selectedTransactions = computed(() =>
  transactions.value.filter((t) => selectedIds.value.has(t.id))
);
const someSelectedOnPage = computed(() =>
  paginatedTransactions.value.some((t) => selectedIds.value.has(t.id))
);
const allSelected = computed(
  () =>
    paginatedTransactions.value.length > 0 &&
    paginatedTransactions.value.every((t) => selectedIds.value.has(t.id))
);

// Statistics: netBalance always computed from ALL transactions (so navbar badge is accurate on every tab)
// Chart-specific stats use chartFilteredTransactions when on chart tab
// OPTIMIZED: Single-pass computation - one O(n) scan instead of two separate filter+reduce passes
function getTotals(): { income: number; expenses: number } {
  const tx = transactions.value;
  let income = 0;
  let expenses = 0;
  for (let i = 0; i < tx.length; i++) {
    const t = tx[i];
    if (t.type === "income") income += t.amount;
    else if (t.type === "spending") expenses += t.amount;
  }
  return { income, expenses };
}
const totalIncome = computed(() => getTotals().income);
const totalExpenses = computed(() => getTotals().expenses);
const netBalance = computed(() => totalIncome.value - totalExpenses.value);

// Pre-format balance string to avoid .toLocaleString() in template on every render
// This moves the expensive formatting into the computed cache layer
const netBalanceFormatted = computed(() => {
  const nb = netBalance.value;
  const abs = Math.abs(nb);
  return {
    sign: nb < 0 ? '-$' : '$',
    value: abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ariaLabel: nb >= 0
      ? `Balance: $${abs.toFixed(2)}`
      : `Balance: negative $${abs.toFixed(2)}`,
  };
});





// Do NOT auto-select tags — leave them empty so category filtering works correctly



// async function renderChart() {
//   if (!chartCanvas.value || chartData.value.labels.length === 0) return;
//   if (chartInstance) chartInstance.destroy();

//   const data = JSON.parse(JSON.stringify(chartData.value));

//   chartInstance = new Chart(chartCanvas.value.getContext('2d')!, {
//     type: chartConfig.value.type as any,
//     data,
//     options: {
//       responsive: true,
//       maintainAspectRatio: false,
//       animation: {
//         duration: 800,
//         easing: 'easeOutQuart',
//       },
//       plugins: {
//         legend: {
//           position: 'top',
//           labels: {
//             usePointStyle: true,
//             padding: 15,
//             font: { size: 12, weight: 'bold' },
//           },
//         },
//         title: {
//           display: true,
//           text: 'Financial Analytics',
//           font: { size: 16, weight: 'bold' },
//           padding: { bottom: 20 },
//         },
//         tooltip: {
//           backgroundColor: 'rgba(0, 0, 0, 0.8)',
//           titleFont: { size: 14, weight: 'bold' },
//           bodyFont: { size: 13 },
//           padding: 12,
//           cornerRadius: 8,
//           callbacks: {
//             label: (ctx: any) => `${ctx.dataset.label}: $${Number(ctx.parsed?.y ?? ctx.parsed).toFixed(2)}`,
//           },
//         },
//       },
//       scales: chartConfig.value.type === 'pie' || chartConfig.value.type === 'doughnut' ? {} : {
//         y: {
//           beginAtZero: true,
//           grid: { color: 'rgba(0, 0, 0, 0.1)' },
//           ticks: {
//             callback: (v: any) => '$' + Number(v).toFixed(0),
//             font: { size: 11 },
//           },
//         },
//         x: {
//           grid: { display: false },
//           ticks: { font: { size: 11 } },
//         },
//       },
//       interaction: {
//         intersect: false,
//         mode: 'index',
//       },
//     },
//   });
// }

// // Watch for chart updates
// watch([chartData, () => chartConfig.value.type, () => chartConfig.value.groupBy], () => {
//   if (activeTab.value === 'chart') {
//     nextTick(() => renderChart());
//   }
// }, { deep: true });

// watch(() => activeTab.value, (tab) => {
//   if (tab === 'chart') {
//     ensureAllCatsSelected();
//     nextTick(() => renderChart());
//   }
// });
// --- DaisyUI → Chart.js color helpers (moved above chart section) ---
// type Token =
//   | "primary"
//   | "primaryContent"
//   | "secondary"
//   | "secondaryContent"
//   | "accent"
//   | "accentContent"
//   | "neutral"
//   | "neutralContent"
//   | "base1"
//   | "base2"
//   | "base3"
//   | "baseContent"
//   | "info"
//   | "success"
//   | "warning"
//   | "error";

// const TOKEN_VAR: Record<Token, string> = {
//   primary: "--p",
//   primaryContent: "--pc",
//   secondary: "--s",
//   secondaryContent: "--sc",
//   accent: "--a",
//   accentContent: "--ac",
//   neutral: "--n",
//   neutralContent: "--nc",
//   base1: "--b1",
//   base2: "--b2",
//   base3: "--b3",
//   baseContent: "--bc",
//   info: "--in",
//   success: "--su",
//   warning: "--wa",
//   error: "--er",
// };

// // tiny singleton probe → resolves any CSS color (oklch/hsl/hex) to computed rgb(a)
// let _probeEl: HTMLSpanElement | null = null;
// function cssVarToRGB(varName: string): string {
//   if (!_probeEl) {
//     _probeEl = document.createElement("span");
//     _probeEl.style.position = "absolute";
//     _probeEl.style.left = "-9999px";
//     _probeEl.style.top = "-9999px";
//     _probeEl.style.pointerEvents = "none";
//     _probeEl.style.opacity = "0";
//     document.body.appendChild(_probeEl);
//   }
//   _probeEl.style.backgroundColor = `var(${varName})`;
//   return getComputedStyle(_probeEl).backgroundColor || "rgb(0,0,0)";
// }

// function withAlpha(rgbOrRgba: string, alpha = 1): string {
//   const m = rgbOrRgba.match(
//     /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i
//   );
//   if (!m) return rgbOrRgba;
//   const r = +m[1],
//     g = +m[2],
//     b = +m[3];
//   return `rgba(${r}, ${g}, ${b}, ${alpha})`;
// }

// function themeColor(token: Token, alpha = 1): string {
//   return withAlpha(cssVarToRGB(TOKEN_VAR[token]), alpha);
// }

// function themePalette(n: number): string[] {
//   const seeds: Token[] = [
//     "primary",
//     "secondary",
//     "accent",
//     "info",
//     "success",
//     "warning",
//     "error",
//     "neutral",
//   ];
//   const out: string[] = [];
//   for (let i = 0; i < n; i++)
//     out.push(themeColor(seeds[i % seeds.length], 0.85));
//   return out;
// }


// const chartInstance = shallowRef<Chart | null>(null);


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

// Compute y-extent across visible datasets for line/bar (supports negatives)

// Import/Export
const shareCode = computed(() => {
  if (transactions.value.length === 0) return "tx:";
  try {
    const data = {
      t: transactions.value,
      v: version.value,
      ts: Date.now(),
    };
    const compressed = jsonToBase64(data);
    return `tx:${compressed}`;
  } catch (e) {
    devError("Failed to generate share code:", e);
    return "tx:";
  }
});

const shareCodeLength = computed(() => shareCode.value.length);
const shareUrl = computed(() => {
  if (!shareCode.value || shareCode.value === "tx:") return "";
  // Use the URL fragment, not a query param: fragments are never sent to the
  // server, so the ledger doesn't end up in proxy/CDN access logs or referrers.
  return `${window.location.origin}${window.location.pathname
    }#tx=${encodeURIComponent(shareCode.value.slice(3))}`;
});
const canWebShare = computed(() => {
  const nav: any = navigator;
  return !!nav?.share || !!nav?.canShare;
});

// ===== Phase 2: Share Code Batching (800 tx limit) =====
async function generateShareCodesWithBatching() {
  const txs = transactions.value;
  if (txs.length === 0) {
    pushToast("No transactions to share", "warning");
    return;
  }

  if (encryptShareData.value && (!sharePassword.value || sharePassword.value !== shareConfirmPassword.value)) {
    pushToast("Enter matching passwords to encrypt, or turn encryption off", "error");
    return;
  }

  const batches: Transaction[][] = [];
  for (let i = 0; i < txs.length; i += MAX_SHARE_TX) {
    batches.push(txs.slice(i, i + MAX_SHARE_TX));
  }

  if (batches.length > MAX_SHARE_BATCHES) {
    pushToast(`Too many transactions! Max ${MAX_SHARE_BATCHES} batches allowed (${MAX_SHARE_BATCHES * MAX_SHARE_TX} tx)`, "error");
    return;
  }

  shareBatchCount.value = batches.length;
  shareBatchIndex.value = 0;
  shareCodes.value = [];

  // Generate share code for each batch
  try {
    for (let i = 0; i < batches.length; i++) {
      let data: any = {
        t: batches[i],
        v: version.value,
        ts: Date.now(),
        batch: `${i + 1}/${batches.length}`,
      };
      if (shareExpirationDays.value > 0) {
        data = addExpirationToShareData(data, shareExpirationDays.value);
      }
      if (encryptShareData.value) {
        const encrypted = await encryptSharePayload(sharePassword.value, data);
        shareCodes.value.push(`enc:${encrypted}`);
      } else {
        shareCodes.value.push(`tx:${jsonToBase64(data)}`);
      }
    }
  } catch (e) {
    devError("Failed to generate share codes:", e);
    pushToast("Failed to generate share codes", "error");
    return;
  }

  encryptedShareModalOpen.value = false;
  sharePassword.value = "";
  shareConfirmPassword.value = "";
  shareCodeModalOpen.value = true;
  pushToast(
    batches.length === 1
      ? "Share code generated!"
      : `Generated ${batches.length} share codes for ${txs.length} transactions`,
    "success"
  );
}



// Date presets
const datePresets = [
  { label: "All Time", start: "", end: "" },
  {
    label: "Last 30d",
    start: toLocalISO(new Date(new Date().setDate(new Date().getDate() - 29))),
    end: todayLocalISO(),
  },
  {
    label: "This Month",
    start: toLocalISO(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    ),
    end: todayLocalISO(),
  },
  {
    label: "This Year",
    start: `${new Date().getFullYear()}-01-01`,
    end: todayLocalISO(),
  },
];

// ========== METHODS ==========


// Tab navigation
// AppHeader/MobileNav are generic nav components (NavTab.id: string); guard
// against anything outside our fixed tab set before narrowing into activeTab.
const VALID_TABS = ["import", "transactions", "chart", "add", "about"] as const;
function onTab(id: string) {
  if (!(VALID_TABS as readonly string[]).includes(id)) return;
  // Remember where we came from when entering the Add tab (for Cancel).
  if (id === "add" && activeTab.value !== "add") previousTab.value = activeTab.value;
  activeTab.value = id as typeof activeTab.value;
  // Scroll to top on tab switch (mobile UX)
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Reset pagination when switching tabs
  currentPage.value = 1;
  // WCAG 2.2: Move focus to the activated panel after tab switch
  setTimeout(() => {
    const panel = document.getElementById(`panel-${id}`);
    if (panel) {
      panel.setAttribute('tabindex', '-1');
      panel.focus();
    }
  }, 100);
}

// Date input handlers
function onAddDateInput(e: Event) {
  // Clear error as user types
  newTxDateError.value = "";

  const input = e.target as HTMLInputElement;
  const oldValue = input.value;

  // Get cursor position BEFORE updating value
  let cursorPos = input.selectionStart ?? oldValue.length;

  // Format the date
  const formattedValue = formatDDMMProgressive(oldValue);

  // Count how many dashes were added before the cursor
  const oldDashesBeforeCursor = (oldValue.slice(0, cursorPos).match(/-/g) || []).length;
  const newDashesBeforeCursor = (formattedValue.slice(0, cursorPos).match(/-/g) || []).length;

  // Adjust cursor position based on dashes added/removed before cursor
  const adjustedCursorPos = cursorPos + (newDashesBeforeCursor - oldDashesBeforeCursor);

  // Update value
  input.value = formattedValue;
  newTxDateText.value = formattedValue;

  // Restore cursor position - use nextTick for reliability
  nextTick(() => {
    if (input === document.activeElement) {
      input.setSelectionRange(adjustedCursorPos, adjustedCursorPos);
    }
  });

  addDateTextRef.value?.setCustomValidity?.("");
}

function onAddDateBlur() {
  const ddmmyyyy = finalizeDDMM(newTxDateText.value);

  if (!ddmmyyyy) {
    // Empty is okay - not required until submit
    newTxDateError.value = "";
    addDateTextRef.value?.setCustomValidity?.("");
    return;
  }

  const iso = ddmmyyyyToISO(ddmmyyyy);
  if (iso) {
    newTxDateText.value = ddmmyyyy;
    newTxDateISO.value = iso;
    newTxDateError.value = "";
    addDateTextRef.value?.setCustomValidity?.("");
  } else {
    newTxDateError.value = "Invalid date. Use dd-mm-yyyy (e.g. 05-01-2025).";
    addDateTextRef.value?.setCustomValidity?.(newTxDateError.value);
    addDateTextRef.value?.reportValidity?.();
  }
}

function onDateKeydownDigitsOnly(e: KeyboardEvent) {
  const ok = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "-"];
  if (ok.includes(e.key)) return;
  if (!/^\d$/.test(e.key)) e.preventDefault();
}

// Helper to scroll input into view when focused (handles mobile keyboard)
// Clear amount error when user types
function clearAmountError() {
  if (amountError.value) {
    amountError.value = "";
  }
}

// =========  Tag Picker =========

// Ref to the Tag Picker modal component (for focus management)
const tagPickerModalRef = ref<{ focusInput: () => void } | null>(null);

// Open picker preselecting current tags
function openTagPicker() {
  tagPicker.q = "";
  tagPicker.visible = 120;
  tagPicker.selected = new Set<string>(newTransaction.tags || []);
  tagPicker.open = true;
  nextTick(() => tagPickerModalRef.value?.focusInput());
}
function closeTagPicker() {
  tagPicker.open = false;
}

// Filtered list  virtualized slice
const filteredTagList = computed<string[]>(() => {
  const q = (tagPicker.q || "").toLowerCase().trim();
  const list = sortAlpha(dedupeCI(tags.value));
  if (!q) return list;
  return list.filter((t) => t.toLowerCase().includes(q));
});
const tagSlice = computed<string[]>(() =>
  filteredTagList.value.slice(0, tagPicker.visible)
);

// Infinite scroll load lives in TagPickerModal.vue now.
watch(
  () => tagPicker.q,
  () => (tagPicker.visible += 120)
);
watch(
  () => tagPicker.open,
  (o) => {
    if (o) tagPicker.visible += 120;
  }
);

// Create from query (adds to global tags  selects it)
function createTagFromQuery() {
  const name = norm(tagPicker.q);
  if (!name) return;
  if (!containsCaseIns(tags.value, name)) {
    tags.value = sortAlpha(dedupeCI([...tags.value, name]));
  }
  // Use canonical form from tags list
  const canonical = tags.value.find((x) => eqi(x, name)) || name;
  tagPicker.selected.add(canonical);
  tagPicker.q = "";
  // keep focus for quick adding multiples
  nextTick(() => tagPickerModalRef.value?.focusInput());
}

// Apply picked tags to the Add form
function applyPickedTags() {
  const chosen = Array.from(tagPicker.selected);
  newTransaction.tags = sortAlpha(dedupeCI(chosen));
  closeTagPicker();
  pushToast(
    `Applied ${chosen.length} tag${chosen.length === 1 ? "" : "s"}`,
    "success"
  );
}

// Tiny UX: if they click "Manage custom" we’ll focus the add field in the modal
watch(showManager, (open) => {
  if (!open) return;
  if (managerMode.value === "add") {
    nextTick(() => {
      const el = document.querySelector<HTMLInputElement>(
        '[data-testid="new-category-input"]'
      );
      el?.focus();
    });
  }
});

// Recurring transaction calculations
function computeRecurringEndDate(
  startISO: string,
  freq: RecurringFrequency,
  recursions: number
): string {
  const n = Math.max(1, Number(recursions || 1));
  if (!startISO || n <= 1) return startISO;
  const steps = n - 1;
  switch (freq) {
    case "daily":
      return addDays(startISO, steps);
    case "weekly":
      return addDays(startISO, steps * 7);
    case "fortnightly":
      return addDays(startISO, steps * 14);
    case "monthly":
      return addMonthsClamped(startISO, steps);
    case "quarterly":
      return addMonthsClamped(startISO, steps * 3);
    case "yearly":
      return addMonthsClamped(startISO, steps * 12);
  }
  return startISO;
}

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

function addDays(iso: string, days: number): string {
  // Parse as local time — new Date("YYYY-MM-DD") is UTC midnight and shifts a
  // day backwards in negative-offset timezones once converted back to local.
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return toLocalISO(dt);
}

// Category combobox functions
function handleInput() {
  open.value = true;
  activeIndex.value = showCreateOption.value ? -1 : 0;
}

function moveActive(dir: 1 | -1) {
  const opts = filteredAllCategories.value.length;
  if (showCreateOption.value) {
    const order = [-1, ...Array.from({ length: opts }, (_, i) => i)];
    const cur = order.indexOf(activeIndex.value);
    const next = (cur + dir + order.length) % order.length;
    activeIndex.value = order[next];
  } else {
    const next = (activeIndex.value + dir + opts) % Math.max(opts, 1);
    activeIndex.value = next;
  }
}

function handleEnter() {
  if (activeIndex.value === -1 && showCreateOption.value) {
    createCustomFromQuery();
    return;
  }
  const choice = filteredAllCategories.value[activeIndex.value];
  if (choice) selectCategory(choice);
  else if (showCreateOption.value) createCustomFromQuery();
}

function closeDropdown() {
  open.value = false;
}

// selectCategory backs the parent-only category combobox (handleEnter /
// createCustomFromQuery). The Add form's combobox has its own selectCategory.
function selectCategory(cat: string) {
  currentCategory.value = cat;
  closeDropdown();
}

function createCustomFromQuery() {
  const name = trimmedQuery.value;
  if (!name) return;
  if (!containsCaseIns(customCategories.value, name)) {
    customCategories.value = sortAlpha(
      dedupeCI([...customCategories.value, name])
    );
  }
  selectCategory(name);
}

function rememberCategory(cat: string) {
  const list = dedupeCI([cat, ...recentCategories.value]).slice(0, 6);
  recentCategories.value = list;
  safeLocalStorageSet(LS_KEYS.recent, list);

  // Also store as last selected category for pre-fill
  safeLocalStorageSet("last-selected-category", cat);
  lastSelectedCategory.value = cat;
}

// Tag functions
function commitTagInput() {
  const bits = (tagInput.value || "")
    .split(/[,\s]/)
    .map((s) => s.trim())
    .filter(Boolean);
  bits.forEach((b) => addTagToTransaction(b));
  tagInput.value = "";
  openTagSuggest.value = false;
}

function addTagToTransaction(name: string) {
  const t = norm(String(name));
  if (!t) return;

  if (!containsCaseIns(tags.value, t)) {
    tags.value = sortAlpha(dedupeCI([...tags.value, t]));
  }

  const canonical = tags.value.find((x) => eqi(x, t)) || t;
  if (!newTransaction.tags.some((x) => eqi(x, canonical))) {
    newTransaction.tags = [...newTransaction.tags, canonical];
  }
}

function removeTagFromTransaction(name: string) {
  newTransaction.tags = newTransaction.tags.filter((t) => !eqi(t, name));
}

// Transaction CRUD operations
function addTransaction() {
  // Clear previous errors
  amountError.value = "";

  // Validate amount
  if (newTransaction.amount <= 0) {
    amountError.value = "Please enter a valid amount greater than 0.";
    addFormRef.value?.amountInputRef?.focus();
    return;
  }

  // Validate category
  if (!newTransaction.category) {
    const categorySummary = addFormRef.value?.categoryDropdownRef?.querySelector('summary');
    (categorySummary as HTMLElement)?.focus();
    return;
  }

  // The form displays today when the date is empty; make the model match so
  // an untouched date field never stores "" (which breaks recurring math).
  if (!newTransaction.date) newTransaction.date = todayLocalISO();

  // Compute end date if recurring is on (so both add  edit paths get it)
  const endISO = newTransaction.recurring
    ? computeRecurringEndDate(
      newTransaction.date,
      newTransaction.frequency || "monthly",
      Math.max(1, Number(newTransaction.recursions || 1))
    )
    : "";

  // ===== Edit path =====
  if (currentlyEditingId.value) {
    const idx = transactions.value.findIndex(
      (t) => t.id === currentlyEditingId.value
    );
    if (idx > -1) {
      const baseTx: Transaction = {
        ...newTransaction,
        id: currentlyEditingId.value, // keep same id for the “first/anchor” item
        endDate: endISO,
        source: newTransaction.source || "Manual",
      };

      // transactions is a shallowRef: in-place splice/index writes are invisible
      // to watchers and the UI, so every update must assign a new array.
      const prior = transactions.value[idx];
      let writtenIds: Set<string>;
      if (newTransaction.recurring) {
        // Expand into a series, replace the edited row, and drop the old
        // series' other occurrences so re-editing never duplicates them.
        const series = generateRecurringTransactions(baseTx);
        // Only rewriting the series ANCHOR replaces the whole series; editing a
        // child into a new series must not silently delete its old siblings.
        const oldSeriesId = prior.recurring ? (prior.seriesId ?? prior.id) : undefined;
        transactions.value = transactions.value.flatMap((t) => {
          if (t.id === prior.id) return series;
          if (oldSeriesId && t.seriesId === oldSeriesId) return [];
          return [t];
        });
        writtenIds = new Set(series.map((s) => s.id));
        pushToast(
          `Updated into ${series.length} recurring transactions`,
          "success"
        );
      } else {
        // Plain edit (non-recurring)
        const next = transactions.value.slice();
        next[idx] = baseTx;
        transactions.value = next;
        writtenIds = new Set([baseTx.id]);
        pushToast("Transaction updated", "success");
      }

      // Opt-in: roll the new category, tags & amount out to whichever
      // matching transactions the user hand-picked from the similar-transactions list.
      if (applyToSimilarIds.value.size > 0) {
        const idsToApply = applyToSimilarIds.value;
        let similarUpdated = 0;
        transactions.value = transactions.value.map((t) => {
          if (writtenIds.has(t.id)) return t;
          if (!idsToApply.has(t.id)) return t;
          similarUpdated++;
          return {
            ...t,
            category: baseTx.category,
            tags: [...baseTx.tags],
            amount: baseTx.amount,
          };
        });
        if (similarUpdated > 0) {
          pushToast(
            `Applied category, tags & amount to ${similarUpdated} selected transaction${similarUpdated === 1 ? "" : "s"
            }`,
            "success"
          );
        }
      }

      // Remember the edited transaction id before resetting
      const editedId = currentlyEditingId.value;

      currentlyEditingId.value = null;
      resetForm();

      // Navigate back to transactions tab and scroll to the edited transaction
      if (editedId) {
        // Find the transaction's position in the filtered+sorted list to calculate the correct page
        const list = baseFilteredBySearch.value;
        const type = typeFilter.value;
        const visible: Transaction[] = [];
        for (const t of list) {
          if (type && t.type !== type) continue;
          visible.push(t);
        }
        // Sort using a direct comparator (buildTxComparator expects indices, not objects)
        const field = sortField.value;
        const order = sortOrder.value === "asc" ? 1 : -1;
        visible.sort((a, b) => {
          if (field === "amount") {
            return ((a.amount || 0) - (b.amount || 0)) * order;
          }
          const av = String((a as any)[field] ?? "");
          const bv = String((b as any)[field] ?? "");
          return (av < bv ? -1 : av > bv ? 1 : 0) * order;
        });
        const targetIndex = visible.findIndex((t) => t.id === editedId);
        if (targetIndex !== -1) {
          currentPage.value = Math.floor(targetIndex / itemsPerPage) + 1;
        }

        activeTab.value = "transactions";
        nextTick(() => {
          nextTick(() => {
            const el = document.getElementById(`tx-${editedId}`);
            if (el) {
              // Scroll inside the virtual viewport, not the window
              const viewport = addFormRef.value?.virtViewportRef;
              if (viewport) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
              }
              // Briefly highlight the updated transaction
              el.classList.add("border-primary", "bg-base-200");
              setTimeout(() => el.classList.remove("border-primary", "bg-base-200"), 2000);
            }
          });
        });
      }
      return;
    }
  }

  // ===== Add path =====
  const baseTx: Transaction = {
    ...newTransaction,
    id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    source: newTransaction.source || "Manual",
    endDate: endISO,
    seriesId: undefined, // never inherit a series link from a previous edit
  };

  if (newTransaction.recurring) {
    const series = generateRecurringTransactions(baseTx);
    transactions.value = [...transactions.value, ...series];
    // OPTIMIZED: Incrementally update category set
    categorySet.add(baseTx.category);
    touchCategorySet();
    pushToast(`Added ${series.length} recurring transactions`, "success");
  } else {
    transactions.value = [...transactions.value, baseTx];
    // OPTIMIZED: Incrementally update category set
    categorySet.add(baseTx.category);
    touchCategorySet();
    pushToast("Transaction added", "success");
  }

  resetForm();
}

function resetForm() {
  // Load current defaults from localStorage
  let lastRecurring = { recurring: false, frequency: 'monthly', recursions: 1 };
  try {
    const raw = safeLocalStorageGet(LS_KEYS.recurringDefaults);
    if (raw && typeof raw === 'object') {
      lastRecurring = {
        recurring: typeof raw.recurring === 'boolean' ? raw.recurring : false,
        frequency: raw.frequency || 'monthly',
        recursions: typeof raw.recursions === 'number' ? raw.recursions : 1
      };
    }
  } catch (e) {
    devWarn('Failed to load recurring defaults for reset:', e);
  }

  Object.assign(newTransaction, {
    id: "",
    date: todayLocalISO(),
    type: "spending",
    amount: 0,
    category: lastSelectedCategory.value || "",
    tags: [],
    description: "",
    recurring: lastRecurring.recurring,
    frequency: lastRecurring.frequency,
    recursions: lastRecurring.recursions,
    endDate: "",
    seriesId: undefined, // clear any series link left over from an edit
  });
  currentlyEditingId.value = null;
  applyToSimilarIds.value = new Set();

  // Clear validation errors
  amountError.value = "";
  newTxDateError.value = "";
}

function cancelAddTransaction() {
  // Warn before discarding a draft the user has started filling in.
  const hasDraft =
    newTransaction.amount > 0 ||
    newTransaction.category ||
    newTransaction.description ||
    newTransaction.tags.length > 0;
  if (hasDraft && !confirm("Discard unsaved changes?")) return;

  resetForm();

  // Return to the tab the user was on before opening Add (fallback: About).
  const target = previousTab.value || "about";
  previousTab.value = null;
  onTab(target);
}

function editTransaction(t: Transaction) {
  // Set the editing id first so the recurring-defaults watcher (flushed after
  // this tick) sees an active edit and skips persisting these loaded values.
  currentlyEditingId.value = t.id;
  applyToSimilarIds.value = new Set();
  // Remember where we came from so Cancel can return there.
  if (activeTab.value !== "add") previousTab.value = activeTab.value;
  // Copy tags — sharing the array would let form edits mutate the original
  // transaction even when the edit is cancelled.
  Object.assign(newTransaction, t, { tags: [...(t.tags ?? [])] });
  activeTab.value = "add";
  scrollAddIntoView();
  focusAmount();

  // Remember category for pre-fill when editing
  if (t.category) rememberCategory(t.category);
}

function deleteTransaction(id: string) {
  if (confirm("Delete this transaction?")) {
    // shallowRef: assign a new array, in-place splice is invisible
    transactions.value = transactions.value.filter((t) => t.id !== id);
    pushToast("Transaction deleted", "success");
  }
}

function duplicateTx(t: Transaction) {
  const copy: Transaction = {
    ...t,
    id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    seriesId: undefined, // a duplicate is independent of the original series
  };
  transactions.value = [...transactions.value, copy];
  // OPTIMIZED: Update category set incrementally
  categorySet.add(copy.category);
  touchCategorySet();
  pushToast("Transaction duplicated", "success");
}

function clearAllTransactions() {
  if (!transactions.value.length) {
    alert("Nothing to remove.");
    return;
  }
  if (
    confirm(
      `Remove ALL ${transactions.value.length} transactions? This cannot be undone.`
    )
  ) {
    transactions.value = [];
    localStorage.removeItem(LS_KEYS.tx); // was a hard-coded string
    // OPTIMIZED: Reset category set on clear
    categorySet.clear();
    categoryNames.forEach((c) => categorySet.add(c));
    customCategories.value.forEach((c) => categorySet.add(c));
    touchCategorySet();
    pushToast("All transactions removed", "success");
  }
}

function generateRecurringTransactions(baseTx: Transaction): Transaction[] {
  const series: Transaction[] = [];
  const n = Math.max(1, Number(baseTx.recursions || 1));

  for (let i = 0; i < n; i++) {
    const occurrenceDate =
      i === 0
        ? baseTx.date
        : calculateNextOccurrenceDate(
          baseTx.date,
          baseTx.frequency || "monthly",
          i
        );

    series.push({
      ...baseTx,
      // the anchor keeps its id (edits must preserve it); children get new ids
      id: i === 0 ? baseTx.id : `${Date.now()}-${Math.floor(Math.random() * 10000)}-${i}`,
      seriesId: baseTx.id,
      date: occurrenceDate,
      // only the first (anchor) item carries recurring meta
      recurring: i === 0 ? baseTx.recurring : false,
      recursions: i === 0 ? baseTx.recursions : 1,
      endDate: i === 0 ? baseTx.endDate : "",
    });
  }

  return series;
}

function calculateNextOccurrenceDate(
  startDate: string,
  frequency: RecurringFrequency,
  occurrenceIndex: number
): string {
  // Use the same clamped, timezone-safe helpers as computeRecurringEndDate so
  // occurrences match the advertised end date (Jan 31 monthly → Feb 28, not Mar 3).
  switch (frequency) {
    case "daily":
      return addDays(startDate, occurrenceIndex);
    case "weekly":
      return addDays(startDate, occurrenceIndex * 7);
    case "fortnightly":
      return addDays(startDate, occurrenceIndex * 14);
    case "monthly":
      return addMonthsClamped(startDate, occurrenceIndex);
    case "quarterly":
      return addMonthsClamped(startDate, occurrenceIndex * 3);
    case "yearly":
      return addMonthsClamped(startDate, occurrenceIndex * 12);
  }
  return startDate;
}

// Transaction selection
function isSelected(id: string): boolean {
  return selectedIds.value.has(id);
}

function toggleSelectRow(id: string) {
  const s = new Set(selectedIds.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  selectedIds.value = s;
}

function clearSelection() {
  selectedIds.value = new Set();
}

function toggleSelectAll() {
  const s = new Set(selectedIds.value);
  if (allSelected.value) {
    for (const t of paginatedTransactions.value) s.delete(t.id);
  } else {
    for (const t of paginatedTransactions.value) s.add(t.id);
  }
  selectedIds.value = s;
}

function selectAllScope(scope: "page" | "all") {
  const s = new Set(selectedIds.value);
  const src =
    scope === "page" ? paginatedTransactions.value : filteredTransactions.value;
  for (const t of src) s.add(t.id);
  selectedIds.value = s;
}

function bulkDelete() {
  if (selectedIds.value.size === 0) return;
  if (!confirm(`Delete ${selectedIds.value.size} selected transaction(s)?`))
    return;
  transactions.value = transactions.value.filter(
    (t) => !selectedIds.value.has(t.id)
  );
  clearSelection();
  pushToast("Selected transactions deleted", "success");
}

// Sorting
// Smart selection
function selectByTypeAndClose(
  type: TransactionType,
  scope: "page" | "all",
  ev?: Event
) {
  const s = new Set(selectedIds.value);
  const src =
    scope === "page" ? paginatedTransactions.value : filteredTransactions.value;
  for (const t of src) if (t.type === type) s.add(t.id);
  selectedIds.value = s;

  if (ev) {
    ev.preventDefault();
    const details = (ev.target as HTMLElement).closest("details");
    if (details) details.removeAttribute("open");
  }
}

function selectLarge() {
  const scopeList = largeSelect.value.pageOnly
    ? paginatedTransactions.value
    : filteredTransactions.value;
  const threshold = Number(largeSelect.value.threshold || 50);

  const s = new Set(selectedIds.value);
  let added = 0;

  for (const t of scopeList) {
    if (t.type === "spending" && t.amount >= threshold) {
      if (!s.has(t.id)) {
        s.add(t.id);
        added++;
      }
    }
  }

  if (!added) {
    alert("No large transactions found for current settings.");
    return;
  }

  selectedIds.value = s;
  prioritizeSelected.value = true;
  pushToast(
    `Selected ${added} transaction${added === 1 ? "" : "s"} ≥ ${currencyFmt(
      threshold
    )}`,
    "success"
  );
}

function applySmartSelect() {
  const s = new Set<string>();
  filteredTransactions.value.forEach((t) => {
    if (smartSelect.value.category && t.category !== smartSelect.value.category)
      return;
    if (smartSelect.value.type && t.type !== smartSelect.value.type) return;
    if (smartSelect.value.min != null && t.amount < smartSelect.value.min)
      return;
    if (smartSelect.value.max != null && t.amount > smartSelect.value.max)
      return;
    if (smartSelect.value.from && t.date < smartSelect.value.from) return;
    if (smartSelect.value.to && t.date > smartSelect.value.to) return;
    if (
      smartSelect.value.contains &&
      !t.description
        .toLowerCase()
        .includes(smartSelect.value.contains.toLowerCase())
    )
      return;
    s.add(t.id);
  });
  selectedIds.value = s;
  openSmartSelect.value = false;
}

function selectSimilar() {
  if (selectedIds.value.size === 0) {
    pushToast("Select at least one transaction first", "info");
    return;
  }

  const firstId = Array.from(selectedIds.value)[0];
  const base = filteredTransactions.value.find((t) => t.id === firstId);
  if (!base) {
    pushToast("No transaction found", "error");
    return;
  }

  const targetDesc = normDesc(base.description);
  const s = new Set(selectedIds.value);
  let added = 0;

  for (const t of filteredTransactions.value) {
    if (normDesc(t.description) === targetDesc) {
      if (!s.has(t.id)) {
        s.add(t.id);
        added++;
      }
    }
  }

  if (!added) {
    pushToast("No similar transactions found", "info");
    return;
  }

  selectedIds.value = s;
  prioritizeSelected.value = true;
  pushToast(
    `Selected ${added} similar transaction${added === 1 ? "" : "s"}`,
    "success"
  );
}


// Bulk edit
const suggestedKeyword = computed(() => {
  // Simplified keyword suggestion
  if (selectedTransactions.value.length === 0) return "";
  const firstTx = selectedTransactions.value[0];
  return firstTx.description.split(" ").find((word) => word.length > 3) || "";
});

function openBulkEdit() {
  if (selectedCount.value === 0) {
    pushToast("Select at least one transaction first", "warning");
    return;
  }
  Object.assign(bulkEdit, {
    category: "",
    type: "" as "" | TransactionType,
    descMode: "none" as DescMode,
    descText: "",
    findText: "",
    replaceWith: "",
    replaceAll: true,
    trimWhitespace: true,
    collapseSpaces: true,
    titleCase: false,
    shiftDays: null,
    saveRule: false,
    ruleKeyword: "",
    addTags: [],
    removeTags: [],
  });
  bulkEdit.open = true;
}

// Union of tags present across the current selection — drives the "Remove
// tags" picker so it only ever offers tags that actually exist to remove.
const selectionTags = computed(() =>
  sortAlpha(dedupeCI(selectedTransactions.value.flatMap((t) => t.tags || [])))
);

function applyBulkEdit() {
  if (selectedCount.value === 0) return;
  const ids = selectedIds.value;
  const shift = Number(bulkEdit.shiftDays || 0);

  transactions.value = transactions.value.map((t) => {
    if (!ids.has(t.id)) return t;

    let desc = t.description || "";

    // Apply description modifications
    if (bulkEdit.descMode === "replace") {
      desc = bulkEdit.descText;
    } else if (bulkEdit.descMode === "prepend" && bulkEdit.descText) {
      desc = bulkEdit.descText + desc;
    } else if (bulkEdit.descMode === "append" && bulkEdit.descText) {
      desc = desc + bulkEdit.descText;
    }

    // Apply find/replace (findText is matched literally, not as a regex)
    if (bulkEdit.findText) {
      const flags = bulkEdit.replaceAll ? "gi" : "i";
      const regex = new RegExp(escapeRegExp(bulkEdit.findText), flags);
      desc = desc.replace(regex, bulkEdit.replaceWith || "");
    }

    // Apply cleanup
    if (bulkEdit.trimWhitespace) desc = desc.trim();
    if (bulkEdit.collapseSpaces) desc = desc.replace(/\s+/g, " ");
    if (bulkEdit.titleCase) {
      desc = desc.replace(/\b\w/g, (l) => l.toUpperCase());
    }

    // Apply date shift
    let date = t.date;
    if (shift) {
      const d = new Date(t.date);
      d.setDate(d.getDate() + shift);
      date = toLocalISO(d);
    }

    // Apply tag add/remove
    let tagList = t.tags || [];
    if (bulkEdit.removeTags.length) {
      tagList = tagList.filter(
        (tg) => !bulkEdit.removeTags.some((r) => eqi(r, tg))
      );
    }
    if (bulkEdit.addTags.length) {
      tagList = sortAlpha(dedupeCI([...tagList, ...bulkEdit.addTags]));
    }

    return {
      ...t,
      category: bulkEdit.category || t.category,
      type: (bulkEdit.type as TransactionType) || t.type,
      description: desc,
      date,
      tags: tagList,
    };
  });

  bulkEdit.open = false;
  pushToast("Bulk changes applied", "success");
}

// Chart functions
// function applyDatePreset(preset: any) {
//   selectedDatePreset.value = preset.label;
//   const today = new Date();
//   switch (preset.type) {
//     case "month":
//       dateFilter.value.start = toLocalISO(
//         new Date(today.getFullYear(), today.getMonth(), 1)
//       );
//       dateFilter.value.end = toLocalISO(
//         new Date(today.getFullYear(), today.getMonth() + 1, 0)
//       );
//       break;
//     case "lastMonth":
//       dateFilter.value.start = toLocalISO(
//         new Date(today.getFullYear(), today.getMonth() - 1, 1)
//       );
//       dateFilter.value.end = toLocalISO(
//         new Date(today.getFullYear(), today.getMonth(), 0)
//       );
//       break;
//     case "year":
//       dateFilter.value.start = toLocalISO(new Date(today.getFullYear(), 0, 1));
//       dateFilter.value.end = toLocalISO(new Date(today.getFullYear(), 11, 31));
//       break;
//     case "lastYear":
//       dateFilter.value.start = toLocalISO(
//         new Date(today.getFullYear() - 1, 0, 1)
//       );
//       dateFilter.value.end = toLocalISO(
//         new Date(today.getFullYear() - 1, 11, 31)
//       );
//       break;
//     case "all":
//       dateFilter.value.start = "";
//       dateFilter.value.end = "";
//       break;
//     default:
//       const start = new Date(today.getTime() - preset.days * 86400000);
//       dateFilter.value.start = toLocalISO(start);
//       dateFilter.value.end = toLocalISO(today);
//   }
// }

// function resetDateFilter() {
//   dateFilter.value = { start: "", end: "" };
//   selectedDatePreset.value = "All Time";
// }

// function formatDateRange() {
//   if (!dateFilter.value.start || !dateFilter.value.end) return "All time";
//   const s = new Date(dateFilter.value.start),
//     e = new Date(dateFilter.value.end);
//   const diff = Math.ceil(Math.abs(e - s) / 86400000);
//   return `${formatDate(dateFilter.value.start)} - ${formatDate(
//     dateFilter.value.end
//   )} (${diff} days)`;
// }


// watch(
//   () => chartConfig.value.groupBy,
//   async () => {
//     if (activeTab.value !== "chart") return;
//     await nextTick();
//     updateChart();
//   }
// );

// watch(
//   () => chartConfig.value.type,
//   async () => {
//     if (activeTab.value !== "chart") return;
//     await nextTick();
//     updateChart();
//   }
// );

// Import/Export functions
async function readFileAsText(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => resolve(String(r.result || ""));
    r.readAsText(file);
  });
}

// Parses raw CSV text into normalized transactions. Shared by the plain-CSV
// upload path and the encrypted-CSV import path so both use identical column
// inference, headerless detection, and amount-convention scanning.
function parseCsvTextToTransactions(text: string, fallbackLabel: string): Transaction[] {
  const rows = parseCSV(text);
  if (!rows.length) return [];

  // ── Headerless CSV detection (BEFORE column inference) ──
  // If the first row looks like data (starts with a digit, has 3+ cols),
  // generate synthetic headers so column inference works
  const firstRow = rows[0];
  const headerLooksLikeData = /^\d/.test((firstRow?.[0] || "").trim()) && firstRow.length >= 3;

  let headers: string[];
  let dataRows: string[][];

  if (headerLooksLikeData) {
    dbg("Headerless CSV detected — generating synthetic headers");
    // Generate synthetic headers based on common bank CSV patterns
    // (date, amount, description, balance is the most common headerless format)
    headers = firstRow.map((_, i) => {
      if (i === 0) return "date";
      if (i === 1) return "amount";
      if (i === 2) return "description";
      if (i === 3) return "balance";
      return `col_${i}`;
    });
    dataRows = rows
      .filter((r) => r.some((c) => c?.trim?.()));
  } else {
    headers = firstRow;
    dataRows = rows
      .slice(1)
      .filter((r) => r.some((c) => c?.trim?.()));
  }

  const cols = inferColumns(headers);

  // ── Scan for amount convention (only for single-amount banks) ──
  if (cols.amount != null && cols.debit == null && cols.credit == null
    && cols.mobileId == null && cols.desktopId == null) {
    cols.amountConvention = scanAmountConvention(dataRows, cols.amount);
    dbg("Amount convention:", cols.amountConvention);
  }

  // Debug summary
  dbgg(`IMPORT: ${fallbackLabel}`);
  dbg("rows total:", rows.length);
  dbg("header:", headers);
  dbg("data sample:", sample(dataRows, 3));
  dbg("column picks (preview):", {
    dateCol: cols.date,
    amountCol: cols.amount,
    debitCol: cols.debit,
    creditCol: cols.credit,
    dirCol: cols.drcr,
    currencyCol: cols.currency,
    descCols: cols.desc,
    dateHeader: headers[cols.date],
    amountHeader: cols.amount != null ? headers[cols.amount] : null,
    dirHeader: cols.drcr != null ? headers[cols.drcr] : null,
    currencyHeader: cols.currency != null ? headers[cols.currency] : null,
    descHeaders: cols.desc.map((i) => headers[i]),
  });

  const txs: Transaction[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    dbg(`row #${i + 1}/${dataRows.length}`);
    const t = rowToTransaction(r, cols, fallbackLabel);
    if (t) txs.push(t);
  }
  dbg("kept transactions:", txs.length, "of", dataRows.length);
  dbgge();

  return txs;
}

function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  if (!files.length) return;

  importStatus.value = `Reading ${files.length} file${files.length > 1 ? "s" : ""
    }…`;
  importError.value = false;

  // Queue all files (we parse sequentially for better UX)
  (async () => {
    for (const f of files) {
      try {
        const text = await f.text();
        // Build a source label placeholder; user can rename in modal
        const fallbackLabel = f.name.replace(/\.[^.]+$/, "");
        const txs = parseCsvTextToTransactions(text, fallbackLabel);

        importQueue.value.push({ file: f, rows: txs, filename: f.name });
        pushToast(
          `Parsed ${f.name}: kept ${txs.length} transactions (see console)`,
          txs.length ? "success" : "warning"
        );
      } catch (err) {
        devError("Failed to parse file:", err);
        pushToast(`Failed to parse ${f.name}`, "error");
      }
    }
    importStatus.value = "";
    // kick off modal for first job
    if (!importingNow) prepareNextImport();
    // reset file input to allow re-selecting the same files later
    input.value = "";
  })();
}

// Present next file in the label modal
function prepareNextImport() {
  const job = importQueue.value.shift();
  if (!job) {
    importingNow = false;
    // All imports complete - switch to chart tab to show imported data
    if (transactions.value.length > 0) {
      // Reset date filter to show all imported data
      chartsSectionRef.value?.resetDateForImport();
      // Switch to chart tab with a small delay for toast visibility
      setTimeout(() => onTab('chart'), 600);
    }
    return;
  }
  importingNow = true;

  // De-dupe against existing BEFORE showing counts
  const existingKeys = new Set(transactions.value.map((t) => stableKey(t)));
  const unique = job.rows.filter((t) => !existingKeys.has(stableKey(t)));

  labelImport.open = true;
  labelImport.filename = job.filename;
  labelImport.label = job.file.name.replace(/\.[^.]+$/, "");
  labelImport.note = "";
  labelImport.imported = unique;
  labelImport.autoDetectedTags = sortAlpha(
    dedupeCI(unique.flatMap((t) => t.tags || []))
  );
  labelImport.tagsSelected = [...labelImport.autoDetectedTags];
  labelImport.tagsQuery = "";
}

// Keep your existing cancel/close but ensure they continue the queue
function cancelLabelImport() {
  labelImport.open = false;
  // skip current and go to next
  nextTick(() => prepareNextImport());
}

// Apply modal settings and merge
function confirmLabelImport() {
  const src = labelImport.label.trim() || "Imported";
  // Only tags added beyond the per-transaction auto-detected set are applied
  // to every row — the auto-detected ones already live on the rows that
  // matched them and must not spread to unrelated rows in the same batch.
  const extraTags = labelImport.tagsSelected.filter(
    (tg) => !labelImport.autoDetectedTags.some((a) => eqi(a, tg))
  );

  const withMeta = labelImport.imported.map((t) => {
    const mergedTags = sortAlpha(dedupeCI([...(t.tags || []), ...extraTags]));
    return { ...t, source: src, tags: mergedTags };
  });

  // Merge (defensive de-dupe again across the new list)
  const existingKeys = new Set(transactions.value.map((t) => stableKey(t)));
  const added: Transaction[] = [];
  for (const t of withMeta) {
    const k = stableKey(t);
    if (!existingKeys.has(k)) {
      existingKeys.add(k);
      added.push(t);
    }
  }
  if (added.length) {
    transactions.value = sortByDateDesc([...transactions.value, ...added]);
    safeLocalStorageSet(LS_KEYS.tx, transactions.value);
    // OPTIMIZED: Extract categories after bulk import
    for (const t of added) {
      categorySet.add(t.category);
    }
    touchCategorySet();
  }

  lastImportSummary.value = `Imported ${added.length}/${labelImport.imported.length} new transactions from "${labelImport.filename}".`;
  pushToast(lastImportSummary.value, "success");

  // Close current modal and continue the queue
  labelImport.open = false;
  nextTick(() => prepareNextImport());
}

// Small helper
function sortByDateDesc(arr: Transaction[]): Transaction[] {
  return [...arr].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  );
}

// Normalizes a raw input (URL or bare code) down to the bare base64 payload
// and reports whether it is an encrypted (`enc:`) code.
function extractShareCode(rawInput: string): { code: string; encrypted: boolean } {
  let code = rawInput.trim();

  if (code.startsWith("http")) {
    const url = new URL(code);
    code = url.hash.startsWith("#tx=")
      ? decodeURIComponent(url.hash.slice(4))
      : url.searchParams.get("tx") || code;
  }

  const encrypted = code.startsWith("enc:");
  if (encrypted) {
    code = code.slice(4);
  } else if (code.startsWith("tx:")) {
    code = code.slice(3);
  }

  return { code, encrypted };
}

// True when the raw input (URL or bare code) is a password-encrypted share.
function isEncryptedShareInput(rawInput: string): boolean {
  try {
    return extractShareCode(rawInput).encrypted;
  } catch {
    return false;
  }
}

// Decodes a "tx:" (plain) or "enc:" (password-encrypted) share code into
// normalized transactions. Shared by URL/code, clipboard, and any future
// import entry points so size limits and expiration are enforced uniformly.
// For encrypted codes the caller must supply `password` (collected via the
// PasswordPromptModal — see `finishEncryptedImport`).
async function decodeShareCode(rawInput: string, password?: string): Promise<Transaction[]> {
  const { code, encrypted } = extractShareCode(rawInput);

  if (code.length > MAX_SHARE_DECODED_CHARS) {
    throw new Error("Share code is too large to import");
  }

  let data: any;
  if (encrypted) {
    if (!password) throw new Error("Password required to decrypt share code");
    data = await decryptShareData(password, code);
  } else {
    let normalized = code.replace(/-/g, "+").replace(/_/g, "/");
    while (normalized.length % 4) normalized += "=";
    const bytes = base64ToBytes(normalized);
    if (bytes.length > MAX_SHARE_DECODED_CHARS) {
      throw new Error("Share code is too large to import");
    }
    data = JSON.parse(new TextDecoder().decode(bytes));
  }

  if (!data || !Array.isArray(data.t)) {
    throw new Error("Invalid share code format");
  }
  if (data.t.length > MAX_SHARE_IMPORT_TX) {
    throw new Error(`Share code contains too many transactions (max ${MAX_SHARE_IMPORT_TX})`);
  }
  if (!checkShareCodeExpiration(data)) {
    throw new Error("This share code has expired");
  }

  return data.t.map(normalizeTransaction);
}

async function importFromUrlOrCode() {
  const input = importUrl.value.trim();
  if (!input) {
    pushToast("Please enter a URL or share code", "warning");
    return;
  }

  // Encrypted codes need a password — collect it via the modal first.
  if (isEncryptedShareInput(input)) {
    pendingEncryptedCode.value = input;
    pendingImportContext.value = "Share Import";
    passwordPromptOpen.value = true;
    return;
  }

  try {
    const importedTransactions = await decodeShareCode(input);
    openLabelImportModal(importedTransactions, "Share Import");
    importUrl.value = "";
    pushToast(
      `Ready to import ${importedTransactions.length} transactions`,
      "success"
    );
  } catch (error) {
    devError("Import error:", error);
    pushToast(error instanceof Error ? error.message : "Failed to import from URL/share code", "error");
  }
}

// Completes an encrypted import after the user submits a password in the
// PasswordPromptModal. Handles two flows:
//   1. Encrypted share code (`enc:`) — decrypt + validate + label-import.
//   2. Encrypted file export (`.enc`) — decrypt to text, parse as JSON or CSV,
//      then label-import.
async function finishEncryptedImport(password: string) {
  passwordPromptOpen.value = false;
  const context = pendingImportContext.value;
  const file = pendingEncryptedFile.value;
  const code = pendingEncryptedCode.value;
  pendingEncryptedCode.value = "";
  pendingEncryptedFile.value = null;

  try {
    if (file) {
      const text = await decryptFileContent(password, file.bytes);
      const imported = parseEncryptedExportText(text, file.filename);
      if (imported.length > MAX_SHARE_IMPORT_TX) {
        throw new Error(`File contains too many transactions (max ${MAX_SHARE_IMPORT_TX})`);
      }
      if (imported.length === 0) {
        pushToast("No valid transactions found in encrypted file", "warning");
        return;
      }
      openLabelImportModal(imported, context);
      pushToast(`Ready to import ${imported.length} transactions`, "success");
      return;
    }

    const imported = await decodeShareCode(code, password);
    openLabelImportModal(imported, context);
    importUrl.value = "";
    pushToast(`Ready to import ${imported.length} transactions`, "success");
  } catch (error) {
    devError("Encrypted import error:", error);
    pushToast(error instanceof Error ? error.message : "Failed to decrypt", "error");
  }
}

// Parses decrypted export text into normalized transactions. Tries JSON first
// (array or `{ transactions: [...] }`), then falls back to the CSV pipeline.
// The filename hint (`.enc.json` / `.enc.csv`) is used to prefer one format,
// but both are always attempted so a mislabeled file still imports.
function parseEncryptedExportText(text: string, filename: string): Transaction[] {
  const lower = filename.toLowerCase();
  const preferCsv = lower.endsWith(".enc.csv") || lower.endsWith(".csv");
  const preferJson = lower.endsWith(".enc.json") || lower.endsWith(".json");

  const tryJson = (): Transaction[] | null => {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) return data.map(normalizeTransaction);
      if (data && Array.isArray(data.transactions)) return data.transactions.map(normalizeTransaction);
    } catch {
      /* not JSON — fall through to CSV */
    }
    return null;
  };

  const tryCsv = (): Transaction[] | null => {
    try {
      const txs = parseCsvTextToTransactions(text, filename.replace(/\.[^.]+$/, ""));
      return txs.length ? txs : null;
    } catch {
      return null;
    }
  };

  if (preferJson) {
    return tryJson() ?? tryCsv() ?? [];
  }
  if (preferCsv) {
    return tryCsv() ?? tryJson() ?? [];
  }
  // No hint — try JSON first (the recommended full-data format), then CSV.
  return tryJson() ?? tryCsv() ?? [];
}

async function importFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      pushToast("Clipboard is empty", "warning");
      return;
    }

    if (text.startsWith("tx:") || text.startsWith("enc:")) {
      // Encrypted codes need a password — collect it via the modal first.
      if (isEncryptedShareInput(text)) {
        pendingEncryptedCode.value = text;
        pendingImportContext.value = "Clipboard Import";
        passwordPromptOpen.value = true;
        return;
      }
      const imported = await decodeShareCode(text);
      openLabelImportModal(imported, "Clipboard Import");
      pushToast(
        `Ready to import ${imported.length} transactions from clipboard`,
        "success"
      );
      return;
    }

    pushToast("No valid share code found in clipboard", "warning");
  } catch (error) {
    devError("Clipboard import error:", error);
    pushToast(error instanceof Error ? error.message : "Failed to read from clipboard", "error");
  }
}

function handleJsonImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const data = JSON.parse(content);

      let imported: Transaction[] = [];
      if (Array.isArray(data)) {
        imported = data.map(normalizeTransaction);
      } else if (Array.isArray(data.transactions)) {
        imported = data.transactions.map(normalizeTransaction);
      } else {
        throw new Error("Invalid JSON format");
      }

      if (imported.length > MAX_SHARE_IMPORT_TX) {
        throw new Error(`File contains too many transactions (max ${MAX_SHARE_IMPORT_TX})`);
      }

      if (imported.length > 0) {
        openLabelImportModal(imported, file.name);
        pushToast(
          `Ready to import ${imported.length} transactions from JSON`,
          "success"
        );
      } else {
        pushToast("No valid transactions found in JSON file", "warning");
      }
    } catch (error) {
      devError("JSON import error:", error);
      pushToast("Failed to parse JSON file", "error");
    }
  };
  reader.readAsText(file);
  input.value = "";
}

// Reads a password-protected `.enc` export (JSON or CSV) and stashes the raw
// bytes so the shared password prompt can decrypt it. The actual decrypt +
// parse + label-import happens in `finishEncryptedImport` once a password is
// submitted. Format is inferred from the filename (`.enc.json` → JSON,
// `.enc.csv` → CSV) and falls back to "try JSON, then CSV" at decrypt time.
function handleEncryptedFileImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const bytes = new Uint8Array(e.target?.result as ArrayBuffer);
    pendingEncryptedFile.value = { bytes, filename: file.name };
    pendingEncryptedCode.value = "";
    pendingImportContext.value = file.name;
    passwordPromptOpen.value = true;
  };
  reader.onerror = () => {
    devError("Failed to read encrypted file");
    pushToast("Failed to read file", "error");
  };
  reader.readAsArrayBuffer(file);
  input.value = "";
}

/**
 * Trigger a browser download of either a text string or raw bytes. When
 * `protectExport` is on, the content is encrypted with `exportPassword` first
 * (AES-256-GCM via PBKDF2) and the `.enc` suffix is appended to the filename.
 */
async function downloadContent(
  content: string | Uint8Array,
  filename: string,
  mime: string
): Promise<void> {
  let blob: Blob;
  let finalName = filename;
  if (protectExport.value) {
    if (!exportPassword.value) {
      // Defensive: the modal warns the user, but log the insecure path in dev
      // so an empty-password "protected" export is never silent.
      devWarn("Exporting a .enc file with an EMPTY password — trivially decryptable.");
    }
    const text = typeof content === "string" ? content : new TextDecoder().decode(content);
    const encrypted = await encryptFileContent(exportPassword.value, text);
    blob = new Blob([encrypted as unknown as BlobPart], { type: "application/octet-stream" });
    finalName = filename.replace(/(\.[a-z0-9]+)$/i, ".enc$1");
  } else {
    blob = new Blob([content as unknown as BlobPart], { type: mime });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function downloadJson() {
  if (transactions.value.length === 0) {
    pushToast("No transactions to export", "warning");
    return;
  }

  try {
    const data = {
      transactions: transactions.value,
      exportDate: new Date().toISOString(),
      version: version.value,
    };

    const content = JSON.stringify(data, null, 2);
    const filename = `financial-tracker-export-${new Date().toISOString().split("T")[0]}.json`;
    await downloadContent(content, filename, "application/json");
    pushToast(
      `Exported ${transactions.value.length} transactions to JSON`,
      "success"
    );
  } catch (error) {
    devError("JSON export error:", error);
    pushToast("Failed to export JSON", "error");
  }
}

// ===== Phase 1: CSV Export =====
async function downloadCsv() {
  if (transactions.value.length === 0) {
    pushToast("No transactions to export", "warning");
    return;
  }

  try {
    const headers = ["Date", "Type", "Amount", "Category", "Tags", "Description", "Source"];
    // Neutralize spreadsheet formula injection (=, +, -, @, tab, CR prefixes)
    // and double embedded quotes so fields can't break row structure
    const csvField = (value: string): string => {
      let v = value ?? "";
      if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
      return `"${v.replace(/"/g, '""')}"`;
    };
    const rows = transactions.value.map(t => [
      t.date,
      t.type,
      t.amount.toFixed(2),
      csvField(t.category),
      csvField((t.tags || []).join(", ")),
      csvField(t.description || ""),
      csvField(t.source || ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const filename = `${exportFilenamePrefix.value}-${new Date().toISOString().split("T")[0]}.csv`;
    await downloadContent(csvContent, filename, "text/csv;charset=utf-8;");
    pushToast(`Exported ${transactions.value.length} transactions to CSV`, "success");
  } catch (error) {
    devError("CSV export error:", error);
    pushToast("Failed to export CSV", "error");
  }
}

// ===== Phase 1: QIF Export =====
async function downloadQif() {
  if (transactions.value.length === 0) {
    pushToast("No transactions to export", "warning");
    return;
  }

  try {
    const qifHeader = "!Type:Cash^1";
    const rows = transactions.value.map(t => {
      const date = t.date.split("-").reverse().join("/");
      const amount = t.type === "income" ? t.amount.toFixed(2) : (-t.amount).toFixed(2);
      // `^` is the QIF line terminator — strip it from every field so a
      // category/tag containing `^` can't corrupt the record structure.
      const category = (t.category || "").replace(/\^/g, "");
      const tags = (t.tags || []).map((x: string) => x.replace(/\^/g, "")).join(", ");
      const desc = `${(t.description || "").replace(/\^/g, "")}${tags ? ` ^${tags}` : ""}`;
      return `D${date}\nT${amount}\nL${category}\nM${desc}\n^\n`;
    });

    const qifContent = `${qifHeader}\n${rows.join("")}`;
    const filename = `${exportFilenamePrefix.value}-${new Date().toISOString().split("T")[0]}.qif`;
    await downloadContent(qifContent, filename, "application/x-qif");
    pushToast(`Exported ${transactions.value.length} transactions to QIF`, "success");
  } catch (error) {
    devError("QIF export error:", error);
    pushToast("Failed to export QIF", "error");
  }
}

// ===== Phase 1: Unified Export Handler =====
async function handleExport(format: 'json' | 'csv' | 'qif') {
  exportFormat.value = format;
  exportInProgress.value = true;
  exportProgress.value = 0;

  // Simulate progress for UX
  const progressInterval = setInterval(() => {
    exportProgress.value = Math.min(exportProgress.value + 10, 90);
  }, 50);

  setTimeout(async () => {
    clearInterval(progressInterval);
    exportProgress.value = 100;

    try {
      switch (format) {
        case 'json':
          await downloadJson();
          break;
        case 'csv':
          await downloadCsv();
          break;
        case 'qif':
          await downloadQif();
          break;
      }
    } finally {
      setTimeout(() => {
        exportInProgress.value = false;
        exportProgress.value = 0;
        exportModalOpen.value = false;
      }, 500);
    }
  }, 300);
}

// ========= Smart Web Share with file fallback & copy backup =========
function buildExportBlob(): Blob {
  const data = {
    transactions: transactions.value,
    exportDate: new Date().toISOString(),
    version: version.value,
  };
  return new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
}
function exportFilename(): string {
  const d = new Date().toISOString().split("T")[0];
  return `financial-tracker-export-${d}.json`;
}
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    pushToast("Copied to clipboard", "success");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    pushToast("Copied to clipboard", "success");
  }
}

async function webShare(shareUrl: string) {
  const nav: any = navigator;

  // Guard: nothing to share
  if (!shareCode.value || shareCode.value === "tx:") {
    pushToast("Nothing to share yet", "warning");
    return;
  }

  // Web Share requires secure context (https, localhost). If not, fall back.
  const secureOk =
    window.isSecureContext === true ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";
  if (!secureOk) {
    // Fallback: copy share link (or share code if no link)
    if (shareUrl) {
      await copyToClipboard(shareUrl);
      pushToast("Link copied (sharing requires HTTPS)", "info");
    } else {
      await copyToClipboard(shareCode.value);
      pushToast("Share code copied (sharing requires HTTPS)", "info");
    }
    return;
  }

  // Decide payload: short link → share URL; long payload → share JSON file if possible
  const tooLong = shareCodeLength.value > SHARE_URL_SAFE_LIMIT; // you already expose this
  const blob = buildExportBlob();
  const file = new File([blob], exportFilename(), { type: "application/json" });

  try {
    // Prefer sharing a file when link is too long and Level 2 is supported
    if (
      tooLong &&
      typeof nav.canShare === "function" &&
      nav.canShare({ files: [file] })
    ) {
      await nav.share({
        title: "My Financial Data",
        text: "Transactions export (JSON)",
        files: [file],
      });
      pushToast("Shared JSON export via device", "success");
      return;
    }

    // Otherwise share the URL (if present and share() exists)
    if (shareUrl && typeof nav.share === "function") {
      await nav.share({
        title: "My Financial Data",
        text: "Open this link to load my transactions",
        url: shareUrl,
      });
      pushToast("Shared link via device", "success");
      return;
    }

    // Fallback: share plain text (compact code), then final fallback to copy
    if (typeof nav.share === "function") {
      await nav.share({
        title: "My Financial Data",
        text: shareCode.value,
      });
      pushToast("Shared code via device", "success");
      return;
    }

    // Final fallback: copy link or code
    if (shareUrl) {
      await copyToClipboard(shareUrl);
      pushToast("Link copied to clipboard", "info");
    } else {
      await copyToClipboard(shareCode.value);
      pushToast("Share code copied to clipboard", "info");
    }
  } catch (error: any) {
    if (error?.name === "AbortError") return; // user canceled
    devError("Web share error:", error);

    // On error, offer download as a robust fallback for very large datasets
    if (tooLong) {
      // Trigger a download immediately to make it useful
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = exportFilename();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        pushToast("Downloaded JSON export as fallback", "success");
        return;
      } catch (e) {
        devError("Download fallback failed:", e);
      }
    }

    // Last resort: copy to clipboard
    await copyToClipboard(shareUrl || shareCode.value);
    pushToast("Copied to clipboard as fallback", "warning");
  }
}

function copy(text: string) {
  if (!text || text === "tx:") {
    pushToast("Nothing to copy", "warning");
    return;
  }

  navigator.clipboard
    .writeText(text)
    .then(() => {
      pushToast("Copied to clipboard", "success");
    })
    .catch(() => {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      pushToast("Copied to clipboard", "success");
    });
}



// // Modal management
function openLabelImportModal(
  importedTransactions: Transaction[],
  filename: string
) {
  labelImport.imported = importedTransactions;
  labelImport.filename = filename;
  labelImport.label = `Import from ${filename} - ${new Date().toLocaleDateString()}`;
  labelImport.note = "";
  labelImport.autoDetectedTags = sortAlpha(
    dedupeCI(importedTransactions.flatMap((t) => t.tags || []))
  );
  labelImport.tagsSelected = [...labelImport.autoDetectedTags];
  labelImport.tagsQuery = "";
  labelImport.open = true;
}

watch(transactions, (v) => safeLocalStorageSet(LS_KEYS.tx, v), { deep: true });

// Onboarding functions
function startImportFromOnboarding() {
  showTour.value = false;
  afterOnboarding();
  activeTab.value = "import";
  pushToast("Select a file or paste data to import", "info");
}

function startManualAdd() {
  showTour.value = false;
  afterOnboarding();
  previousTab.value = activeTab.value;
  activeTab.value = "add";
  pushToast("Start adding your transactions", "info");
}

function confirmDemo() {
  onboardingStep.value = 1;
}

type Template = {
  type: TransactionType;
  category: string;
  descriptions: string[];
  min: number;
  max: number;
  tags: string[];
  recurring?: boolean;
  frequency?: RecurringFrequency;
};

type DemoTemplate = Template & {
  count: number;
};

const DEMO_START_DATE = "2025-07-01";
const DEMO_END_DATE = "2026-06-30";

const DEMO_TEMPLATES: DemoTemplate[] = [
  {
    type: "income",
    category: "Salary",
    descriptions: [
      "salary take-home pay",
      "Fortnightly pay",
      "Payroll deposit",
      "Salary credit",
    ],
    min: 2400,
    max: 2800,
    tags: ["income", "salary", "work"],
    recurring: true,
    frequency: "fortnightly",
    count: 26,
  },
  {
    type: "spending",
    category: "Rent & Board",
    descriptions: ["Rent payment", "Board contribution", "Room rent"],
    min: 1100,
    max: 1550,
    tags: ["housing", "rent", "living"],
    recurring: true,
    frequency: "monthly",
    count: 12,
  },
  {
    type: "spending",
    category: "Internet & Mobile",
    descriptions: ["NBN plan", "Mobile bill", "Internet + phone bundle"],
    min: 85,
    max: 145,
    tags: ["utilities", "internet", "mobile"],
    recurring: true,
    frequency: "monthly",
    count: 12,
  },
  {
    type: "spending",
    category: "Subscriptions & Cloud",
    descriptions: ["Spotify", "iCloud+", "Notion", "YouTube Premium", "Prime Video", "Chat GPT Plus"],
    min: 12,
    max: 55,
    tags: ["subscriptions", "cloud", "software"],
    recurring: true,
    frequency: "monthly",
    count: 12,
  },
  {
    type: "spending",
    category: "Automatic Savings",
    descriptions: [
      "Auto-transfer to savings",
      "Emergency fund transfer",
      "Offset transfer",
      "ETF savings transfer",
    ],
    min: 180,
    max: 420,
    tags: ["savings", "transfer", "budget"],
    recurring: true,
    frequency: "monthly",
    count: 12,
  },
  {
    type: "spending",
    category: "Groceries",
    descriptions: ["Woolworths shop", "Coles shop", "ALDI run", "IGA top-up"],
    min: 55,
    max: 185,
    tags: ["groceries", "supermarket", "food"],
    count: 20,
  },
  {
    type: "spending",
    category: "Coffee & Lunch",
    descriptions: ["Flat white", "Oat latte", "Sushi lunch", "Toastie", "Snack run", "Lunch bowl"],
    min: 5,
    max: 35,
    tags: ["coffee", "cafe", "lunch"],
    count: 14,
  },
  {
    type: "spending",
    category: "Transport & Parking",
    descriptions: ["Opal top-up", "Train fare", "Light rail trip", "Uber home", "Parking meter"],
    min: 6,
    max: 48,
    tags: ["transport", "commute", "parking"],
    count: 12,
  },
  {
    type: "spending",
    category: "Dining & Takeaway",
    descriptions: ["Ramen night", "Sushi train", "Thai takeaway", "Burger night", "Uber Eats dinner"],
    min: 18,
    max: 95,
    tags: ["dining", "takeaway", "restaurant"],
    count: 10,
  },
  {
    type: "spending",
    category: "Tech & Gadgets",
    descriptions: [
      "USB-C dock",
      "Mechanical keyboard",
      "SSD upgrade",
      "Noise cancelling headphones",
      "Mouse pad",
      "Monitor arm",
    ],
    min: 24,
    max: 650,
    tags: ["tech", "gadgets", "work"],
    count: 6,
  },
  {
    type: "spending",
    category: "Fitness & Health",
    descriptions: ["Gym membership", "Physio visit", "Chemist Warehouse", "Dental check-up"],
    min: 18,
    max: 140,
    tags: ["health", "fitness", "pharmacy"],
    count: 4,
  },
  {
    type: "spending",
    category: "Home & Household",
    descriptions: ["Bunnings run", "IKEA home goods", "Kmart essentials", "Cleaning supplies"],
    min: 18,
    max: 120,
    tags: ["home", "household", "essentials"],
    count: 4,
  },
  {
    type: "spending",
    category: "Entertainment",
    descriptions: ["Cinema night", "Pub trivia", "Live gig", "Game Pass", "Bowling night"],
    min: 15,
    max: 110,
    tags: ["entertainment", "social", "leisure"],
    count: 4,
  },
  {
    type: "spending",
    category: "Travel & Weekend",
    descriptions: ["Weekend Airbnb", "Day trip train fare", "Regional getaway", "Hotel stay"],
    min: 90,
    max: 420,
    tags: ["travel", "weekend", "holiday"],
    count: 2,
  },
];

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T extends { weight?: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  let r = Math.random() * total;

  for (const item of items) {
    r -= item.weight ?? 1;
    if (r <= 0) return item;
  }

  return items[items.length - 1];
}

// function formatDate(date: Date): string {
//   return date.toISOString().split("T")[0];
// }

function randomDateBetween(start: Date, end: Date): string {
  const time = rand(start.getTime(), end.getTime());
  return toLocalISO(new Date(time));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function uniqueTags(baseTags: string[], type: TransactionType, recurring?: boolean, frequency?: RecurringFrequency): string[] {
  const tags = [...baseTags, type];
  if (recurring) tags.push("recurring");
  if (frequency) tags.push(frequency);
  return [...new Set(tags)];
}

function generateRecurringSeries(
  template: Template,
  count: number,
  startDate: Date,
  endDate: Date,
  idStart: number
): Transaction[] {
  const out: Transaction[] = [];
  let current = new Date(startDate);
  let idCounter = idStart;

  while (current <= endDate && out.length < count) {
    const description = pickOne(template.descriptions);
    const amount = roundMoney(rand(template.min, template.max));

    out.push({
      id: `demo-${idCounter++}`,
      date: toLocalISO(current),
      type: template.type,
      amount,
      category: template.category,
      description,
      source: "Demo Data",
      recurring: true,
      frequency: template.frequency,
      tags: uniqueTags(template.tags, template.type, true, template.frequency),
    });

    switch (template.frequency) {
      case "weekly":
        current.setDate(current.getDate() + 7);
        break;
      case "fortnightly":
        current.setDate(current.getDate() + 14);
        break;
      case "monthly":
        current.setMonth(current.getMonth() + 1);
        break;
      case "quarterly":
        current.setMonth(current.getMonth() + 3);
        break;
      case "yearly":
        current.setFullYear(current.getFullYear() + 1);
        break;
      default:
        current.setMonth(current.getMonth() + 1);
    }
  }

  return out;
}


function isBnplCategory(category?: string): boolean {
  return eqi(category || "", "BNPL");
}

function stripInstallmentSuffix(text: string): string {
  return (text || "")
    .replace(/\s*\(\d+\s*\/\s*\d+\)\s*$/i, "")
    .trim();
}

function splitAmountIntoInstallments(total: number, count = 4): number[] {
  const totalCents = Math.round(Math.abs(total) * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents - baseCents * count;

  return Array.from({ length: count }, (_, i) => {
    const cents = i === count - 1 ? baseCents + remainder : baseCents;
    return cents / 100;
  });
}

function generateBnplInstallmentSeries(baseTx: Transaction): Transaction[] {
  const installmentCount = 4;
  const startISO =
    /^\d{4}-\d{2}-\d{2}$/.test(baseTx.date) ? baseTx.date : todayLocalISO();

  const installments = splitAmountIntoInstallments(baseTx.amount, installmentCount);
  const baseDescription = stripInstallmentSuffix(baseTx.description || "BNPL Purchase");
  const baseTags = sortAlpha(
    dedupeCI([
      ...(baseTx.tags || []),
      "bnpl",
      "installment",
      "fortnightly",
    ])
  );

  return installments.map((amount, index) => ({
    ...baseTx,
    id: `${baseTx.id}-bnpl-${index + 1}`,
    date: addDays(startISO, index * 14),
    amount,
    category: "BNPL",
    description: `${baseDescription} (${index + 1}/${installmentCount})`,
    tags: sortAlpha(
      dedupeCI([...baseTags, `${index + 1}-of-${installmentCount}`])
    ),
    recurring: false,
    frequency: undefined,
    recursions: 1,
    endDate: "",
  }));
}

function generateRandomDemoData(): Transaction[] {
  const startDate = new Date(DEMO_START_DATE);
  const endDate = new Date(DEMO_END_DATE);
  const transactions: Transaction[] = [];
  let idCounter = 1;

  for (const template of DEMO_TEMPLATES) {
    if (template.recurring && template.frequency) {
      const { count, ...seriesTemplate } = template;
      const series = generateRecurringSeries(seriesTemplate, count, startDate, endDate, idCounter);
      transactions.push(...series);
      idCounter += series.length;
      continue;
    }

    for (let i = 0; i < template.count; i++) {
      transactions.push({
        id: `demo-${idCounter++}`,
        date: randomDateBetween(startDate, endDate),
        type: template.type,
        amount: roundMoney(rand(template.min, template.max)),
        category: template.category,
        description: pickOne(template.descriptions),
        source: "Demo Data",
        tags: uniqueTags(template.tags, template.type),
      });
    }
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date));

  return transactions.map((tx, index) => ({
    ...tx,
    id: `demo-${index + 1}`,
  }));
}

function loadDemoDataAndFinish() {
  const demoData = generateRandomDemoData();
  transactions.value = demoData.map(t => ({ ...t }));
  safeLocalStorageSet(LS_KEYS.tx, transactions.value);
  // `tags` is a separate, manually-maintained list (unlike `categories`,
  // which is derived live from `transactions.value`) — seed it from the
  // demo data's own tags so tag pickers aren't empty on a fresh demo load.
  tags.value = sortAlpha(
    dedupeCI([...tags.value, ...demoData.flatMap((t) => t.tags || [])])
  );
  safeLocalStorageSet(LS_KEYS.tags, tags.value);
  showTour.value = false;
  onboardingStep.value = 0;
  afterOnboarding();
  activeTab.value = "chart";
  pushToast(`${demoData.length} Australian demo transactions loaded! Chart view opened.`, "success", 3000);
}


function handleTourBack() {
  if (onboardingStep.value > 0) {
    onboardingStep.value--;
  }
}

function skipTour() {
  showTour.value = false;
  onboardingStep.value = 0;
  afterOnboarding();
  if (transactions.value.length === 0) {
    activeTab.value = "about";
  }
  pushToast("You can always access onboarding from the About page", "info");
}

function startImportFromEmptyState() {
  activeTab.value = "import";
  pushToast("Select a file or paste data to import", "info");
}

function startTourFromAbout() {
  showTour.value = true;
  onboardingStep.value = 0;
  activeTab.value = "about";
}

function goHome() {
  onTab(transactions.value.length > 0 ? "chart" : "about");
}
</script>

<style scoped>
/* Try break me heheh */
.opacity-80 {
  word-break: break-word;
}

/* Advanced Settings Modal styling now lives in components/AdvancedSettingsModal.vue —
   that component owns the dialog markup, and Vue's scoped-CSS child-root inheritance
   doesn't reach two levels down (App.Dev.vue -> ChartsSection.vue -> AdvancedSettingsModal.vue),
   so rules here never matched it. */

/* WCAG-friendly skip link */
.skip-link {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.skip-link:focus {
  position: fixed;
  left: 1rem;
  top: 1rem;
  width: auto;
  height: auto;
  padding: 0.5rem 0.75rem;
  background: CanvasText;
  color: Canvas;
  border-radius: 0.375rem;
  z-index: 9999;
}

/* Modal background scroll lock */
.no-scroll {
  overflow: hidden;
}

.menu li>a:focus {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

/* ===== Tour/Onboarding Overlay ===== */
.fixed.inset-0 {
  position: fixed;
  inset: 0;
  /* The background will slightly blur the main content underneath */
  backdrop-filter: blur(1px);
}

.badge.badge-outline,
.sm\:badge-ghost {
  width: max-content;
}

/* ===== Accessibility & focus ===== */
:focus-visible {
  outline: 3px solid oklch(var(--bc) / 0.9);
  outline-offset: 2px;
  border-radius: 6px;
}

/* Screen-reader helper (fallback if not provided by your CSS framework) */
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border-width: 0 !important;
}

/* ===== Skip link (WCAG 2.2) ===== */
.skip-link {
  position: absolute;
  left: -9999px;
  top: -9999px;
  background: oklch(var(--b1));
  color: oklch(var(--bc));
  padding: 0.5rem 0.75rem;
  z-index: 80;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px oklch(var(--bc) / 0.15);
}

.skip-link:focus-visible {
  left: 0.75rem;
  top: 0.75rem;
}

/* ===== Dropdown (details/summary) polish ===== */
details.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown>summary {
  list-style: none;
  cursor: pointer;
}

.dropdown>summary::-webkit-details-marker {
  display: none;
}

.dropdown .dropdown-content {
  display: none;
  position: absolute;
  right: 0;
  margin-top: 0.5rem;
  z-index: 60;
  max-height: 60vh;
  overflow: auto;
  overscroll-behavior: contain;
  border-radius: 0.75rem;
  box-shadow: 0 10px 30px oklch(var(--bc) / 0.15);
  /* Smooth desktop dropdown animation */
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Show only when <details> is actually open (so it toggles correctly). */
details.dropdown[open]>.dropdown-content {
  display: block;
}

/* Desktop dropdown open animation */
@media screen and (min-width: 768px) {
  header details.dropdown[open]>.dropdown-content {
    animation: desktop-dropdown-fade-in 0.2s ease-out forwards;
  }

  @keyframes desktop-dropdown-fade-in {
    from {
      opacity: 0;
      transform: translateY(-0.5rem) scale(0.95);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Better desktop dropdown positioning - align with button edge */
  header .dropdown .dropdown-content {
    right: -0.25rem;
    margin-top: 0.625rem;
  }

  /* Widen dropdowns on large screens for better readability */
  @media screen and (min-width: 1280px) {
    header .dropdown .dropdown-content {
      min-width: 16rem;
    }
  }
}

/* ===== Transaction table usability ===== */
.table {
  border-collapse: separate;
  border-spacing: 0 2px;
  /* gentle breathing room */
}

.table thead th {
  position: sticky;
  top: 0;
  z-index: 10;
  background: oklch(var(--b2));
}

.table th .btn {
  white-space: nowrap;
}

/* Selected row emphasis */
tbody tr.bg-base-200 {
  outline: 2px solid oklch(var(--p) / 0.25);
  box-shadow: inset 0 0 0 9999px oklch(var(--p) / 0.05);
}

/* Compact badges in table */
.type-badge {
  width: 6.5rem;
  justify-content: center;
}

/* Hide less-critical columns on small screens to reduce overwhelm */
@media (max-width: 480px) {

  /* Description column (6th) */
  table thead th:nth-child(6),
  table tbody td:nth-child(6) {
    display: none;
  }

  /* Category badge remains; keep actions visible */
  /* Reduce table padding on mobile */
  table.table td,
  table.table th {
    padding: 0.5rem 0.2rem;
    font-size: 0.8rem;
  }

  /* Table headers more compact on mobile */
  table.table thead th .btn {
    font-size: 0.75rem;
    padding: 0.2rem 0.15rem;
    min-height: 1.5rem;
    line-height: 1.2;
  }

  /* Hide Tags column on very small screens to save space */
  @media (max-width: 520px) {

    table thead th:nth-child(5),
    table tbody td:nth-child(5) {
      display: none;
    }
  }

  /* Make checkboxes easier to tap */
  table.table .checkbox {
    margin: 0;
    width: 1.25rem;
    height: 1.25rem;
  }

  /* Better action buttons on mobile - larger touch targets */
  table.table .btn {
    min-width: 2rem;
    min-height: 2rem;
    padding: 0.3rem;
  }

  /* Row entrance animation */
  table.table tbody tr {
    animation: table-row-fade-in 0.35s ease forwards;
    opacity: 0;
  }

  table.table tbody tr:nth-child(1) {
    animation-delay: 0.02s;
  }

  table.table tbody tr:nth-child(2) {
    animation-delay: 0.04s;
  }

  table.table tbody tr:nth-child(3) {
    animation-delay: 0.06s;
  }

  table.table tbody tr:nth-child(4) {
    animation-delay: 0.08s;
  }

  table.table tbody tr:nth-child(5) {
    animation-delay: 0.10s;
  }

  table.table tbody tr:nth-child(6) {
    animation-delay: 0.12s;
  }

  table.table tbody tr:nth-child(7) {
    animation-delay: 0.14s;
  }

  table.table tbody tr:nth-child(8) {
    animation-delay: 0.16s;
  }

  table.table tbody tr:nth-child(9) {
    animation-delay: 0.18s;
  }

  table.table tbody tr:nth-child(10) {
    animation-delay: 0.20s;
  }

  table.table tbody tr:nth-child(n+11) {
    animation-delay: 0.22s;
  }

  /* Row press feedback */
  table.table tbody tr {
    transition: background-color 0.15s ease;
  }

  table.table tbody tr:active {
    background-color: oklch(var(--bc) / 0.05);
  }
}

/* Improve zebra contrast slightly on dark themes */
.table-zebra tbody tr:nth-child(even) td,
.table-zebra tbody tr:nth-child(even) th {
  background-color: color-mix(in oklab,
      oklch(var(--b1)) 90%,
      oklch(var(--bc)) 10%);
}

/* ===== HEADER / NAVBAR ===== */

/* Sticky header with consistent height and reliable positioning */
header.navbar.sticky {
  /* Fixed height - balance widget overflows, doesn't push nav taller */
  min-height: 3.5rem;
  height: 3.5rem;
  /* Set CSS variable for nested sticky elements to use */
  --header-height: 3.5rem;
  /* Prevent header from becoming too tall on mobile */
  max-height: none;
  /* Allow balance widget to overflow past nav boundary */
  overflow: visible;
}

/* Mobile: allow header to expand so logo subtitle is visible */
@media screen and (max-width: 1023px) {
  header.navbar.sticky {
    height: 3.5rem;
    min-height: 3.5rem;
  }
}

/* Balance badge sizing/color (including the WCAG-legible caption font
   size and contrast) lives in AppHeader.vue's own <style scoped> — this
   component's scoped CSS can't reach that markup, so a duplicate copy
   here would be dead CSS that could silently drift out of sync. */

/* Desktop tab alignment — vertically center tabs-boxed with logo */
@media screen and (min-width: 1024px) {
  header.navbar.sticky {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    padding: 0 1rem;
  }

  /* Allow balance widget to overflow the navbar, but center icon buttons */
  header .navbar-end {
    align-items: flex-start;
    padding-top: 0.15rem;
    padding-bottom: 0.15rem;
  }

  /* Vertically center dropdown icon buttons on desktop */
  header .navbar-end .mobile-nav-end {
    align-items: center;
  }

  /* Dropdown hover/active states for header controls live in
     AppHeader.vue's own <style scoped> (this component's scoped CSS can't
     reach summary elements nested inside AppHeader.vue's template). */

  /* Tab row doesn't wrap on medium desktop, better spacing */
  .navbar-center .tabs-boxed {
    white-space: nowrap;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }

  .navbar-center .tabs-boxed .tab {
    padding: 0.6rem 1rem;
  }

  /* Overflow guard for narrow desktop */
  @media screen and (max-width: 1280px) {
    .navbar-center .tabs-boxed .tab {
      padding-left: 0.75rem;
      padding-right: 0.75rem;
      font-size: 0.875rem;
    }
  }
}

/* Mobile header adjustments */
@media screen and (max-width: 767px) {

  /* Mobile nav: compact fixed height so badge extends below */
  header.navbar.sticky {
    height: 3.5rem;
    min-height: 3.5rem;
    max-height: 3.5rem;
    overflow: visible;
    padding: 0 0.75rem;
  }

  /* Allow badge to overflow navbar on mobile */
  header .navbar-end {
    align-items: flex-start;
    padding-top: 0.15rem;
    padding-bottom: 0.15rem;
  }

  /* Navbar end container: tighter spacing, proper alignment */
  header .navbar-end .mobile-nav-end {
    gap: 0.35rem;
    align-items: center;
  }

  /* Shrink title on mobile to prevent wrapping */
  header .navbar-start h1 {
    font-size: 1rem;
  }

  /* Stack logo lines vertically on mobile */
  header .navbar-start .logo-line-1,
  header .navbar-start .logo-line-2 {
    display: block;
    line-height: 1.2;
  }

  header .navbar-start .logo-line-1 {
    font-weight: 400;
  }

  header .navbar-start .logo-line-2 {
    font-size: 0.85em;
  }

  /* Balance badge sizing/color at this breakpoint lives in
     AppHeader.vue's own <style scoped>. */

  /* Dropdown wrapper positioning and touch-target sizing live in
     AppHeader.vue's own <style scoped>. */

  /* Force dropdowns to open below on mobile, centered on the page when content overflows */
  header details.dropdown[open]>.mobile-dropdown-content {
    position: fixed !important;
    top: calc(var(--header-height, 3.5rem) + 0.75rem) !important;
    bottom: auto !important;
    left: 50% !important;
    right: auto !important;
    transform: translateX(-50%) !important;
    max-width: calc(100vw - 2rem) !important;
    opacity: 1 !important;
    visibility: visible !important;
    display: block !important;
    pointer-events: auto !important;
    z-index: 70 !important;
    animation: dropdown-fade-in 0.2s ease-out forwards;
  }

  /* Smooth dropdown open animation */
  @keyframes dropdown-fade-in {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-0.5rem) scale(0.95);
    }

    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
  }

  /* Table row entrance animation */
  @keyframes table-row-fade-in {
    from {
      opacity: 0;
      transform: translateY(0.5rem);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Tab switch animation */
  @keyframes tab-content-fade-in {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  /* Form field focus animation */
  @keyframes input-focus-glow {
    from {
      box-shadow: 0 0 0 2px oklch(var(--p) / 0.2);
    }

    to {
      box-shadow: 0 0 0 4px oklch(var(--p) / 0.15);
    }
  }

  /* Hide logo text only at very narrow screens where balance overlaps stacked lines */
  @media (max-width: 380px) {
    header .navbar-start .logo-text {
      display: none;
    }
  }

  header .navbar-start {
    flex: 0 0 auto;
    min-width: 0;
  }

  header .navbar-end {
    flex: 1 1 auto;
    justify-content: flex-end;
    min-width: 0;
  }
}

/* Balance badge sizing at the 420px breakpoint lives in AppHeader.vue's
   own <style scoped>. */

/* XS screens (320px-375px): fix top nav alignment */
@media (max-width: 375px) {
  header.navbar.sticky {
    height: 3.25rem;
    min-height: 3.25rem;
    padding: 0 0.5rem;
  }

  header .navbar-end .mobile-nav-end {
    gap: 0.2rem;
    align-items: center;
    flex-wrap: nowrap;
  }

  /* Balance badge sizing at this breakpoint lives in AppHeader.vue's
     own <style scoped>. */

  header .navbar-start img {
    width: 28px;
    height: 28px;
  }

  header .navbar-start h1 {
    font-size: 0.9rem;
  }
}

/* Mobile adjustments for main content */
@media screen and (max-width: 767px) {

  /* Reduce padding on main content for small screens */
  main.container {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  /* Tab panel switch animation on mobile */
  main.container section[role="tabpanel"],
  main.container section.card {
    animation: tab-content-fade-in 0.25s ease;
  }

  /* Transaction form grid stacks on mobile */
  form.grid {
    grid-template-columns: 1fr !important;
  }

  /* Form input focus glow on mobile */
  form input:focus,
  form select:focus,
  form textarea:focus {
    animation: input-focus-glow 0.2s ease forwards;
    border-color: oklch(var(--p) / 0.6) !important;
  }

  /* Mobile bottom nav spacing */
  .btm-nav {
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  /* Main content starts below the overflow balance widget */
  main.container {
    padding-top: 0.5rem;
  }

  /* Better card spacing on mobile */
  main.container .card {
    margin-bottom: 1rem;
  }

  /* Compact form sections on mobile */
  main.container .tab-content {
    padding: 0.5rem 0;
  }

  /* Smooth scroll behavior for mobile */
  main {
    scroll-behavior: smooth;
  }

  /* Card entrance animation for mobile */
  .card.shadow-xl {
    animation: card-fade-in 0.3s ease;
  }

  @keyframes card-fade-in {
    from {
      opacity: 0;
      transform: translateY(0.75rem);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

/* Only apply will-change during active scroll to avoid stacking context bugs */
@media screen and (max-width: 768px) {
  header.navbar.sticky {
    --header-height: 3.5rem;
  }
}

/* Mobile dropdown tap-feedback transitions live in AppHeader.vue's own
   <style scoped>, alongside the desktop hover state they now match. */

/* Safe area padding for notched devices (iPhone X+, Android edge-to-edge) */
/* Consistent additive formula: base padding + safe area inset (no double-counting) */
.safe-area-bottom {
  padding-bottom: calc(0.25rem + env(safe-area-inset-bottom, 0));
}

.safe-area-main {
  padding-bottom: calc(6rem + env(safe-area-inset-bottom, 0));
}

/* Touch target minimums (WCAG 2.2: 24x24px, Apple HIG: 44x44px) */
.target-min {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 0 0;
}

/* Focus ring for keyboard accessibility */
.focus-ring:focus-visible {
  outline: 3px solid oklch(var(--p) / 0.5);
  outline-offset: 2px;
  border-radius: 0.375rem;
}

/* Bottom nav specific improvements - anchored and stable after any scroll */
.btm-nav {
  /* Explicit anchoring - prevents drift after viewport changes */
  position: fixed !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: min-content;
  padding: 5px 10px 20px 10px;
  margin-bottom: -5px;

  /* Prevent iOS bounce effect */
  overscroll-behavior: contain;
  /* Ensure proper rendering on Android */
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  /* Consistent box model for padding calculations */
  box-sizing: border-box;
}

/* Active tab indicator enhancement */
.btm-nav button.active {
  font-weight: 600;
}

/* iOS Safari: Prevent text size adjustment on orientation change */
@media screen and (max-width: 768px) {
  html {
    text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
  }

  /* Fix for iOS Safari address bar */
  .min-h-\[100dvh\] {
    min-height: 100dvh;
    min-height: 100vh;
    /* Fallback */
  }
}

/* Android Chrome: Smooth scrolling */
@media (prefers-reduced-motion: no-preference) {
  html {
    scroll-behavior: smooth;
  }
}

/* Mobile modal improvements */
@media screen and (max-width: 768px) {
  .modal-box {
    width: 95vw;
    max-height: 90dvh;
    max-height: 90vh;
    /* Fallback */
  }

  /* Fix dropdown height on mobile */
  .dropdown .dropdown-content {
    max-height: 70dvh;
    max-height: 70vh;
    /* Fallback */
    /* Prevent dropdowns from overflowing viewport */
    right: auto;
    left: 0;
    width: 90vw;
    max-width: calc(100vw - 2rem);
  }

  /* Form inputs full width on mobile */
  .form-control {
    width: 100%;
  }
}

/* iPhone specific: Prevent zoom on input focus */
@media screen and (max-width: 768px) {

  input,
  textarea,
  select {
    font-size: 16px !important;
    /* Prevents iOS zoom on focus */
  }

  /* Prevent horizontal scroll on mobile */
  html,
  body {
    overflow-x: hidden;
  }

  /* Fix container width on mobile */
  .container {
    max-width: 100%;
    padding-left: 1rem;
    padding-right: 1rem;
  }

  /* Ensure cards don't overflow */
  .card {
    max-width: 100%;
  }

  /* Main content padding adjustment for mobile */
  main.container {
    padding-bottom: 6rem !important;
  }
}

/* ===== Cards / sections ===== */
.card {
  border-radius: 1rem;
  padding: 1.5rem 1.5rem 0 1.5rem;
}

.card-body {
  gap: 0.75rem;
}

.card:hover {
  transform: none !important;
  box-shadow: none !important;
}

/* Chart card, stats tiles, and their responsive breakpoints live in
   style.css (unscoped) — this component's <style scoped> can't reach
   ChartsSection.vue's markup, so a duplicate copy here would be dead CSS. */

/* ===== Toast stack spacing ===== */
.toast .alert {
  gap: 0.5rem;
  align-items: center;
}

/* ===== Modal tweaks ===== */
.modal-box {
  border-radius: 1rem;
}

/* ===== Minor utilities ===== */
.max-w-xs {
  max-width: 20rem;
}

/* prefers-reduced-motion (SC 2.3.3) is handled once, globally, in style.css */

@media (prefers-contrast: more) {
  :root:not([data-theme="dark"]) {
    color-scheme: light;
  }

  :root {
    --fallback-bc: #0b0b0b;
  }
}

/* Force underline on links (no color-only state, SC 1.4.1) */
.prose a,
a.underline-always {
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

/* Balance table mode: hide only the chart canvas area, keep all chart type icons visible. */
section:has(.chart-view-toggle[aria-pressed="true"]) .chart-canvas-area {
  display: none !important;
}

/* Keep chart type selector icons visible in table mode - only hide the canvas. */
section:has(.chart-view-toggle[aria-pressed="true"]) [aria-label="Chart type"]>label {
  /* No longer hidden - icons stay visible */
}

/* Improve table mode visual feedback: highlight the table button more prominently */
.chart-view-toggle[aria-pressed="true"] {
  box-shadow: 0 0 0 2px oklch(var(--p) / 0.3);
  transition: box-shadow 0.2s ease, background-color 0.2s ease;
}

/* ===== WCAG 2.2 Accessibility Enhancements ===== */

/* 1. Focus Visible - Enhanced focus indicators (WCAG 2.4.7) */
/* Apply to all interactive elements */
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
[tabindex]:focus-visible,
a:focus-visible,
.tab:focus-visible,
.badge:focus-visible {
  outline: 3px solid oklch(var(--p) / 0.7);
  outline-offset: 2px;
  border-radius: 0.25rem;
}

/* 2. Touch Target Sizes (WCAG 2.5.8 Target Size Minimum) */
/* Minimum 24x24px, with 44x44px recommended for primary actions */
@media (hover: none) and (pointer: coarse) {

  /* Primary interactive elements */
  .btn,
  .tab,
  .badge-lg.badge-outline {
    min-height: 44px;
    padding: 0.5rem 1rem;
  }

  /* Form controls */
  input[type="checkbox"],
  input[type="radio"] {
    width: 24px;
    height: 24px;
  }

  .form-control input,
  .form-control select,
  .form-control textarea {
    min-height: 44px;
  }

  /* Category/Tag badges in modal */
  .badge.badge-lg {
    min-height: 36px;
    min-width: 36px;
    padding: 0.25rem 0.75rem;
  }

  /* Radio group buttons */
  .join .btn {
    min-height: 44px;
  }
}

/* 3. Modal Dialog Accessibility (WCAG 2.1.1 Keyboard) */
.modal-box form {
  max-height: 85vh;
  overflow-y: auto;
  scrollbar-width: thin;
}

/* 4. High Contrast Mode Support (WCAG 1.4.11 Non-text Contrast) */
@media (prefers-contrast: more) {
  .badge-outline {
    border-width: 2px !important;
  }

  .btn-ghost {
    border: 2px solid oklch(var(--bc) / 0.6);
  }

  .input-bordered,
  .select-bordered {
    border-width: 2px !important;
  }

  /* Increase contrast for interactive elements */
  .tab {
    border: 2px solid transparent;
  }

  .tab-active {
    border-color: oklch(var(--p) / 1);
  }
}

/* 5. Status Messages (WCAG 4.1.3 Status Messages) */
/* Live regions for dynamic content updates */
.chart-info-badge {
  position: relative;
}

/* Screen reader only text */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* 6. Color Contrast Enhancement */
/* Ensure text meets AA contrast ratio (4.5:1 for normal, 3:1 for large) */
.stat-title {
  color: oklch(var(--bc) / 0.8);
}

.stat-desc {
  color: oklch(var(--bc) / 0.7);
}

/* Chart legend accessibility */
.chart-legend-item {
  min-height: 24px;
  padding: 0.25rem 0.5rem;
}

/* 7. Error Prevention (WCAG 3.3.1 Error Identification) */
.alert-error {
  border-left: 4px solid oklch(var(--er) / 1);
}

/* 8. Label Visibility */
/* Ensure form labels are always visible and associated */
.label-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: oklch(var(--bc) / 1);
}

/* 9. Spacing for motor impairments */
/* Minimum 8px gap between interactive elements */
.flex-wrap.gap-2>* {
  margin: 0.25rem;
}

/* 10. Heading hierarchy */
/* Ensure proper heading structure */
h1,
h2,
h3,
h4,
h5,
h6 {
  font-weight: 600;
  color: oklch(var(--bc) / 1);
}

/* ===== Mobile Transaction Card ===== */
.tx-card-mobile {
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.tx-card-mobile:active {
  transform: scale(0.98);
}

/* Line clamp utility for description truncation */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Mobile chart type buttons: smaller join buttons */
@media screen and (max-width: 767px) {
  .join.join-vertical .btn {
    padding: 0.35rem 0.5rem;
    font-size: 0.7rem;
  }

  /* Smaller touch targets for chart type grid on mobile */
  .chart-type-join .btn {
    min-height: 2rem;
    padding: 0.25rem 0.4rem;
  }
}
</style>
