<template>
  <div class="p-6">
    <PageHeader title="Tableau de bord">
      <button
        @click="sync.syncNow()"
        class="btn btn-primary btn-sm flex items-center gap-1.5"
        :disabled="sync.syncState === 'syncing' || !sync.isOnline"
      >
        <RefreshCwIcon :size="13" :class="sync.syncState === 'syncing' ? 'animate-spin' : ''" />
        {{ sync.syncState === 'syncing' ? 'Synchronisation...' : 'Synchroniser' }}
      </button>
    </PageHeader>

    <!-- ── Bloc 1 : KPI Cards ─────────────────────────────────────── -->
    <StatGeneral />

    <!-- ── Bloc 2 : Accès rapides ────────────────────────────────── -->
    <div class="card mb-4">
      <div class="p-3 flex flex-wrap gap-2">
        <RouterLink to="/invoices/create" class="btn btn-success btn-sm">
          <PlusCircleIcon :size="13" /> Nouvelle facture
        </RouterLink>
        <RouterLink to="/clients" class="btn btn-primary btn-sm">
          <UsersIcon :size="13" /> Clients
        </RouterLink>
        <RouterLink to="/articles" class="btn btn-warning btn-sm">
          <PackageIcon :size="13" /> Stock
        </RouterLink>
        <RouterLink to="/caisse" class="btn btn-secondary btn-sm">
          <WalletIcon :size="13" /> Caisse
        </RouterLink>
        <RouterLink to="/clients/comptes" class="btn btn-secondary btn-sm">
          <BookIcon :size="13" /> Comptabilité clients
        </RouterLink>
        <RouterLink to="/sync" class="btn btn-secondary btn-sm">
          <FileTextIcon :size="13" /> Rapports
        </RouterLink>
      </div>
    </div>

    <!-- ── Bloc 4 : CA & Bénéfice par mois ──────────────────────── -->
    <div class="mb-4">
      <StatsCaBenefice />
    </div>

    <!-- ── Bloc 3 : Évolution CA + Top Clients ───────────────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
      <div class="lg:col-span-2">
        <EvolutionCA />
      </div>
      <div>
        <TopClients />
      </div>
    </div>

    <!-- ── Sync banner ────────────────────────────────────────────── -->
    <div
      class="card p-4 flex items-center gap-4"
      :class="sync.isOnline ? '' : 'border-amber-200 bg-amber-50/60'"
    >
      <div
        class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        :class="sync.isOnline ? 'bg-emerald-100' : 'bg-amber-100'"
      >
        <RefreshCwIcon
          :size="16"
          :class="[
            sync.isOnline ? 'text-emerald-600' : 'text-amber-600',
            sync.syncState === 'syncing' ? 'animate-spin' : '',
          ]"
        />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-slate-800">{{ sync.statusLabel }}</p>
        <p class="text-[11px] text-slate-400 mt-0.5 truncate">
          {{ sync.lastSyncedAt
             ? `Dernière synchronisation : ${formatDate(sync.lastSyncedAt)}`
             : 'Données locales uniquement — aucune synchronisation effectuée' }}
        </p>
      </div>
      <button
        v-if="sync.isOnline"
        @click="sync.syncNow()"
        :disabled="sync.syncState === 'syncing'"
        class="btn btn-primary btn-sm flex-shrink-0"
      >
        <RefreshCwIcon :size="13" :class="sync.syncState === 'syncing' ? 'animate-spin' : ''" />
        {{ sync.syncState === 'syncing' ? 'Sync…' : sync.pendingCount > 0 ? `Sync (${sync.pendingCount})` : 'Synchroniser' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import {
  RefreshCwIcon, PlusCircleIcon, UsersIcon,
  PackageIcon, WalletIcon, BookIcon, FileTextIcon,
} from 'lucide-vue-next'
import { useSyncStore } from '../stores/sync.store'
import PageHeader from '../components/PageHeader.vue'
import StatGeneral from './Dashboard/StatGeneral.vue'
import StatsCaBenefice from './Dashboard/StatsCaBenefice.vue'
import EvolutionCA from './Dashboard/EvolutionCA.vue'
import TopClients from './Dashboard/TopClients.vue'

const sync = useSyncStore()

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR')
}
</script>
