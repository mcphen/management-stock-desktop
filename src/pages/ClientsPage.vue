<template>
  <div class="p-6">
    <PageHeader
      title="Gestion des clients"
      :breadcrumbs="[{ label: 'Tableau de bord', to: '/dashboard' }, { label: 'Clients' }]"
    >
      <button class="btn btn-primary btn-sm" @click="openCreate">+ Nouveau client</button>
    </PageHeader>

    <!-- Barre de recherche -->
    <div class="mb-4">
      <input
        v-model="search"
        @input="onSearch"
        type="text"
        placeholder="Rechercher un client…"
        class="field max-w-xs"
      />
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div v-if="store.isLoading" class="divide-y">
        <div v-for="i in 5" :key="i" class="flex gap-4 px-4 py-3">
          <div class="skeleton h-4 w-36 rounded"></div>
          <div class="skeleton h-4 w-24 rounded"></div>
          <div class="skeleton h-4 w-20 rounded ml-auto"></div>
        </div>
      </div>

      <table v-else class="data-table w-full">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Téléphone</th>
            <th class="text-right">Solde (FCFA)</th>
            <th class="text-center">Sync</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in store.clients" :key="client.id">
            <td class="font-medium text-gray-900">{{ client.name }}</td>
            <td class="text-gray-500">{{ client.phone ?? '—' }}</td>
            <td class="text-right" :class="client.amount_solde > 0 ? 'text-red-600 font-medium' : 'text-gray-500'">
              {{ formatAmount(client.amount_solde) }}
            </td>
            <td class="text-center">
              <span class="badge" :class="syncBadge(client.sync_status).cls">
                {{ syncBadge(client.sync_status).label }}
              </span>
            </td>
            <td class="text-right">
              <button class="btn btn-secondary btn-sm mr-1" @click="editClient(client)">Modifier</button>
              <button class="text-red-500 hover:text-red-700 text-xs font-medium transition-colors" @click="requestDelete(client.id)">Supprimer</button>
            </td>
          </tr>
          <tr v-if="store.clients.length === 0">
            <td colspan="5" class="py-16 text-center">
              <p class="text-3xl mb-2">👥</p>
              <p class="text-sm text-gray-400">Aucun client. <button class="text-primary-600 hover:underline" @click="openCreate">Créer le premier client →</button></p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between mt-4 text-sm text-gray-500">
      <span>{{ store.total }} client(s)</span>
      <div class="flex items-center gap-1">
        <button class="btn btn-secondary btn-sm" :disabled="store.currentPage === 1" @click="prevPage">←</button>
        <span class="px-3 py-1 text-xs">{{ store.currentPage }}</span>
        <button class="btn btn-secondary btn-sm" :disabled="store.currentPage * store.perPage >= store.total" @click="nextPage">→</button>
      </div>
    </div>

    <!-- Modal création / édition -->
    <Transition name="modal">
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeModal"
      >
        <div class="modal-panel card w-full max-w-md p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-base font-bold text-gray-900">{{ editingClient ? 'Modifier le client' : 'Nouveau client' }}</h3>
            <button class="text-gray-400 hover:text-gray-600 text-xl leading-none" @click="closeModal">✕</button>
          </div>
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
                <input v-model="form.name" required class="field" placeholder="Nom du client" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
                <input v-model="form.phone" class="field" placeholder="+237 6xx xxx xxx" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input v-model="form.email" type="email" class="field" placeholder="email@exemple.com" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                <input v-model="form.address" class="field" placeholder="Adresse" />
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
              <button type="button" class="btn btn-secondary" @click="closeModal">Annuler</button>
              <button type="submit" class="btn btn-primary" :disabled="isSaving">
                {{ isSaving ? 'Enregistrement…' : editingClient ? 'Mettre à jour' : 'Créer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Confirmation suppression -->
    <Transition name="modal">
      <div v-if="deleteId !== null" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="deleteId = null">
        <div class="modal-panel card p-6 w-full max-w-sm">
          <div class="flex items-start gap-3 mb-4">
            <div class="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">⚠</div>
            <div>
              <h3 class="font-bold text-gray-900">Supprimer ce client ?</h3>
              <p class="text-sm text-gray-500 mt-1">Cette action est irréversible.</p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button class="btn btn-secondary" @click="deleteId = null">Annuler</button>
            <button class="btn btn-danger" @click="doDelete">Supprimer</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useClientStore } from '../stores/client.store'
import { useToastStore } from '../stores/toast.store'
import PageHeader from '../components/PageHeader.vue'
import type { Client } from '../electron.d'

const store    = useClientStore()
const toast    = useToastStore()
const showModal    = ref(false)
const editingClient = ref<Client | null>(null)
const isSaving  = ref(false)
const deleteId  = ref<number | null>(null)
const search    = ref('')
const form      = reactive({ name: '', phone: '', email: '', address: '' })

onMounted(() => store.fetch())

function onSearch() { store.currentPage = 1; store.fetch({ name: search.value || undefined }) }
function prevPage() { if (store.currentPage > 1) { store.currentPage--; store.fetch() } }
function nextPage() { store.currentPage++; store.fetch() }

function formatAmount(n: number) { return new Intl.NumberFormat('fr-FR').format(n) }

function syncBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    synced:          { label: '✓ Sync',    cls: 'badge-green' },
    pending:         { label: '⏳ Attente', cls: 'badge-yellow' },
    conflict:        { label: '⚠ Conflit', cls: 'badge-red' },
    deleted_pending: { label: '🗑 Supprimé',cls: 'badge-gray' },
  }
  return map[s] ?? { label: s, cls: 'badge-gray' }
}

function openCreate() {
  editingClient.value = null
  form.name = form.phone = form.email = form.address = ''
  showModal.value = true
}

function editClient(c: Client) {
  editingClient.value = c
  form.name = c.name; form.phone = c.phone ?? ''; form.email = c.email ?? ''; form.address = c.address ?? ''
  showModal.value = true
}

function closeModal() { showModal.value = false; editingClient.value = null }

async function handleSubmit() {
  isSaving.value = true
  try {
    if (editingClient.value) {
      await store.update(editingClient.value.id, { ...form })
      toast.show('Client mis à jour')
    } else {
      await store.create({ ...form })
      toast.show('Client créé avec succès')
    }
    closeModal()
  } catch {
    toast.show('Une erreur est survenue', 'error')
  } finally {
    isSaving.value = false
  }
}

function requestDelete(id: number) { deleteId.value = id }

async function doDelete() {
  if (deleteId.value === null) return
  try {
    await store.remove(deleteId.value)
    toast.show('Client supprimé')
  } catch {
    toast.show('Impossible de supprimer ce client', 'error')
  } finally {
    deleteId.value = null
  }
}
</script>
