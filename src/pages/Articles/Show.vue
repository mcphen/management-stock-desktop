<template>
  <div class="p-6">
    <PageHeader
      title="📦 Détails du stock"
      :breadcrumbs="[
        { label: 'Tableau de bord', to: '/dashboard' },
        { label: 'Gestion des stocks', to: '/articles' },
        { label: '📦 Détails du stock' },
      ]"
    >
      <button class="btn btn-success btn-sm" @click="showModalAddColis = true">+ Ajouter des colis</button>
      <button class="btn btn-warning btn-sm" @click="openEditModal">✏ Modifier</button>
      <button class="btn btn-danger btn-sm" @click="confirmDeleteArticle = true">🗑 Supprimer</button>
      <button class="btn btn-primary btn-sm" @click="router.push('/articles')">← Retour à la Liste</button>
    </PageHeader>

    <!-- Skeleton global -->
    <div v-if="isLoading" class="space-y-5">
      <div class="grid grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="card p-5 h-24 skeleton"></div>
      </div>
      <div class="card p-5 h-32 skeleton"></div>
    </div>

    <template v-else>
      <!-- ── KPI Cards ─────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="rounded-2xl p-5 text-white shadow-sm" style="background:#2563eb;">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold uppercase tracking-wide opacity-75">Volume initial</span>
            <span class="text-2xl">📦</span>
          </div>
          <p class="text-2xl font-bold leading-tight">{{ formatVolume(initialTotalVolume) }} <span class="text-base font-normal opacity-80">m³</span></p>
          <p class="text-xs opacity-70 mt-1">Volume total prévu / initial</p>
        </div>

        <div class="rounded-2xl p-5 text-white shadow-sm" style="background:#475569;">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold uppercase tracking-wide opacity-75">Volume vendu</span>
            <span class="text-2xl">🚛</span>
          </div>
          <p class="text-2xl font-bold leading-tight">{{ formatVolume(volumeTotalVendu) }} <span class="text-base font-normal opacity-80">m³</span></p>
          <p class="text-xs opacity-70 mt-1">Volume total vendu</p>
        </div>

        <div class="rounded-2xl p-5 text-white shadow-sm" style="background:#0891b2;">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold uppercase tracking-wide opacity-75">Chiffre d'affaire</span>
            <span class="text-2xl">💶</span>
          </div>
          <p class="text-2xl font-bold leading-tight">{{ formatTotalPrice(chiffreAffaire) }}</p>
          <p class="text-xs opacity-70 mt-1">FCFA</p>
        </div>

        <div class="rounded-2xl p-5 text-white shadow-sm" style="background:#0e7490;">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold uppercase tracking-wide opacity-75">Bénéfice</span>
            <span class="text-2xl">💰</span>
          </div>
          <p class="text-2xl font-bold leading-tight">{{ formatTotalPrice(benefice) }}</p>
          <p class="text-xs opacity-70 mt-1">FCFA</p>
        </div>
      </div>

      <!-- ── Info article + Liste des colis ──────── -->
      <div class="card overflow-hidden">
        <!-- En-tête info article -->
        <div class="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Essence</p>
            <p class="text-sm font-semibold text-gray-900">{{ article?.essence }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Fournisseur</p>
            <p class="text-sm font-semibold text-primary-600">{{ supplierName }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Numéro du Contrat</p>
            <p class="text-sm font-mono font-semibold text-gray-900">{{ article?.contract_number ?? '—' }}</p>
          </div>
        </div>

        <!-- Onglet -->
        <div class="px-5 pt-4 border-b border-gray-100">
          <span class="inline-block pb-3 text-sm font-semibold text-primary-600 border-b-2 border-primary-600">
            Liste des colisages ({{ filteredItems.length }})
          </span>
        </div>

        <!-- Filtres -->
        <div class="px-5 py-4 border-b border-gray-100 bg-slate-50">
          <div class="grid grid-cols-3 gap-4 mb-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Longueur (Min – Max)</label>
              <div class="flex gap-1">
                <input v-model.number="search.longueur_min" type="number" class="field py-1.5 text-xs" placeholder="Min" />
                <input v-model.number="search.longueur_max" type="number" class="field py-1.5 text-xs" placeholder="Max" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Épaisseur</label>
              <select v-model="search.epaisseur" class="field py-1.5 text-xs">
                <option value="">Toutes</option>
                <option value="27">27</option>
                <option value="40">40</option>
                <option value="6">6</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Volume (Min – Max)</label>
              <div class="flex gap-1">
                <input v-model.number="search.volume_min" type="number" class="field py-1.5 text-xs" placeholder="Min" />
                <input v-model.number="search.volume_max" type="number" class="field py-1.5 text-xs" placeholder="Max" />
              </div>
            </div>
          </div>
          <div class="flex items-end gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Disponibilité</label>
              <select v-model="search.indisponible" class="field py-1.5 text-xs">
                <option value="all">Tout voir</option>
                <option :value="0">Disponible</option>
                <option :value="1">Indisponible</option>
              </select>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-primary btn-sm" @click="applyFilters">🔎 Rechercher</button>
              <button class="btn btn-secondary btn-sm" @click="resetFilters">Réinitialiser</button>
              <button class="btn btn-secondary btn-sm" @click="downloadPdf">🖨 Imprimer</button>
            </div>
          </div>
        </div>

        <!-- Table des colis -->
        <div class="overflow-x-auto">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>N-COLIS</th>
                <th class="text-right">LONGUEUR</th>
                <th class="text-right">ÉPAISSEUR</th>
                <th class="text-right">LARGEUR</th>
                <th class="text-right">NMBRE PCS</th>
                <th class="text-right">VOLUME</th>
                <th class="text-center">Statut</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredItems" :key="item.id">
                <td class="font-mono text-xs font-semibold">{{ item.numero_colis }}</td>
                <td class="text-right">{{ item.longueur }}</td>
                <td class="text-right">{{ item.epaisseur }}</td>
                <td class="text-right">{{ item.largeur }}</td>
                <td class="text-right">{{ item.nombre_piece }}</td>
                <td class="text-right font-medium">{{ formatVolume(item.volume) }}</td>
                <td class="text-center">
                  <span v-if="item.indisponible" class="badge badge-red">Indisponible</span>
                  <span v-else class="badge badge-green">Disponible</span>
                </td>
                <td class="text-center">
                  <template v-if="!item.indisponible">
                    <button class="btn btn-secondary btn-sm mr-1" @click="openEditItem(item)">Modifier</button>
                    <button class="btn btn-danger btn-sm" @click="confirmDeleteItem = item.id">Supprimer</button>
                  </template>
                  <span v-else class="text-xs text-gray-400">Actions indisponibles</span>
                </td>
              </tr>
              <tr v-if="filteredItems.length === 0">
                <td colspan="8" class="py-12 text-center">
                  <p class="text-2xl mb-2">📭</p>
                  <p class="text-sm text-gray-400">Aucun colis trouvé.</p>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="filteredItems.length > 0">
              <tr class="bg-slate-50 font-semibold text-sm">
                <td colspan="5" class="px-4 py-2.5 text-right text-gray-600">Volume Total :</td>
                <td class="px-4 py-2.5 text-right text-gray-900">{{ formatVolume(totalVolume) }}</td>
                <td></td>
                <td></td>
              </tr>
              <tr class="bg-slate-50 font-semibold text-sm">
                <td colspan="5" class="px-4 py-2.5 text-right text-gray-600">Total des colis :</td>
                <td class="px-4 py-2.5 text-right text-gray-900">{{ filteredItems.length }}</td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>

    <!-- ══ Modal : Modifier l'article ══════════════ -->
    <Transition name="modal">
      <div v-if="showModalEdit" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showModalEdit = false">
        <div class="modal-panel card w-full max-w-md p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-base font-bold text-gray-900">Modifier un stock</h3>
            <button class="text-gray-400 hover:text-gray-600 text-xl" @click="showModalEdit = false">✕</button>
          </div>
          <form @submit.prevent="saveEditArticle" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Fournisseur *</label>
              <div class="flex gap-2">
                <select v-model="editForm.supplier_id" class="field flex-1" required>
                  <option value="" disabled>Sélectionner un fournisseur</option>
                  <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
                <button type="button" class="btn btn-secondary btn-sm flex-shrink-0" @click="showModalSupplier = true">➕</button>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Essence *</label>
              <select v-model="editForm.essence" class="field" required>
                <option value="" disabled>Sélectionner l'essence</option>
                <option v-for="ess in essences" :key="ess" :value="ess">{{ ess }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Numéro du Contrat *</label>
              <input v-model="editForm.contract_number" type="text" class="field" required />
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
              <button type="button" class="btn btn-secondary" @click="showModalEdit = false">Annuler</button>
              <button type="submit" class="btn btn-primary" :disabled="isSaving">{{ isSaving ? 'Enregistrement…' : 'Modifier' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ══ Modal : Ajouter un fournisseur ══════════ -->
    <Transition name="modal">
      <div v-if="showModalSupplier" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showModalSupplier = false">
        <div class="modal-panel card w-full max-w-sm p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-base font-bold text-gray-900">Ajouter un fournisseur</h3>
            <button class="text-gray-400 hover:text-gray-600 text-xl" @click="showModalSupplier = false">✕</button>
          </div>
          <form @submit.prevent="saveNewSupplier" class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
              <input v-model="newSupplier.name" type="text" class="field" required />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
              <input v-model="newSupplier.address" type="text" class="field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
              <input v-model="newSupplier.phone" type="text" class="field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input v-model="newSupplier.email" type="email" class="field" />
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
              <button type="button" class="btn btn-secondary" @click="showModalSupplier = false">Annuler</button>
              <button type="submit" class="btn btn-primary">Ajouter</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ══ Modal : Ajouter des colis (coller Excel) ═ -->
    <Transition name="modal">
      <div v-if="showModalAddColis" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showModalAddColis = false">
        <div class="modal-panel card w-full max-w-lg p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-base font-bold text-gray-900">Ajouter des colis</h3>
            <button class="text-gray-400 hover:text-gray-600 text-xl" @click="showModalAddColis = false">✕</button>
          </div>
          <form @submit.prevent="addColis" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Collez ici les données copiées depuis Excel
              </label>
              <textarea
                ref="textareaRef"
                @paste="handlePaste"
                class="field font-mono text-xs resize-none"
                rows="10"
                placeholder="Collez ici les données copiées depuis Excel"
              ></textarea>
              <p v-if="parsedData.length > 0" class="text-xs text-emerald-600 mt-1">
                ✓ {{ parsedData.length }} ligne(s) détectée(s)
              </p>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
              <button type="button" class="btn btn-secondary" @click="showModalAddColis = false">Annuler</button>
              <button type="submit" class="btn btn-primary" :disabled="parsedData.length === 0 || isSaving">
                {{ isSaving ? 'Ajout en cours…' : 'Ajouter' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ══ Modal : Modifier un colis ═══════════════ -->
    <Transition name="modal">
      <div v-if="showModalEditItem" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showModalEditItem = false">
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
              <button type="submit" class="btn btn-primary" :disabled="isSaving">{{ isSaving ? 'Enregistrement…' : 'Modifier' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ══ Confirmation suppression article ════════ -->
    <Transition name="modal">
      <div v-if="confirmDeleteArticle" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="confirmDeleteArticle = false">
        <div class="modal-panel card p-6 w-full max-w-sm">
          <div class="flex items-start gap-3 mb-4">
            <div class="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">⚠</div>
            <div>
              <h3 class="font-bold text-gray-900">Êtes-vous sûr ?</h3>
              <p class="text-sm text-gray-500 mt-1">Tous les colis associés seront supprimés. Cette action est irréversible.</p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button class="btn btn-secondary" @click="confirmDeleteArticle = false">Annuler</button>
            <button class="btn btn-danger" :disabled="isDeleting" @click="deleteArticle">
              {{ isDeleting ? 'Suppression…' : 'Oui, supprimer' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ Confirmation suppression colis ══════════ -->
    <Transition name="modal">
      <div v-if="confirmDeleteItem !== null" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="confirmDeleteItem = null">
        <div class="modal-panel card p-6 w-full max-w-sm">
          <div class="flex items-start gap-3 mb-4">
            <div class="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">⚠</div>
            <div>
              <h3 class="font-bold text-gray-900">Supprimer ce colis ?</h3>
              <p class="text-sm text-gray-500 mt-1">Cette action est irréversible.</p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button class="btn btn-secondary" @click="confirmDeleteItem = null">Annuler</button>
            <button class="btn btn-danger" :disabled="isDeleting" @click="deleteItem">
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
import { useRouter, useRoute } from 'vue-router'
import PageHeader from '../../components/PageHeader.vue'
import { useToastStore } from '../../stores/toast.store'
import type { Article, ArticleEssence, ArticleItem, Supplier } from '../../electron.d'

const router = useRouter()
const route  = useRoute()
const toast  = useToastStore()

const articleId = Number(route.params.id)

// ── State ──────────────────────────────────────────
const isLoading  = ref(true)
const isSaving   = ref(false)
const isDeleting = ref(false)

const article      = ref<Article | null>(null)
const allItems     = ref<ArticleItem[]>([])
const suppliers    = ref<Supplier[]>([])
const filteredItems = ref<ArticleItem[]>([])

const initialTotalVolume = ref(0)
const volumeTotalVendu   = ref(0)
const chiffreAffaire     = ref(0)
const benefice           = ref(0)

// ── Modals ─────────────────────────────────────────
const showModalEdit      = ref(false)
const showModalSupplier  = ref(false)
const showModalAddColis  = ref(false)
const showModalEditItem  = ref(false)
const confirmDeleteArticle = ref(false)
const confirmDeleteItem  = ref<number | null>(null)

// ── Forms ──────────────────────────────────────────
const essences: ArticleEssence[] = ['Ayous', 'Frake', 'Dibetou', 'Bois Rouge', 'Dabema']

const editForm = reactive({ supplier_id: 0, essence: '' as ArticleEssence | '', contract_number: '' })

const newSupplier = reactive({ name: '', address: '', phone: '', email: '' })

const editItemForm = reactive({
  id: 0, numero_colis: '', longueur: 0, largeur: 0, epaisseur: 0, nombre_piece: 0, volume: 0,
})

// ── Filtres ────────────────────────────────────────
const search = reactive({
  longueur_min: null as number | null,
  longueur_max: null as number | null,
  epaisseur: '' as string,
  volume_min: null as number | null,
  volume_max: null as number | null,
  indisponible: 0 as 'all' | 0 | 1,
})

// ── Computed ───────────────────────────────────────
const supplierName = computed(() =>
  suppliers.value.find(s => s.id === article.value?.supplier_id)?.name ?? '—'
)

const totalVolume = computed(() =>
  filteredItems.value.reduce((sum, i) => sum + (i.volume || 0), 0)
)

// ── Excel paste ────────────────────────────────────
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const parsedData  = ref<string[][]>([])

function handlePaste(event: ClipboardEvent) {
  const clipboard = event.clipboardData || (window as any).clipboardData
  const raw = clipboard?.getData('Text') ?? ''
  const rows = raw.split(/\r?\n/).map((r: string) => r.split('\t'))
  parsedData.value = rows
    .filter((r: string[]) => r.some(c => c.trim() !== ''))
    .map((r: string[]) => r.map(c => c.trim()))
}

// ── Load data ──────────────────────────────────────
async function loadAll() {
  isLoading.value = true
  const [art, itemsData, supData] = await Promise.all([
    window.electron.articles.get(articleId),
    window.electron.articles.items(articleId),
    window.electron.suppliers.list({ per_page: 500 }),
  ])
  article.value   = art ?? null
  allItems.value  = itemsData
  suppliers.value = supData.data
  applyFilters()   // applique "Disponible" par défaut

  if (art) {
    initialTotalVolume.value = art.volume ?? 0
    volumeTotalVendu.value   = itemsData.filter(i => i.indisponible).reduce((s, i) => s + (i.volume || 0), 0)
    chiffreAffaire.value     = volumeTotalVendu.value * (art.price_per_m3 ?? 0)
    benefice.value           = 0
  }
  isLoading.value = false
}

// ── Filtres ────────────────────────────────────────
function applyFilters() {
  filteredItems.value = allItems.value.filter(item => {
    if (search.indisponible !== 'all' && Number(item.indisponible) !== search.indisponible) return false
    if (search.longueur_min !== null && item.longueur < search.longueur_min) return false
    if (search.longueur_max !== null && item.longueur > search.longueur_max) return false
    if (search.epaisseur && String(item.epaisseur) !== search.epaisseur) return false
    if (search.volume_min !== null && item.volume < search.volume_min) return false
    if (search.volume_max !== null && item.volume > search.volume_max) return false
    return true
  })
}

function resetFilters() {
  search.longueur_min = null; search.longueur_max = null
  search.epaisseur = ''; search.volume_min = null; search.volume_max = null
  search.indisponible = 'all'
  filteredItems.value = allItems.value
}

// ── Article CRUD ───────────────────────────────────
function openEditModal() {
  if (!article.value) return
  editForm.supplier_id     = article.value.supplier_id
  editForm.essence         = article.value.essence
  editForm.contract_number = article.value.contract_number ?? ''
  showModalEdit.value = true
}

async function saveEditArticle() {
  if (!editForm.essence) return
  isSaving.value = true
  try {
    await window.electron.articles.update(articleId, {
      supplier_id: editForm.supplier_id,
      essence: editForm.essence,
      contract_number: editForm.contract_number,
    })
    toast.show('Article modifié avec succès')
    showModalEdit.value = false
    await loadAll()
  } catch {
    toast.show("Erreur lors de la modification", 'error')
  } finally {
    isSaving.value = false
  }
}

async function deleteArticle() {
  isDeleting.value = true
  try {
    await window.electron.articles.delete(articleId)
    toast.show('Article supprimé')
    router.push('/articles')
  } catch {
    toast.show("Impossible de supprimer cet article", 'error')
  } finally {
    isDeleting.value = false
    confirmDeleteArticle.value = false
  }
}

// ── Fournisseur CRUD ───────────────────────────────
async function saveNewSupplier() {
  try {
    const created = await window.electron.suppliers.create({ ...newSupplier })
    suppliers.value.push(created)
    editForm.supplier_id = created.id
    newSupplier.name = newSupplier.address = newSupplier.phone = newSupplier.email = ''
    showModalSupplier.value = false
    toast.show('Fournisseur ajouté')
  } catch {
    toast.show("Erreur : le fournisseur existe peut-être déjà", 'error')
  }
}

// ── Colis CRUD ─────────────────────────────────────
async function addColis() {
  if (parsedData.value.length === 0) return
  isSaving.value = true
  try {
    for (const row of parsedData.value) {
      const [numero_colis, longueur, largeur, epaisseur, nombre_piece, volume] = row
      await window.electron.articleItems.create({
        article_id: articleId,
        numero_colis,
        longueur:     parseFloat(longueur) || 0,
        largeur:      parseFloat(largeur)  || 0,
        epaisseur:    parseFloat(epaisseur)|| 0,
        nombre_piece: parseInt(nombre_piece) || 0,
        volume:       parseFloat(volume)   || 0,
      })
    }
    toast.show(`${parsedData.value.length} colis ajoutés avec succès`)
    parsedData.value = []
    showModalAddColis.value = false
    await loadAll()
  } catch {
    toast.show("Erreur lors de l'ajout des colis", 'error')
  } finally {
    isSaving.value = false
  }
}

function openEditItem(item: ArticleItem) {
  editItemForm.id           = item.id
  editItemForm.numero_colis = item.numero_colis
  editItemForm.longueur     = item.longueur
  editItemForm.largeur      = item.largeur
  editItemForm.epaisseur    = item.epaisseur
  editItemForm.nombre_piece = item.nombre_piece
  editItemForm.volume       = item.volume
  showModalEditItem.value = true
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
    toast.show('Colis modifié avec succès')
    showModalEditItem.value = false
    await loadAll()
  } catch {
    toast.show("Impossible de modifier ce colis", 'error')
  } finally {
    isSaving.value = false
  }
}

async function deleteItem() {
  if (confirmDeleteItem.value === null) return
  isDeleting.value = true
  try {
    await window.electron.articleItems.delete(confirmDeleteItem.value)
    allItems.value = allItems.value.filter(i => i.id !== confirmDeleteItem.value)
    filteredItems.value = filteredItems.value.filter(i => i.id !== confirmDeleteItem.value)
    toast.show('Colis supprimé')
  } catch {
    toast.show("Impossible de supprimer ce colis", 'error')
  } finally {
    isDeleting.value = false
    confirmDeleteItem.value = null
  }
}

// ── Helpers ────────────────────────────────────────
function formatVolume(v?: number | null): string {
  return v != null ? parseFloat(String(v)).toFixed(3) : '0.000'
}

function formatTotalPrice(p?: number | null): string {
  return new Intl.NumberFormat('de-DE').format(p ? Math.round(p) : 0)
}

function downloadPdf() { window.electron.print() }

onMounted(loadAll)
</script>
