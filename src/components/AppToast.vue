<template>
  <Teleport to="body">
    <div class="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="t in toast.toasts"
          :key="t.id"
          class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium min-w-[240px] max-w-xs"
          :class="{
            'bg-emerald-600 text-white': t.type === 'success',
            'bg-red-600 text-white':     t.type === 'error',
            'bg-gray-800 text-white':    t.type === 'info',
          }"
        >
          <span class="text-base leading-none">
            {{ t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ' }}
          </span>
          <span class="flex-1">{{ t.message }}</span>
          <button class="opacity-70 hover:opacity-100 ml-1 leading-none" @click="toast.remove(t.id)">✕</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastStore } from '../stores/toast.store'
const toast = useToastStore()
</script>
