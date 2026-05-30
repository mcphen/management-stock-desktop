<template>
  <div class="card overflow-hidden">
    <!-- En-tête -->
    <div class="card-section">
      <span class="card-section-label flex items-center gap-1.5">
        <LineChartIcon :size="11" />
        Évolution du CA — 6 derniers mois
      </span>
      <div class="flex items-center gap-2">
        <button @click="fetchEvolution" class="btn btn-primary btn-sm" :disabled="loading">
          <FilterIcon :size="11" /> Appliquer
        </button>
        <button @click="resetFilters" class="btn btn-secondary btn-sm">
          <XIcon :size="11" /> Réinitialiser
        </button>
      </div>
    </div>

    <div class="p-4">
      <!-- Filtres -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Client</label>
          <select v-model="filters.client_id" class="field text-xs py-1.5">
            <option value="">Tous les clients</option>
            <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Essence</label>
          <select v-model="filters.essence" class="field text-xs py-1.5">
            <option value="">Toutes les essences</option>
            <option v-for="ess in essences" :key="ess" :value="ess">{{ ess }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Épaisseur (mm)</label>
          <select v-model="filters.epaisseur" class="field text-xs py-1.5">
            <option value="">Toutes les épaisseurs</option>
            <option value="6">6 mm</option>
            <option value="27">27 mm</option>
            <option value="40">40 mm</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Fournisseur</label>
          <select v-model="filters.fournisseur_id" class="field text-xs py-1.5">
            <option value="">Tous les fournisseurs</option>
            <option v-for="f in fournisseurs" :key="f.id" :value="f.id">{{ f.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">N° Contrat</label>
          <input v-model="filters.contract_number" type="text" class="field text-xs py-1.5" placeholder="Ex: CONT-2025-01" />
        </div>
      </div>

      <!-- Nav tabs -->
      <div class="flex gap-1 border-b border-slate-200 mb-4">
        <button
          v-for="tab in ['chart', 'table']" :key="tab"
          @click="activeTab = tab"
          class="px-3 py-2 text-xs font-medium border-b-2 transition-colors"
          :class="activeTab === tab
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-400 hover:text-slate-600'"
        >
          <component :is="tab === 'chart' ? LineChartIcon : TableIcon" :size="11" class="inline mr-1" />
          {{ tab === 'chart' ? 'Graphique' : 'Tableau' }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-2 py-2">
        <div v-for="i in 6" :key="i" class="skeleton h-6 rounded"></div>
      </div>

      <template v-else-if="rawData.length">

        <!-- ── Line chart SVG ───────────────────────────────── -->
        <div v-show="activeTab === 'chart'" class="relative select-none">
          <svg
            :viewBox="`0 0 ${SVG_W} ${SVG_H + LABEL_H}`"
            class="w-full overflow-visible"
            style="height: 220px"
          >
            <!-- Grille horizontale -->
            <line
              v-for="tick in yTicks" :key="tick.y"
              :x1="PAD_L" :y1="tick.y"
              :x2="SVG_W - PAD_R" :y2="tick.y"
              stroke="#e2e8f0" stroke-width="1"
            />
            <!-- Labels Y -->
            <text
              v-for="tick in yTicks" :key="`yl-${tick.y}`"
              :x="PAD_L - 6" :y="tick.y + 4"
              text-anchor="end" font-size="9" fill="#94a3b8"
            >{{ fmtShort(tick.val) }}</text>

            <!-- Area fill -->
            <path
              v-if="areaPath"
              :d="areaPath"
              fill="rgba(0,123,255,0.08)"
            />
            <!-- Line -->
            <path
              v-if="linePath"
              :d="linePath"
              fill="none"
              stroke="#007bff"
              stroke-width="2"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
            <!-- Points + tooltips -->
            <g
              v-for="(pt, i) in svgPoints" :key="i"
              @mouseenter="hovered = i"
              @mouseleave="hovered = null"
              style="cursor: default"
            >
              <!-- Hit area -->
              <circle :cx="pt.x" :cy="pt.y" r="14" fill="transparent" />
              <!-- Dot -->
              <circle
                :cx="pt.x" :cy="pt.y" :r="hovered === i ? 6 : 5"
                fill="#007bff"
                stroke="white" stroke-width="2"
                class="transition-all duration-100"
              />
              <!-- Tooltip -->
              <g v-if="hovered === i">
                <rect
                  :x="tooltipX(pt.x)" :y="pt.y - 36"
                  width="120" height="26"
                  rx="5" fill="#1e293b" opacity="0.9"
                />
                <text
                  :x="tooltipX(pt.x) + 60" :y="pt.y - 22"
                  text-anchor="middle" font-size="9" fill="#94a3b8"
                >{{ fmtMonth(rawData[i].month) }}</text>
                <text
                  :x="tooltipX(pt.x) + 60" :y="pt.y - 13"
                  text-anchor="middle" font-size="10" font-weight="bold" fill="white"
                >{{ formatPrice(rawData[i].total_revenue) }}</text>
              </g>
            </g>

            <!-- Labels X -->
            <text
              v-for="(pt, i) in svgPoints" :key="`xl-${i}`"
              :x="pt.x" :y="SVG_H + LABEL_H - 2"
              text-anchor="middle" font-size="9" fill="#94a3b8"
            >{{ fmtMonth(rawData[i].month) }}</text>
          </svg>

          <!-- Légende -->
          <div class="flex items-center justify-center gap-2 mt-1">
            <span class="w-6 h-0.5 bg-blue-500 inline-block rounded"></span>
            <span class="text-[10px] text-slate-500">Chiffre d'Affaires</span>
          </div>
        </div>

        <!-- ── Tableau — identique au web ───────────────────── -->
        <div v-show="activeTab === 'table'" class="overflow-x-auto">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Mois</th>
                <th class="text-right">Chiffre d'Affaires</th>
                <th class="text-right">Évolution</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in rawData" :key="row.month">
                <td class="font-semibold">{{ fmtMonth(row.month) }}</td>
                <td class="text-right font-bold text-blue-600">{{ formatPrice(row.total_revenue) }}</td>
                <td class="text-right">
                  <template v-if="i > 0">
                    <span class="badge" :class="evolutionClass(rawData[i-1].total_revenue, row.total_revenue)">
                      <component :is="evolutionIcon(rawData[i-1].total_revenue, row.total_revenue)" :size="9" />
                      {{ evolutionPct(rawData[i-1].total_revenue, row.total_revenue) }}%
                    </span>
                  </template>
                  <span v-else class="text-slate-400 text-xs">—</span>
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-slate-50">
              <tr>
                <td class="font-bold">Total 6 mois</td>
                <td class="text-right font-bold text-blue-600">{{ formatPrice(totalRevenue) }}</td>
                <td class="text-right text-slate-400 text-xs">
                  Moy. {{ formatPrice(Math.round(totalRevenue / rawData.length)) }}/mois
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </template>

      <div v-else class="text-center py-6 text-slate-400 text-sm">
        <LineChartIcon :size="24" class="mx-auto mb-2 opacity-40" />
        Aucune donnée disponible.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  LineChartIcon, FilterIcon, XIcon, TableIcon,
  ArrowUpIcon, ArrowDownIcon, MinusIcon,
} from 'lucide-vue-next'

// ── Constantes SVG ───────────────────────────────────────────
const SVG_W  = 600
const SVG_H  = 160
const PAD_L  = 56
const PAD_R  = 12
const PAD_T  = 16
const PAD_B  = 8
const LABEL_H = 18

// ── State ────────────────────────────────────────────────────
const rawData      = ref<{ month: string; total_revenue: number }[]>([])
const clients      = ref<{ id: number; name: string }[]>([])
const fournisseurs = ref<{ id: number; name: string }[]>([])
const essences     = ['Ayous', 'Frake', 'Dibetou', 'Bois Rouge']
const loading      = ref(false)
const activeTab    = ref('chart')
const hovered      = ref<number | null>(null)

const filters = ref({
  client_id:       '' as string | number,
  essence:         '',
  epaisseur:       '' as string | number,
  fournisseur_id:  '' as string | number,
  contract_number: '',
})

// ── Helpers ──────────────────────────────────────────────────
const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function fmtMonth(ym: string): string {
  const [year, month] = ym.split('-').map(Number)
  return `${MONTHS[month] ?? month} ${year}`
}

function formatPrice(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'XOF', maximumFractionDigits: 0,
  }).format(v ?? 0)
}

function fmtShort(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}G`
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)}M`
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

// ── Totaux ───────────────────────────────────────────────────
const totalRevenue = computed(() => rawData.value.reduce((s, r) => s + r.total_revenue, 0))

// ── SVG chart ────────────────────────────────────────────────
const svgPoints = computed(() => {
  const n    = rawData.value.length
  if (!n) return []
  const vals = rawData.value.map(r => r.total_revenue)
  const maxV = Math.max(...vals, 1)
  const minV = 0
  const rangeV = maxV - minV || 1
  const chartW = SVG_W - PAD_L - PAD_R
  const chartH = SVG_H - PAD_T - PAD_B

  return vals.map((v, i) => ({
    x: PAD_L + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW),
    y: PAD_T + chartH - ((v - minV) / rangeV) * chartH,
  }))
})

// Bezier path (tension 0.4, same as chart.js default)
function bezierPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const dx   = (curr.x - prev.x) * 0.4
    d += ` C ${prev.x + dx} ${prev.y} ${curr.x - dx} ${curr.y} ${curr.x} ${curr.y}`
  }
  return d
}

const linePath = computed(() => bezierPath(svgPoints.value))

const areaPath = computed(() => {
  const pts = svgPoints.value
  if (!pts.length) return ''
  const line    = bezierPath(pts)
  const bottomY = SVG_H - PAD_B
  return `${line} L ${pts[pts.length - 1].x} ${bottomY} L ${pts[0].x} ${bottomY} Z`
})

// Ticks Y (4 niveaux)
const yTicks = computed(() => {
  const vals = rawData.value.map(r => r.total_revenue)
  const maxV = Math.max(...vals, 1)
  const chartH = SVG_H - PAD_T - PAD_B
  return [0, 1, 2, 3].map(i => {
    const frac = i / 3
    return {
      val: Math.round(maxV * frac),
      y:   PAD_T + chartH - frac * chartH,
    }
  })
})

function tooltipX(ptX: number): number {
  if (ptX + 120 > SVG_W - PAD_R) return ptX - 124
  return ptX - 60
}

// ── Évolution ────────────────────────────────────────────────
function evolutionPct(prev: number, curr: number): number {
  if (!prev) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
}

function evolutionClass(prev: number, curr: number): string {
  const p = evolutionPct(prev, curr)
  if (p > 0) return 'badge-green'
  if (p < 0) return 'badge-red'
  return 'badge-gray'
}

function evolutionIcon(prev: number, curr: number) {
  const p = evolutionPct(prev, curr)
  if (p > 0) return ArrowUpIcon
  if (p < 0) return ArrowDownIcon
  return MinusIcon
}

// ── Data ─────────────────────────────────────────────────────
function activeFilters(): Record<string, unknown> {
  const f: Record<string, unknown> = {}
  if (filters.value.client_id)       f['client_id']       = filters.value.client_id
  if (filters.value.essence)         f['essence']         = filters.value.essence
  if (filters.value.epaisseur)       f['epaisseur']       = filters.value.epaisseur
  if (filters.value.fournisseur_id)  f['fournisseur_id']  = filters.value.fournisseur_id
  if (filters.value.contract_number) f['contract_number'] = filters.value.contract_number
  return f
}

async function fetchEvolution(): Promise<void> {
  loading.value = true
  try {
    rawData.value = await window.electron.dashboard.evolutionCa(activeFilters())
  } catch (e) {
    console.error('Erreur évolution CA:', e)
  } finally {
    loading.value = false
  }
}

function resetFilters(): void {
  filters.value = { client_id: '', essence: '', epaisseur: '', fournisseur_id: '', contract_number: '' }
  fetchEvolution()
}

onMounted(async () => {
  fetchEvolution()
  const [clientsRes, suppliersRes] = await Promise.all([
    window.electron.clients.list({ per_page: 500 }),
    window.electron.suppliers.list({ per_page: 500 }),
  ])
  clients.value      = clientsRes.data as { id: number; name: string }[]
  fournisseurs.value = suppliersRes.data as { id: number; name: string }[]
})
</script>
