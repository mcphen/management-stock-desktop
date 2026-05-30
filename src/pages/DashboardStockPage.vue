<template>
  <div class="p-6">
    <PageHeader
      title="Tableau de bord — Stock"
      :breadcrumbs="[
        { label: 'Tableau de bord', to: '/dashboard' },
        { label: 'Stock' },
      ]"
    >
      <button @click="fetchAll" class="btn btn-primary btn-sm" :disabled="loading">
        <RefreshCwIcon :size="13" :class="loading ? 'animate-spin' : ''" />
        Actualiser
      </button>
    </PageHeader>

    <!-- ── KPI Cards ─────────────────────────────────────────── -->
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
      </div>
    </div>

    <!-- ── Loading ───────────────────────────────────────────── -->
    <div v-if="loading" class="space-y-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="card p-5 h-56 skeleton"></div>
        <div class="card p-5 h-56 skeleton"></div>
      </div>
      <div class="card p-5 h-48 skeleton"></div>
    </div>

    <template v-else>
      <!-- ── Ligne 1 : Essence + Épaisseur ───────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <!-- Par essence -->
        <div class="card overflow-hidden">
          <div class="card-section">
            <span class="card-section-label flex items-center gap-1.5">
              <LeafIcon :size="11" />
              Répartition par essence
            </span>
            <TabToggle v-model="tabEssence" />
          </div>

          <div class="p-5">
            <!-- Chart -->
            <div v-show="tabEssence === 'chart'">
              <div v-if="parEssence.length" class="space-y-2.5">
                <div v-for="(row, i) in parEssence" :key="row.essence" class="flex items-center gap-3">
                  <span
                    class="w-3 h-3 rounded-sm flex-shrink-0"
                    :style="{ background: COLORS[i % COLORS.length] }"
                  ></span>
                  <span class="text-xs text-slate-600 w-24 flex-shrink-0 truncate">{{ row.essence }}</span>
                  <div class="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                    <div
                      class="h-full rounded transition-all duration-500"
                      :style="{
                        width: pctOf(row.nb_colis, totEssence.colis) + '%',
                        background: COLORS[i % COLORS.length],
                      }"
                    ></div>
                  </div>
                  <span class="text-[11px] text-slate-500 w-10 text-right flex-shrink-0">
                    {{ pctOf(row.nb_colis, totEssence.colis) }}%
                  </span>
                </div>
              </div>
              <p v-else class="text-center text-slate-400 text-sm py-4">Aucune donnée</p>
            </div>

            <!-- Table -->
            <div v-show="tabEssence === 'table'" class="overflow-x-auto -mx-5">
              <table class="data-table w-full">
                <thead>
                  <tr>
                    <th>Essence</th>
                    <th class="text-right">Colis</th>
                    <th class="text-right">Volume (m³)</th>
                    <th class="text-right">Valeur estimée</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in parEssence" :key="row.essence">
                    <td class="font-semibold">{{ row.essence }}</td>
                    <td class="text-right">{{ row.nb_colis }}</td>
                    <td class="text-right">{{ fmtVol(row.volume_total) }}</td>
                    <td class="text-right font-semibold text-blue-600">{{ fmt(row.valeur_estimee) }}</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50">
                  <tr>
                    <td class="font-bold">Total</td>
                    <td class="text-right font-bold">{{ totEssence.colis }}</td>
                    <td class="text-right font-bold">{{ fmtVol(totEssence.volume) }}</td>
                    <td class="text-right font-bold text-blue-600">{{ fmt(totEssence.valeur) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <!-- Par épaisseur -->
        <div class="card overflow-hidden">
          <div class="card-section">
            <span class="card-section-label flex items-center gap-1.5">
              <LayersIcon :size="11" />
              Répartition par épaisseur
            </span>
            <TabToggle v-model="tabEpaisseur" />
          </div>

          <div class="p-5">
            <!-- Chart -->
            <div v-show="tabEpaisseur === 'chart'">
              <div v-if="parEpaisseur.length" class="flex items-end gap-4 h-36 px-2">
                <div
                  v-for="(row, i) in parEpaisseur"
                  :key="row.epaisseur"
                  class="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                >
                  <span class="text-[10px] text-slate-500 font-semibold">{{ row.nb_colis }}</span>
                  <div
                    class="w-full rounded-t transition-all duration-500"
                    style="background: #fd7e14"
                    :style="{ height: pctOf(row.nb_colis, totEpaisseur.colis) + '%' }"
                  ></div>
                  <span class="text-[10px] text-slate-400">{{ row.epaisseur }} mm</span>
                </div>
              </div>
              <p v-else class="text-center text-slate-400 text-sm py-4">Aucune donnée</p>
            </div>

            <!-- Table -->
            <div v-show="tabEpaisseur === 'table'" class="overflow-x-auto -mx-5">
              <table class="data-table w-full">
                <thead>
                  <tr>
                    <th>Épaisseur</th>
                    <th class="text-right">Colis</th>
                    <th class="text-right">Volume (m³)</th>
                    <th class="text-right">% colis</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in parEpaisseur" :key="row.epaisseur">
                    <td class="font-semibold">{{ row.epaisseur }} mm</td>
                    <td class="text-right">{{ row.nb_colis }}</td>
                    <td class="text-right">{{ fmtVol(row.volume_total) }}</td>
                    <td class="text-right">
                      <span class="badge badge-blue">{{ pctOf(row.nb_colis, totEpaisseur.colis) }}%</span>
                    </td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50">
                  <tr>
                    <td class="font-bold">Total</td>
                    <td class="text-right font-bold">{{ totEpaisseur.colis }}</td>
                    <td class="text-right font-bold">{{ fmtVol(totEpaisseur.volume) }}</td>
                    <td class="text-right font-bold">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Ligne 2 : Par fournisseur ───────────────────────── -->
      <div class="card overflow-hidden">
        <div class="card-section">
          <span class="card-section-label flex items-center gap-1.5">
            <TruckIcon :size="11" />
            Répartition par fournisseur
          </span>
          <TabToggle v-model="tabFournisseur" />
        </div>

        <div class="p-5">
          <!-- Chart -->
          <div v-show="tabFournisseur === 'chart'">
            <div v-if="parFournisseur.length" class="space-y-3">
              <div v-for="(row, i) in parFournisseur" :key="row.name" class="space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-semibold text-slate-700 truncate max-w-[180px]">{{ row.name }}</span>
                  <span class="text-slate-400 flex-shrink-0 ml-2">
                    {{ row.nb_colis }} colis — {{ fmtVol(row.volume_total) }} m³
                  </span>
                </div>
                <div class="flex gap-1 items-center">
                  <div class="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                    <div
                      class="h-full rounded transition-all duration-500"
                      :style="{
                        width: pctOf(row.nb_colis, totFournisseur.colis) + '%',
                        background: COLORS[i % COLORS.length],
                      }"
                    ></div>
                  </div>
                  <span class="text-[11px] text-slate-400 w-8 text-right flex-shrink-0">
                    {{ pctOf(row.nb_colis, totFournisseur.colis) }}%
                  </span>
                </div>
              </div>
            </div>
            <p v-else class="text-center text-slate-400 text-sm py-4">Aucune donnée</p>
          </div>

          <!-- Table -->
          <div v-show="tabFournisseur === 'table'" class="overflow-x-auto -mx-5">
            <table class="data-table w-full">
              <thead>
                <tr>
                  <th>Fournisseur</th>
                  <th class="text-right">Colis</th>
                  <th class="text-right">Volume (m³)</th>
                  <th class="text-right">Valeur estimée</th>
                  <th class="text-right">% stock</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in parFournisseur" :key="row.name">
                  <td class="font-semibold">{{ row.name }}</td>
                  <td class="text-right">{{ row.nb_colis }}</td>
                  <td class="text-right">{{ fmtVol(row.volume_total) }}</td>
                  <td class="text-right font-semibold text-blue-600">{{ fmt(row.valeur_estimee) }}</td>
                  <td class="text-right">
                    <span class="badge badge-indigo">{{ pctOf(row.nb_colis, totFournisseur.colis) }}%</span>
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50">
                <tr>
                  <td class="font-bold">Total</td>
                  <td class="text-right font-bold">{{ totFournisseur.colis }}</td>
                  <td class="text-right font-bold">{{ fmtVol(totFournisseur.volume) }}</td>
                  <td class="text-right font-bold text-blue-600">{{ fmt(totFournisseur.valeur) }}</td>
                  <td class="text-right font-bold">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineComponent, h, onMounted } from 'vue'
import {
  RefreshCwIcon, LeafIcon, LayersIcon, TruckIcon,
  BarChart2Icon, TableIcon,
  PackageIcon, CheckSquareIcon, DatabaseIcon, DollarSignIcon, FlameIcon, BuildingIcon,
} from 'lucide-vue-next'
import PageHeader from '../components/PageHeader.vue'

// ── Types ───────────────────────────────────────────────────
interface ArticleRow {
  id: number
  essence: string
  nombre_de_colis: number
  volume: number
  price_per_m3: number
  indisponible: boolean
  supplier_id: number
  supplier_name?: string
}

interface ArticleItemRow {
  id: number
  article_id: number
  epaisseur: number
  volume: number
  indisponible: boolean
}

interface EssenceRow  { essence: string;   nb_colis: number; volume_total: number; valeur_estimee: number }
interface EpaisseurRow{ epaisseur: number; nb_colis: number; volume_total: number }
interface FournisseurRow { name: string; nb_colis: number; volume_total: number; valeur_estimee: number }

// ── State ───────────────────────────────────────────────────
const loading       = ref(true)
const kpi           = ref<Record<string, number>>({})
const parEssence    = ref<EssenceRow[]>([])
const parEpaisseur  = ref<EpaisseurRow[]>([])
const parFournisseur = ref<FournisseurRow[]>([])

const tabEssence     = ref('chart')
const tabEpaisseur   = ref('chart')
const tabFournisseur = ref('chart')

const COLORS = ['#007bff','#28a745','#fd7e14','#dc3545','#6f42c1','#20c997','#ffc107','#17a2b8']

// ── Formatters ──────────────────────────────────────────────
function fmt(v: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v ?? 0)
}
function fmtVol(v: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(v ?? 0)
}
function pctOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

// ── Totaux ───────────────────────────────────────────────────
const totEssence = computed(() => ({
  colis:  parEssence.value.reduce((s, r) => s + r.nb_colis, 0),
  volume: parEssence.value.reduce((s, r) => s + r.volume_total, 0),
  valeur: parEssence.value.reduce((s, r) => s + r.valeur_estimee, 0),
}))

const totEpaisseur = computed(() => ({
  colis:  parEpaisseur.value.reduce((s, r) => s + r.nb_colis, 0),
  volume: parEpaisseur.value.reduce((s, r) => s + r.volume_total, 0),
}))

const totFournisseur = computed(() => ({
  colis:  parFournisseur.value.reduce((s, r) => s + r.nb_colis, 0),
  volume: parFournisseur.value.reduce((s, r) => s + r.volume_total, 0),
  valeur: parFournisseur.value.reduce((s, r) => s + r.valeur_estimee, 0),
}))

// ── KPI ─────────────────────────────────────────────────────
const kpiStats = computed(() => {
  const k = kpi.value
  return [
    { key: 'colis',        label: 'Colis disponibles', icon: PackageIcon,      color: '#28a745', value: `${k.total_colis ?? 0} colis` },
    { key: 'indispo',      label: 'Colis vendus',      icon: CheckSquareIcon,  color: '#6c757d', value: `${k.total_indisponible ?? 0} colis` },
    { key: 'volume',       label: 'Volume total',      icon: DatabaseIcon,     color: '#007bff', value: `${fmtVol(k.volume_total ?? 0)} m³` },
    { key: 'valeur',       label: 'Valeur estimée',    icon: DollarSignIcon,   color: '#fd7e14', value: fmt(k.valeur_stock ?? 0) },
    { key: 'essences',     label: 'Essences',          icon: FlameIcon,        color: '#20c997', value: `${k.nb_essences ?? 0} essences` },
    { key: 'fournisseurs', label: 'Fournisseurs',      icon: BuildingIcon,     color: '#6f42c1', value: `${k.nb_fournisseurs ?? 0} fournisseurs` },
  ]
})

// ── Fetch ────────────────────────────────────────────────────
async function fetchAll(): Promise<void> {
  loading.value = true
  try {
    // Récupère tous les articles (paginé)
    const allArticles: ArticleRow[] = []
    let page = 1
    while (true) {
      const res = await window.electron.articles.list({ per_page: 500, page })
      allArticles.push(...(res.data as ArticleRow[]))
      if (allArticles.length >= res.total) break
      page++
    }

    // Récupère tous les article_items (paginé) pour l'épaisseur
    const allItems: ArticleItemRow[] = []
    page = 1
    while (true) {
      const res = await window.electron.articleItems.list({ per_page: 500, page })
      allItems.push(...(res.data as ArticleItemRow[]))
      if (allItems.length >= res.total) break
      page++
    }

    // Map articles par id pour les jointures
    const articleMap = new Map(allArticles.map(a => [a.id, a]))

    // Source de vérité : article_items (chaque item = 1 colis)
    const itemDispo  = allItems.filter(i => !i.indisponible)
    const itemIndispo = allItems.filter(i =>  i.indisponible)

    // ── KPI (calculé depuis article_items) ───────────────────
    const total_colis        = itemDispo.length
    const total_indisponible = itemIndispo.length
    const volume_total       = itemDispo.reduce((s, i) => s + (i.volume ?? 0), 0)
    const valeur_stock       = itemDispo.reduce((s, i) => {
      const a = articleMap.get(i.article_id)
      return s + (i.volume ?? 0) * (a?.price_per_m3 ?? 0)
    }, 0)
    const nb_essences     = new Set(
      itemDispo.map(i => articleMap.get(i.article_id)?.essence).filter(Boolean)
    ).size
    const nb_fournisseurs = new Set(
      itemDispo.map(i => articleMap.get(i.article_id)?.supplier_id).filter(v => v != null)
    ).size

    kpi.value = { total_colis, total_indisponible, volume_total, valeur_stock, nb_essences, nb_fournisseurs }

    // ── Par essence (depuis article_items) ───────────────────
    const essMap = new Map<string, EssenceRow>()
    for (const item of itemDispo) {
      const a = articleMap.get(item.article_id)
      if (!a) continue
      const e = essMap.get(a.essence) ?? { essence: a.essence, nb_colis: 0, volume_total: 0, valeur_estimee: 0 }
      e.nb_colis++
      e.volume_total   += item.volume ?? 0
      e.valeur_estimee += (item.volume ?? 0) * (a.price_per_m3 ?? 0)
      essMap.set(a.essence, e)
    }
    parEssence.value = [...essMap.values()].sort((a, b) => b.nb_colis - a.nb_colis)

    // ── Par épaisseur (depuis article_items) ─────────────────
    const epMap = new Map<number, EpaisseurRow>()
    for (const item of itemDispo) {
      const ep = epMap.get(item.epaisseur) ?? { epaisseur: item.epaisseur, nb_colis: 0, volume_total: 0 }
      ep.nb_colis++
      ep.volume_total += item.volume ?? 0
      epMap.set(item.epaisseur, ep)
    }
    parEpaisseur.value = [...epMap.values()].sort((a, b) => a.epaisseur - b.epaisseur)

    // ── Par fournisseur (depuis article_items) ───────────────
    const foMap = new Map<number, FournisseurRow & { supplier_id: number }>()
    for (const item of itemDispo) {
      const a = articleMap.get(item.article_id)
      if (!a) continue
      const name = a.supplier_name ?? `Fournisseur #${a.supplier_id}`
      const f = foMap.get(a.supplier_id) ?? { supplier_id: a.supplier_id, name, nb_colis: 0, volume_total: 0, valeur_estimee: 0 }
      f.nb_colis++
      f.volume_total   += item.volume ?? 0
      f.valeur_estimee += (item.volume ?? 0) * (a.price_per_m3 ?? 0)
      foMap.set(a.supplier_id, f)
    }
    parFournisseur.value = [...foMap.values()].sort((a, b) => b.nb_colis - a.nb_colis)

  } catch (e) {
    console.error('Erreur dashboard stock:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)

// ── TabToggle inline component ───────────────────────────────
const TabToggle = defineComponent({
  props: { modelValue: String },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', { class: 'flex gap-1' }, [
      h('button', {
        onClick: () => emit('update:modelValue', 'chart'),
        class: [
          'p-1.5 rounded transition-colors',
          props.modelValue === 'chart'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
        ].join(' '),
      }, [h(BarChart2Icon, { size: 13 })]),
      h('button', {
        onClick: () => emit('update:modelValue', 'table'),
        class: [
          'p-1.5 rounded transition-colors',
          props.modelValue === 'table'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
        ].join(' '),
      }, [h(TableIcon, { size: 13 })]),
    ])
  },
})
</script>
