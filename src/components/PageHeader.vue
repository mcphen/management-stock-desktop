<template>
  <div class="mb-6">
    <!-- Title row -->
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-lg font-bold text-slate-900 leading-tight truncate">{{ title }}</h1>

        <!-- Breadcrumb -->
        <nav v-if="breadcrumbs?.length" class="flex items-center gap-1 mt-1 flex-wrap">
          <template v-for="(crumb, i) in breadcrumbs" :key="i">
            <RouterLink
              v-if="crumb.to"
              :to="crumb.to"
              class="text-[11px] text-slate-400 hover:text-blue-600 transition-colors"
            >{{ crumb.label }}</RouterLink>
            <span v-else class="text-[11px] text-slate-500 font-medium">{{ crumb.label }}</span>
            <ChevronRightIcon
              v-if="i < breadcrumbs.length - 1"
              :size="10"
              class="text-slate-300 flex-shrink-0"
            />
          </template>
        </nav>
      </div>

      <!-- Action buttons slot -->
      <div class="flex items-center gap-2 flex-shrink-0 pt-0.5">
        <slot />
      </div>
    </div>

    <!-- Separator -->
    <div class="mt-4 h-px bg-slate-200/80"></div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ChevronRightIcon } from 'lucide-vue-next'

defineProps<{
  title: string
  breadcrumbs?: { label: string; to?: string }[]
}>()
</script>
