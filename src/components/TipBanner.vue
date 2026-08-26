<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <!-- Dismissible Tip Banner -->
  <section class="alert alert-info mb-4 flex justify-between" role="status" aria-live="polite">
    <div>
      <h2 class="font-semibold mb-1">Quick start tips:</h2>
      <ol class="list-decimal ml-5 space-y-1">
        <li>
          Use <strong>Smart Filters</strong> like "uber last 30d >20" to
          find transactions quickly.
        </li>
        <li>
          Select multiple rows and use <strong>Bulk Edit</strong> to clean
          up categories.
        </li>
        <li>
          Create <strong>Custom Categories</strong> in the 'Add'
          transaction form.
        </li>
      </ol>
    </div>
    <button class="btn btn-ghost btn-sm" @click="$emit('dismiss')">
      Dismiss
    </button>
  </section>
</template>

<script setup lang="ts">
defineEmits<{
  (e: "dismiss"): void;
}>();
</script>
