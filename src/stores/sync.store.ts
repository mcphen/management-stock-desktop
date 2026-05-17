import { defineStore } from 'pinia'
import { ref, computed, onMounted, onUnmounted } from 'vue'

export type SyncState = 'idle' | 'syncing' | 'error'

export const useSyncStore = defineStore('sync', () => {
  const isOnline      = ref(false)
  const lastSyncedAt  = ref<string | null>(null)
  const pendingCount  = ref(0)
  const syncState     = ref<SyncState>('idle')
  const lastError     = ref<string | null>(null)
  const conflictCount = ref(0)

  const statusLabel = computed(() => {
    if (!isOnline.value)        return 'Hors ligne'
    if (syncState.value === 'syncing') return 'Synchronisation...'
    if (pendingCount.value > 0) return `${pendingCount.value} en attente`
    return 'Synchronisé'
  })

  const statusColor = computed(() => {
    if (!isOnline.value)              return 'text-gray-400'
    if (syncState.value === 'error')  return 'text-red-500'
    if (syncState.value === 'syncing')return 'text-blue-500'
    if (pendingCount.value > 0)       return 'text-yellow-500'
    return 'text-green-500'
  })

  async function init(): Promise<void> {
    const status = await window.electron.sync.getStatus()
    isOnline.value     = status.isOnline
    lastSyncedAt.value = status.lastSyncedAt
    await refreshPendingCount()

    // Écouter les événements du main process
    const cleanupNetwork  = window.electron.on('network:status',   (data: unknown) => {
      isOnline.value = (data as { online: boolean }).online
    })
    const cleanupStarted  = window.electron.on('sync:started',     () => { syncState.value = 'syncing' })
    const cleanupDone     = window.electron.on('sync:completed',   (data: unknown) => {
      const d = data as { pulled: number; pushed: number; conflicts: number; at: string }
      syncState.value    = 'idle'
      lastSyncedAt.value = d.at
      conflictCount.value = d.conflicts
      refreshPendingCount()
    })
    const cleanupError    = window.electron.on('sync:error',       (data: unknown) => {
      syncState.value = 'error'
      lastError.value = (data as { message: string }).message
    })

    // Cleanup au démontage du composant qui appelle init()
    onUnmounted(() => {
      cleanupNetwork()
      cleanupStarted()
      cleanupDone()
      cleanupError()
    })
  }

  async function syncNow(): Promise<void> {
    syncState.value = 'syncing'
    try {
      const result = await window.electron.sync.now()
      if (!result.success) {
        lastError.value = result.message ?? 'Erreur inconnue'
        syncState.value = 'error'
      } else {
        syncState.value = 'idle'
      }
      await refreshPendingCount()
    } catch (err) {
      syncState.value = 'error'
      lastError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function refreshPendingCount(): Promise<void> {
    pendingCount.value = await window.electron.sync.getPendingCount()
  }

  return {
    isOnline, lastSyncedAt, pendingCount, syncState, lastError,
    conflictCount, statusLabel, statusColor,
    init, syncNow, refreshPendingCount,
  }
})
