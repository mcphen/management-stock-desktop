<template>
  <div class="p-6">
    <PageHeader
      title="🆕 Ajouter un nouveau stock"
      :breadcrumbs="[
        { label: 'Tableau de bord', to: '/dashboard' },
        { label: 'Gestion des stocks', to: '/articles' },
        { label: '🆕 Ajouter un nouveau stock' },
      ]"
    >
      <button class="btn btn-primary btn-sm" @click="router.push('/articles')"><ArrowLeftIcon :size="14" /> Retour à la Liste</button>
    </PageHeader>

    <div class="card p-6">
      <form @submit.prevent="addArticle" class="space-y-5">

        <!-- Fournisseur -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            Fournisseur *
          </label>
          <div class="flex gap-2">
            <select v-model="form.supplier_id" class="field flex-1" required>
              <option value="" disabled>Sélectionner un fournisseur</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
            <button type="button" class="btn btn-success btn-sm flex-shrink-0" @click="showModalSupplier = true">
              <UserPlusIcon :size="14" /> <span class="hidden sm:inline">Ajouter fournisseur</span><span class="sm:hidden">Ajouter</span>
            </button>
          </div>
        </div>

        <!-- Essence -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Essence *</label>
          <select v-model="form.essence" class="field" required>
            <option value="" disabled>Sélectionner l'essence</option>
            <option v-for="ess in essences" :key="ess" :value="ess">{{ ess }}</option>
          </select>
        </div>

        <!-- Numéro du Contrat -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Numéro du Contrat *</label>
          <input v-model="form.contract_number" type="text" class="field" required placeholder="ex: CTR-2024-001" />
        </div>

        <!-- Coller depuis Excel -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            Données des colis
            <span class="text-xs font-normal text-gray-400 ml-1">(coller depuis Excel)</span>
          </label>
          <textarea
            ref="textareaRef"
            @paste="handlePaste"
            class="field font-mono text-xs resize-none"
            rows="8"
            placeholder="Collez ici les données copiées depuis Excel&#10;Format attendu : N-COLIS | LONGUEUR | LARGEUR | ÉPAISSEUR | NMBRE PCS | VOLUME"
          ></textarea>
          <p v-if="parsedData.length > 0" class="text-xs text-emerald-600 mt-1.5 font-medium">
            ✓ {{ parsedData.length }} ligne(s) détectée(s)
          </p>
        </div>

        <!-- Aperçu des données collées -->
        <div v-if="parsedData.length > 0" class="overflow-x-auto rounded-xl border border-gray-100">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>N-COLIS</th>
                <th class="text-right">LONGUEUR</th>
                <th class="text-right">LARGEUR</th>
                <th class="text-right">ÉPAISSEUR</th>
                <th class="text-right">NMBRE PCS</th>
                <th class="text-right">VOLUME</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in parsedData" :key="i">
                <td v-for="(cell, j) in row" :key="j" :class="j > 0 ? 'text-right' : ''">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button type="submit" class="btn btn-success" :disabled="isSaving">
            <SaveIcon v-if="!isSaving" :size="15" />
            {{ isSaving ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
          <button type="button" class="btn btn-secondary" @click="router.push('/articles')">Annuler</button>
        </div>

      </form>
    </div>

    <!-- ══ Modal : Ajouter un fournisseur ══════════ -->
    <Transition name="modal">
      <div
        v-if="showModalSupplier"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showModalSupplier = false"
      >
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
              <button type="submit" class="btn btn-success" :disabled="isSavingSupplier">
                {{ isSavingSupplier ? 'Ajout…' : 'Ajouter' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon, SaveIcon, UserPlusIcon } from 'lucide-vue-next'
import PageHeader from '../../components/PageHeader.vue'
import { useToastStore } from '../../stores/toast.store'
import type { ArticleEssence, Supplier } from '../../electron.d'

const router = useRouter()
const toast  = useToastStore()

// ── State ──────────────────────────────────────────
const isSaving         = ref(false)
const isSavingSupplier = ref(false)
const showModalSupplier = ref(false)

const suppliers = ref<Supplier[]>([])
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const parsedData  = ref<string[][]>([])

const essences: ArticleEssence[] = ['Ayous', 'Frake', 'Dibetou', 'Bois Rouge', 'Dabema']

const form = reactive({
  supplier_id:     '' as number | '',
  essence:         '' as ArticleEssence | '',
  contract_number: '',
})

const newSupplier = reactive({ name: '', address: '', phone: '', email: '' })

// ── Load ───────────────────────────────────────────
async function loadSuppliers() {
  const res = await window.electron.suppliers.list({ per_page: 500 })
  suppliers.value = res.data
}

// ── Excel paste ────────────────────────────────────
function handlePaste(event: ClipboardEvent) {
  const clipboard = event.clipboardData || (window as any).clipboardData
  const raw = clipboard?.getData('Text') ?? ''
  const rows = raw.split(/\r?\n/).map((r: string) => r.split('\t'))
  parsedData.value = rows
    .filter((r: string[]) => r.some((c: string) => c.trim() !== ''))
    .map((r: string[]) => r.map((c: string) => c.trim()))
}

// ── Submit ─────────────────────────────────────────
async function addArticle() {
  if (!form.supplier_id || !form.essence || !form.contract_number) return
  isSaving.value = true
  try {
    const article = await window.electron.articles.create({
      supplier_id:     form.supplier_id,
      essence:         form.essence,
      contract_number: form.contract_number,
    })

    if (parsedData.value.length > 0) {
      for (const row of parsedData.value) {
        const [numero_colis, longueur, largeur, epaisseur, nombre_piece, volume] = row
        await window.electron.articleItems.create({
          article_id:   article.id,
          numero_colis,
          longueur:     parseFloat(longueur)     || 0,
          largeur:      parseFloat(largeur)      || 0,
          epaisseur:    parseFloat(epaisseur)    || 0,
          nombre_piece: parseInt(nombre_piece)   || 0,
          volume:       parseFloat(volume)       || 0,
        })
      }
    }

    toast.show('Stock enregistré avec succès')
    router.push(`/articles/${article.id}`)
  } catch {
    toast.show("Erreur lors de l'enregistrement", 'error')
  } finally {
    isSaving.value = false
  }
}

// ── Fournisseur ────────────────────────────────────
async function saveNewSupplier() {
  isSavingSupplier.value = true
  try {
    const created = await window.electron.suppliers.create({ ...newSupplier })
    suppliers.value.push(created)
    form.supplier_id = created.id
    newSupplier.name = newSupplier.address = newSupplier.phone = newSupplier.email = ''
    showModalSupplier.value = false
    toast.show('Fournisseur ajouté')
  } catch {
    toast.show("Erreur : le fournisseur existe peut-être déjà", 'error')
  } finally {
    isSavingSupplier.value = false
  }
}

onMounted(loadSuppliers)
</script>
