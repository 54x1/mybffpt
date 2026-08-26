<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <!-- Import / Export -->
  <section :id="'panel-import'" role="tabpanel" :aria-labelledby="'tab-import'"
    class="card bg-base-100 shadow-xl mb-6" tabindex="0">

    <div class="card-body">
      <h2 id="importExportHeading" class="card-title">
        📥 Import / 📤 Export
      </h2>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Importers -->
        <div class="space-y-6">
          <!-- File upload -->
          <div class="form-control">
            <label class="label" for="csvUpload">
              <span class="label-text">Upload CSV File</span>
            </label>
            <input id="csvUpload" type="file" accept=".csv" multiple class="file-input file-input-bordered w-full"
              @change="$emit('file-upload', $event)" />
            <p class="text-xs text-base-content/60 mt-1">
              After upload you'll be prompted to label the import (e.g.,
              "ING Everyday - May 2025").
            </p>
          </div>

          <!-- URL / Share code -->
          <div class="form-control">
            <label class="label" for="importUrl">
              <span class="label-text">Import from URL or Share Code</span>
            </label>
            <div class="join">
              <input id="importUrl" v-model="importUrl" type="text" inputmode="url" autocapitalize="off"
                autocorrect="off" placeholder="https://... or share code (tx:...)"
                class="input input-bordered join-item flex-1" @keyup.enter="$emit('import-url-or-code')" />
              <button type="button" class="btn btn-primary join-item" @click="$emit('import-url-or-code')"
                :disabled="!importUrl.trim()">
                Import
              </button>
            </div>
            <p class="text-xs text-base-content/60 mt-1">
              Tip: Paste a link with <code>?tx=...</code> or just the
              share code (starts with <code>tx:</code>).
            </p>
          </div>

          <!-- Import Actions -->
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-outline btn-sm" @click="$emit('import-clipboard')">
              📋 Paste from Clipboard
            </button>
            <button type="button" class="btn btn-error btn-sm" @click="$emit('clear-all')">
              🧨 Remove all transactions
            </button>
          </div>
        </div>

        <!-- Exporters -->
        <div class="space-y-6">
          <!-- Share code -->
          <div class="form-control">
            <label class="label" for="shareCode">
              <span class="label-text">Share Code (compact, paste anywhere)</span>
            </label>
            <div class="join">
              <input id="shareCode" :value="shareCode" readonly
                class="input input-bordered join-item flex-1 font-mono text-sm" />
              <button type="button" class="btn join-item" @click="$emit('copy', shareCode)"
                :disabled="!shareCode || shareCode === 'tx:'">
                Copy
              </button>
            </div>
            <p class="text-xs text-base-content/60 mt-1">
              Length: <strong>{{ shareCodeLength }}</strong> characters.
              <span v-if="shareCodeLength > shareUrlSafeLimit" class="text-warning">
                (Tip: Use JSON export for very large datasets.)
              </span>
            </p>
            <div class="alert alert-warning text-xs mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-4 w-4" fill="none"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                This code is <strong>unencrypted</strong> — anyone who has it can
                read your full ledger. Use <strong>Generate Share Code</strong> to
                create an encrypted, password-protected code instead.
              </span>
            </div>
            <p class="text-xs text-base-content/60 mt-1">
              Paste into the "Import from URL or Share Code" box.
            </p>
          </div>

          <!-- JSON Export / Import -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">JSON Export / Import</span>
            </label>
            <div class="flex flex-wrap gap-2 items-center">
              <button type="button" class="btn btn-outline btn-sm" @click="$emit('download-json')"
                :disabled="transactionCount === 0">
                ⬇️ Download JSON
              </button>
              <label class="btn btn-outline btn-sm cursor-pointer">
                ⬆️ Upload JSON
                <input type="file" accept="application/json" class="sr-only" @change="$emit('json-import', $event)" />
              </label>
            </div>
            <p class="text-xs text-base-content/60 mt-1">
              Use JSON to transfer large datasets offline without relying
              on long links.
            </p>
          </div>

          <!-- Import Encrypted Export -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Import Encrypted Export</span>
            </label>
            <div class="flex flex-wrap gap-2 items-center">
              <label class="btn btn-outline btn-sm cursor-pointer">
                🔓 Import
                <input type="file" accept=".enc,.enc.json,.enc.csv,application/octet-stream"
                  class="sr-only" @change="$emit('encrypted-import', $event)" />
              </label>
            </div>
            <p class="text-xs text-base-content/60 mt-1">
              Import a password-protected <code>.enc</code> file you exported
              (JSON or CSV). You'll be asked for the password to decrypt it
              locally.
            </p>
          </div>

          <!-- Phase 1: Export Format Buttons -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Export Formats</span>
            </label>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="btn btn-primary btn-sm" @click="$emit('open-export-modal')"
                :disabled="transactionCount === 0 || exportInProgress">
                📤 Export Data
                <span v-if="exportInProgress" class="loading loading-spinner loading-xs"></span>
              </button>
              <button type="button" class="btn btn-accent btn-sm" @click="$emit('generate-share-codes')"
                :disabled="transactionCount === 0">
                🔗 Generate Share Code
              </button>
            </div>
            <p class="text-xs text-base-content/60 mt-1">
              Export your data in multiple formats or generate share codes.
            </p>
          </div>

          <!-- Phase 4: Export Progress -->
          <div v-if="exportInProgress" class="form-control mt-3">
            <progress class="progress progress-primary" :value="exportProgress" max="100"></progress>
            <p class="text-xs text-base-content/60 mt-1">
              Exporting... {{ exportProgress }}%
            </p>
          </div>

          <!-- Web Share API -->
          <div v-if="canWebShare" class="form-control">
            <label class="label">
              <span class="label-text">Share via Device</span>
            </label>
            <button type="button" class="btn btn-outline btn-sm" @click="$emit('web-share')"
              :disabled="!shareCode || shareCode === 'tx:'">
              📱 Share via...
            </button>
            <p class="text-xs text-base-content/60 mt-1">
              Use your device's native sharing options.
            </p>
          </div>

          <!-- Import Status -->
          <div v-if="importStatus" class="alert" :class="importError ? 'alert-error' : 'alert-info'">
            <span>{{ importStatus }}</span>
          </div>

          <!-- Last Import Summary -->
          <div v-if="lastImportSummary" class="alert alert-success">
            <span>{{ lastImportSummary }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const importUrl = defineModel<string>("importUrl", { required: true });

defineProps<{
  shareCode: string;
  shareCodeLength: number;
  shareUrlSafeLimit: number;
  transactionCount: number;
  exportInProgress: boolean;
  exportProgress: number;
  canWebShare: boolean;
  importStatus: string;
  importError: boolean;
  lastImportSummary: string;
}>();

defineEmits<{
  (e: "file-upload", event: Event): void;
  (e: "import-url-or-code"): void;
  (e: "import-clipboard"): void;
  (e: "clear-all"): void;
  (e: "copy", text: string): void;
  (e: "download-json"): void;
  (e: "json-import", event: Event): void;
  (e: "encrypted-import", event: Event): void;
  (e: "open-export-modal"): void;
  (e: "generate-share-codes"): void;
  (e: "web-share"): void;
}>();
</script>
