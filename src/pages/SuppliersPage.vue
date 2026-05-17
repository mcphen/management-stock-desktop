<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-900">Fournisseurs</h2>
      <button @click="showModal = true" class="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
        + Nouveau fournisseur
      </button>
    </div>

    <div class="bg-white border rounded-xl overflow-hidden">
      <div v-if="isLoading" class="py-12 text-center text-sm text-gray-400">Chargement...</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Téléphone</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Email</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="s in suppliers" :key="s.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium">{{ s.name }}</td>
            <td class="px-4 py-3 text-gray-500">{{ s.phone ?? '—' }}</td>
            <td class="px-4 py-3 text-gray-500">{{ s.email ?? '—' }}</td>
            <td class="px-4 py-3 text-right">
              <button @click="edit(s)" class="text-primary-600 text-xs mr-3">Modifier</button>
              <button @click="remove(s.id)" class="text-red-500 text-xs">Supprimer</button>
            </td>
          </tr>
          <tr v-if="suppliers.length === 0">
            <td colspan="4" class="py-8 text-center text-sm text-gray-400">Aucun fournisseur.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
        <h3 class="text-lg font-bold mb-4">{{ editing ? 'Modifier' : 'Nouveau fournisseur' }}</h3>
        <form @submit.prevent="submit" class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input v-model="form.name" required class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input v-model="form.phone" class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input v-model="form.email" type="email" class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" @click="closeModal" class="px-4 py-2 text-sm text-gray-600">Annuler</button>
            <button type="submit" class="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
              {{ editing ? 'Mettre à jour' : 'Créer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { Supplier } from '../electron.d'

const suppliers = ref<Supplier[]>([])
const isLoading = ref(true)
const showModal = ref(false)
const editing   = ref<Supplier | null>(null)
const form      = reactive({ name: '', phone: '', email: '', address: '' })

onMounted(async () => {
  const result = await window.electron.suppliers.list()
  suppliers.value = result.data
  isLoading.value = false
})

function edit(s: Supplier): void {
  editing.value = s
  form.name    = s.name
  form.phone   = s.phone ?? ''
  form.email   = s.email ?? ''
  showModal.value = true
}

function closeModal(): void {
  showModal.value = false
  editing.value   = null
  form.name = form.phone = form.email = ''
}

async function submit(): Promise<void> {
  if (editing.value) {
    const updated = await window.electron.suppliers.update(editing.value.id, { ...form })
    const i = suppliers.value.findIndex((s) => s.id === editing.value!.id)
    if (i !== -1) suppliers.value[i] = updated
  } else {
    const created = await window.electron.suppliers.create({ ...form })
    suppliers.value.unshift(created)
  }
  closeModal()
}

async function remove(id: number): Promise<void> {
  if (confirm('Supprimer ce fournisseur ?')) {
    await window.electron.suppliers.delete(id)
    suppliers.value = suppliers.value.filter((s) => s.id !== id)
  }
}
</script>
