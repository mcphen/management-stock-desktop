<template>
  <div class="p-6">
    <PageHeader
      title="Gestion des stocks"
      :breadcrumbs="[
        { label: 'Tableau de bord', to: '/dashboard' },
        { label: 'Articles' },
      ]"
    >
      <button class="btn btn-secondary btn-sm" @click="downloadPdf">
        <PrinterIcon :size="14" />
        <span class="hidden sm:inline">Imprimer</span>
      </button>
      <button class="btn btn-primary btn-sm" @click="router.push('/articles/create')">
        <PlusIcon :size="14" />
        <span class="hidden sm:inline">Ajouter un stock</span>
        <span class="sm:hidden">Ajouter</span>
      </button>
    </PageHeader>

    <!-- Table card -->
    <div class="card overflow-hidden">

      <!-- Skeleton -->
      <div v-if="isLoading" class="divide-y divide-slate-100">
        <div v-for="i in 7" :key="i" class="flex gap-4 px-5 py-3.5">
          <div class="skeleton h-3.5 w-20 rounded-md"></div>
          <div class="skeleton h-3.5 w-32 rounded-md"></div>
          <div class="skeleton h-3.5 w-24 rounded-md"></div>
          <div class="skeleton h-3.5 w-16 rounded-md ml-auto"></div>
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="data-table w-full">
          <thead>
            <tr>
              <th>
                <div class="space-y-2">
                  <span>Essence</span>
                  <input v-model="filters.essence" type="text" placeholder="Filtrer…" class="col-filter" />
                </div>
              </th>
              <th>
                <div class="space-y-2">
                  <span>Fournisseur</span>
                  <input v-model="filters.supplier" type="text" placeholder="Filtrer…" class="col-filter" />
                </div>
              </th>
              <th>
                <div class="space-y-2">
                  <span>N° Contrat</span>
                  <input v-model="filters.contract" type="text" placeholder="Filtrer…" class="col-filter" />
                </div>
              </th>
              <th class="text-right">Bénéfice</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredArticles.length === 0">
              <td colspan="5" class="py-16 text-center">
                <div class="flex flex-col items-center gap-2">
                  <PackageIcon :size="36" class="text-slate-200" />
                  <p class="text-sm text-slate-400 font-medium">Aucun article trouvé</p>
                  <p class="text-xs text-slate-300">Essayez de modifier vos filtres</p>
                </div>
              </td>
            </tr>
            <tr v-for="article in filteredArticles" :key="article.id">
              <td>
                <span class="badge badge-blue">{{ article.essence }}</span>
              </td>
              <td class="text-slate-600">{{ supplierName(article.supplier_id) }}</td>
              <td class="font-mono text-xs text-slate-500">{{ article.contract_number ?? '—' }}</td>
              <td class="text-right font-semibold text-slate-900">
                {{ formatTotalPrice(article.profit) }}
              </td>
              <td class="text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    class="btn btn-secondary btn-sm"
                    @click="router.push(`/articles/${article.id}`)"
                    title="Voir le détail"
                  >
                    <EyeIcon :size="13" />
                    <span class="hidden lg:inline">Voir</span>
                  </button>
                  <button
                    class="btn btn-danger btn-sm"
                    @click="confirmDelete = article.id"
                    title="Supprimer"
                  >
                    <Trash2Icon :size="13" />
                    <span class="hidden lg:inline">Supprimer</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer count -->
      <div v-if="!isLoading" class="px-5 py-3 border-t border-slate-100 bg-slate-50/70">
        <p class="text-[11px] text-slate-400">
          {{ filteredArticles.length }} article(s)
          <span v-if="filteredArticles.length !== allArticles.length" class="text-slate-300">
            sur {{ allArticles.length }} au total
          </span>
        </p>
      </div>
    </div>

    <!-- Modal suppression -->
    <Transition name="modal">
      <div
        v-if="confirmDelete !== null"
        class="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
        @click.self="confirmDelete = null"
      >
        <div class="modal-panel card-raised w-full max-w-sm p-6">
          <div class="flex items-start gap-3 mb-5">
            <div class="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangleIcon :size="17" class="text-red-600" />
            </div>
            <div>
              <h3 class="font-bold text-slate-900">Supprimer cet article ?</h3>
              <p class="text-sm text-slate-500 mt-1">
                Cette action est irréversible. Toutes les données associées seront supprimées.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button class="btn btn-secondary btn-sm" @click="confirmDelete = null">Annuler</button>
            <button class="btn btn-danger btn-sm" :disabled="isDeleting" @click="doDelete">
              <Trash2Icon :size="13" />
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
import { useRouter } from 'vue-router'
import { PlusIcon, PrinterIcon, EyeIcon, Trash2Icon, PackageIcon, AlertTriangleIcon } from 'lucide-vue-next'
import PageHeader from '../components/PageHeader.vue'
import { useToastStore } from '../stores/toast.store'

const router      = useRouter()
const toast       = useToastStore()
const allArticles = ref<any[]>([])
const suppliers   = ref<Record<number, string>>({})
const isLoading   = ref(true)
const isDeleting  = ref(false)
const confirmDelete = ref<number | null>(null)

const filters = reactive({ essence: '', supplier: '', contract: '' })

const filteredArticles = computed(() =>
  allArticles.value.filter(a => {
    if (filters.essence  && !a.essence?.toLowerCase().includes(filters.essence.toLowerCase()))               return false
    if (filters.supplier && !supplierName(a.supplier_id).toLowerCase().includes(filters.supplier.toLowerCase())) return false
    if (filters.contract && !(a.contract_number ?? '').toLowerCase().includes(filters.contract.toLowerCase())) return false
    return true
  })
)

function supplierName(id: number): string { return suppliers.value[id] ?? '—' }

function formatTotalPrice(price?: number | null): string {
  return new Intl.NumberFormat('de-DE').format(price ? Math.round(price) : 0)
}

async function fetchData() {
  isLoading.value = true
  const [artResult, supResult] = await Promise.all([
    window.electron.articles.list({ per_page: 500 }),
    window.electron.suppliers.list({ per_page: 500 }),
  ])
  allArticles.value = artResult.data
  const map: Record<number, string> = {}
  for (const s of supResult.data) map[s.id] = s.name
  suppliers.value = map
  isLoading.value = false
}

async function doDelete() {
  if (confirmDelete.value === null) return
  isDeleting.value = true
  try {
    await window.electron.articles.delete(confirmDelete.value)
    allArticles.value = allArticles.value.filter(a => a.id !== confirmDelete.value)
    toast.show('Article supprimé avec succès')
  } catch {
    toast.show('Impossible de supprimer cet article.', 'error')
  } finally {
    isDeleting.value = false
    confirmDelete.value = null
  }
}

function downloadPdf() { window.electron.print() }

onMounted(fetchData)
</script>
