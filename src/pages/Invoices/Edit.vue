<template>
  <div class="p-4 sm:p-6">
    <PageHeader
      :title="invoice ? `Modifier Facture ${invoice.matricule ?? '#' + invoice.id}` : 'Chargement…'"
      :breadcrumbs="[
        { label: 'Tableau de bord', to: '/dashboard' },
        { label: 'Factures', to: '/invoices' },
        { label: invoice ? (invoice.matricule ?? '#' + invoice.id) : '…', to: invoice ? `/invoices/${invoice.id}` : '/invoices' },
        { label: 'Modifier' },
      ]"
    >
      <div class="flex items-center gap-2">
        <button class="btn btn-secondary btn-sm" @click="router.push(`/invoices/${invoiceId}`)">
          <ArrowLeftIcon :size="14" /> Retour
        </button>
      </div>
    </PageHeader>

    <!-- Skeleton -->
    <div v-if="isLoading" class="space-y-4">
      <div class="card p-6 h-28 skeleton"></div>
      <div class="card p-6 h-48 skeleton"></div>
      <div class="card p-6 h-64 skeleton"></div>
    </div>

    <template v-else-if="invoice">

      <!-- ── Infos générales ──────────────────────── -->
      <div class="card p-5 mb-5">
        <h3 class="text-sm font-bold text-slate-700 mb-4">Informations générales</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <!-- Client -->
          <div class="sm:col-span-1">
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Client *</label>
            <div class="relative" ref="clientDropdownRef">
              <div class="relative">
                <SearchIcon :size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  v-model="clientSearch"
                  type="text"
                  class="field pl-8"
                  placeholder="Rechercher un client…"
                  @focus="showClientDropdown = true"
                  @input="showClientDropdown = true"
                />
              </div>
              <div
                v-if="showClientDropdown && filteredClients.length > 0"
                class="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto"
              >
                <button
                  v-for="c in filteredClients" :key="c.id"
                  type="button"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                  @mousedown.prevent="selectClient(c)"
                >{{ c.name }}</button>
              </div>
            </div>
            <div v-if="selectedClient" class="mt-2 flex items-center gap-2">
              <span class="badge badge-blue px-3 py-1 text-sm">{{ selectedClient.name }}</span>
            </div>
          </div>

          <!-- Date -->
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Date *</label>
            <input v-model="form.date" type="date" class="field" required />
          </div>

          <!-- Statut -->
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Statut</label>
            <select v-model="form.status" class="field">
              <option value="pending">En attente</option>
              <option value="validated">Validée</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end mt-4 pt-4 border-t border-slate-100">
          <button class="btn btn-primary btn-sm" :disabled="isSavingHeader" @click="saveHeader">
            <SaveIcon :size="14" />
            {{ isSavingHeader ? 'Enregistrement…' : 'Enregistrer les infos' }}
          </button>
        </div>
      </div>

      <!-- ── Prix par épaisseur ─────────────────────── -->
      <div class="card p-5 mb-5" v-if="epaisseurList.length > 0">
        <h3 class="text-sm font-bold text-slate-700 mb-4">Prix par épaisseur (FCFA/m³)</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          <div v-for="ep in epaisseurList" :key="ep">
            <label class="block text-xs font-medium text-slate-600 mb-1">Épaisseur {{ ep }}</label>
            <input
              v-model.number="priceByEpaisseur[ep]"
              type="number" min="0" step="1"
              class="field text-sm"
              :placeholder="`Prix pour ${ep}`"
              @input="applyEpaisseurPrice(ep)"
            />
          </div>
        </div>
        <button
          class="btn btn-primary btn-sm"
          :disabled="isSavingPrices"
          @click="saveAllPrices"
        >
          <SaveIcon :size="14" />
          {{ isSavingPrices ? 'Enregistrement…' : 'Appliquer et enregistrer les prix' }}
        </button>
      </div>

      <!-- ── Articles de la facture ─────────────────── -->
      <div class="card overflow-hidden mb-5">
        <div class="card-section">
          <span class="card-section-label">Colis de la facture</span>
          <div class="flex items-center gap-3">
            <span class="text-[11px] text-slate-400">{{ items.length }} colis</span>
            <button class="btn btn-success btn-sm" @click="showAddPanel = !showAddPanel">
              <PlusIcon :size="13" />
              Ajouter des colis
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Essence</th>
                <th>N° Colis</th>
                <th class="text-right">Long.</th>
                <th class="text-right">Ép.</th>
                <th class="text-right hidden sm:table-cell">Volume (m³)</th>
                <th class="text-right">Prix/m³</th>
                <th class="text-right">Total</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="items.length === 0">
                <td colspan="8" class="py-12 text-center text-sm text-slate-400">
                  Aucun article dans cette facture.
                </td>
              </tr>
              <tr v-for="item in items" :key="item.id">
                <td><span class="badge badge-blue">{{ item.essence ?? '—' }}</span></td>
                <td class="font-mono text-xs font-bold text-slate-800">{{ item.numero_colis ?? '—' }}</td>
                <td class="text-right text-slate-600 text-xs">{{ item.longueur ?? '—' }}</td>
                <td class="text-right text-slate-600 text-xs">{{ item.epaisseur ?? '—' }}</td>
                <td class="text-right font-semibold text-slate-800 hidden sm:table-cell">{{ formatVolume(item.volume) }}</td>
                <td class="text-right">
                  <input
                    v-model.number="itemPrices[item.id]"
                    type="number" min="0" step="1"
                    class="w-28 px-2 py-1 text-xs text-right border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400"
                    placeholder="0"
                    @change="saveItemPrice(item)"
                  />
                </td>
                <td class="text-right font-bold text-slate-900">
                  {{ formatPrice(computeItemTotal(item)) }}
                </td>
                <td class="text-center">
                  <button
                    class="btn btn-danger btn-sm"
                    :disabled="removingItemId === item.id"
                    @click="confirmRemoveItem(item)"
                  >
                    <Trash2Icon :size="13" />
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="items.length > 0">
              <tr class="bg-slate-50 text-sm font-semibold">
                <td colspan="6" class="text-right text-slate-500 px-4 py-2.5">Total facture :</td>
                <td class="text-right text-slate-900 px-4 py-2.5">{{ formatPrice(totalFacture) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- ── Panneau ajout de colis ──────────────────── -->
      <div v-if="showAddPanel" class="card p-5 mb-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-slate-700">Ajouter des colis disponibles</h3>
          <button class="btn btn-ghost btn-xs" @click="showAddPanel = false">
            <XIcon :size="15" />
          </button>
        </div>

        <!-- Filtres de recherche -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Essence</label>
            <select v-model="addSearch.essence" class="field text-sm">
              <option value="">Toutes</option>
              <option v-for="e in essences" :key="e" :value="e">{{ e }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">N° Colis</label>
            <input v-model="addSearch.numero_colis" type="text" class="field text-sm" placeholder="ex: C3046" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Épaisseur</label>
            <select v-model="addSearch.epaisseur" class="field text-sm">
              <option value="">Toutes</option>
              <option value="27">27</option>
              <option value="40">40</option>
              <option value="6">6</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Long. min</label>
            <input v-model.number="addSearch.longueur_min" type="number" class="field text-sm" placeholder="Min" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Long. max</label>
            <input v-model.number="addSearch.longueur_max" type="number" class="field text-sm" placeholder="Max" />
          </div>
        </div>
        <div class="flex gap-2 mb-4">
          <button class="btn btn-primary btn-sm" @click="searchAvailableItems" :disabled="isLoadingAvailable">
            <SearchIcon :size="14" /> Rechercher
          </button>
          <button class="btn btn-secondary btn-sm" @click="resetAddSearch">
            <RotateCcwIcon :size="14" /> Réinitialiser
          </button>
        </div>

        <!-- Table des colis disponibles -->
        <div v-if="availableItems.length > 0 || isLoadingAvailable" class="overflow-x-auto border border-slate-200 rounded-xl">
          <div v-if="isLoadingAvailable" class="py-8 text-center text-sm text-slate-400">Chargement…</div>
          <table v-else class="data-table w-full">
            <thead>
              <tr>
                <th class="w-10">
                  <input type="checkbox" @change="toggleAllAvailable" :checked="allAvailableSelected" class="rounded" />
                </th>
                <th>N° Colis</th>
                <th class="text-right">Longueur</th>
                <th class="text-right">Épaisseur</th>
                <th class="text-right hidden sm:table-cell">Volume</th>
                <th class="hidden md:table-cell">Essence</th>
                <th class="text-right">Prix/m³</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in availableItems" :key="item.id"
                class="cursor-pointer"
                :class="selectedToAdd.includes(item.id) ? 'bg-blue-50' : ''"
                @click="toggleToAdd(item.id)"
              >
                <td class="w-10" @click.stop>
                  <input type="checkbox" :value="item.id" v-model="selectedToAdd" class="rounded" />
                </td>
                <td class="font-mono text-xs font-semibold text-slate-900">{{ item.numero_colis }}</td>
                <td class="text-right">{{ item.longueur }}</td>
                <td class="text-right">{{ item.epaisseur }}</td>
                <td class="text-right hidden sm:table-cell">{{ formatVolume(item.volume) }}</td>
                <td class="hidden md:table-cell"><span class="badge badge-blue">{{ item.essence ?? '—' }}</span></td>
                <td class="text-right">
                  <input
                    v-model.number="addItemPrices[item.id]"
                    type="number" min="0" step="1"
                    class="w-24 px-2 py-1 text-xs text-right border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400"
                    placeholder="0"
                    @click.stop
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else-if="!isLoadingAvailable" class="text-sm text-slate-400 py-4 text-center">
          Lancez une recherche pour afficher les colis disponibles.
        </p>

        <div class="flex justify-end mt-4 pt-4 border-t border-slate-100" v-if="selectedToAdd.length > 0">
          <button class="btn btn-success" :disabled="isAddingItems" @click="addSelectedItems">
            <PlusIcon :size="14" />
            {{ isAddingItems ? 'Ajout…' : `Ajouter ${selectedToAdd.length} colis` }}
          </button>
        </div>
      </div>

    </template>

    <!-- Not found -->
    <div v-else-if="!isLoading" class="card p-12 text-center">
      <p class="text-sm text-slate-400 font-medium">Facture introuvable</p>
      <button class="btn btn-secondary btn-sm mt-4" @click="router.push('/invoices')">
        <ArrowLeftIcon :size="13" /> Retour à la liste
      </button>
    </div>

    <!-- ── Confirmation suppression item ─────────── -->
    <Transition name="modal">
      <div
        v-if="confirmRemove"
        class="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
        @click.self="confirmRemove = null"
      >
        <div class="modal-panel card-raised p-6 w-full max-w-sm">
          <div class="flex items-start gap-3 mb-5">
            <div class="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangleIcon :size="17" class="text-red-600" />
            </div>
            <div>
              <h3 class="font-bold text-slate-900">Supprimer ce colis ?</h3>
              <p class="text-sm text-slate-500 mt-1">
                Le colis <strong>{{ confirmRemove?.numero_colis }}</strong> sera retiré de la facture et remis en disponible.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button class="btn btn-secondary btn-sm" @click="confirmRemove = null">Annuler</button>
            <button class="btn btn-danger btn-sm" :disabled="removingItemId !== null" @click="doRemoveItem">
              <Trash2Icon :size="13" />
              {{ removingItemId !== null ? 'Suppression…' : 'Oui, supprimer' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ArrowLeftIcon, SaveIcon, Trash2Icon, PlusIcon, SearchIcon,
  RotateCcwIcon, XIcon, AlertTriangleIcon,
} from 'lucide-vue-next'
import PageHeader from '../../components/PageHeader.vue'
import { useToastStore } from '../../stores/toast.store'
import type { Invoice, InvoiceItem, Client, ArticleItem } from '../../electron.d'

const router = useRouter()
const route  = useRoute()
const toast  = useToastStore()

const invoiceId = Number(route.params.id)

// ── État principal ─────────────────────────────────
const isLoading      = ref(true)
const isSavingHeader = ref(false)
const isSavingPrices = ref(false)
const isAddingItems  = ref(false)
const removingItemId = ref<number | null>(null)
const showAddPanel   = ref(false)

const invoice = ref<Invoice | null>(null)
const items   = ref<InvoiceItem[]>([])
const clients = ref<Client[]>([])

// ── Formulaire en-tête ─────────────────────────────
const form = reactive({ client_id: 0, date: '', status: 'pending' as 'pending' | 'validated' })

// ── Client dropdown ────────────────────────────────
const clientSearch       = ref('')
const showClientDropdown = ref(false)
const selectedClient     = ref<Client | null>(null)
const clientDropdownRef  = ref<HTMLElement | null>(null)

const filteredClients = computed(() =>
  clients.value.filter(c =>
    !clientSearch.value || c.name.toLowerCase().includes(clientSearch.value.toLowerCase())
  )
)

function selectClient(c: Client) {
  selectedClient.value     = c
  form.client_id           = c.id
  clientSearch.value       = ''
  showClientDropdown.value = false
}

// ── Prix par item ──────────────────────────────────
const itemPrices = ref<Record<number, number>>({})

const epaisseurList = computed(() => {
  const set = new Set(items.value.map(i => String(i.epaisseur ?? '')).filter(Boolean))
  return [...set].sort((a, b) => Number(a) - Number(b))
})

const priceByEpaisseur = ref<Record<string, number>>({})

function applyEpaisseurPrice(ep: string) {
  const price = priceByEpaisseur.value[ep]
  if (!price) return
  for (const item of items.value) {
    if (String(item.epaisseur) === ep) itemPrices.value[item.id] = price
  }
}

function computeItemTotal(item: InvoiceItem): number {
  const price = itemPrices.value[item.id] ?? 0
  return Math.round((item.volume ?? item.volume_vendu ?? 0) * price)
}

const totalFacture = computed(() =>
  items.value.reduce((sum, item) => sum + computeItemTotal(item), 0)
)

async function saveItemPrice(item: InvoiceItem) {
  const price = itemPrices.value[item.id] ?? 0
  try {
    await window.electron.invoices.updateItem(invoiceId, item.id, { price })
  } catch {
    toast.show('Impossible de mettre à jour le prix', 'error')
  }
}

async function saveAllPrices() {
  isSavingPrices.value = true
  try {
    await Promise.all(
      items.value.map(item =>
        window.electron.invoices.updateItem(invoiceId, item.id, { price: itemPrices.value[item.id] ?? 0 })
      )
    )
    toast.show('Prix mis à jour avec succès')
  } catch {
    toast.show('Erreur lors de la mise à jour des prix', 'error')
  } finally {
    isSavingPrices.value = false
  }
}

// ── Enregistrer en-tête ────────────────────────────
async function saveHeader() {
  if (!form.client_id || !form.date) return
  isSavingHeader.value = true
  try {
    const updated = await window.electron.invoices.update(invoiceId, {
      client_id: form.client_id,
      date:      form.date,
      status:    form.status,
    })
    invoice.value = updated
    toast.show('Facture mise à jour')
  } catch {
    toast.show('Impossible de modifier la facture', 'error')
  } finally {
    isSavingHeader.value = false
  }
}

// ── Supprimer un item ──────────────────────────────
const confirmRemove = ref<InvoiceItem | null>(null)

function confirmRemoveItem(item: InvoiceItem) {
  confirmRemove.value = item
}

async function doRemoveItem() {
  if (!confirmRemove.value) return
  removingItemId.value = confirmRemove.value.id
  try {
    await window.electron.invoices.removeItem(invoiceId, confirmRemove.value.id)
    items.value = items.value.filter(i => i.id !== confirmRemove.value!.id)
    toast.show('Colis retiré de la facture')
    confirmRemove.value = null
  } catch {
    toast.show('Impossible de supprimer ce colis', 'error')
  } finally {
    removingItemId.value = null
  }
}

// ── Ajout de colis ─────────────────────────────────
const essences       = ['Ayous', 'Frake', 'Dibetou', 'Bois Rouge', 'Dabema']
const availableItems = ref<(ArticleItem & { essence?: string; article_id?: number })[]>([])
const selectedToAdd  = ref<number[]>([])
const addItemPrices  = ref<Record<number, number>>({})
const isLoadingAvailable = ref(false)

const addSearch = reactive({
  essence: '', numero_colis: '', epaisseur: '',
  longueur_min: null as number | null,
  longueur_max: null as number | null,
})

const allAvailableSelected = computed(() =>
  availableItems.value.length > 0 &&
  availableItems.value.every(i => selectedToAdd.value.includes(i.id))
)

function toggleToAdd(id: number) {
  const idx = selectedToAdd.value.indexOf(id)
  if (idx === -1) selectedToAdd.value.push(id)
  else selectedToAdd.value.splice(idx, 1)
}

function toggleAllAvailable() {
  if (allAvailableSelected.value) {
    selectedToAdd.value = []
  } else {
    selectedToAdd.value = availableItems.value.map(i => i.id)
  }
}

async function searchAvailableItems() {
  isLoadingAvailable.value = true
  const currentItemIds = new Set(items.value.map(i => i.article_item_id).filter(Boolean))

  const params: Record<string, unknown> = { per_page: 1000, indisponible: 0 }
  if (addSearch.essence)      params['essence']      = addSearch.essence
  if (addSearch.numero_colis) params['numero_colis'] = addSearch.numero_colis
  if (addSearch.epaisseur)    params['epaisseur']    = addSearch.epaisseur
  if (addSearch.longueur_min !== null) params['longueur_min'] = addSearch.longueur_min
  if (addSearch.longueur_max !== null) params['longueur_max'] = addSearch.longueur_max

  const [res, artRes] = await Promise.all([
    window.electron.articleItems.list(params),
    window.electron.articles.list({ per_page: 500 }),
  ])

  const artMap: Record<number, { essence: string; id: number }> = {}
  for (const a of artRes.data) artMap[a.id] = { essence: a.essence, id: a.id }

  availableItems.value = (res.data as any[])
    .filter(i => !i.indisponible && !currentItemIds.has(i.id))
    .map(i => ({
      ...i,
      essence:    artMap[i.article_id]?.essence ?? null,
      article_id: i.article_id,
    }))
    .sort((a, b) => String(a.numero_colis).localeCompare(String(b.numero_colis), 'fr', { numeric: true }))

  // Pré-remplir les prix depuis priceByEpaisseur
  for (const item of availableItems.value) {
    const ep = String(item.epaisseur ?? '')
    if (!addItemPrices.value[item.id] && priceByEpaisseur.value[ep]) {
      addItemPrices.value[item.id] = priceByEpaisseur.value[ep]
    }
  }

  isLoadingAvailable.value = false
}

function resetAddSearch() {
  addSearch.essence = ''; addSearch.numero_colis = ''; addSearch.epaisseur = ''
  addSearch.longueur_min = null; addSearch.longueur_max = null
  searchAvailableItems()
}

async function addSelectedItems() {
  isAddingItems.value = true
  const toAdd = availableItems.value.filter(i => selectedToAdd.value.includes(i.id))
  try {
    for (const item of toAdd) {
      await window.electron.invoices.addItem(invoiceId, {
        article_item_id: item.id,
        article_id:      item.article_id ?? 0,
        price:           addItemPrices.value[item.id] ?? 0,
        volume:          item.volume ?? 0,
      })
    }
    // Recharger les items
    const updated = await window.electron.invoices.items(invoiceId)
    items.value = updated
    syncItemPrices()
    selectedToAdd.value  = []
    availableItems.value = availableItems.value.filter(i => !toAdd.some(t => t.id === i.id))
    toast.show(`${toAdd.length} colis ajouté(s) à la facture`)
  } catch {
    toast.show('Erreur lors de l\'ajout des colis', 'error')
  } finally {
    isAddingItems.value = false
  }
}

// ── Helpers ────────────────────────────────────────
function syncItemPrices() {
  for (const item of items.value) {
    if (itemPrices.value[item.id] === undefined) {
      itemPrices.value[item.id] = item.price ?? 0
    }
  }
  // Synchroniser priceByEpaisseur depuis les items existants
  for (const item of items.value) {
    const ep = String(item.epaisseur ?? '')
    if (ep && !priceByEpaisseur.value[ep] && item.price) {
      priceByEpaisseur.value[ep] = item.price
    }
  }
}

function formatVolume(v: number | null | undefined): string {
  return v != null ? parseFloat(String(v)).toFixed(3) : '0.000'
}

function formatPrice(p: number): string {
  return new Intl.NumberFormat('de-DE').format(Math.round(p))
}

function handleClickOutside(e: MouseEvent) {
  if (clientDropdownRef.value && !clientDropdownRef.value.contains(e.target as Node)) {
    showClientDropdown.value = false
  }
}

// ── Chargement ─────────────────────────────────────
async function loadAll() {
  isLoading.value = true
  const [inv, invItems, clientsRes] = await Promise.all([
    window.electron.invoices.get(invoiceId),
    window.electron.invoices.items(invoiceId),
    window.electron.clients.list({ per_page: 500 }),
  ])

  invoice.value = inv ?? null
  items.value   = invItems
  clients.value = clientsRes.data

  if (inv) {
    form.client_id = inv.client_id
    form.date      = inv.date?.slice(0, 10) ?? ''
    form.status    = inv.status === 'validated' ? 'validated' : 'pending'
    selectedClient.value = clientsRes.data.find(c => c.id === inv.client_id) ?? null
  }

  syncItemPrices()
  isLoading.value = false
}

onMounted(() => {
  loadAll()
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
