<template>
  <div class="p-6">
    <PageHeader
      title="Caisse"
      :breadcrumbs="[{ label: 'Tableau de bord', to: '/dashboard' }, { label: 'Finances' }, { label: 'Caisses' }]"
    />

    <!-- KPI Solde -->
    <div class="grid grid-cols-3 gap-4 mb-6" v-if="solde">
      <div class="card p-5">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Entrées</p>
        <p class="text-2xl font-bold text-emerald-600">{{ formatAmount(solde.entrees) }}</p>
        <p class="text-xs text-gray-400 mt-1">FCFA</p>
      </div>
      <div class="card p-5">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sorties</p>
        <p class="text-2xl font-bold text-red-600">{{ formatAmount(solde.sorties) }}</p>
        <p class="text-xs text-gray-400 mt-1">FCFA</p>
      </div>
      <div class="card p-5 border-2" :class="solde.solde >= 0 ? 'border-emerald-200' : 'border-red-200'">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Solde net</p>
        <p class="text-2xl font-bold" :class="solde.solde >= 0 ? 'text-gray-900' : 'text-red-600'">{{ formatAmount(solde.solde) }}</p>
        <p class="text-xs text-gray-400 mt-1">FCFA</p>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div v-if="isLoading" class="divide-y">
        <div v-for="i in 5" :key="i" class="flex gap-4 px-4 py-3">
          <div class="skeleton h-4 w-24 rounded"></div>
          <div class="skeleton h-4 w-40 rounded"></div>
          <div class="skeleton h-4 w-16 rounded ml-auto"></div>
        </div>
      </div>

      <table v-else class="data-table w-full">
        <thead>
          <tr>
            <th>Date</th>
            <th>Objet</th>
            <th class="text-center">Type</th>
            <th class="text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in transactions" :key="t.id">
            <td class="text-gray-500 text-xs">{{ formatDateStr(t.date) }}</td>
            <td class="font-medium">{{ t.objet }}</td>
            <td class="text-center">
              <span class="badge" :class="t.type === 'entree' ? 'badge-green' : 'badge-red'">
                {{ t.type === 'entree' ? '↑ Entrée' : '↓ Sortie' }}
              </span>
            </td>
            <td class="text-right font-semibold" :class="t.type === 'entree' ? 'text-emerald-600' : 'text-red-600'">
              {{ t.type === 'entree' ? '+' : '−' }}{{ formatAmount(t.amount) }}
            </td>
          </tr>
          <tr v-if="transactions.length === 0">
            <td colspan="4" class="py-16 text-center">
              <p class="text-3xl mb-2">💳</p>
              <p class="text-sm text-gray-400">Aucune transaction enregistrée.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { CaisseTransaction } from '../electron.d'
import PageHeader from '../components/PageHeader.vue'

const transactions = ref<CaisseTransaction[]>([])
const solde        = ref<{ entrees: number; sorties: number; solde: number } | null>(null)
const isLoading    = ref(true)

function formatAmount(n: number) { return new Intl.NumberFormat('fr-FR').format(n) }
function formatDateStr(d: string) { return new Date(d).toLocaleDateString('fr-FR') }

onMounted(async () => {
  const [result, s] = await Promise.all([
    window.electron.caisse.list({ per_page: 200 }),
    window.electron.caisse.solde(),
  ])
  transactions.value = result.data
  solde.value        = s
  isLoading.value    = false
})
</script>
