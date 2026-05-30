<template>
  <div class="p-6 space-y-5">

    <!-- Header -->
    <PageHeader
      title="Transferts entre caisses"
      :breadcrumbs="[
        { label: 'Tableau de bord', to: '/dashboard' },
        { label: 'Finances' },
        { label: 'Caisses', to: '/caisse' },
        { label: 'Transferts' },
      ]"
    >
      <div class="flex items-center gap-2">
        <button @click="router.push('/caisse')"
          class="flex items-center gap-1.5 text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-lg transition-colors">
          <WalletIcon :size="14" /> Gérer les caisses
        </button>
        <button @click="openNewTransfer"
          class="flex items-center gap-1.5 text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg transition-colors">
          <ArrowRightLeftIcon :size="14" /> Nouveau transfert
        </button>
      </div>
    </PageHeader>

    <!-- Table card -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">

      <!-- Toolbar / filtres -->
      <div class="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">

        <!-- Caisse source -->
        <div>
          <p class="text-[11px] font-semibold text-slate-500 mb-1">Caisse source</p>
          <select v-model.number="filters.source_caisse_id"
            class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            <option :value="0">Toutes</option>
            <option v-for="c in caisses" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <!-- Caisse destination -->
        <div>
          <p class="text-[11px] font-semibold text-slate-500 mb-1">Caisse destination</p>
          <select v-model.number="filters.destination_caisse_id"
            class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            <option :value="0">Toutes</option>
            <option v-for="c in caisses" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <!-- Période -->
        <div>
          <p class="text-[11px] font-semibold text-slate-500 mb-1">Période</p>
          <select v-model="filters.period"
            class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            <option value="">Toutes</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="custom">Plage personnalisée</option>
          </select>
        </div>

        <!-- Dates custom -->
        <template v-if="filters.period === 'custom'">
          <div>
            <p class="text-[11px] font-semibold text-slate-500 mb-1">Du</p>
            <input type="date" v-model="filters.start_date"
              class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <p class="text-[11px] font-semibold text-slate-500 mb-1">Au</p>
            <input type="date" v-model="filters.end_date"
              class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
        </template>

        <!-- Par page -->
        <div>
          <p class="text-[11px] font-semibold text-slate-500 mb-1">Par page</p>
          <select v-model.number="filters.per_page"
            class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            <option :value="10">10</option>
            <option :value="15">15</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>

        <div class="flex items-end ml-auto">
          <button @click="applyFilters"
            class="flex items-center gap-1.5 text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg transition-colors">
            <FilterIcon :size="13" /> Filtrer
          </button>
        </div>
      </div>

      <!-- Table -->
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
            <th class="text-left px-4 py-3 font-semibold">Date</th>
            <th class="text-left px-4 py-3 font-semibold">Source</th>
            <th class="text-left px-4 py-3 font-semibold">Destination</th>
            <th class="text-right px-4 py-3 font-semibold">Montant source</th>
            <th class="text-right px-4 py-3 font-semibold">Montant dest.</th>
            <th class="text-right px-4 py-3 font-semibold">Taux</th>
            <th class="text-right px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-if="loading">
            <td colspan="7" class="py-10 text-center text-slate-400 text-xs">Chargement…</td>
          </tr>
          <tr v-else-if="pageItems.length === 0">
            <td colspan="7" class="py-10 text-center text-slate-400 text-xs">Aucun transfert</td>
          </tr>
          <tr v-else v-for="t in pageItems" :key="t.id" class="hover:bg-slate-50/60 transition-colors">
            <td class="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{{ formatDate(t.date) }}</td>
            <td class="px-4 py-3">
              <span class="font-medium text-slate-700">{{ t.source_name }}</span>
              <span v-if="t.source_currency" class="ml-1 text-[10px] text-slate-400">{{ t.source_currency }}</span>
            </td>
            <td class="px-4 py-3">
              <span class="font-medium text-slate-700">{{ t.dest_name }}</span>
              <span v-if="t.dest_currency" class="ml-1 text-[10px] text-slate-400">{{ t.dest_currency }}</span>
            </td>
            <td class="px-4 py-3 text-right font-semibold text-red-500 whitespace-nowrap">
              −{{ formatMoney(t.amount_source) }}
            </td>
            <td class="px-4 py-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
              {{ t.amount_dest !== null ? '+' + formatMoney(t.amount_dest) : '—' }}
            </td>
            <td class="px-4 py-3 text-right text-slate-500 text-xs">
              {{ t.exchange_rate ? t.exchange_rate : '—' }}
            </td>
            <td class="px-4 py-3 text-right">
              <button @click="openDetails(t)"
                class="text-[11px] font-medium px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors">
                Détails
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination footer -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60">
        <p class="text-xs text-slate-500">Total : {{ filtered.length }}</p>
        <div class="flex items-center gap-1">
          <button @click="goToPage(currentPage - 1)" :disabled="currentPage <= 1"
            class="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
            <ChevronLeftIcon :size="13" />
          </button>
          <button v-for="p in visiblePages" :key="p" @click="goToPage(p)"
            class="w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors"
            :class="p === currentPage ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-100'">
            {{ p }}
          </button>
          <button @click="goToPage(currentPage + 1)" :disabled="currentPage >= lastPage"
            class="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
            <ChevronRightIcon :size="13" />
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Modal Détails ══════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showInfo" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" @click="showInfo = false" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 class="text-base font-semibold text-slate-800">Détails du transfert</h3>
              <button @click="showInfo = false" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <XIcon :size="16" />
              </button>
            </div>
            <div v-if="selectedTransfer" class="px-5 py-4 space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-50 rounded-lg p-3">
                  <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Caisse source</p>
                  <p class="text-sm font-semibold text-slate-800">{{ selectedTransfer.source_name }}</p>
                  <p v-if="selectedTransfer.source_currency" class="text-xs text-slate-400">{{ selectedTransfer.source_currency }}</p>
                </div>
                <div class="bg-slate-50 rounded-lg p-3">
                  <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Caisse destination</p>
                  <p class="text-sm font-semibold text-slate-800">{{ selectedTransfer.dest_name }}</p>
                  <p v-if="selectedTransfer.dest_currency" class="text-xs text-slate-400">{{ selectedTransfer.dest_currency }}</p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-red-50 rounded-lg p-3">
                  <p class="text-[10px] font-semibold text-red-400 uppercase tracking-wide mb-1">Montant source</p>
                  <p class="text-base font-bold text-red-600">−{{ formatMoney(selectedTransfer.amount_source) }}</p>
                </div>
                <div class="bg-emerald-50 rounded-lg p-3">
                  <p class="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide mb-1">Montant destination</p>
                  <p class="text-base font-bold text-emerald-600">
                    {{ selectedTransfer.amount_dest !== null ? '+' + formatMoney(selectedTransfer.amount_dest) : '—' }}
                  </p>
                </div>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span class="text-slate-500">Date</span>
                  <span class="font-medium text-slate-700">{{ formatDate(selectedTransfer.date) }}</span>
                </div>
                <div v-if="selectedTransfer.exchange_rate" class="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span class="text-slate-500">Taux de change</span>
                  <span class="font-medium text-slate-700">{{ selectedTransfer.exchange_rate }}</span>
                </div>
                <div v-if="selectedTransfer.description" class="flex items-center justify-between py-1.5">
                  <span class="text-slate-500">Description</span>
                  <span class="font-medium text-slate-700 text-right max-w-[60%]">{{ selectedTransfer.description }}</span>
                </div>
              </div>
            </div>
            <div class="flex justify-end px-5 py-4 border-t border-slate-100 bg-slate-50">
              <button @click="showInfo = false"
                class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Fermer</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ Modal Nouveau transfert ════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showNew" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" @click="showNew = false" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 class="text-base font-semibold text-slate-800">Nouveau transfert</h3>
              <button @click="showNew = false" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <XIcon :size="16" />
              </button>
            </div>
            <div class="px-5 py-4 space-y-4">
              <p class="text-sm text-slate-500">Sélectionnez la caisse source pour initier un transfert.</p>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Caisse source</label>
                <select v-model.number="selectedSource"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
                  <option :value="0">— Sélectionner —</option>
                  <option v-for="c in caisses" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
            </div>
            <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
              <button @click="showNew = false"
                class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
              <button @click="goToSourceCaisse" :disabled="!selectedSource"
                class="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                <ArrowRightIcon :size="13" /> Continuer
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  WalletIcon, ArrowRightLeftIcon, FilterIcon, XIcon,
  ChevronLeftIcon, ChevronRightIcon, ArrowRightIcon,
} from 'lucide-vue-next'
import PageHeader from '../../../components/PageHeader.vue'
import { useToastStore } from '../../../stores/toast.store'
import type { Caisse, CaisseTransaction } from '../../../electron.d'

const router = useRouter()
const toast  = useToastStore()

// ── Transfer view model ───────────────────────────────────────
interface TransferRow {
  id:              number
  date:            string
  source_name:     string
  source_currency: string
  dest_name:       string
  dest_currency:   string
  amount_source:   number
  amount_dest:     number | null
  exchange_rate:   number | null
  description:     string | null
}

// ── State ─────────────────────────────────────────────────────
const loading  = ref(false)
const caisses  = ref<Caisse[]>([])
const allRows  = ref<TransferRow[]>([])
const currentPage = ref(1)

const filters = ref({
  source_caisse_id:      0,
  destination_caisse_id: 0,
  period:      '' as '' | 'today' | 'week' | 'month' | 'custom',
  start_date:  '',
  end_date:    '',
  per_page:    15,
})

// ── Filtered + paginated ──────────────────────────────────────
const filtered = computed<TransferRow[]>(() => {
  let rows = allRows.value

  if (filters.value.source_caisse_id) {
    const name = caisses.value.find(c => c.id === filters.value.source_caisse_id)?.name ?? ''
    rows = rows.filter(r => r.source_name === name)
  }

  if (filters.value.destination_caisse_id) {
    const name = caisses.value.find(c => c.id === filters.value.destination_caisse_id)?.name ?? ''
    rows = rows.filter(r => r.dest_name === name)
  }

  if (filters.value.period && filters.value.period !== 'custom') {
    const now  = new Date()
    const today = now.toISOString().split('T')[0]!
    if (filters.value.period === 'today') {
      rows = rows.filter(r => r.date.startsWith(today))
    } else if (filters.value.period === 'week') {
      const start = new Date(now); start.setDate(start.getDate() - start.getDay() + 1)
      const end   = new Date(start); end.setDate(end.getDate() + 6)
      rows = rows.filter(r => r.date >= start.toISOString().split('T')[0]! && r.date <= end.toISOString().split('T')[0]!)
    } else if (filters.value.period === 'month') {
      const ym = today.slice(0, 7)
      rows = rows.filter(r => r.date.startsWith(ym))
    }
  } else if (filters.value.period === 'custom') {
    if (filters.value.start_date) rows = rows.filter(r => r.date >= filters.value.start_date)
    if (filters.value.end_date)   rows = rows.filter(r => r.date <= filters.value.end_date)
  }

  return rows
})

const lastPage = computed(() => Math.max(1, Math.ceil(filtered.value.length / filters.value.per_page)))

const visiblePages = computed(() => {
  const pages: number[] = []
  const cur  = currentPage.value
  const last = lastPage.value
  for (let p = Math.max(1, cur - 2); p <= Math.min(last, cur + 2); p++) pages.push(p)
  return pages
})

const pageItems = computed<TransferRow[]>(() => {
  const s = (currentPage.value - 1) * filters.value.per_page
  return filtered.value.slice(s, s + filters.value.per_page)
})

function applyFilters() { currentPage.value = 1 }
function goToPage(p: number) { currentPage.value = Math.max(1, Math.min(p, lastPage.value)) }

// ── Load data ─────────────────────────────────────────────────
async function loadCaisses() {
  try { caisses.value = await window.electron.caisses.list() } catch { /* silent */ }
}

async function loadTransfers() {
  loading.value = true
  try {
    const res = await window.electron.caisse.list({ per_page: 500 })
    type TxnRow = CaisseTransaction & { caisse_id?: number }
    const txns = res.data as TxnRow[]

    const caisseMap = new Map<number, Caisse>()
    caisses.value.forEach(c => caisseMap.set(c.id, c))

    const caisseByName = new Map<string, Caisse>()
    caisses.value.forEach(c => caisseByName.set(c.name.toLowerCase(), c))

    // Helper: is this transaction a transfer sortie? (both web + desktop patterns)
    const isTransferSortie = (t: TxnRow) =>
      t.type === 'sortie' && (
        (t.objet ?? '').startsWith('Transfert vers') ||         // desktop local
        (t.objet ?? '').toLowerCase() === 'transfert sortant'   // synced from web
      )

    // Helper: is this transaction a transfer entrée?
    const isTransferEntree = (t: TxnRow) =>
      t.type === 'entree' && (
        (t.objet ?? '').startsWith('Transfert de') ||           // desktop local
        (t.objet ?? '').toLowerCase() === 'transfert entrant'   // synced from web
      )

    const sorties = txns.filter(isTransferSortie)
    const entrees = txns.filter(isTransferEntree)

    allRows.value = sorties.map(s => {
      const srcCaisse = s.caisse_id ? caisseMap.get(s.caisse_id) : undefined

      // Determine dest from objet (desktop "Transfert vers X") or find via matching entrée
      let destName  = (s.objet ?? '').replace(/^Transfert vers\s*/i, '').trim()
      let destCaisse: Caisse | undefined = caisseByName.get(destName.toLowerCase())

      // Find matching entrée: same date + same description (most reliable cross-pattern key)
      const matchingEntree = entrees.find(e =>
        e.date === s.date &&
        (e.description ?? '') === (s.description ?? '') &&
        e.caisse_id !== s.caisse_id   // must be a different caisse
      )

      if (matchingEntree && !destCaisse) {
        destCaisse = matchingEntree.caisse_id ? caisseMap.get(matchingEntree.caisse_id) : undefined
        destName   = destCaisse?.name ?? '—'
      }

      return {
        id:              s.id,
        date:            s.date,
        source_name:     srcCaisse?.name ?? '—',
        source_currency: srcCaisse?.currency_code ?? 'XOF',
        dest_name:       destName || destCaisse?.name || '—',
        dest_currency:   destCaisse?.currency_code ?? 'XOF',
        amount_source:   s.amount,
        amount_dest:     matchingEntree ? matchingEntree.amount : null,
        exchange_rate:   null,
        description:     s.description ?? null,
      } as TransferRow
    })

    allRows.value.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  } catch {
    toast.show('Impossible de charger les transferts', 'error')
  } finally {
    loading.value = false
  }
}

// ── Détails modal ─────────────────────────────────────────────
const showInfo        = ref(false)
const selectedTransfer = ref<TransferRow | null>(null)

function openDetails(t: TransferRow) {
  selectedTransfer.value = t
  showInfo.value = true
}

// ── Nouveau transfert modal ───────────────────────────────────
const showNew        = ref(false)
const selectedSource = ref(0)

function openNewTransfer() {
  selectedSource.value = caisses.value[0]?.id ?? 0
  showNew.value = true
}

function goToSourceCaisse() {
  if (!selectedSource.value) return
  showNew.value = false
  router.push({ name: 'caisse-show', params: { id: selectedSource.value } })
}

// ── Helpers ───────────────────────────────────────────────────
function formatDate(d: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(Number(n || 0))
}

onMounted(async () => {
  await loadCaisses()
  await loadTransfers()
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.18s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; }
.modal-enter-active .relative,
.modal-leave-active .relative            { transition: transform 0.18s ease; }
.modal-enter-from .relative,
.modal-leave-to .relative                { transform: scale(0.96); }
</style>
