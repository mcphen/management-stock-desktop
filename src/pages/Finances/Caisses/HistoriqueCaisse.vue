<template>
  <div class="p-6 space-y-5">

    <!-- Header -->
    <PageHeader
      title="Historique de la caisse"
      :breadcrumbs="[
        { label: 'Tableau de bord', to: '/dashboard' },
        { label: 'Finances' },
        { label: 'Caisses', to: '/caisse' },
        { label: 'Historique' },
      ]"
    >
      <div class="flex items-center gap-2 flex-wrap">
        <button @click="openSortieModal"
          class="flex items-center gap-1.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-colors">
          <MinusIcon :size="14" /> Enregistrer une Sortie
        </button>
      </div>
    </PageHeader>

    <!-- Solde card -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
        <p class="text-xs font-semibold uppercase tracking-wide text-blue-200 mb-1">Solde actuel</p>
        <p class="text-2xl font-bold">{{ formatPrice(solde.solde) }}</p>
        <p class="text-xs text-blue-200 mt-1">XOF</p>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-5">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Total Entrées</p>
        <p class="text-xl font-bold text-emerald-600">{{ formatPrice(solde.entrees) }}</p>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-5">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Total Sorties</p>
        <p class="text-xl font-bold text-red-500">{{ formatPrice(solde.sorties) }}</p>
      </div>
    </div>

    <!-- Transactions table -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">

      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <span class="text-sm font-semibold text-slate-700 mr-1">Transactions</span>
        <input v-model="filters.start_date" type="date"
          class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        <span class="text-slate-400 text-xs">→</span>
        <input v-model="filters.end_date" type="date"
          class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        <select v-model="filters.type"
          class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">Tous types</option>
          <option value="entree">Entrées</option>
          <option value="sortie">Sorties</option>
        </select>
        <button @click="applyFilters"
          class="flex items-center gap-1.5 text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg transition-colors">
          <FilterIcon :size="13" /> Filtrer
        </button>
        <div class="flex-1" />
        <select v-model.number="filters.per_page" @change="applyFilters"
          class="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-500 focus:outline-none">
          <option :value="10">10 / page</option>
          <option :value="25">25 / page</option>
          <option :value="50">50 / page</option>
        </select>
      </div>

      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
            <th class="text-left px-4 py-3 font-semibold">Date</th>
            <th class="text-center px-4 py-3 font-semibold">Type</th>
            <th class="text-left px-4 py-3 font-semibold">Objet</th>
            <th class="text-right px-4 py-3 font-semibold">Montant</th>
            <th class="text-right px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-if="loading">
            <td colspan="5" class="py-10 text-center text-slate-400 text-xs">Chargement…</td>
          </tr>
          <tr v-else-if="transactions.length === 0">
            <td colspan="5" class="py-10 text-center text-slate-400 text-xs">Aucune transaction</td>
          </tr>
          <tr v-else v-for="t in transactions" :key="t.id"
            class="hover:bg-slate-50/60 transition-colors group">
            <td class="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{{ formatDate(t.date) }}</td>
            <td class="px-4 py-3 text-center">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                :class="t.type === 'entree' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'">
                {{ t.type === 'entree' ? 'Entrée' : 'Sortie' }}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-700 max-w-[260px]">
              <p class="truncate" :title="t.objet">{{ t.objet || '—' }}</p>
              <p v-if="t.description" class="text-[11px] text-slate-400 truncate mt-0.5">{{ t.description }}</p>
            </td>
            <td class="px-4 py-3 text-right font-semibold whitespace-nowrap"
              :class="t.type === 'entree' ? 'text-emerald-600' : 'text-red-500'">
              {{ t.type === 'entree' ? '+' : '−' }}{{ formatPrice(t.amount) }}
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <template v-if="t.type === 'sortie' && !isPaymentOrTransfer(t)">
                  <button @click="openEditSortieModal(t)"
                    class="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white transition-colors">
                    <PencilIcon :size="10" /> Modifier
                  </button>
                  <button @click="confirmDelete(t)"
                    class="flex items-center justify-center w-6 h-6 rounded-md bg-red-100 hover:bg-red-200 text-red-500 transition-colors">
                    <Trash2Icon :size="11" />
                  </button>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination footer -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60">
        <p class="text-xs text-slate-500">
          {{ pagination.total }} transaction(s) · page {{ pagination.current_page }} / {{ pagination.last_page }}
        </p>
        <div class="flex items-center gap-1">
          <button @click="goToPage(pagination.current_page - 1)" :disabled="pagination.current_page <= 1"
            class="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
            <ChevronLeftIcon :size="13" />
          </button>
          <button v-for="p in visiblePages" :key="p" @click="goToPage(p)"
            class="w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors"
            :class="p === pagination.current_page ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-100'">
            {{ p }}
          </button>
          <button @click="goToPage(pagination.current_page + 1)" :disabled="pagination.current_page >= pagination.last_page"
            class="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
            <ChevronRightIcon :size="13" />
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Modal Sortie ════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showSortie" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" @click="closeSortie" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 class="text-base font-semibold text-slate-800">
                {{ editSortieId ? 'Modifier la sortie' : '➖ Nouvelle sortie' }}
              </h3>
              <button @click="closeSortie" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <XIcon :size="16" />
              </button>
            </div>
            <form @submit.prevent="submitSortie" class="px-5 py-4 space-y-4">

              <!-- Caisse (création uniquement) -->
              <div v-if="!editSortieId">
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Caisse <span class="text-red-500">*</span></label>
                <select v-model.number="sortieForm.caisse_id" required
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
                  <option :value="0">— Sélectionner une caisse —</option>
                  <option v-for="c in caisses" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>

              <!-- Objet -->
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Objet <span class="text-red-500">*</span></label>
                <input v-model="sortieForm.objet" type="text" required placeholder="Ex : Achat fournitures, loyer…"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>

              <!-- Montant -->
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Montant <span class="text-red-500">*</span></label>
                <input v-model.number="sortieForm.amount" type="number" min="0.01" step="0.01" required
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>

              <!-- Date -->
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Date <span class="text-red-500">*</span></label>
                <input v-model="sortieForm.date" type="date" required
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>

              <!-- Description -->
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Description <span class="text-slate-400 font-normal">(optionnel)</span></label>
                <input v-model="sortieForm.description" type="text"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>

              <div class="flex items-center justify-end gap-2 pt-1">
                <button type="button" @click="closeSortie"
                  class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
                <button type="submit" :disabled="submitting"
                  class="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  <LoaderIcon v-if="submitting" :size="13" class="animate-spin" />
                  {{ submitting ? 'En cours…' : (editSortieId ? 'Modifier' : 'Enregistrer') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ Modal suppression ═══════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="pendingDelete" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" @click="pendingDelete = null" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div class="p-5">
              <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2Icon :size="18" class="text-red-500" />
              </div>
              <h3 class="text-base font-semibold text-slate-800 mb-1">Supprimer la sortie ?</h3>
              <p class="text-sm text-slate-500">
                <strong class="text-slate-700">{{ pendingDelete.objet }}</strong> —
                <span class="text-red-500">−{{ formatPrice(pendingDelete.amount) }}</span>
              </p>
            </div>
            <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
              <button @click="pendingDelete = null"
                class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
              <button @click="doDelete" :disabled="deleting"
                class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                <LoaderIcon v-if="deleting" :size="13" class="animate-spin" />
                {{ deleting ? 'Suppression…' : 'Supprimer' }}
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
import {
  MinusIcon, FilterIcon, PencilIcon, Trash2Icon, LoaderIcon,
  ChevronLeftIcon, ChevronRightIcon, XIcon,
} from 'lucide-vue-next'
import PageHeader from '../../../components/PageHeader.vue'
import { useToastStore } from '../../../stores/toast.store'
import type { CaisseTransaction, Caisse } from '../../../electron.d'

const toast = useToastStore()

// ── State ────────────────────────────────────────────────────
const loading    = ref(false)
const submitting = ref(false)
const deleting   = ref(false)

const transactions = ref<CaisseTransaction[]>([])
const caisses      = ref<Caisse[]>([])
const solde        = ref({ entrees: 0, sorties: 0, solde: 0 })

const pagination = ref({ current_page: 1, last_page: 1, total: 0, per_page: 25 })

const filters = ref({ start_date: '', end_date: '', type: '', per_page: 25 })

const visiblePages = computed(() => {
  const pages: number[] = []
  const cur  = pagination.value.current_page
  const last = pagination.value.last_page
  for (let p = Math.max(1, cur - 2); p <= Math.min(last, cur + 2); p++) pages.push(p)
  return pages
})

// ── Modal sortie ─────────────────────────────────────────────
const showSortie   = ref(false)
const editSortieId = ref<number | null>(null)
const pendingDelete = ref<CaisseTransaction | null>(null)

const sortieForm = ref({
  caisse_id:   0,
  objet:       '',
  amount:      0,
  date:        today(),
  description: '',
})

// ── Load data ─────────────────────────────────────────────────
// caisse:list uses exact equality for all params — date ranges must be filtered client-side
const allTransactions = ref<CaisseTransaction[]>([])

async function loadTransactions(page = 1) {
  loading.value = true
  try {
    // Fetch all records (no server-side date filtering — base.ipc only supports exact match)
    const res = await window.electron.caisse.list({ per_page: 500 })
    let data = res.data as CaisseTransaction[]

    // Client-side filtering
    if (filters.value.start_date) data = data.filter(t => t.date >= filters.value.start_date)
    if (filters.value.end_date)   data = data.filter(t => t.date <= filters.value.end_date)
    if (filters.value.type)       data = data.filter(t => t.type === filters.value.type)

    // Sort by date ASC (same as web fetchCaisseTransactionsOld)
    data.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id)

    allTransactions.value = data

    const total    = data.length
    const perPage  = filters.value.per_page
    const lastPage = Math.max(1, Math.ceil(total / perPage))
    const curPage  = Math.min(page, lastPage)
    const offset   = (curPage - 1) * perPage

    transactions.value = data.slice(offset, offset + perPage)
    pagination.value   = { current_page: curPage, last_page: lastPage, total, per_page: perPage }
  } catch {
    toast.show('Impossible de charger les transactions', 'error')
  } finally {
    loading.value = false
  }
}

async function loadSolde() {
  try {
    solde.value = await window.electron.caisse.solde()
  } catch { /* silent */ }
}

async function loadCaisses() {
  try {
    caisses.value = await window.electron.caisses.list()
  } catch { /* silent */ }
}

function applyFilters() { loadTransactions(1) }

function goToPage(p: number) {
  const clamped  = Math.max(1, Math.min(p, pagination.value.last_page))
  const perPage  = filters.value.per_page
  const offset   = (clamped - 1) * perPage
  transactions.value   = allTransactions.value.slice(offset, offset + perPage)
  pagination.value.current_page = clamped
}

// ── Sortie modal ──────────────────────────────────────────────
function openSortieModal() {
  editSortieId.value = null
  sortieForm.value   = { caisse_id: caisses.value[0]?.id ?? 0, objet: '', amount: 0, date: today(), description: '' }
  showSortie.value   = true
}

function openEditSortieModal(t: CaisseTransaction) {
  editSortieId.value = t.id
  sortieForm.value   = { caisse_id: 0, objet: t.objet ?? '', amount: t.amount, date: t.date.slice(0, 10), description: t.description ?? '' }
  showSortie.value   = true
}

function closeSortie() { showSortie.value = false; editSortieId.value = null }

async function submitSortie() {
  if (!editSortieId.value && !sortieForm.value.caisse_id) {
    toast.show('Veuillez sélectionner une caisse', 'error'); return
  }
  submitting.value = true
  try {
    if (editSortieId.value) {
      await window.electron.caisse.update(editSortieId.value, {
        objet: sortieForm.value.objet,
        amount: sortieForm.value.amount,
        date: sortieForm.value.date,
        description: sortieForm.value.description || undefined,
      })
      toast.show('Sortie modifiée')
    } else {
      await window.electron.caisse.create({
        type: 'sortie',
        caisse_id: sortieForm.value.caisse_id,
        objet: sortieForm.value.objet,
        amount: sortieForm.value.amount,
        date: sortieForm.value.date,
        description: sortieForm.value.description || undefined,
      })
      toast.show('Sortie enregistrée')
    }
    closeSortie()
    await Promise.all([loadTransactions(pagination.value.current_page), loadSolde()])
  } catch {
    toast.show("Impossible d'enregistrer la sortie", 'error')
  } finally {
    submitting.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────
function confirmDelete(t: CaisseTransaction) { pendingDelete.value = t }

async function doDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await window.electron.caisse.delete(pendingDelete.value.id)
    toast.show('Sortie supprimée')
    pendingDelete.value = null
    await Promise.all([loadTransactions(pagination.value.current_page), loadSolde()])
  } catch {
    toast.show('Suppression impossible', 'error')
  } finally {
    deleting.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────
function isPaymentOrTransfer(t: CaisseTransaction): boolean {
  if (t.payment_id) return true
  const o = (t.objet ?? '').toLowerCase()
  return o.startsWith('transfert vers') || o.startsWith('transfert de') || o.startsWith('paiement')
}

function today(): string { return new Date().toISOString().split('T')[0]! }

function formatPrice(n: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(Number(n || 0))
}

function formatDate(d: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

onMounted(async () => {
  await Promise.all([loadTransactions(), loadSolde(), loadCaisses()])
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
