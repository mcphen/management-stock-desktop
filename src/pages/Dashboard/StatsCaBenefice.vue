<template>
  <div class="card overflow-hidden">
    <div class="card-section">
      <span class="card-section-label flex items-center gap-1.5">
        <BarChart2Icon :size="11" />
        Chiffre d'Affaires, bénéfice brut &amp; bénéfice net par mois
      </span>
      <div class="flex items-center gap-2">
        <button @click="fetchStats" class="btn btn-primary btn-sm" :disabled="loading">
          <FilterIcon :size="11" /> Appliquer
        </button>
        <button @click="resetFilters" class="btn btn-secondary btn-sm">
          <XIcon :size="11" /> Réinitialiser
        </button>
      </div>
    </div>

    <div class="p-4">
      <!-- Filtres — identiques au web -->
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
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">No Contrat</label>
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
          <component :is="tab === 'chart' ? BarChart2Icon : TableIcon" :size="11" class="inline mr-1" />
          {{ tab === 'chart' ? 'Graphique' : 'Tableau' }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-2 py-2">
        <div v-for="i in 5" :key="i" class="skeleton h-6 rounded"></div>
      </div>

      <template v-else-if="stats.length">

        <!-- Graphique (barres groupées CSS) -->
        <div v-show="activeTab === 'chart'">
          <div class="flex items-end gap-2 h-48 px-2">
            <div
              v-for="row in stats" :key="`${row.year}-${row.month}`"
              class="flex-1 flex flex-col items-center gap-0.5 h-full justify-end"
            >
              <div class="w-full flex items-end gap-px justify-center" style="height:85%">
                <div
                  class="flex-1 rounded-t bg-blue-500 transition-all duration-500"
                  :style="{ height: barH(row.total_revenue) }"
                  :title="`CA: ${formatPrice(row.total_revenue)}`"
                ></div>
                <div
                  class="flex-1 rounded-t bg-emerald-500 transition-all duration-500"
                  :style="{ height: barH(Math.max(row.gross_profit, 0)) }"
                  :title="`Bén. brut: ${formatPrice(row.gross_profit)}`"
                ></div>
                <div
                  class="flex-1 rounded-t transition-all duration-500"
                  :class="row.net_profit >= 0 ? 'bg-teal-400' : 'bg-red-400'"
                  :style="{ height: barH(Math.abs(row.net_profit)) }"
                  :title="`Bén. net: ${formatPrice(row.net_profit)}`"
                ></div>
              </div>
              <span class="text-[9px] text-slate-400 truncate w-full text-center">
                {{ monthName(row.month) }} {{ row.year }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-4 mt-2 justify-center flex-wrap">
            <span class="flex items-center gap-1 text-[10px] text-slate-500">
              <span class="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span> Chiffre d'Affaires
            </span>
            <span class="flex items-center gap-1 text-[10px] text-slate-500">
              <span class="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span> Bénéfice brut
            </span>
            <span class="flex items-center gap-1 text-[10px] text-slate-500">
              <span class="w-3 h-3 rounded-sm bg-teal-400 inline-block"></span> Bénéfice net
            </span>
          </div>
        </div>

        <!-- Tableau — identique au web -->
        <div v-show="activeTab === 'table'" class="overflow-x-auto">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Periode</th>
                <th class="text-right">Chiffre d'Affaires</th>
                <th class="text-right">Cout de revient</th>
                <th class="text-right">Benefice brut</th>
                <th class="text-right">Depenses mensuelles</th>
                <th class="text-right">Benefice net</th>
                <th class="text-right">Marge nette</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in stats" :key="`${row.year}-${row.month}`">
                <td class="font-semibold">{{ monthName(row.month) }} {{ row.year }}</td>
                <td class="text-right font-semibold text-blue-600">{{ formatPrice(row.total_revenue) }}</td>
                <td class="text-right text-slate-500">{{ formatPrice(row.cost_base) }}</td>
                <td class="text-right font-semibold" :class="row.gross_profit >= 0 ? 'text-emerald-600' : 'text-red-600'">
                  {{ formatPrice(row.gross_profit) }}
                </td>
                <td class="text-right text-amber-600">{{ formatPrice(row.monthly_expense) }}</td>
                <td class="text-right font-semibold" :class="row.net_profit >= 0 ? 'text-emerald-600' : 'text-red-600'">
                  {{ formatPrice(row.net_profit) }}
                </td>
                <td class="text-right">
                  <span class="badge" :class="margeClass(row)">{{ margePercent(row) }}%</span>
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-slate-50">
              <tr>
                <td class="font-bold">Total</td>
                <td class="text-right font-bold text-blue-600">{{ formatPrice(totaux.revenue) }}</td>
                <td class="text-right font-bold text-slate-500">{{ formatPrice(totaux.cost) }}</td>
                <td class="text-right font-bold" :class="totaux.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'">
                  {{ formatPrice(totaux.grossProfit) }}
                </td>
                <td class="text-right font-bold text-amber-600">{{ formatPrice(totaux.expenses) }}</td>
                <td class="text-right font-bold" :class="totaux.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'">
                  {{ formatPrice(totaux.netProfit) }}
                </td>
                <td class="text-right">
                  <span class="badge" :class="totaux.revenue > 0 ? 'badge-green' : 'badge-gray'">
                    {{ totaux.revenue > 0 ? Math.round((totaux.netProfit / totaux.revenue) * 100) : 0 }}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </template>

      <div v-else class="text-center py-6 text-slate-400 text-sm">
        <BarChart2Icon :size="24" class="mx-auto mb-2 opacity-40" />
        Aucune donnee disponible pour cette periode et ces filtres.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { BarChart2Icon, FilterIcon, XIcon, TableIcon } from 'lucide-vue-next'

interface MonthRow {
  year: number; month: number
  total_revenue: number; cost_base: number
  gross_profit: number; monthly_expense: number; net_profit: number
}

const stats        = ref<MonthRow[]>([])
const clients      = ref<{ id: number; name: string }[]>([])
const fournisseurs = ref<{ id: number; name: string }[]>([])
const essences     = ['Ayous', 'Frake', 'Dibetou', 'Bois Rouge']
const loading      = ref(false)
const activeTab    = ref('chart')

const filters = ref({
  client_id:       '' as string | number,
  essence:         '',
  epaisseur:       '' as string | number,
  fournisseur_id:  '' as string | number,
  contract_number: '',
})

const MONTHS = ['', 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']

const monthName = (n: number) => MONTHS[n] ?? String(n)

function formatPrice(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'XOF', maximumFractionDigits: 0,
  }).format(v ?? 0)
}

function margePercent(row: MonthRow): number {
  return row.total_revenue > 0 ? Math.round((row.net_profit / row.total_revenue) * 100) : 0
}

function margeClass(row: MonthRow): string {
  const m = margePercent(row)
  if (m >= 20) return 'badge-green'
  if (m >= 10) return 'badge-yellow'
  return 'badge-red'
}

const totaux = computed(() => ({
  revenue:    stats.value.reduce((s, r) => s + r.total_revenue,   0),
  cost:       stats.value.reduce((s, r) => s + r.cost_base,       0),
  grossProfit:stats.value.reduce((s, r) => s + r.gross_profit,    0),
  expenses:   stats.value.reduce((s, r) => s + r.monthly_expense, 0),
  netProfit:  stats.value.reduce((s, r) => s + r.net_profit,      0),
}))

const maxVal = computed(() =>
  Math.max(...stats.value.map(r => r.total_revenue), 1)
)

function barH(v: number): string {
  return `${Math.round((Math.abs(v) / maxVal.value) * 100)}%`
}

function activeFilters(): Record<string, unknown> {
  const f: Record<string, unknown> = {}
  if (filters.value.client_id)       f['client_id']       = filters.value.client_id
  if (filters.value.essence)         f['essence']         = filters.value.essence
  if (filters.value.epaisseur)       f['epaisseur']       = filters.value.epaisseur
  if (filters.value.fournisseur_id)  f['fournisseur_id']  = filters.value.fournisseur_id
  if (filters.value.contract_number) f['contract_number'] = filters.value.contract_number
  return f
}

async function fetchStats(): Promise<void> {
  loading.value = true
  try {
    stats.value = await window.electron.dashboard.caBenefice(activeFilters())
  } catch (e) {
    console.error('Erreur CA/bénéfice:', e)
  } finally {
    loading.value = false
  }
}

function resetFilters(): void {
  filters.value = { client_id: '', essence: '', epaisseur: '', fournisseur_id: '', contract_number: '' }
  fetchStats()
}

onMounted(async () => {
  fetchStats()
  const [clientsRes, suppliersRes] = await Promise.all([
    window.electron.clients.list({ per_page: 500 }),
    window.electron.suppliers.list({ per_page: 500 }),
  ])
  clients.value      = clientsRes.data as { id: number; name: string }[]
  fournisseurs.value = suppliersRes.data as { id: number; name: string }[]
})
</script>
