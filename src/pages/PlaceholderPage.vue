<template>
  <div class="p-6 flex flex-col items-center justify-center min-h-80 text-center">
    <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl mb-4">🚧</div>
    <h3 class="text-base font-semibold text-gray-700 mb-1">Section en développement</h3>
    <p class="text-sm text-gray-400 max-w-xs">Cette fonctionnalité sera disponible prochainement.</p>
    <button class="btn btn-secondary btn-sm mt-5" @click="router.back()">← Retour</button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>
