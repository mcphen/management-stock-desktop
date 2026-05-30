<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
    <div v-for="stat in stats" :key="stat.key" class="card p-4 text-center">
      <div
        class="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
        :style="{ backgroundColor: stat.color + '1a' }"
      >
        <component :is="stat.icon" :size="18" :style="{ color: stat.color }" />
      </div>
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 leading-tight">
        {{ stat.label }}
      </p>
      <p class="text-sm font-bold leading-tight" :style="{ color: stat.color }">
        <span v-if="loading">—</span>
        <span v-else>{{ stat.formatted }}</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  TrendingUpIcon, HistoryIcon, CheckCircleIcon,
  AlertTriangleIcon, PackageIcon, WalletIcon,
} from 'lucide-vue-next'

const loading = ref(true)
const data = ref<{
  chiffre_affaires: number
  chiffre_affaire_old: number
  montant_paye: number
  montant_du: number
  stock_disponible: number
  soldeCaisse: number
} | null>(null)

function formatPrice(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'XOF', maximumFractionDigits: 0,
  }).format(value ?? 0)
}

const stats = computed(() => {
  const d = data.value
  return [
    {
      key: 'ca',
      label: "Chiffre d'affaires",
      icon: TrendingUpIcon,
      color: '#007bff',
      formatted: d ? formatPrice(d.chiffre_affaires) : '—',
    },
    {
      key: 'ca_old',
      label: 'Ancien compte',
      icon: HistoryIcon,
      color: '#6c757d',
      formatted: d ? formatPrice(d.chiffre_affaire_old) : '—',
    },
    {
      key: 'paye',
      label: 'Montant payé',
      icon: CheckCircleIcon,
      color: '#28a745',
      formatted: d ? formatPrice(d.montant_paye) : '—',
    },
    {
      key: 'du',
      label: 'Montant dû',
      icon: AlertTriangleIcon,
      color: '#dc3545',
      formatted: d ? formatPrice(d.montant_du) : '—',
    },
    {
      key: 'stock',
      label: 'Colis en stock',
      icon: PackageIcon,
      color: '#fd7e14',
      formatted: d ? `${d.stock_disponible ?? 0} colis` : '—',
    },
    {
      key: 'caisse',
      label: 'Solde caisse',
      icon: WalletIcon,
      color: '#17a2b8',
      formatted: d ? formatPrice(d.soldeCaisse) : '—',
    },
  ]
})

onMounted(async () => {
  try {
    data.value = await window.electron.dashboard.statsGeneral()
  } catch (e) {
    console.error('Erreur stats générales:', e)
  } finally {
    loading.value = false
  }
})
</script>
