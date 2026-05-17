<template>
  <div class="p-4 sm:p-6">
    <PageHeader
      title="Nouvelle Facture"
      :breadcrumbs="[
        { label: 'Tableau de bord', to: '/dashboard' },
        { label: 'Factures', to: '/invoices' },
        { label: 'Nouvelle Facture' },
      ]"
    >
      <button class="btn btn-secondary btn-sm" @click="router.push('/invoices')">
        <ArrowLeftIcon :size="14" /> Retour à la liste
      </button>
    </PageHeader>

    <!-- ── Indicateur d'étape ────────────────────── -->
    <div class="flex items-center gap-3 mb-6">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          :class="step === 1 ? 'bg-primary-600 text-white' : 'bg-emerald-500 text-white'">
          <CheckIcon v-if="step === 2" :size="14" />
          <span v-else>1</span>
        </div>
        <span class="text-sm font-medium" :class="step === 1 ? 'text-gray-900' : 'text-gray-400'">Sélection des colis</span>
      </div>
      <div class="flex-1 h-px bg-gray-200"></div>
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          :class="step === 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-400'">2</div>
        <span class="text-sm font-medium" :class="step === 2 ? 'text-gray-900' : 'text-gray-400'">Prix & Finalisation</span>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════
         ÉTAPE 1 — Client + sélection des colis
    ═══════════════════════════════════════════════ -->
    <template v-if="step === 1">

      <!-- Client + Date -->
      <div class="card p-5 mb-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <!-- Client -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              Client *
              <button type="button" class="btn btn-success btn-sm ml-2" @click="showModalClient = true">
                <UserPlusIcon :size="13" /> Ajouter
              </button>
            </label>
            <div class="relative" ref="clientDropdownRef">
              <div class="relative">
                <SearchIcon :size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="clientSearch"
                  type="text"
                  class="field pl-8"
                  placeholder="Rechercher un client…"
                  @focus="showClientDropdown = true"
                  @input="showClientDropdown = true"
                />
              </div>
              <!-- Dropdown -->
              <div v-if="showClientDropdown && filteredClients.length > 0"
                class="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                <button
                  v-for="c in filteredClients" :key="c.id"
                  type="button"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                  @mousedown.prevent="selectClient(c)"
                >{{ c.name }}</button>
              </div>
            </div>
            <!-- Badge client sélectionné -->
            <div v-if="selectedClient" class="mt-2 flex items-center gap-2">
              <span class="badge badge-blue px-3 py-1 text-sm">{{ selectedClient.name }}</span>
              <button type="button" class="text-gray-400 hover:text-red-500" @click="clearClient">
                <XIcon :size="14" />
              </button>
            </div>
          </div>

          <!-- Date -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Date *</label>
            <input v-model="form.date" type="date" class="field" required />
          </div>
        </div>
      </div>

      <!-- Recherche d'articles -->
      <div class="card p-5 mb-4">
        <h4 class="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <SearchIcon :size="15" /> Rechercher des colis disponibles
        </h4>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Essence</label>
            <select v-model="search.essence" class="field text-sm">
              <option value="">Toutes</option>
              <option v-for="e in essences" :key="e" :value="e">{{ e }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">N° Colis</label>
            <input v-model="search.numero_colis" type="text" class="field text-sm" placeholder="ex: C3046" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Épaisseur</label>
            <select v-model="search.epaisseur" class="field text-sm">
              <option value="">Toutes</option>
              <option value="27">27</option>
              <option value="40">40</option>
              <option value="6">6</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Long. min</label>
            <input v-model.number="search.longueur_min" type="number" class="field text-sm" placeholder="Min" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Long. max</label>
            <input v-model.number="search.longueur_max" type="number" class="field text-sm" placeholder="Max" />
          </div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm" @click="applySearch" :disabled="isLoadingItems">
            <SearchIcon :size="14" /> Rechercher
          </button>
          <button class="btn btn-secondary btn-sm" @click="resetSearch">
            <RotateCcwIcon :size="14" /> Réinitialiser
          </button>
        </div>
      </div>

      <!-- Table des colis disponibles -->
      <div class="card overflow-hidden mb-5">
        <div class="px-5 py-3 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Colis disponibles — {{ filteredItems.length }} résultat(s)
          </span>
          <span v-if="form.article_item_ids.length > 0" class="text-xs font-semibold text-primary-600">
            {{ form.article_item_ids.length }} sélectionné(s)
          </span>
        </div>

        <div v-if="isLoadingItems" class="divide-y">
          <div v-for="i in 5" :key="i" class="flex gap-4 px-4 py-3">
            <div class="skeleton h-4 w-4 rounded"></div>
            <div class="skeleton h-4 w-20 rounded"></div>
            <div class="skeleton h-4 w-16 rounded"></div>
            <div class="skeleton h-4 w-16 rounded"></div>
            <div class="skeleton h-4 w-12 rounded"></div>
          </div>
        </div>

        <div v-else class="overflow-x-auto">
          <!-- Filtres inline colonnes -->
          <table class="data-table w-full">
            <thead>
              <tr>
                <th class="w-10">
                  <input type="checkbox" @change="toggleAll" :checked="allSelected" class="rounded" />
                </th>
                <th>N° Colis</th>
                <th class="text-right">Longueur</th>
                <th class="text-right">Épaisseur</th>
                <th class="text-right hidden sm:table-cell">Nb P</th>
                <th class="text-right">Volume</th>
                <th class="hidden md:table-cell">Essence</th>
              </tr>
              <tr class="bg-white border-b border-slate-100">
                <th></th>
                <th class="px-3 py-1.5">
                  <input v-model="colFilter.numero_colis" type="text" placeholder="🔍"
                    class="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400" />
                </th>
                <th class="px-3 py-1.5">
                  <input v-model="colFilter.longueur" type="text" placeholder="🔍"
                    class="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400" />
                </th>
                <th class="px-3 py-1.5">
                  <input v-model="colFilter.epaisseur" type="text" placeholder="🔍"
                    class="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400" />
                </th>
                <th class="hidden sm:table-cell"></th>
                <th></th>
                <th class="hidden md:table-cell"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredItems.length === 0">
                <td colspan="7" class="py-12 text-center text-sm text-gray-400">
                  Aucun colis disponible. Lancez une recherche.
                </td>
              </tr>
              <tr v-for="item in filteredItems" :key="item.id"
                class="cursor-pointer"
                :class="form.article_item_ids.includes(item.id) ? 'bg-blue-50' : ''"
                @click="toggleItem(item.id)"
              >
                <td class="w-10" @click.stop>
                  <input type="checkbox" :value="item.id" v-model="form.article_item_ids" class="rounded" />
                </td>
                <td class="font-mono text-xs font-semibold text-gray-900">{{ item.numero_colis }}</td>
                <td class="text-right">{{ item.longueur }}</td>
                <td class="text-right">{{ item.epaisseur }}</td>
                <td class="text-right hidden sm:table-cell">{{ item.nombre_piece }}</td>
                <td class="text-right font-medium">{{ formatVolume(item.volume) }}</td>
                <td class="hidden md:table-cell">
                  <span class="badge badge-blue">{{ item.essence ?? '—' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Bouton Suivant -->
      <div class="flex justify-end">
        <button
          class="btn btn-primary"
          :disabled="!form.client_id || form.article_item_ids.length === 0"
          @click="goToStep2"
        >
          Suivant ({{ form.article_item_ids.length }} colis)
          <ArrowRightIcon :size="15" />
        </button>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════
         ÉTAPE 2 — Prix par épaisseur + finalisation
    ═══════════════════════════════════════════════ -->
    <template v-else>

      <!-- Récapitulatif -->
      <div class="card p-5 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Client</p>
          <p class="text-base font-bold text-gray-900">{{ selectedClient?.name }}</p>
        </div>
        <div>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Date</p>
          <p class="text-sm font-semibold text-gray-700">{{ formatDate(form.date) }}</p>
        </div>
        <div>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Colis sélectionnés</p>
          <p class="text-sm font-bold text-primary-600">{{ selectedItems.length }}</p>
        </div>
        <button class="btn btn-secondary btn-sm self-start sm:self-center" @click="step = 1">
          <ArrowLeftIcon :size="14" /> Modifier la sélection
        </button>
      </div>

      <!-- Prix par épaisseur -->
      <div class="card p-5 mb-5">
        <h4 class="text-sm font-bold text-gray-700 mb-4">Prix par épaisseur (FCFA/m³)</h4>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div v-for="ep in epaisseurList" :key="ep">
            <label class="block text-xs font-medium text-gray-600 mb-1">Épaisseur {{ ep }}</label>
            <input
              v-model.number="priceByEpaisseur[ep]"
              type="number" min="0" step="1"
              class="field text-sm"
              :placeholder="`Prix pour ${ep}`"
              @input="applyEpaisseurPrice(ep)"
            />
          </div>
        </div>
      </div>

      <!-- Table des colis sélectionnés avec prix -->
      <div class="card overflow-hidden mb-5">
        <div class="px-5 py-3 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Détail des colis</span>
          <span class="text-xs font-bold text-gray-900">
            Total : {{ formatPrice(totalFacture) }} FCFA
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>N° Colis</th>
                <th class="text-right">Longueur</th>
                <th class="text-right hidden sm:table-cell">Épaisseur</th>
                <th class="text-right">Volume (m³)</th>
                <th class="text-right">Prix/m³ (FCFA)</th>
                <th class="text-right">Total</th>
                <th class="text-center">Retirer</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in selectedItems" :key="item.id">
                <td class="font-mono text-xs font-semibold">{{ item.numero_colis }}</td>
                <td class="text-right">{{ item.longueur }}</td>
                <td class="text-right hidden sm:table-cell">{{ item.epaisseur }}</td>
                <td class="text-right">{{ formatVolume(item.volume) }}</td>
                <td class="text-right">
                  <input
                    v-model.number="itemPrices[item.id]"
                    type="number" min="0" step="1"
                    class="w-28 px-2 py-1 text-xs text-right border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400"
                    placeholder="0"
                  />
                </td>
                <td class="text-right font-semibold text-gray-900">
                  {{ formatPrice(computeTotal(item)) }}
                </td>
                <td class="text-center">
                  <button type="button" class="btn btn-danger btn-sm" @click="removeItem(item.id)">
                    <Trash2Icon :size="13" />
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-slate-50 font-semibold text-sm">
                <td colspan="5" class="px-4 py-2.5 text-right text-gray-600">Total facture :</td>
                <td class="px-4 py-2.5 text-right text-gray-900">{{ formatPrice(totalFacture) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Finaliser -->
      <div class="flex justify-end">
        <button class="btn btn-success" :disabled="isSaving || selectedItems.length === 0" @click="finalizeInvoice">
          <SaveIcon v-if="!isSaving" :size="15" />
          {{ isSaving ? 'Enregistrement…' : 'Finaliser la facture' }}
        </button>
      </div>
    </template>

    <!-- ══ Modal : Ajouter un client ═══════════════ -->
    <Transition name="modal">
      <div v-if="showModalClient" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showModalClient = false">
        <div class="modal-panel card w-full max-w-sm p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-base font-bold text-gray-900">Ajouter un client</h3>
            <button class="text-gray-400 hover:text-gray-600 text-xl" @click="showModalClient = false">✕</button>
          </div>
          <form @submit.prevent="saveNewClient" class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
              <input v-model="newClient.name" type="text" class="field" required />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
              <input v-model="newClient.address" type="text" class="field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
              <input v-model="newClient.phone" type="text" class="field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input v-model="newClient.email" type="email" class="field" />
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
              <button type="button" class="btn btn-secondary" @click="showModalClient = false">Annuler</button>
              <button type="submit" class="btn btn-success" :disabled="isSavingClient">
                {{ isSavingClient ? 'Ajout…' : 'Ajouter' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeftIcon, ArrowRightIcon, SearchIcon, RotateCcwIcon,
  UserPlusIcon, XIcon, CheckIcon, SaveIcon, Trash2Icon,
} from 'lucide-vue-next'
import PageHeader from '../../components/PageHeader.vue'
import { useToastStore } from '../../stores/toast.store'
import type { Client, ArticleItem } from '../../electron.d'

const router = useRouter()
const toast  = useToastStore()

// ── State global ───────────────────────────────────
const step         = ref<1 | 2>(1)
const isSaving     = ref(false)
const isSavingClient = ref(false)
const showModalClient = ref(false)

// ── Clients ────────────────────────────────────────
const clients            = ref<Client[]>([])
const clientSearch       = ref('')
const showClientDropdown = ref(false)
const selectedClient     = ref<Client | null>(null)
const clientDropdownRef  = ref<HTMLElement | null>(null)

const newClient = reactive({ name: '', address: '', phone: '', email: '' })

const filteredClients = computed(() =>
  clients.value.filter(c =>
    !clientSearch.value || c.name.toLowerCase().includes(clientSearch.value.toLowerCase())
  )
)

function selectClient(c: Client) {
  selectedClient.value   = c
  form.client_id         = c.id
  clientSearch.value     = ''
  showClientDropdown.value = false
}

function clearClient() {
  selectedClient.value = null
  form.client_id       = 0
}

// ── Formulaire ────────────────────────────────────
const form = reactive({
  client_id:       0,
  date:            new Date().toISOString().split('T')[0],
  article_item_ids: [] as number[],
})

// ── Article items ──────────────────────────────────
const essences       = ['Ayous', 'Frake', 'Dibetou', 'Bois Rouge', 'Dabema']
const allItems       = ref<(ArticleItem & { essence?: string })[]>([])
const isLoadingItems = ref(false)

const search = reactive({
  essence: '', numero_colis: '', epaisseur: '',
  longueur_min: null as number | null,
  longueur_max: null as number | null,
})

const colFilter = reactive({ numero_colis: '', longueur: '', epaisseur: '' })

const filteredItems = computed(() => {
  return allItems.value.filter(item => {
    if (colFilter.numero_colis && !item.numero_colis.toLowerCase().includes(colFilter.numero_colis.toLowerCase())) return false
    if (colFilter.longueur    && !String(item.longueur).includes(colFilter.longueur)) return false
    if (colFilter.epaisseur   && !String(item.epaisseur).includes(colFilter.epaisseur)) return false
    return true
  })
})

const allSelected = computed(() =>
  filteredItems.value.length > 0 &&
  filteredItems.value.every(i => form.article_item_ids.includes(i.id))
)

async function applySearch() {
  isLoadingItems.value = true
  const params: Record<string, unknown> = { per_page: 1000, indisponible: 0 }
  if (search.essence)      params['essence']      = search.essence
  if (search.numero_colis) params['numero_colis'] = search.numero_colis
  if (search.epaisseur)    params['epaisseur']    = search.epaisseur
  if (search.longueur_min !== null) params['longueur_min'] = search.longueur_min
  if (search.longueur_max !== null) params['longueur_max'] = search.longueur_max

  const res = await window.electron.articleItems.list(params)

  // Join article info from local articles cache
  const artRes = await window.electron.articles.list({ per_page: 500 })
  const artMap: Record<number, string> = {}
  for (const a of artRes.data) artMap[a.id] = a.essence

  allItems.value = (res.data as any[])
    .filter(i => !i.indisponible)
    .map(i => ({ ...i, essence: artMap[i.article_id] ?? null }))
    .sort((a, b) => String(a.numero_colis).localeCompare(String(b.numero_colis), 'fr', { numeric: true }))

  isLoadingItems.value = false
}

function resetSearch() {
  search.essence = ''; search.numero_colis = ''; search.epaisseur = ''
  search.longueur_min = null; search.longueur_max = null
  applySearch()
}

function toggleItem(id: number) {
  const idx = form.article_item_ids.indexOf(id)
  if (idx === -1) form.article_item_ids.push(id)
  else form.article_item_ids.splice(idx, 1)
}

function toggleAll() {
  if (allSelected.value) {
    form.article_item_ids = form.article_item_ids.filter(id => !filteredItems.value.some(i => i.id === id))
  } else {
    for (const item of filteredItems.value) {
      if (!form.article_item_ids.includes(item.id)) form.article_item_ids.push(item.id)
    }
  }
}

// ── Étape 2 ────────────────────────────────────────
const itemPrices      = ref<Record<number, number>>({})
const priceByEpaisseur = ref<Record<string, number>>({})

const selectedItems = computed(() =>
  allItems.value.filter(i => form.article_item_ids.includes(i.id))
)

const epaisseurList = computed(() => {
  const set = new Set(selectedItems.value.map(i => String(i.epaisseur)))
  return [...set].sort((a, b) => Number(a) - Number(b))
})

function applyEpaisseurPrice(ep: string) {
  const price = priceByEpaisseur.value[ep]
  if (!price) return
  for (const item of selectedItems.value) {
    if (String(item.epaisseur) === ep) itemPrices.value[item.id] = price
  }
}

function computeTotal(item: ArticleItem) {
  const price = itemPrices.value[item.id] ?? 0
  return Math.round((item.volume ?? 0) * price)
}

const totalFacture = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + computeTotal(item), 0)
)

function goToStep2() {
  if (!form.client_id || form.article_item_ids.length === 0) return
  step.value = 2
  // Initialiser les prix depuis priceByEpaisseur si disponible
  for (const item of selectedItems.value) {
    const ep = String(item.epaisseur)
    if (!itemPrices.value[item.id] && priceByEpaisseur.value[ep]) {
      itemPrices.value[item.id] = priceByEpaisseur.value[ep]
    }
  }
}

function removeItem(id: number) {
  form.article_item_ids = form.article_item_ids.filter(i => i !== id)
  if (form.article_item_ids.length === 0) step.value = 1
}

async function finalizeInvoice() {
  if (!form.client_id || selectedItems.value.length === 0) return
  isSaving.value = true
  try {
    const items = selectedItems.value.map(item => ({
      article_item_id:      item.id,
      article_id:           item.article_id,
      price:                itemPrices.value[item.id] ?? 0,
      total_price_item:     computeTotal(item),
      volume_vendu:         item.volume,
      nombre_de_colis_vendu: 1,
    }))

    const invoice = await window.electron.invoices.create({
      client_id: form.client_id,
      date:      form.date,
      status:    'pending',
      items,
    })

    toast.show('Facture créée avec succès')
    router.push(`/invoices/${(invoice as any).id}`)
  } catch {
    toast.show('Erreur lors de la création de la facture', 'error')
  } finally {
    isSaving.value = false
  }
}

// ── Nouveau client ─────────────────────────────────
async function saveNewClient() {
  isSavingClient.value = true
  try {
    const created = await window.electron.clients.create({ ...newClient }) as Client
    clients.value.push(created)
    selectClient(created)
    newClient.name = newClient.address = newClient.phone = newClient.email = ''
    showModalClient.value = false
    toast.show('Client ajouté')
  } catch {
    toast.show('Erreur : le client existe peut-être déjà', 'error')
  } finally {
    isSavingClient.value = false
  }
}

// ── Fermer dropdown client au clic extérieur ───────
function handleClickOutside(e: MouseEvent) {
  if (clientDropdownRef.value && !clientDropdownRef.value.contains(e.target as Node)) {
    showClientDropdown.value = false
  }
}

// ── Helpers ────────────────────────────────────────
function formatVolume(v?: number | null) {
  return v != null ? parseFloat(String(v)).toFixed(3) : '0.000'
}
function formatPrice(p: number) {
  return new Intl.NumberFormat('de-DE').format(Math.round(p))
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR')
}

// ── Load ───────────────────────────────────────────
async function loadClients() {
  const res = await window.electron.clients.list({ per_page: 500 })
  clients.value = res.data
}

onMounted(() => {
  loadClients()
  applySearch()
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
