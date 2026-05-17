<template>
  <div class="p-6 max-w-5xl">
    <PageHeader title="Tableau de bord" />

    <!-- Skeleton -->
    <div v-if="isLoading" class="space-y-5">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="card p-5 h-24 skeleton"></div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="card p-5 h-44 skeleton"></div>
        <div class="card p-5 h-44 skeleton"></div>
      </div>
    </div>

    <div v-else class="space-y-5">

      <!-- ── KPI Cards ─────────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div class="card p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clients</span>
            <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <UsersIcon :size="16" class="text-blue-600" />
            </div>
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900 leading-none">{{ stats?.clients.total ?? 0 }}</p>
            <p class="text-[11px] text-slate-400 mt-1">clients enregistrés</p>
          </div>
        </div>

        <div class="card p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock</span>
            <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <PackageIcon :size="16" class="text-indigo-600" />
            </div>
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900 leading-none">{{ stats?.articles.total ?? 0 }}</p>
            <p class="text-[11px] text-slate-400 mt-1">articles en stock</p>
          </div>
        </div>

        <div class="card p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chiffre d'affaires</span>
            <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUpIcon :size="16" class="text-emerald-600" />
            </div>
          </div>
          <div>
            <p class="text-xl font-bold text-slate-900 leading-none">{{ formatAmount(stats?.invoices.ca_total ?? 0) }}</p>
            <p class="text-[11px] text-slate-400 mt-1">FCFA total</p>
          </div>
        </div>

        <div class="card p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Caisse</span>
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center"
              :class="(stats?.caisse.solde ?? 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'"
            >
              <WalletIcon :size="16" :class="(stats?.caisse.solde ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'" />
            </div>
          </div>
          <div>
            <p
              class="text-xl font-bold leading-none"
              :class="(stats?.caisse.solde ?? 0) >= 0 ? 'text-slate-900' : 'text-red-600'"
            >{{ formatAmount(stats?.caisse.solde ?? 0) }}</p>
            <p class="text-[11px] text-slate-400 mt-1">FCFA solde</p>
          </div>
        </div>

      </div>

      <!-- ── Détails ────────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <!-- Factures -->
        <div class="card overflow-hidden">
          <div class="card-section">
            <span class="card-section-label flex items-center gap-1.5">
              <FileTextIcon :size="11" />
              Factures
            </span>
            <RouterLink to="/invoices" class="text-[11px] text-blue-600 hover:text-blue-700 font-medium">
              Voir tout →
            </RouterLink>
          </div>
          <div class="p-5 space-y-3">
            <DetailRow label="Total factures"   :value="String(stats?.invoices.total ?? 0)" />
            <DetailRow
              label="En attente"
              :value="String(stats?.invoices.pending ?? 0)"
              value-class="text-amber-600 font-semibold"
            />
            <DetailRow label="Ce mois-ci"  :value="String(stats?.invoices.this_month ?? 0)" />
            <div class="border-t border-slate-100 pt-3">
              <DetailRow
                label="CA ce mois"
                :value="formatAmount(stats?.invoices.ca_this_month ?? 0) + ' FCFA'"
                value-class="text-emerald-600 font-bold"
              />
            </div>
          </div>
        </div>

        <!-- Caisse -->
        <div class="card overflow-hidden">
          <div class="card-section">
            <span class="card-section-label flex items-center gap-1.5">
              <WalletIcon :size="11" />
              Caisse
            </span>
            <RouterLink to="/caisse" class="text-[11px] text-blue-600 hover:text-blue-700 font-medium">
              Voir tout →
            </RouterLink>
          </div>
          <div class="p-5 space-y-3">
            <DetailRow label="Entrées" :value="formatAmount(stats?.caisse.entrees ?? 0) + ' FCFA'" value-class="text-emerald-600 font-semibold" />
            <DetailRow label="Sorties" :value="formatAmount(stats?.caisse.sorties ?? 0) + ' FCFA'" value-class="text-red-500 font-semibold" />
            <div class="border-t border-slate-100 pt-3">
              <DetailRow
                label="Solde net"
                :value="formatAmount(stats?.caisse.solde ?? 0) + ' FCFA'"
                :value-class="(stats?.caisse.solde ?? 0) >= 0 ? 'text-slate-900 font-bold' : 'text-red-600 font-bold'"
              />
            </div>
          </div>
        </div>

      </div>

      <!-- ── Sync banner ────────────────────────────────── -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineComponent, h } from 'vue'
import { RouterLink } from 'vue-router'
import { UsersIcon, PackageIcon, TrendingUpIcon, WalletIcon, FileTextIcon, RefreshCwIcon } from 'lucide-vue-next'
import { useSyncStore } from '../stores/sync.store'
import PageHeader from '../components/PageHeader.vue'

const sync      = useSyncStore()
const isLoading = ref(true)
const stats     = ref<Record<string, Record<string, number>> | null>(null)

// ── Mini-composant inline ─────────────────────────────────
const DetailRow = defineComponent({
  props: { label: String, value: String, valueClass: String },
  setup(props) {
    return () => h('div', { class: 'flex items-center justify-between text-sm' }, [
      h('span', { class: 'text-slate-500' }, props.label),
      h('span', { class: props.valueClass ?? 'text-slate-800 font-medium' }, props.value),
    ])
  },
})

function formatAmount(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n))
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR')
}

onMounted(async () => {
  const now       = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [clientsData, articlesData, allInvoices, pendingInvoices, thisMonthInvoices, caisseData] =
    await Promise.all([
      window.electron.clients.list({ per_page: 1 }),
      window.electron.articles.list({ per_page: 1 }),
      window.electron.invoices.list({ per_page: 500 }),
      window.electron.invoices.list({ per_page: 1, status: 'pending' }),
      window.electron.invoices.list({ per_page: 500 }),
      window.electron.caisse.solde(),
    ])

  const caTotal     = (allInvoices.data as { total_price: number }[]).reduce((s, i) => s + (i.total_price ?? 0), 0)
  const caThisMonth = (thisMonthInvoices.data as { total_price: number; date: string }[])
    .filter(i => i.date?.startsWith(thisMonth)).reduce((s, i) => s + (i.total_price ?? 0), 0)
  const countThisMonth = (thisMonthInvoices.data as { date: string }[])
    .filter(i => i.date?.startsWith(thisMonth)).length

  stats.value = {
    clients:  { total: clientsData.total },
    articles: { total: articlesData.total },
    invoices: {
      total: allInvoices.total,
      pending: pendingInvoices.total,
      this_month: countThisMonth,
      ca_this_month: caThisMonth,
      ca_total: caTotal,
    },
    caisse: { entrees: caisseData.entrees, sorties: caisseData.sorties, solde: caisseData.solde },
  }
  isLoading.value = false
})
</script>
