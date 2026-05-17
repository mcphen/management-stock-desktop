<template>
  <div class="p-6">
    <h2 class="text-xl font-bold text-gray-900 mb-6">Paiements</h2>
    <div class="bg-white border rounded-xl overflow-hidden">
      <div v-if="isLoading" class="py-12 text-center text-sm text-gray-400">Chargement...</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Client</th>
            <th class="text-right px-4 py-3 font-medium text-gray-600">Montant (FCFA)</th>
            <th class="text-center px-4 py-3 font-medium text-gray-600">Sync</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="p in payments" :key="p.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-500">{{ p.date }}</td>
            <td class="px-4 py-3">Client #{{ p.client_id }}</td>
            <td class="px-4 py-3 text-right font-medium text-green-600">{{ formatAmount(p.amount) }}</td>
            <td class="px-4 py-3 text-center text-xs" :class="p.sync_status === 'synced' ? 'text-green-500' : 'text-yellow-500'">
              {{ p.sync_status === 'synced' ? '✓' : '⏳' }}
            </td>
          </tr>
          <tr v-if="payments.length === 0">
            <td colspan="4" class="py-8 text-center text-sm text-gray-400">Aucun paiement.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Payment } from '../electron.d'

const payments  = ref<Payment[]>([])
const isLoading = ref(true)

function formatAmount(n: number): string { return new Intl.NumberFormat('fr-FR').format(n) }

onMounted(async () => {
  const result = await window.electron.payments.list({ per_page: 100 })
  payments.value  = result.data
  isLoading.value = false
})
</script>
