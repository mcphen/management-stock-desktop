<template>
  <div class="card overflow-hidden h-full">
    <div class="card-section">
      <span class="card-section-label flex items-center gap-1.5">
        <TrophyIcon :size="11" />
        Top 5 Clients
      </span>
      <RouterLink to="/clients" class="text-[11px] text-blue-600 hover:text-blue-700 font-medium">
        Tous →
      </RouterLink>
    </div>

    <div v-if="loading" class="p-5 space-y-3">
      <div v-for="i in 5" :key="i" class="skeleton h-8 rounded-lg"></div>
    </div>

    <table v-else class="data-table w-full">
      <thead>
        <tr>
          <th class="w-10">#</th>
          <th>Client</th>
          <th class="text-right">CA Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(client, index) in clients" :key="client.id">
          <td>
            <span class="badge" :class="medalClass(index)">{{ index + 1 }}</span>
          </td>
          <td>
            <RouterLink :to="`/clients/${client.id}`" class="text-slate-800 font-semibold hover:text-blue-600">
              {{ client.name }}
            </RouterLink>
          </td>
          <td class="text-right font-bold text-blue-600">
            {{ formatPrice(client.total_revenue) }}
          </td>
        </tr>
        <tr v-if="!clients.length">
          <td colspan="3" class="text-center text-slate-400 py-6">
            Aucun client avec des ventes.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { TrophyIcon } from 'lucide-vue-next'

const loading = ref(true)
const clients = ref<{ id: number; name: string; total_revenue: number }[]>([])

function formatPrice(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'XOF', maximumFractionDigits: 0,
  }).format(v ?? 0)
}

function medalClass(index: number): string {
  return ['badge-yellow', 'badge-gray', 'badge-blue', 'badge-gray', 'badge-gray'][index] ?? 'badge-gray'
}

onMounted(async () => {
  try {
    clients.value = await window.electron.dashboard.topClients()
  } catch (e) {
    console.error('Erreur top clients:', e)
  } finally {
    loading.value = false
  }
})
</script>
