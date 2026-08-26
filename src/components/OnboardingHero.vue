<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <!-- Get Started / Onboarding -->
  <section class="fixed inset-0 z-[60] bg-base-100/90 backdrop-blur p-4 lg:p-10" role="dialog"
    aria-modal="true" aria-labelledby="onboardingTitle" @keydown.escape.prevent="$emit('skip')">
    <div class="max-w-3xl mx-auto" tabindex="-1">
      <div class="card bg-base-100 shadow-2xl">
        <div class="card-body p-6 lg:p-8 space-y-6">
          <!-- Step 0 -->
          <div v-if="step === 0" class="text-center space-y-5">
            <h1 id="onboardingTitle" class="text-3xl lg:text-4xl font-extrabold">
              Let's get your data in
            </h1>
            <p class="text-base-content/70">
              Pick one of the options below. You can change your mind later.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button class="btn btn-primary" @click="$emit('import')" data-testid="cta-import">
                📥 Import Data
              </button>
              <button class="btn" @click="$emit('manual-add')">
                ✍️ Add Transactions Manually
              </button>
              <button class="btn btn-outline" @click="$emit('demo')">
                🥳 Try demo data
              </button>
            </div>
          </div>

          <!-- Step 1: demo confirm -->
          <div v-else-if="step === 1" class="text-center space-y-5">
            <h2 class="text-2xl lg:text-3xl font-bold">Load demo data?</h2>
            <p class="text-base-content/70">
              We'll add a realistic sample so you can explore charts and
              filters.
            </p>
            <div class="flex justify-center gap-3">
              <button class="btn btn-primary" @click="$emit('load-demo')">
                Load & explore
              </button>
            </div>
          </div>
        </div>

        <!-- Tour controls -->
        <div class="card-actions justify-between px-6 pb-6 -mt-2">
          <button class="btn btn-ghost btn-sm" @click="$emit('back')" :disabled="step === 0">
            ◀ Back
          </button>
          <button class="btn btn-ghost btn-sm" @click="$emit('skip')">
            Skip for now
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  step: number;
}>();

defineEmits<{
  (e: "import"): void;
  (e: "manual-add"): void;
  (e: "demo"): void;
  (e: "load-demo"): void;
  (e: "back"): void;
  (e: "skip"): void;
}>();
</script>
