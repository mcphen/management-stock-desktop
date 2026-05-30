<template>
  <div class="p-6 space-y-5">

    <!-- Header -->
    <PageHeader
      title="Gestion des caisses"
      :breadcrumbs="[{ label: 'Tableau de bord', to: '/dashboard' }, { label: 'Finances' }, { label: 'Caisses' }]"
    >
      <div class="flex items-center gap-4">
        <div class="text-right">
          <p class="text-[11px] text-slate-400 uppercase tracking-wide">Total caisses</p>
          <p class="text-lg font-bold text-slate-800 leading-tight">{{ formatPrice(totalBalance) }}</p>
        </div>
        <button
          @click="openCreate"
          class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <PlusIcon :size="15" />
          Nouvelle caisse
        </button>
      </div>
    </PageHeader>

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Search -->
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <SearchIcon :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          v-model="filters.search"
          type="text"
          placeholder="Rechercher…"
          class="w-full pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-slate-700 placeholder-slate-400"
          @keyup.enter="fetchCaisses"
        />
        <button
          v-if="filters.search"
          @click="clearSearch"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <XIcon :size="13" />
        </button>
      </div>

      <!-- Active filter -->
      <select
        v-model="filters.active"
        @change="fetchCaisses"
        class="text-sm border border-slate-200 rounded-lg bg-white px-3 py-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
      >
        <option value="">Toutes</option>
        <option :value="true">Actives</option>
        <option :value="false">Inactives</option>
      </select>

      <button
        @click="fetchCaisses"
        class="flex items-center gap-1.5 text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-lg transition-colors"
      >
        <FilterIcon :size="13" />
        Filtrer
      </button>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- View toggle -->
      <div class="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
        <button
          @click="viewMode = 'card'"
          class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-all"
          :class="viewMode === 'card' ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'"
        >
          <LayoutGridIcon :size="13" /> Cartes
        </button>
        <button
          @click="viewMode = 'table'"
          class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-all"
          :class="viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'"
        >
          <TableIcon :size="13" /> Tableau
        </button>
      </div>
    </div>

    <!-- ── Card view ──────────────────────────────────────── -->
    <div v-if="viewMode === 'card'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

      <!-- Skeletons -->
      <template v-if="loading">
        <div v-for="n in 6" :key="'sk' + n" class="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0" />
            <div class="flex-1 space-y-2 pt-1">
              <div class="h-3 bg-slate-100 rounded w-3/4" />
              <div class="h-2.5 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
          <div class="mt-4 h-5 bg-slate-100 rounded w-2/3" />
        </div>
      </template>

      <!-- Empty -->
      <div
        v-else-if="caisses.length === 0"
        class="col-span-full flex flex-col items-center justify-center py-16 text-slate-400"
      >
        <WalletIcon :size="40" class="mb-3 opacity-40" />
        <p class="text-sm font-medium">Aucune caisse trouvée</p>
        <p class="text-xs mt-1">Créez votre première caisse en cliquant sur « Nouvelle caisse »</p>
      </div>

      <!-- Cards -->
      <div
        v-else
        v-for="c in caisses"
        :key="c.id"
        @click="goToDetail(c)"
        class="group bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 flex flex-col cursor-pointer"
      >
        <!-- Top row: icon + name + badge -->
        <div class="flex items-start gap-3">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            :class="iconBg(c.type)"
          >
            <component :is="iconFor(c.type)" :size="18" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-1">
              <p class="text-sm font-semibold text-slate-800 truncate leading-tight" :title="c.name">{{ c.name }}</p>
              <span
                class="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                :class="c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
              >{{ c.active ? 'ACTIVE' : 'INACTIVE' }}</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">{{ labelType(c.type) }} · {{ c.currency_code || 'XOF' }}</p>
          </div>
        </div>

        <!-- Balance -->
        <div class="mt-3 pt-3 border-t border-slate-100 flex-1">
          <p class="text-[11px] text-slate-400 uppercase tracking-wide">Solde</p>
          <p class="text-base font-bold text-slate-800 mt-0.5">{{ formatPrice(c.balance_with_initial ?? 0) }}</p>
        </div>

        <!-- Actions (visible on hover) -->
        <div class="mt-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            @click.stop="openEdit(c)"
            class="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1.5 transition-colors"
            title="Modifier"
          >
            <PencilIcon :size="11" /> Modifier
          </button>
          <button
            @click.stop="toggleActive(c)"
            class="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
            :class="c.active ? 'bg-amber-100 hover:bg-amber-200 text-amber-600' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-600'"
            :title="c.active ? 'Désactiver' : 'Activer'"
          >
            <component :is="c.active ? PauseIcon : PlayIcon" :size="12" />
          </button>
          <button
            @click.stop="confirmDelete(c)"
            class="flex items-center justify-center w-7 h-7 rounded-md bg-red-100 hover:bg-red-200 text-red-500 transition-colors"
            title="Supprimer"
          >
            <Trash2Icon :size="12" />
          </button>
        </div>
      </div>
    </div>

    <!-- ── Table view ─────────────────────────────────────── -->
    <div v-else class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <th class="text-left px-4 py-3 font-semibold">Caisse</th>
            <th class="text-left px-4 py-3 font-semibold">Type</th>
            <th class="text-left px-4 py-3 font-semibold">Devise</th>
            <th class="text-right px-4 py-3 font-semibold">Solde</th>
            <th class="text-center px-4 py-3 font-semibold">Statut</th>
            <th class="text-right px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-if="loading">
            <td colspan="6" class="py-10 text-center text-slate-400 text-xs">Chargement…</td>
          </tr>
          <tr v-else-if="caisses.length === 0">
            <td colspan="6" class="py-10 text-center text-slate-400 text-xs">Aucune caisse trouvée</td>
          </tr>
          <tr v-else v-for="c in caisses" :key="c.id" @click="goToDetail(c)" class="hover:bg-slate-50/60 transition-colors group cursor-pointer">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" :class="iconBg(c.type)">
                  <component :is="iconFor(c.type)" :size="13" />
                </div>
                <span class="font-medium text-slate-800">{{ c.name }}</span>
              </div>
            </td>
            <td class="px-4 py-3 text-slate-500">{{ labelType(c.type) }}</td>
            <td class="px-4 py-3 text-slate-500">{{ c.currency_code || 'XOF' }}</td>
            <td class="px-4 py-3 text-right font-semibold text-slate-800">{{ formatPrice(c.balance_with_initial ?? 0) }}</td>
            <td class="px-4 py-3 text-center">
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                :class="c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
              >{{ c.active ? 'Active' : 'Inactive' }}</span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  @click.stop="openEdit(c)"
                  class="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <PencilIcon :size="11" /> Modifier
                </button>
                <button
                  @click.stop="toggleActive(c)"
                  class="text-[11px] font-medium px-2.5 py-1.5 rounded-md transition-colors"
                  :class="c.active ? 'bg-amber-100 hover:bg-amber-200 text-amber-700' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'"
                >{{ c.active ? 'Désactiver' : 'Activer' }}</button>
                <button
                  @click.stop="confirmDelete(c)"
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

    <!-- ── Modal création/édition ─────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeModal"
        >
          <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" @click="closeModal" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 class="text-base font-semibold text-slate-800">
                {{ isEdit ? 'Modifier la caisse' : 'Nouvelle caisse' }}
              </h3>
              <button @click="closeModal" class="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
                <XIcon :size="16" />
              </button>
            </div>

            <!-- Body -->
            <form @submit.prevent="submit" class="px-5 py-4 space-y-4">
              <!-- Nom -->
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Nom <span class="text-red-500">*</span></label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-slate-400"
                  placeholder="Ex : Caisse principale"
                />
              </div>

              <!-- Type -->
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
                <select
                  v-model="form.type"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
                >
                  <option value="">— Sélectionner un type —</option>
                  <option value="especes">Espèces</option>
                  <option value="banque">Banque</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
              </div>

              <!-- Devise + Solde initial -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1.5">Devise</label>
                  <select
                    v-model="form.currency_code"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
                  >
                    <option value="XOF">XOF</option>
                    <option value="XAF">XAF</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1.5">Solde initial</label>
                  <input
                    v-model.number="form.initial_balance"
                    type="number"
                    min="0"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </div>
              </div>

              <!-- Active toggle -->
              <label class="flex items-center gap-3 cursor-pointer select-none">
                <div
                  @click="form.active = !form.active"
                  class="relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0"
                  :class="form.active ? 'bg-blue-600' : 'bg-slate-200'"
                >
                  <span
                    class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                    :class="form.active ? 'translate-x-4' : 'translate-x-0'"
                  />
                </div>
                <span class="text-sm text-slate-700">Caisse active</span>
              </label>

              <!-- Footer -->
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

    <!-- ── Modal suppression ──────────────────────────────── -->
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
              <h3 class="text-base font-semibold text-slate-800 mb-1">Supprimer la caisse ?</h3>
              <p class="text-sm text-slate-500">
                La caisse <strong class="text-slate-700">« {{ pendingDelete.name }} »</strong> sera supprimée définitivement.
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
import { computed, onMounted, ref, type Component } from 'vue'
import {
  PlusIcon, SearchIcon, XIcon, FilterIcon, LayoutGridIcon, TableIcon,
  WalletIcon, BanknoteIcon, BuildingIcon, SmartphoneIcon,
  PencilIcon, Trash2Icon, PauseIcon, PlayIcon, LoaderIcon,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import PageHeader from '../../../components/PageHeader.vue'
import { useToastStore } from '../../../stores/toast.store'
import type { Caisse } from '../../../electron.d'

const router  = useRouter()
const toast      = useToastStore()
const loading    = ref(false)
const submitting = ref(false)
const deleting   = ref(false)
const showModal  = ref(false)
const isEdit     = ref(false)
const currentId  = ref<number | null>(null)
const viewMode   = ref<'card' | 'table'>('card')
const caisses    = ref<Caisse[]>([])
const pendingDelete = ref<Caisse | null>(null)

const filters = ref({ search: '', active: '' as '' | boolean })

const form = ref({
  name:            '',
  type:            '' as Caisse['type'] | '',
  currency_code:   'XOF',
  initial_balance: 0,
  active:          true,
})

const totalBalance = computed(() =>
  caisses.value.reduce((sum, c) => sum + (c.balance_with_initial ?? 0), 0),
)

function formatPrice(n: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(Number(n || 0))
}

function labelType(t: string | null): string {
  const normalized = (t ?? '').toLowerCase()
  if (normalized === 'especes')      return 'Espèces'
  if (normalized === 'banque')       return 'Banque'
  if (normalized === 'mobile_money') return 'Mobile Money'
  return t || 'Non défini'
}

function iconFor(t: string | null): Component {
  const normalized = (t ?? '').toLowerCase()
  if (normalized === 'especes')      return BanknoteIcon
  if (normalized === 'banque')       return BuildingIcon
  if (normalized === 'mobile_money') return SmartphoneIcon
  return WalletIcon
}

function iconBg(t: string | null): string {
  const normalized = (t ?? '').toLowerCase()
  if (normalized === 'especes')      return 'bg-emerald-100 text-emerald-600'
  if (normalized === 'banque')       return 'bg-blue-100 text-blue-600'
  if (normalized === 'mobile_money') return 'bg-amber-100 text-amber-600'
  return 'bg-slate-100 text-slate-500'
}

async function fetchCaisses() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {}
    if (filters.value.search)        params['search'] = filters.value.search
    if (filters.value.active !== '') params['active'] = filters.value.active
    caisses.value = await window.electron.caisses.list(params)
  } catch {
    toast.show('Impossible de charger les caisses', 'error')
  } finally {
    loading.value = false
  }
}

function goToDetail(c: Caisse) {
  router.push({ name: 'caisse-show', params: { id: c.id } })
}

function clearSearch() {
  filters.value.search = ''
  fetchCaisses()
}

function openCreate() {
  isEdit.value    = false
  currentId.value = null
  form.value = { name: '', type: '', currency_code: 'XOF', initial_balance: 0, active: true }
  showModal.value = true
}

function openEdit(c: Caisse) {
  isEdit.value    = true
  currentId.value = c.id
  form.value = {
    name:            c.name,
    type:            c.type ?? '',
    currency_code:   c.currency_code ?? 'XOF',
    initial_balance: c.initial_balance ?? 0,
    active:          !!c.active,
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function submit() {
  submitting.value = true
  try {
    const payload = {
      name:            form.value.name,
      type:            form.value.type || null,
      currency_code:   form.value.currency_code,
      initial_balance: form.value.initial_balance,
      active:          form.value.active,
    }
    if (isEdit.value && currentId.value) {
      await window.electron.caisses.update(currentId.value, payload)
      toast.show('Caisse mise à jour')
    } else {
      await window.electron.caisses.create(payload)
      toast.show('Caisse créée')
    }
    await fetchCaisses()
    closeModal()
  } catch {
    toast.show('Vérifiez les champs du formulaire', 'error')
  } finally {
    submitting.value = false
  }
}

async function toggleActive(c: Caisse) {
  try {
    await window.electron.caisses.update(c.id, { active: !c.active })
    toast.show(`Caisse ${!c.active ? 'activée' : 'désactivée'}`)
    await fetchCaisses()
  } catch {
    toast.show('Impossible de modifier le statut', 'error')
  }
}

function confirmDelete(c: Caisse) {
  pendingDelete.value = c
}

async function doDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await window.electron.caisses.delete(pendingDelete.value.id)
    toast.show('Caisse supprimée')
    pendingDelete.value = null
    await fetchCaisses()
  } catch {
    toast.show('Suppression impossible', 'error')
  } finally {
    deleting.value = false
  }
}

onMounted(fetchCaisses)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.18s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; }
.modal-enter-active .relative,
.modal-leave-active .relative            { transition: transform 0.18s ease; }
.modal-enter-from .relative,
.modal-leave-to .relative                { transform: scale(0.96); }
</style>
