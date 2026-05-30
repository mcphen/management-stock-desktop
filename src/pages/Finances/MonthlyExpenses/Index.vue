<template>
  <div class="p-6 space-y-5">

    <!-- Header -->
    <PageHeader
      title="Dépenses mensuelles"
      :breadcrumbs="[{ label: 'Tableau de bord', to: '/dashboard' }, { label: 'Finances' }, { label: 'Dépenses mensuelles' }]"
    >
      <div class="flex items-center gap-4">
        <div class="text-right">
          <p class="text-[11px] text-slate-400 uppercase tracking-wide">Total affiché</p>
          <p class="text-lg font-bold text-slate-800 leading-tight">{{ formatPrice(totalAmount) }}</p>
        </div>
        <button
          @click="openCreate"
          class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <PlusIcon :size="15" />
          Nouvelle dépense
        </button>
      </div>
    </PageHeader>

    <!-- Filtres -->
    <div class="flex flex-wrap items-end gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Année</label>
        <input
          v-model.number="filters.year"
          type="number"
          min="2000"
          max="2100"
          class="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-28"
          @keyup.enter="fetchExpenses"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Mois</label>
        <select
          v-model="filters.month"
          class="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          @change="fetchExpenses"
        >
          <option value="">Tous les mois</option>
          <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </div>

      <button
        @click="fetchExpenses"
        class="flex items-center gap-1.5 text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-lg transition-colors"
      >
        <FilterIcon :size="13" />
        Filtrer
      </button>

      <button
        @click="resetFilters"
        class="flex items-center gap-1.5 text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 px-3 py-2 rounded-lg transition-colors"
      >
        <RotateCcwIcon :size="13" />
        Réinitialiser
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <th class="text-left px-4 py-3 font-semibold">Mois</th>
            <th class="text-left px-4 py-3 font-semibold">Année</th>
            <th class="text-right px-4 py-3 font-semibold">Montant</th>
            <th class="text-right px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-if="loading">
            <td colspan="4" class="py-10 text-center text-slate-400 text-xs">Chargement…</td>
          </tr>
          <tr v-else-if="expenses.length === 0">
            <td colspan="4" class="py-10 text-center text-slate-400 text-xs">
              Aucune dépense mensuelle trouvée
            </td>
          </tr>
          <tr
            v-else
            v-for="e in expenses"
            :key="e.id"
            class="hover:bg-slate-50/60 transition-colors group"
          >
            <td class="px-4 py-3 font-medium text-slate-800">{{ monthLabel(e.month) }}</td>
            <td class="px-4 py-3 text-slate-600">{{ e.year }}</td>
            <td class="px-4 py-3 text-right font-semibold text-slate-800">{{ formatPrice(e.amount) }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  @click="openEdit(e)"
                  class="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <PencilIcon :size="11" /> Modifier
                </button>
                <button
                  @click="confirmDelete(e)"
                  class="flex items-center justify-center w-7 h-7 rounded-md bg-red-100 hover:bg-red-200 text-red-500 transition-colors"
                >
                  <Trash2Icon :size="11" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal création/édition -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeModal"
        >
          <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" @click="closeModal" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 class="text-base font-semibold text-slate-800">
                {{ isEdit ? 'Modifier la dépense' : 'Nouvelle dépense mensuelle' }}
              </h3>
              <button @click="closeModal" class="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
                <XIcon :size="16" />
              </button>
            </div>

            <form @submit.prevent="submit" class="px-5 py-4 space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1.5">Mois <span class="text-red-500">*</span></label>
                  <select
                    v-model.number="form.month"
                    required
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  >
                    <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1.5">Année <span class="text-red-500">*</span></label>
                  <input
                    v-model.number="form.year"
                    type="number"
                    min="2000"
                    max="2100"
                    required
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Montant <span class="text-red-500">*</span></label>
                <input
                  v-model.number="form.amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>

              <div class="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  @click="closeModal"
                  class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >Annuler</button>
                <button
                  type="submit"
                  :disabled="submitting"
                  class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <LoaderIcon v-if="submitting" :size="13" class="animate-spin" />
                  {{ submitting ? 'En cours…' : (isEdit ? 'Enregistrer' : 'Créer') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal suppression -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="pendingDelete"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="pendingDelete = null"
        >
          <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" @click="pendingDelete = null" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div class="p-5">
              <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2Icon :size="18" class="text-red-500" />
              </div>
              <h3 class="text-base font-semibold text-slate-800 mb-1">Supprimer la dépense ?</h3>
              <p class="text-sm text-slate-500">
                La dépense de
                <strong class="text-slate-700">{{ monthLabel(pendingDelete.month) }} {{ pendingDelete.year }}</strong>
                sera supprimée définitivement.
              </p>
            </div>
            <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
              <button
                @click="pendingDelete = null"
                class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >Annuler</button>
              <button
                @click="doDelete"
                :disabled="deleting"
                class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
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
import { onMounted, ref } from 'vue'
import {
  PlusIcon, FilterIcon, RotateCcwIcon,
  PencilIcon, Trash2Icon, XIcon, LoaderIcon,
} from 'lucide-vue-next'
import PageHeader from '../../../components/PageHeader.vue'
import { useToastStore } from '../../../stores/toast.store'
import type { MonthlyExpense } from '../../../electron.d'

const toast      = useToastStore()
const loading    = ref(false)
const submitting = ref(false)
const deleting   = ref(false)
const showModal  = ref(false)
const isEdit     = ref(false)
const currentId  = ref<number | null>(null)
const expenses   = ref<MonthlyExpense[]>([])
const totalAmount = ref(0)
const pendingDelete = ref<MonthlyExpense | null>(null)

const currentYear  = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

const months = [
  { value: 1,  label: 'Janvier' },
  { value: 2,  label: 'Février' },
  { value: 3,  label: 'Mars' },
  { value: 4,  label: 'Avril' },
  { value: 5,  label: 'Mai' },
  { value: 6,  label: 'Juin' },
  { value: 7,  label: 'Juillet' },
  { value: 8,  label: 'Août' },
  { value: 9,  label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
]

const filters = ref({ year: currentYear, month: '' as number | '' })

const form = ref({ month: currentMonth, year: currentYear, amount: 0 })

function formatPrice(n: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n || 0))
}

function monthLabel(value: number): string {
  return months.find(m => m.value === Number(value))?.label ?? String(value)
}

async function fetchExpenses() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {}
    if (filters.value.year)  params['year']  = filters.value.year
    if (filters.value.month) params['month'] = filters.value.month

    const result = await window.electron.monthlyExpenses.list(params)
    expenses.value  = result.data
    totalAmount.value = result.total
  } catch {
    toast.show('Impossible de charger les dépenses mensuelles', 'error')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = { year: currentYear, month: '' }
  fetchExpenses()
}

function openCreate() {
  isEdit.value    = false
  currentId.value = null
  form.value = { month: currentMonth, year: currentYear, amount: 0 }
  showModal.value = true
}

function openEdit(e: MonthlyExpense) {
  isEdit.value    = true
  currentId.value = e.id
  form.value = { month: Number(e.month), year: Number(e.year), amount: Number(e.amount) }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function submit() {
  submitting.value = true
  try {
    const payload = {
      month:  Number(form.value.month),
      year:   Number(form.value.year),
      amount: Number(form.value.amount),
    }
    if (isEdit.value && currentId.value) {
      await window.electron.monthlyExpenses.update(currentId.value, payload)
      toast.show('Dépense mise à jour')
    } else {
      await window.electron.monthlyExpenses.create(payload)
      toast.show('Dépense enregistrée')
    }
    closeModal()
    await fetchExpenses()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.show(msg || 'Vérifiez les champs du formulaire', 'error')
  } finally {
    submitting.value = false
  }
}

function confirmDelete(e: MonthlyExpense) {
  pendingDelete.value = e
}

async function doDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await window.electron.monthlyExpenses.delete(pendingDelete.value.id)
    toast.show('Dépense supprimée')
    pendingDelete.value = null
    await fetchExpenses()
  } catch {
    toast.show('Suppression impossible', 'error')
  } finally {
    deleting.value = false
  }
}

onMounted(fetchExpenses)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.18s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; }
.modal-enter-active .relative,
.modal-leave-active .relative            { transition: transform 0.18s ease; }
.modal-enter-from .relative,
.modal-leave-to .relative                { transform: scale(0.96); }
</style>
