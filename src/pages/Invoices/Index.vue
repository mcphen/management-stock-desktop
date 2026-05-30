<template>
  <div class="p-6">
    <PageHeader
      title="Factures clients"
      :breadcrumbs="[
        { label: 'Tableau de bord', to: '/dashboard' },
        { label: 'Factures' },
      ]"
    >
      <button class="btn btn-primary btn-sm" @click="router.push('/invoices/create')">
        <PlusIcon :size="14" />
        <span class="hidden sm:inline">Nouvelle facture</span>
        <span class="sm:hidden">Nouveau</span>
      </button>
    </PageHeader>

    <!-- ── Filtres haut ───────────────────────────── -->
    <div class="card p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
        <div>
          <label class="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">N° de colis</label>
          <div class="relative">
            <SearchIcon :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              v-model="numeroColis"
              type="text"
              class="field pl-8"
              placeholder="Ex: 2024-001"
              :disabled="isLoading"
            />
          </div>
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Essence</label>
          <div class="relative">
            <LeafIcon :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select v-model="essence" class="field pl-8" :disabled="isLoading">
              <option value="">Toutes les essences</option>
              <option v-for="ess in essences" :key="ess" :value="ess">{{ ess }}</option>
            </select>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm flex-1" @click="applySearch" :disabled="isLoading">
            <SearchIcon :size="13" /> Rechercher
          </button>
          <button class="btn btn-secondary btn-sm" @click="resetFilters" :disabled="isLoading" title="Réinitialiser">
            <RotateCcwIcon :size="13" />
          </button>
        </div>
      </div>
    </div>

    <!-- ── Table ─────────────────────────────────── -->
    <div class="card overflow-hidden">

      <!-- Skeleton -->
      <div v-if="isLoading" class="divide-y divide-slate-100">
        <div v-for="i in 7" :key="i" class="flex gap-4 px-5 py-3.5">
          <div class="skeleton h-3.5 w-24 rounded-md"></div>
          <div class="skeleton h-3.5 w-36 rounded-md"></div>
          <div class="skeleton h-3.5 w-20 rounded-md hidden sm:block"></div>
          <div class="skeleton h-3.5 w-24 rounded-md ml-auto"></div>
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="data-table w-full">
          <thead>
            <tr>
              <th>
                <div class="space-y-2">
                  <span>Matricule</span>
                  <input v-model="filters.matricule" type="text" placeholder="Filtrer…" class="col-filter" />
                </div>
              </th>
              <th>
                <div class="space-y-2">
                  <span>Client</span>
                  <input v-model="filters.client" type="text" placeholder="Filtrer…" class="col-filter" />
                </div>
              </th>
              <th class="hidden sm:table-cell">
                <div class="space-y-2">
                  <span>Date</span>
                  <input v-model="filters.date" type="date" class="col-filter" />
                </div>
              </th>
              <th class="text-right">Total (FCFA)</th>
              
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredInvoices.length === 0">
              <td colspan="6" class="py-16 text-center">
                <div class="flex flex-col items-center gap-2">
                  <FileTextIcon :size="36" class="text-slate-200" />
                  <p class="text-sm text-slate-400 font-medium">Aucune facture trouvée</p>
                  <p class="text-xs text-slate-300">Essayez de modifier vos filtres</p>
                </div>
              </td>
            </tr>
            <tr v-for="inv in filteredInvoices" :key="inv.id">
              <td class="font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                {{ inv.matricule ?? `#${inv.id}` }}
              </td>
              <td class="font-medium text-slate-800">
                {{ inv.client_name ?? `Client #${inv.client_id}` }}
              </td>
              <td class="text-slate-500 hidden sm:table-cell whitespace-nowrap text-xs">
                {{ formatDate(inv.date) }}
              </td>
              <td class="text-right font-bold text-slate-900 whitespace-nowrap">
                {{ formatPrice(inv.total_price) }}
              </td>
             
              <td class="text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    class="btn btn-secondary btn-sm"
                    @click="router.push(`/invoices/${inv.id}`)"
                    title="Voir la facture"
                  >
                    <EyeIcon :size="13" />
                    <span class="hidden lg:inline">Voir</span>
                  </button>
                  <button
                    class="btn btn-ghost btn-sm"
                    @click="printInvoice(inv.id)"
                    title="Imprimer"
                  >
                    <PrinterIcon :size="13" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div v-if="!isLoading" class="px-5 py-3 border-t border-slate-100 bg-slate-50/70">
        <p class="text-[11px] text-slate-400">
          {{ filteredInvoices.length }} facture(s)
          <span v-if="filteredInvoices.length !== allInvoices.length" class="text-slate-300">
            sur {{ allInvoices.length }} au total
          </span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  PlusIcon, SearchIcon, RotateCcwIcon,
  EyeIcon, PrinterIcon, LeafIcon, FileTextIcon,
} from 'lucide-vue-next'
import PageHeader from '../../components/PageHeader.vue'

const router = useRouter()

const isLoading   = ref(true)
const allInvoices = ref<any[]>([])
const essences    = ['Ayous', 'Frake', 'Dibetou', 'Bois Rouge', 'Dabema']
const numeroColis = ref('')
const essence     = ref('')
const filters     = reactive({ matricule: '', client: '', date: '' })

const filteredInvoices = computed(() =>
  allInvoices.value.filter(inv => {
    if (filters.matricule && !(inv.matricule ?? '').toLowerCase().includes(filters.matricule.toLowerCase())) return false
    if (filters.client    && !(inv.client_name ?? '').toLowerCase().includes(filters.client.toLowerCase()))    return false
    if (filters.date      && inv.date !== filters.date) return false
    return true
  })
)

async function fetchInvoices() {
  isLoading.value = true
  const result = await window.electron.invoices.list({ per_page: 500 })
  allInvoices.value = result.data as any[]
  isLoading.value = false
}

function applySearch() { fetchInvoices() }

function resetFilters() {
  numeroColis.value = ''
  essence.value     = ''
  filters.matricule = ''
  filters.client    = ''
  filters.date      = ''
  fetchInvoices()
}

function formatDate(d: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

function formatPrice(p: number): string {
  return new Intl.NumberFormat('de-DE').format(p ? Math.round(p) : 0)
}

function statusLabel(s: string) {
  return { pending: 'En attente', validated: 'Validée', canceled: 'Annulée' }[s] ?? s
}
function statusBadge(s: string) {
  return { pending: 'badge-yellow', validated: 'badge-green', canceled: 'badge-red' }[s] ?? 'badge-gray'
}

void statusLabel
void statusBadge

function printInvoice(_id: number) { window.electron.print() }

onMounted(fetchInvoices)
</script>
