<template>
  <div class="p-6 max-w-2xl">
    <PageHeader
      title="Synchronisation"
      :breadcrumbs="[{ label: 'Tableau de bord', to: '/dashboard' }, { label: 'Synchronisation' }]"
    />

    <!-- Statut principal -->
    <div class="card p-5 mb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div
            class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            :class="sync.isOnline ? 'bg-emerald-50' : 'bg-slate-100'"
          >
            {{ sync.isOnline ? '🌐' : '📴' }}
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-800">{{ sync.statusLabel }}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              Dernière sync : {{ sync.lastSyncedAt ? formatDate(sync.lastSyncedAt) : 'Jamais' }}
            </p>
          </div>
        </div>
        <button
          @click="sync.syncNow()"
          :disabled="!sync.isOnline || sync.syncState === 'syncing'"
          class="btn btn-primary"
        >
          {{ sync.syncState === 'syncing' ? '⟳ En cours…' : '↻ Synchroniser' }}
        </button>
      </div>
    </div>

    <!-- Compteurs -->
    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold" :class="sync.pendingCount > 0 ? 'text-amber-500' : 'text-gray-900'">{{ sync.pendingCount }}</p>
        <p class="text-xs text-gray-400 mt-1">En attente</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold" :class="sync.conflictCount > 0 ? 'text-red-600' : 'text-gray-900'">{{ sync.conflictCount }}</p>
        <p class="text-xs text-gray-400 mt-1">Conflits</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-sm font-bold" :class="sync.isOnline ? 'text-emerald-600' : 'text-slate-400'">
          {{ sync.isOnline ? 'En ligne' : 'Hors ligne' }}
        </p>
        <p class="text-xs text-gray-400 mt-1">Connectivité</p>
      </div>
    </div>

    <!-- Erreur -->
    <div v-if="sync.syncState === 'error' && sync.lastError" class="card p-4 mb-4 border-red-200 bg-red-50">
      <p class="text-sm font-semibold text-red-700 mb-1">⚠ Erreur de synchronisation</p>
      <p class="text-sm text-red-600">{{ sync.lastError }}</p>
    </div>

    <!-- Info mode offline -->
    <div class="card p-4 border-blue-100 bg-blue-50/60">
      <p class="text-sm font-semibold text-blue-700 mb-1">ℹ Mode hors ligne</p>
      <p class="text-sm text-blue-600 leading-relaxed">
        Toutes vos modifications sont sauvegardées localement et seront synchronisées automatiquement à la prochaine connexion. Vos données sont sécurisées même sans accès au serveur.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSyncStore } from '../stores/sync.store'
import PageHeader from '../components/PageHeader.vue'

const sync = useSyncStore()
function formatDate(iso: string) { return new Date(iso).toLocaleString('fr-FR') }
</script>
