<template>
  <div class="p-6">
    <PageHeader
      title="Vue globale du stock"
      :breadcrumbs="[
        { label: 'Tableau de bord', to: '/dashboard' },
        { label: 'Gestion des stocks', to: '/articles' },
        { label: 'Vue globale du stock' },
      ]"
    />

    <!-- ── Bloc recherche ─────────────────────────── -->
    <div class="card p-5 mb-5">
      <h4 class="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
        <span>🔍</span> Rechercher
      </h4>

      <div class="grid grid-cols-3 gap-4 mb-3">
        <!-- Numéro de Contrat -->
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Numéro de Contrat</label>
          <select v-model="search.contract_number" class="field text-sm">
            <option value="">Tous</option>
            <option v-for="a in articles" :key="a.id" :value="a.contract_number">
              {{ a.contract_number }}
            </option>
          </select>
        </div>

        <!-- Numéro de Colis -->
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Numéro de Colis</label>
          <input v-model="search.numero_colis" type="text" class="field text-sm" placeholder="ex: C3046" />
        </div>

        <!-- Essence -->
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Essence</label>
          <select v-model="search.essence" class="field text-sm">
            <option value="">Toutes</option>
            <option v-for="ess in essences" :key="ess" :value="ess">{{ ess }}</option>
          </select>
        </div>

        <!-- Longueur min/max -->
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Longueur (Min – Max)</label>
          <div class="flex gap-2">
            <input v-model.number="search.longueur_min" type="number" class="field text-sm" placeholder="Min" />
            <input v-model.number="search.longueur_max" type="number" class="field text-sm" placeholder="Max" />
          </div>
        </div>

        <!-- Épaisseur -->
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Épaisseur</label>
          <select v-model="search.epaisseur" class="field text-sm">
            <option value="">Toutes les épaisseurs</option>
            <option value="27">27</option>
            <option value="40">40</option>
            <option value="6">6</option>
          </select>
        </div>

        <!-- Fournisseur -->
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Fournisseur</label>
          <select v-model="search.supplier_id" class="field text-sm">
            <option value="">Tous</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>

        <!-- Disponibilité -->
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Disponibilité</label>
          <select v-model="search.indisponible" class="field text-sm">
            <option value="all">Tout voir</option>
            <option :value="0">Disponible</option>
            <option :value="1">Indisponible</option>
          </select>
        </div>
      </div>

      <!-- Boutons -->
      <div class="flex gap-2 pt-1">
        <button class="btn btn-primary btn-sm" @click="applyFilters">🔎 Rechercher</button>
        <button class="btn btn-secondary btn-sm" @click="resetFilters">Réinitialiser</button>
        <button class="btn btn-secondary btn-sm" @click="downloadPdf">🖨 Imprimer</button>
      </div>
    </div>

    <!-- ── Table ───────────────────────────────────── -->
    <div class="card overflow-hidden">

      <!-- Compteur résultats -->
      <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-slate-50">
        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {{ filteredItems.length }} colis trouvé(s)
        </span>
        <span class="text-xs text-gray-400">
          Volume total : <strong class="text-gray-700">{{ formatVolume(totalVolume) }} m³</strong>
        </span>
      </div>

      <!-- Skeleton -->
      <div v-if="isLoading" class="divide-y">
        <div v-for="i in 8" :key="i" class="flex gap-4 px-4 py-3">
          <div class="skeleton h-4 w-20 rounded"></div>
          <div class="skeleton h-4 w-16 rounded"></div>
          <div class="skeleton h-4 w-20 rounded"></div>
          <div class="skeleton h-4 w-16 rounded"></div>
          <div class="skeleton h-4 w-12 rounded"></div>
          <div class="skeleton h-4 w-12 rounded ml-auto"></div>
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="data-table w-full">
          <thead>
            <tr>
              <th>N-CONTRAT</th>
              <th>ESSENCE</th>
              <th>N-COLIS</th>
              <th class="text-right">LONGUEUR</th>
              <th class="text-right">ÉPAISSEUR</th>
              <th class="text-right">NMBRE PCS</th>
              <th class="text-right">VOLUME</th>
              <th class="text-center">Statut</th>
              <th class="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id">
              <td class="font-mono text-xs font-semibold text-gray-900">
                {{ articleMap[item.article_id]?.contract_number ?? '—' }}
              </td>
              <td>
                <span class="badge badge-blue">{{ articleMap[item.article_id]?.essence ?? '—' }}</span>
              </td>
              <td class="font-mono text-xs font-semibold">{{ item.numero_colis }}</td>
              <td class="text-right">{{ item.longueur }}</td>
              <td class="text-right">{{ item.epaisseur }}</td>
              <td class="text-right">{{ item.nombre_piece }}</td>
              <td class="text-right font-medium">{{ formatVolume(item.volume) }}</td>
              <td class="text-center">
                <span v-if="item.indisponible" class="badge badge-red">Indisponible</span>
                <span v-else class="badge badge-green">Disponible</span>
              </td>
              <td class="text-center">
                <template v-if="!item.indisponible">
                  <button
                    class="btn btn-warning btn-sm mr-1"
                    @click="openEditItem(item)"
                  >Modifier</button>
                  <button
                    class="btn btn-danger btn-sm"
                    @click="confirmDelete = item.id"
                  >Supprimer</button>
                </template>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
            </tr>

            <tr v-if="!isLoading && filteredItems.length === 0">
              <td colspan="9" class="py-16 text-center">
                <p class="text-3xl mb-2">📭</p>
                <p class="text-sm text-gray-400">Aucun colis trouvé pour ces critères.</p>
                <button class="btn btn-secondary btn-sm mt-3" @click="resetFilters">
                  Réinitialiser les filtres
                </button>
              </td>
            </tr>
          </tbody>

          <tfoot v-if="filteredItems.length > 0">
            <tr class="bg-slate-50 text-sm font-semibold">
              <td colspan="6" class="px-4 py-2.5 text-right text-gray-600">Volume Total :</td>
              <td class="px-4 py-2.5 text-right text-gray-900">{{ formatVolume(totalVolume) }}</td>
              <td></td>
              <td></td>
            </tr>
            <tr class="bg-slate-50 text-sm font-semibold">
              <td colspan="6" class="px-4 py-2.5 text-right text-gray-600">Total des colis :</td>
              <td class="px-4 py-2.5 text-right text-gray-900">{{ filteredItems.length }}</td>
              <td></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- ── Modal : Modifier un colis ────────────────── -->
    <Transition name="modal">
      <div
        v-if="showModalEditItem"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showModalEditItem = false"
      >
        <div class="modal-panel card w-full max-w-md p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-base font-bold text-gray-900">Modification colis</h3>
            <button class="text-gray-400 hover:text-gray-600 text-xl" @click="showModalEditItem = false">✕</button>
          </div>
          <form @submit.prevent="saveEditItem" class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Numéro du colis *</label>
              <input v-model="editItemForm.numero_colis" type="text" class="field" required />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Longueur *</label>
                <input v-model="editItemForm.longueur" type="number" step="any" class="field" required />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Largeur *</label>
                <input v-model="editItemForm.largeur" type="number" step="any" class="field" required />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Épaisseur *</label>
                <input v-model="editItemForm.epaisseur" type="number" step="any" class="field" required />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Nombre de pièces *</label>
                <input v-model="editItemForm.nombre_piece" type="number" class="field" required />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Volume *</label>
              <input v-model="editItemForm.volume" type="number" step="any" class="field" required />
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
              <button type="button" class="btn btn-secondary" @click="showModalEditItem = false">Annuler</button>
              <button type="submit" class="btn btn-primary" :disabled="isSaving">
                {{ isSaving ? 'Enregistrement…' : 'Modifier' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ── Modal confirmation suppression ─────────── -->
    <Transition name="modal">
      <div
        v-if="confirmDelete !== null"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="confirmDelete = null"
      >
        <div class="modal-panel card p-6 w-full max-w-sm">
          <div class="flex items-start gap-3 mb-4">
            <div class="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">⚠</div>
            <div>
              <h3 class="font-bold text-gray-900">Êtes-vous sûr ?</h3>
              <p class="text-sm text-gray-500 mt-1">Cette action est irréversible.</p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button class="btn btn-secondary" @click="confirmDelete = null">Annuler</button>
            <button class="btn btn-danger" :disabled="isDeleting" @click="doDelete">
              {{ isDeleting ? 'Suppression…' : 'Oui, supprimer' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { useToastStore } from '../../stores/toast.store'
import type { Article, ArticleItem, Supplier } from '../../electron.d'

const toast = useToastStore()

// ── State ──────────────────────────────────────────
const isLoading   = ref(true)
const isDeleting  = ref(false)
const isSaving    = ref(false)
const confirmDelete = ref<number | null>(null)

const showModalEditItem = ref(false)
const editItemForm = reactive({
  id: 0, numero_colis: '', longueur: 0, largeur: 0, epaisseur: 0, nombre_piece: 0, volume: 0,
})

const allItems      = ref<ArticleItem[]>([])
const filteredItems = ref<ArticleItem[]>([])
const articles      = ref<Article[]>([])
const suppliers     = ref<Supplier[]>([])

// Map article_id → article (pour lookup rapide dans la table)
const articleMap = computed<Record<number, Article>>(() => {
  const m: Record<number, Article> = {}
  for (const a of articles.value) m[a.id] = a
  return m
})

// Map supplier_id → supplier (pour filtre)
const supplierArticleIds = computed<Record<number, number[]>>(() => {
  const m: Record<number, number[]> = {}
  for (const a of articles.value) {
    if (!m[a.supplier_id]) m[a.supplier_id] = []
    m[a.supplier_id].push(a.id)
  }
  return m
})

// ── Filtres ────────────────────────────────────────
const essences = ['Ayous', 'Frake', 'Dibetou', 'Bois Rouge', 'Dabema']

const search = reactive({
  contract_number: '',
  numero_colis:    '',
  essence:         '',
  longueur_min:    null as number | null,
  longueur_max:    null as number | null,
  epaisseur:       '',
  supplier_id:     '' as number | '',
  indisponible:    0  as 'all' | 0 | 1,
})

// ── Computed ───────────────────────────────────────
const totalVolume = computed(() =>
  filteredItems.value.reduce((s, i) => s + (i.volume || 0), 0)
)

// ── Load ───────────────────────────────────────────
async function loadAll() {
  isLoading.value = true
  const [itemsRes, articlesRes, suppliersRes] = await Promise.all([
    window.electron.articleItems.list({ per_page: 2000 }),
    window.electron.articles.list({ per_page: 500 }),
    window.electron.suppliers.list({ per_page: 500 }),
  ])
  allItems.value  = itemsRes.data
  articles.value  = articlesRes.data
  suppliers.value = suppliersRes.data
  isLoading.value = false
  applyFilters()
}

// ── Filtres ────────────────────────────────────────
function applyFilters() {
  filteredItems.value = allItems.value.filter(item => {
    const art = articleMap.value[item.article_id]

    // Disponibilité
    if (search.indisponible !== 'all' && Number(item.indisponible) !== search.indisponible) return false

    // N° Contrat
    if (search.contract_number && art?.contract_number !== search.contract_number) return false

    // Essence
    if (search.essence && art?.essence !== search.essence) return false

    // N° Colis
    if (search.numero_colis && !item.numero_colis.toLowerCase().includes(search.numero_colis.toLowerCase())) return false

    // Longueur
    if (search.longueur_min !== null && item.longueur < search.longueur_min) return false
    if (search.longueur_max !== null && item.longueur > search.longueur_max) return false

    // Épaisseur
    if (search.epaisseur && String(item.epaisseur) !== search.epaisseur) return false

    // Fournisseur
    if (search.supplier_id !== '') {
      const ids = supplierArticleIds.value[Number(search.supplier_id)] ?? []
      if (!ids.includes(item.article_id)) return false
    }

    return true
  })
}

function resetFilters() {
  search.contract_number = ''
  search.numero_colis    = ''
  search.essence         = ''
  search.longueur_min    = null
  search.longueur_max    = null
  search.epaisseur       = ''
  search.supplier_id     = ''
  search.indisponible    = 0
  applyFilters()
}

// ── Actions ────────────────────────────────────────
function openEditItem(item: ArticleItem) {
  editItemForm.id           = item.id
  editItemForm.numero_colis = item.numero_colis
  editItemForm.longueur     = item.longueur
  editItemForm.largeur      = item.largeur ?? 0
  editItemForm.epaisseur    = item.epaisseur
  editItemForm.nombre_piece = item.nombre_piece
  editItemForm.volume       = item.volume
  showModalEditItem.value   = true
}

async function saveEditItem() {
  isSaving.value = true
  try {
    await window.electron.articleItems.update(editItemForm.id, {
      numero_colis: editItemForm.numero_colis,
      longueur:     editItemForm.longueur,
      largeur:      editItemForm.largeur,
      epaisseur:    editItemForm.epaisseur,
      nombre_piece: editItemForm.nombre_piece,
      volume:       editItemForm.volume,
    })
    const idx = allItems.value.findIndex(i => i.id === editItemForm.id)
    if (idx !== -1) Object.assign(allItems.value[idx], { ...editItemForm })
    applyFilters()
    toast.show('Colis modifié avec succès')
    showModalEditItem.value = false
  } catch {
    toast.show("Impossible de modifier ce colis", 'error')
  } finally {
    isSaving.value = false
  }
}

async function doDelete() {
  if (confirmDelete.value === null) return
  isDeleting.value = true
  try {
    await window.electron.articleItems.delete(confirmDelete.value)
    allItems.value      = allItems.value.filter(i => i.id !== confirmDelete.value)
    filteredItems.value = filteredItems.value.filter(i => i.id !== confirmDelete.value)
    toast.show('Colis supprimé avec succès')
  } catch {
    toast.show("Impossible de supprimer ce colis", 'error')
  } finally {
    isDeleting.value  = false
    confirmDelete.value = null
  }
}

function downloadPdf() { window.electron.print() }

function formatVolume(v?: number | null): string {
  return v != null ? parseFloat(String(v)).toFixed(3) : '0.000'
}

onMounted(loadAll)
</script>
