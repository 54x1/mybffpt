<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <!-- Empty state hero -->
  <section :id="`panel-${activeTab}`" role="tabpanel" :aria-labelledby="`tab-${activeTab}`"
    class="hero min-h-[60vh] card bg-base-100 shadow-xl">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <div class="text-8xl mb-6" aria-hidden="true">📊</div>
        <h2 class="text-3xl font-bold">No transactions yet</h2>
        <p class="py-6 text-base-content/70">
          Import your bank data or add a transaction to get started.
        </p>
        <div class="flex flex-wrap gap-4 justify-center">
          <button class="btn btn-primary" @click="$emit('import')">
            📥 Import Data
          </button>
          <button class="btn" @click="$emit('manual-add')">
            ✍️ Add Transactions Manually
          </button>
          <button class="btn btn-outline" @click="$emit('load-demo')">
            🥳 Load Demo Data
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  activeTab: string;
}>();

defineEmits<{
  (e: "import"): void;
  (e: "manual-add"): void;
  (e: "load-demo"): void;
}>();
</script>
