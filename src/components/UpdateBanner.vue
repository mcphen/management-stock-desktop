<template>
  <Transition name="slide-down">
    <div
      v-if="state !== 'idle'"
      class="flex items-center gap-3 px-4 py-2.5 text-sm border-b"
      :class="state === 'downloaded'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : 'bg-blue-50 border-blue-200 text-blue-800'"
    >
      <!-- Icône -->
      <span class="text-base flex-shrink-0">
        {{ state === 'downloaded' ? '✅' : '🔔' }}
      </span>

      <!-- Message -->
      <span class="flex-1">
        <template v-if="state === 'available'">
          Nouvelle version <strong>v{{ updateVersion }}</strong> disponible.
        </template>
        <template v-else-if="state === 'downloading'">
          Téléchargement de la mise à jour en cours…
        </template>
        <template v-else-if="state === 'downloaded'">
          Mise à jour <strong>v{{ updateVersion }}</strong> prête.
          Redémarrez pour l'installer.
        </template>
      </span>

      <!-- Actions -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <button
          v-if="state === 'available'"
          @click="download"
          class="px-3 py-1 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Télécharger
        </button>
        <button
          v-if="state === 'downloaded'"
          @click="install"
          class="px-3 py-1 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          Redémarrer
        </button>
        <button
          v-if="state !== 'downloading'"
          @click="dismiss"
          class="text-current opacity-50 hover:opacity-100 transition-opacity text-lg leading-none"
          title="Ignorer"
        >
          ×
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

type BannerState = 'idle' | 'available' | 'downloading' | 'downloaded'

const state         = ref<BannerState>('idle')
const updateVersion = ref('')

let offAvailable:  (() => void) | null = null
let offDownloaded: (() => void) | null = null

onMounted(() => {
  offAvailable = window.electron.on('updater:available', (data: unknown) => {
    const d = data as { version: string }
    updateVersion.value = d.version
    state.value = 'available'
  })

  offDownloaded = window.electron.on('updater:downloaded', (data: unknown) => {
    const d = data as { version: string }
    updateVersion.value = d.version
    state.value = 'downloaded'
  })
})

onUnmounted(() => {
  offAvailable?.()
  offDownloaded?.()
})

function download(): void {
  state.value = 'downloading'
  window.electron.updater.download()
}

function install(): void {
  window.electron.updater.install()
}

function dismiss(): void {
  state.value = 'idle'
}
</script>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.slide-down-enter-from, .slide-down-leave-to {
  opacity: 0;
  max-height: 0;
}
.slide-down-enter-to, .slide-down-leave-from {
  max-height: 60px;
}
</style>
