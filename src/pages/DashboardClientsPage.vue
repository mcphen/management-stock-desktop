<template>
  <div class="p-6">
    <PageHeader
      title="Dashboard — Clients & Comptabilité"
      :breadcrumbs="[
        { label: 'Tableau de bord', to: '/dashboard' },
        { label: 'Clients & Comptabilité' },
      ]"
    >
      <button @click="fetchAll" class="btn btn-primary btn-sm" :disabled="loading">
        <RefreshCwIcon :size="13" :class="loading ? 'animate-spin' : ''" />
        Actualiser
      </button>
    </PageHeader>

    <!-- KPI cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      <div v-for="stat in kpiStats" :key="stat.key" class="card p-4 text-center">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
          :style="{ backgroundColor: stat.color + '1a' }"
        >
          <component :is="stat.icon" :size="18" :style="{ color: stat.color }" />
        </div>
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 leading-tight">
          {{ stat.label }}
        </p>
        <p class="text-sm font-bold leading-tight" :style="{ color: stat.color }">
          <span v-if="loading">—</span>
          <span v-else>{{ stat.value }}</span>
        </p>
        <div v-if="stat.key === 'taux' && !loading" class="mt-1.5 bg-slate-200 rounded-full h-1">
          <div
            class="h-1 rounded-full transition-all"
            :style="{ width: Math.min(kpi?.taux_recouvrement ?? 0, 100) + '%', backgroundColor: stat.color }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div class="skeleton h-52 rounded-xl"></div>
      <div class="skeleton h-64 rounded-xl"></div>
    </div>

    <template v-else>

      <!-- ── Évolution Factures vs Paiements ─────────────────────── -->
      <div class="card overflow-hidden mb-4">
        <div class="card-section">
          <span class="card-section-label flex items-center gap-1.5">
            <LineChartIcon :size="11" />
            Factures vs Paiements — 6 derniers mois
          </span>
          <div class="flex gap-1 border border-slate-200 rounded p-0.5">
            <button
              v-for="tab in ['chart','table']" :key="tab"
              @click="evoTab = tab"
              class="px-2 py-1 text-[10px] rounded transition-colors"
              :class="evoTab === tab ? 'bg-blue-100 text-blue-600 font-semibold' : 'text-slate-400'"
            >
              <component :is="tab === 'chart' ? LineChartIcon : TableIcon" :size="9" class="inline mr-0.5" />
              {{ tab === 'chart' ? 'Graphique' : 'Tableau' }}
            </button>
          </div>
        </div>

        <div class="p-4">
          <template v-if="evolution.length">

            <!-- SVG dual-line chart -->
            <div v-show="evoTab === 'chart'" class="relative select-none">
              <svg
                :viewBox="`0 0 ${SVG_W} ${SVG_H + LABEL_H}`"
                class="w-full overflow-visible"
                style="height: 200px"
              >
                <!-- Grid -->
                <line
                  v-for="tick in evoYTicks" :key="tick.y"
                  :x1="PAD_L" :y1="tick.y" :x2="SVG_W - PAD_R" :y2="tick.y"
                  stroke="#e2e8f0" stroke-width="1"
                />
                <text
                  v-for="tick in evoYTicks" :key="`yl-${tick.y}`"
                  :x="PAD_L - 6" :y="tick.y + 4"
                  text-anchor="end" font-size="9" fill="#94a3b8"
                >{{ fmtShort(tick.val) }}</text>

                <!-- Area fills -->
                <path v-if="evoAreaFact" :d="evoAreaFact" fill="rgba(111,66,193,0.07)" />
                <path v-if="evoAreaPay"  :d="evoAreaPay"  fill="rgba(40,167,69,0.07)" />

                <!-- Lines -->
                <path v-if="evoLineFact" :d="evoLineFact" fill="none" stroke="#6f42c1" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
                <path v-if="evoLinePay"  :d="evoLinePay"  fill="none" stroke="#28a745" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

                <!-- Dots Facturé -->
                <g
                  v-for="(pt, i) in evoPointsFact" :key="`f${i}`"
                  @mouseenter="evoHovered = i" @mouseleave="evoHovered = null"
                  style="cursor: default"
                >
                  <circle :cx="pt.x" :cy="pt.y" r="14" fill="transparent" />
                  <circle :cx="pt.x" :cy="pt.y" :r="evoHovered === i ? 6 : 4" fill="#6f42c1" stroke="white" stroke-width="2" class="transition-all duration-100" />
                </g>

                <!-- Dots Encaissé -->
                <g
                  v-for="(pt, i) in evoPointsPay" :key="`p${i}`"
                  @mouseenter="evoHovered = i" @mouseleave="evoHovered = null"
                  style="cursor: default"
                >
                  <circle :cx="pt.x" :cy="pt.y" r="14" fill="transparent" />
                  <circle :cx="pt.x" :cy="pt.y" :r="evoHovered === i ? 6 : 4" fill="#28a745" stroke="white" stroke-width="2" class="transition-all duration-100" />
                </g>

                <!-- Tooltip -->
                <g v-if="evoHovered !== null && evoPointsFact[evoHovered]">
                  <rect
                    :x="tooltipX(evoPointsFact[evoHovered].x)"
                    :y="Math.min(evoPointsFact[evoHovered].y, evoPointsPay[evoHovered].y) - 56"
                    width="148" height="50"
                    rx="5" fill="#1e293b" opacity="0.92"
                  />
                  <text :x="tooltipX(evoPointsFact[evoHovered].x) + 74" :y="Math.min(evoPointsFact[evoHovered].y, evoPointsPay[evoHovered].y) - 44" text-anchor="middle" font-size="9" fill="#94a3b8">{{ evolution[evoHovered].month }}</text>
                  <text :x="tooltipX(evoPointsFact[evoHovered].x) + 74" :y="Math.min(evoPointsFact[evoHovered].y, evoPointsPay[evoHovered].y) - 32" text-anchor="middle" font-size="9" fill="#c4b5fd">Facturé : {{ fmt(evolution[evoHovered].total_facture) }}</text>
                  <text :x="tooltipX(evoPointsFact[evoHovered].x) + 74" :y="Math.min(evoPointsFact[evoHovered].y, evoPointsPay[evoHovered].y) - 19" text-anchor="middle" font-size="9" fill="#86efac">Encaissé : {{ fmt(evolution[evoHovered].total_paye) }}</text>
                </g>

                <!-- X labels -->
                <text
                  v-for="(pt, i) in evoPointsFact" :key="`xl-${i}`"
                  :x="pt.x" :y="SVG_H + LABEL_H - 2"
                  text-anchor="middle" font-size="9" fill="#94a3b8"
                >{{ evolution[i].month }}</text>
              </svg>

              <!-- Legend -->
              <div class="flex items-center justify-center gap-4 mt-1">
                <span class="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span class="w-6 h-0.5 inline-block rounded" style="background:#6f42c1"></span>Facturé
                </span>
                <span class="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span class="w-6 h-0.5 inline-block rounded" style="background:#28a745"></span>Encaissé
                </span>
              </div>
            </div>

            <!-- Table Évolution -->
            <div v-show="evoTab === 'table'" class="overflow-x-auto">
              <table class="data-table w-full">
                <thead>
                  <tr>
                    <th>Mois</th>
                    <th class="text-right">Facturé</th>
                    <th class="text-right">Encaissé</th>
                    <th class="text-right">Écart</th>
                    <th class="text-right">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in evolution" :key="row.month">
                    <td class="font-semibold">{{ row.month }}</td>
                    <td class="text-right text-slate-600">{{ fmt(row.total_facture) }}</td>
                    <td class="text-right text-emerald-600 font-semibold">{{ fmt(row.total_paye) }}</td>
                    <td class="text-right font-semibold" :class="(row.total_facture - row.total_paye) <= 0 ? 'text-emerald-600' : 'text-red-600'">
                      {{ fmt(row.total_facture - row.total_paye) }}
                    </td>
                    <td class="text-right">
                      <span class="badge" :class="tauxBadge(row.total_facture, row.total_paye)">
                        {{ tauxPct(row.total_facture, row.total_paye) }}%
                      </span>
                    </td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50">
                  <tr>
                    <td class="font-bold">Total</td>
                    <td class="text-right font-bold text-slate-600">{{ fmt(totFacture) }}</td>
                    <td class="text-right font-bold text-emerald-600">{{ fmt(totPaye) }}</td>
                    <td class="text-right font-bold" :class="(totFacture - totPaye) <= 0 ? 'text-emerald-600' : 'text-red-600'">
                      {{ fmt(totFacture - totPaye) }}
                    </td>
                    <td class="text-right">
                      <span class="badge" :class="tauxBadge(totFacture, totPaye)">
                        {{ tauxPct(totFacture, totPaye) }}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </template>
          <div v-else class="text-center py-6 text-slate-400 text-sm">
            <LineChartIcon :size="24" class="mx-auto mb-2 opacity-40" />
            Aucune donnée sur 6 mois.
          </div>
        </div>
      </div>

      <!-- ── Tableau clients ──────────────────────────────────────── -->
      <div class="card overflow-hidden">
        <div class="card-section flex-wrap gap-2">
          <span class="card-section-label flex items-center gap-1.5">
            <UsersIcon :size="11" />
            Situation comptable par client
          </span>
          <div class="flex items-center gap-3 flex-wrap">
            <label class="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
              <input type="checkbox" v-model="creancesOnly" class="accent-blue-600" />
              Avec créances uniquement
            </label>
            <input
              v-model="search" type="text"
              placeholder="Rechercher un client..."
              class="field text-xs py-1.5"
              style="max-width: 200px"
            />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th @click="doSort('name')" class="cursor-pointer select-none whitespace-nowrap">
                  Client <component :is="sortIconComp('name')" :size="9" class="inline ml-0.5 opacity-60" />
                </th>
                <th @click="doSort('total_ca')" class="cursor-pointer select-none text-right whitespace-nowrap">
                  CA Facturé <component :is="sortIconComp('total_ca')" :size="9" class="inline ml-0.5 opacity-60" />
                </th>
                <th @click="doSort('total_paye')" class="cursor-pointer select-none text-right whitespace-nowrap">
                  Encaissé <component :is="sortIconComp('total_paye')" :size="9" class="inline ml-0.5 opacity-60" />
                </th>
                <th @click="doSort('montant_du')" class="cursor-pointer select-none text-right whitespace-nowrap">
                  Créance <component :is="sortIconComp('montant_du')" :size="9" class="inline ml-0.5 opacity-60" />
                </th>
                <th @click="doSort('taux_recouvrement')" class="cursor-pointer select-none text-right whitespace-nowrap">
                  Taux <component :is="sortIconComp('taux_recouvrement')" :size="9" class="inline ml-0.5 opacity-60" />
                </th>
                <th @click="doSort('nb_factures')" class="cursor-pointer select-none text-center whitespace-nowrap">
                  Factures <component :is="sortIconComp('nb_factures')" :size="9" class="inline ml-0.5 opacity-60" />
                </th>
                <th @click="doSort('derniere_facture')" class="cursor-pointer select-none text-center whitespace-nowrap">
                  Dernière facture <component :is="sortIconComp('derniere_facture')" :size="9" class="inline ml-0.5 opacity-60" />
                </th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="client in paginated" :key="client.id">
                <td class="font-semibold">{{ client.name }}</td>
                <td class="text-right text-slate-600">{{ fmt(client.total_ca) }}</td>
                <td class="text-right text-emerald-600 font-semibold">{{ fmt(client.total_paye) }}</td>
                <td class="text-right font-bold" :class="creanceClass(client.montant_du)">{{ fmt(client.montant_du) }}</td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <div class="flex-1 bg-slate-200 rounded-full h-1.5" style="min-width:40px; max-width:64px">
                      <div
                        class="h-1.5 rounded-full transition-all"
                        :class="tauxBarClass(client.taux_recouvrement)"
                        :style="{ width: Math.min(client.taux_recouvrement, 100) + '%' }"
                      ></div>
                    </div>
                    <span class="badge text-[10px]" :class="tauxBadgeClass(client.taux_recouvrement)">
                      {{ client.taux_recouvrement }}%
                    </span>
                  </div>
                </td>
                <td class="text-center">
                  <span class="badge badge-gray">{{ client.nb_factures }}</span>
                </td>
                <td class="text-center text-slate-400 text-xs">{{ fmtDate(client.derniere_facture) }}</td>
                <td class="text-center">
                  <RouterLink :to="`/clients/${client.id}`" class="btn btn-secondary btn-sm px-2 py-0.5">
                    <EyeIcon :size="10" />
                  </RouterLink>
                </td>
              </tr>
              <tr v-if="!paginated.length">
                <td colspan="8" class="text-center text-slate-400 py-8">Aucun client trouvé.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex justify-between items-center px-4 py-2 border-t border-slate-200">
          <span class="text-[11px] text-slate-400">
            {{ filtered.length }} client(s)<template v-if="search || creancesOnly"> filtrés</template> sur {{ clients.length }}
          </span>
          <div class="flex items-center gap-2">
            <button class="btn btn-secondary btn-sm px-2" :disabled="page <= 1" @click="page--">
              <ChevronLeftIcon :size="12" />
            </button>
            <span class="text-xs text-slate-500">Page {{ page }} / {{ totalPages }}</span>
            <button class="btn btn-secondary btn-sm px-2" :disabled="page >= totalPages" @click="page++">
              <ChevronRightIcon :size="12" />
            </button>
            <select v-model="perPage" class="field text-xs py-1" style="width: auto">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
  RefreshCwIcon, LineChartIcon, TableIcon, UsersIcon,
  BarChart2Icon, CheckCircleIcon, AlertCircleIcon, PieChartIcon,
  AlertTriangleIcon, EyeIcon, ChevronLeftIcon, ChevronRightIcon,
  ArrowUpIcon, ArrowDownIcon, MinusIcon,
} from 'lucide-vue-next'
import PageHeader from '../components/PageHeader.vue'

// ── Types ────────────────────────────────────────────────────
interface KPI {
  nb_clients: number
  total_ca: number
  total_paye: number
  total_du: number
  taux_recouvrement: number
  nb_clients_avec_creances: number
}
interface EvoRow { month: string; total_facture: number; total_paye: number }
interface ClientRow {
  id: number; name: string
  total_ca: number; total_paye: number; montant_du: number
  taux_recouvrement: number; nb_factures: number; derniere_facture: string | null
}

// ── State ────────────────────────────────────────────────────
const loading   = ref(true)
const kpi       = ref<KPI | null>(null)
const evolution = ref<EvoRow[]>([])
const clients   = ref<ClientRow[]>([])

// ── SVG constants ────────────────────────────────────────────
const SVG_W  = 600
const SVG_H  = 160
const PAD_L  = 56
const PAD_R  = 12
const PAD_T  = 16
const PAD_B  = 8
const LABEL_H = 18

// ── Formatters ───────────────────────────────────────────────
function fmt(v: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v ?? 0)
}
function fmtShort(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}G`
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)}M`
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}
function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

// ── KPI cards ────────────────────────────────────────────────
const kpiStats = computed(() => {
  const k = kpi.value ?? {} as KPI
  const taux = k.taux_recouvrement ?? 0
  return [
    { key: 'clients',  label: 'Total clients',          icon: UsersIcon,         color: '#007bff', value: `${k.nb_clients ?? 0} clients` },
    { key: 'ca',       label: 'CA total facturé',        icon: BarChart2Icon,     color: '#6f42c1', value: fmt(k.total_ca) },
    { key: 'paye',     label: 'Total encaissé',          icon: CheckCircleIcon,   color: '#28a745', value: fmt(k.total_paye) },
    { key: 'du',       label: 'Total des créances',      icon: AlertCircleIcon,   color: '#dc3545', value: fmt(k.total_du) },
    { key: 'taux',     label: 'Taux de recouvrement',   icon: PieChartIcon,       color: taux >= 80 ? '#28a745' : taux >= 50 ? '#fd7e14' : '#dc3545', value: `${taux}%` },
    { key: 'creances', label: 'Clients avec créances',  icon: AlertTriangleIcon,  color: '#fd7e14', value: `${k.nb_clients_avec_creances ?? 0} clients` },
  ]
})

// ── Evolution tabs ───────────────────────────────────────────
const evoTab    = ref('chart')
const evoHovered = ref<number | null>(null)

// ── SVG chart computations ───────────────────────────────────
function svgPts(vals: number[], maxV: number): { x: number; y: number }[] {
  const n = vals.length
  if (!n) return []
  const chartW = SVG_W - PAD_L - PAD_R
  const chartH = SVG_H - PAD_T - PAD_B
  return vals.map((v, i) => ({
    x: PAD_L + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW),
    y: PAD_T + chartH - (v / (maxV || 1)) * chartH,
  }))
}

function bezier(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const dx = (pts[i].x - pts[i-1].x) * 0.4
    d += ` C ${pts[i-1].x + dx} ${pts[i-1].y} ${pts[i].x - dx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`
  }
  return d
}

const evoMaxVal = computed(() => {
  const all = evolution.value.flatMap(r => [r.total_facture, r.total_paye])
  return Math.max(...all, 1)
})
const evoPointsFact = computed(() => svgPts(evolution.value.map(r => r.total_facture), evoMaxVal.value))
const evoPointsPay  = computed(() => svgPts(evolution.value.map(r => r.total_paye),    evoMaxVal.value))
const evoLineFact   = computed(() => bezier(evoPointsFact.value))
const evoLinePay    = computed(() => bezier(evoPointsPay.value))

const evoAreaFact = computed(() => {
  const pts = evoPointsFact.value
  if (!pts.length) return ''
  const bottomY = SVG_H - PAD_B
  return `${evoLineFact.value} L ${pts[pts.length-1].x} ${bottomY} L ${pts[0].x} ${bottomY} Z`
})
const evoAreaPay = computed(() => {
  const pts = evoPointsPay.value
  if (!pts.length) return ''
  const bottomY = SVG_H - PAD_B
  return `${evoLinePay.value} L ${pts[pts.length-1].x} ${bottomY} L ${pts[0].x} ${bottomY} Z`
})

const evoYTicks = computed(() => {
  const maxV = evoMaxVal.value
  const chartH = SVG_H - PAD_T - PAD_B
  return [0, 1, 2, 3].map(i => {
    const frac = i / 3
    return { val: Math.round(maxV * frac), y: PAD_T + chartH - frac * chartH }
  })
})

function tooltipX(ptX: number): number {
  if (ptX + 148 > SVG_W - PAD_R) return ptX - 152
  return ptX - 74
}

// ── Évolution totals ─────────────────────────────────────────
const totFacture = computed(() => evolution.value.reduce((s, r) => s + r.total_facture, 0))
const totPaye    = computed(() => evolution.value.reduce((s, r) => s + r.total_paye,    0))

function tauxPct(facture: number, paye: number): number {
  return facture > 0 ? Math.round((paye / facture) * 100) : 100
}
function tauxBadge(facture: number, paye: number): string {
  const t = tauxPct(facture, paye)
  if (t >= 80) return 'badge-green'
  if (t >= 50) return 'badge-yellow'
  return 'badge-red'
}

// ── Clients table ────────────────────────────────────────────
const search       = ref('')
const creancesOnly = ref(false)
const page         = ref(1)
const perPage      = ref(25)
const sortKey      = ref<string>('montant_du')
const sortDir      = ref<'asc' | 'desc'>('desc')

watch([search, creancesOnly, perPage], () => { page.value = 1 })

function doSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

function sortIconComp(key: string) {
  if (sortKey.value !== key) return MinusIcon
  return sortDir.value === 'asc' ? ArrowUpIcon : ArrowDownIcon
}

const filtered = computed(() => {
  let list = clients.value
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(c => c.name.toLowerCase().includes(q))
  }
  if (creancesOnly.value) {
    list = list.filter(c => c.montant_du > 0)
  }
  return [...list].sort((a, b) => {
    const va = (a as Record<string, unknown>)[sortKey.value] ?? 0
    const vb = (b as Record<string, unknown>)[sortKey.value] ?? 0
    if (typeof va === 'string') {
      return sortDir.value === 'asc' ? (va as string).localeCompare(vb as string) : (vb as string).localeCompare(va as string)
    }
    return sortDir.value === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage.value)))
const paginated  = computed(() => {
  const start = (page.value - 1) * perPage.value
  return filtered.value.slice(start, start + perPage.value)
})

function creanceClass(v: number): string {
  if (v <= 0)       return 'text-emerald-600'
  if (v < 500_000)  return 'text-amber-600'
  return 'text-red-600'
}
function tauxBadgeClass(t: number): string {
  if (t >= 100) return 'badge-green'
  if (t >= 80)  return 'badge-blue'
  if (t >= 50)  return 'badge-yellow'
  return 'badge-red'
}
function tauxBarClass(t: number): string {
  if (t >= 80) return 'bg-emerald-500'
  if (t >= 50) return 'bg-amber-400'
  return 'bg-red-500'
}

// ── Data fetch ───────────────────────────────────────────────
async function fetchAll() {
  loading.value = true
  try {
    const res = await window.electron.dashboard.clientsStats()
    kpi.value       = res.kpi
    evolution.value = res.evolution
    clients.value   = res.clients
  } catch (e) {
    console.error('Erreur dashboard clients:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)
</script>
