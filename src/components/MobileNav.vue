<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <nav
    class="btm-nav lg:hidden z-[55] shadow-[0_-2px_6px_0px_rgba(0,0,0,0.1)] border-t border-base-300 safe-area-bottom"
    aria-label="Primary (mobile)">
    <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="$emit('select', tab.id)"
      type="button" class="target-min focus-ring min-h-[48px] min-w-[48px] touch-manip"
      :aria-current="activeTab === tab.id ? 'page' : undefined">
      <span class="text-lg" aria-hidden="true">{{ tab.icon }}</span>
      <span class="btm-nav-label text-xs">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
export interface NavTab {
  id: string;
  label: string;
  icon: string;
}

defineProps<{
  tabs: NavTab[];
  activeTab: string;
}>();

defineEmits<{
  (e: "select", id: string): void;
}>();
</script>
