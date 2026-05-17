<template>
  <div class="p-6">
    <PageHeader
      title="Bons de livraison"
      :breadcrumbs="[{ label: 'Tableau de bord', to: '/dashboard' }, { label: 'Bons de livraison' }]"
    />

    <div class="card overflow-hidden">
      <div v-if="isLoading" class="divide-y">
        <div v-for="i in 5" :key="i" class="flex gap-4 px-4 py-3">
          <div class="skeleton h-4 w-24 rounded"></div>
          <div class="skeleton h-4 w-24 rounded"></div>
          <div class="skeleton h-4 w-20 rounded ml-auto"></div>
        </div>
      </div>

      <table v-else class="data-table w-full">
        <thead>
          <tr>
            <th>Matricule</th>
            <th>Date</th>
            <th class="text-right">Total</th>
            <th class="text-center">Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dn in notes" :key="String(dn['id'])">
            <td class="font-mono text-xs font-semibold">{{ dn['matricule'] ?? `#${dn['id']}` }}</td>
            <td class="text-gray-500">{{ formatDate(String(dn['date'] ?? '')) }}</td>
            <td class="text-right font-medium">{{ formatAmount(Number(dn['total_price'] ?? 0)) }}</td>
            <td class="text-center">
              <span class="badge badge-blue">{{ dn['status'] }}</span>
            </td>
          </tr>
          <tr v-if="notes.length === 0">
            <td colspan="4" class="py-16 text-center">
              <p class="text-3xl mb-2">🚛</p>
              <p class="text-sm text-gray-400">Aucun bon de livraison.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PageHeader from '../components/PageHeader.vue'

const notes     = ref<Record<string, unknown>[]>([])
const isLoading = ref(true)

function formatAmount(n: number) { return new Intl.NumberFormat('fr-FR').format(n) }
function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

onMounted(async () => {
  const result = await window.electron.deliveryNotes.list({ per_page: 100 })
  notes.value     = result.data
  isLoading.value = false
})
</script>
