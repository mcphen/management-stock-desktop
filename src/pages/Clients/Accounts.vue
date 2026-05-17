<template>
  <div class="p-6">
    <PageHeader
      :title="showSettled ? '✅ Comptes Clients Soldés' : '💼 Comptes Clients'"
      :breadcrumbs="[
        { label: 'Tableau de bord', to: '/dashboard' },
        { label: 'Clients', to: '/clients' },
        { label: showSettled ? 'Comptes soldés' : 'Comptes clients' },
      ]"
    >
      <button class="btn btn-secondary btn-sm" @click="printAccounts">🖨 Imprimer</button>
      <button class="btn btn-primary btn-sm" @click="toggleView">
        {{ showSettled ? '⚠️ Clients avec dette' : '✅ Clients sans dette' }}
      </button>
    </PageHeader>

    <!-- Skeleton -->
    <div v-if="isLoading" class="space-y-5">
      <div class="grid grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="rounded-2xl p-5 h-24 skeleton"></div>
      </div>
      <div class="card p-5 h-64 skeleton"></div>
    </div>

    <template v-else>
      <!-- ── KPI Cards ──────────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="rounded-2xl p-5 text-white shadow-sm" style="background:#2563eb;">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold uppercase tracking-wide opacity-75">Clients affichés</span>
            <span class="text-2xl">👥</span>
          </div>
          <p class="text-2xl font-bold leading-tight">{{ displayedClients.length }}</p>
          <p class="text-xs opacity-70 mt-1">{{ showSettled ? 'Comptes soldés' : 'Comptes avec dette' }}</p>
        </div>

        <div class="rounded-2xl p-5 text-white shadow-sm" style="background:#475569;">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold uppercase tracking-wide opacity-75">Total facturé</span>
            <span class="text-2xl">📄</span>
          </div>
          <p class="text-2xl font-bold leading-tight">{{ formatAmount(totalDue) }}</p>
          <p class="text-xs opacity-70 mt-1">FCFA</p>
        </div>

        <div
          class="rounded-2xl p-5 text-white shadow-sm"
          :style="showSettled ? 'background:#16a34a;' : 'background:#dc2626;'"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold uppercase tracking-wide opacity-75">
              {{ showSettled ? 'Total soldé' : 'Total restant dû' }}
            </span>
            <span class="text-2xl">{{ showSettled ? '💚' : '⚠️' }}</span>
          </div>
          <p class="text-2xl font-bold leading-tight">{{ formatAmount(totalSolde) }}</p>
          <p class="text-xs opacity-70 mt-1">FCFA</p>
        </div>
      </div>

      <!-- ── Table ─────────────────────────────────────── -->
      <div class="card overflow-hidden">
        <!-- En-tête section -->
        <div class="px-5 py-3 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
          <span class="text-sm font-semibold text-gray-600">
            {{ displayedClients.length }} client(s)
            {{ showSettled ? 'avec compte soldé' : 'avec dette en cours' }}
          </span>
          <div class="flex items-center gap-2">
            <input
              v-model="search"
              type="text"
              class="field py-1.5 text-xs max-w-xs"
              placeholder="Filtrer par nom…"
            />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Nom du Client</th>
                <th class="text-right">Total Facturé (FCFA)</th>
                <th class="text-right">Montant Versé (FCFA)</th>
                <th class="text-right">{{ showSettled ? 'Solde (FCFA)' : 'Montant Restant (FCFA)' }}</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="client in filteredClients" :key="client.id">
                <td class="font-medium text-gray-900">{{ client.name }}</td>
                <td class="text-right text-gray-700">{{ formatAmount(client.amount_due) }}</td>
                <td class="text-right text-green-700 font-medium">{{ formatAmount(client.amount_payment) }}</td>
                <td
                  class="text-right font-semibold"
                  :class="client.amount_solde > 0 ? 'text-red-600' : 'text-green-600'"
                >
                  {{ formatAmount(client.amount_solde) }}
                </td>
                <td class="text-center">
                  <button
                    v-if="!showSettled && client.amount_solde > 0"
                    class="btn btn-warning btn-sm mr-1"
                    @click="requestSolde(client)"
                  >
                    ✅ Solder le compte
                  </button>
                  <button class="btn btn-primary btn-sm" @click="router.push(`/clients/${client.id}`)">
                    👁 Consulter le compte
                  </button>
                </td>
              </tr>
              <tr v-if="filteredClients.length === 0">
                <td colspan="5" class="py-14 text-center">
                  <p class="text-2xl mb-2">{{ showSettled ? '🎉' : '💚' }}</p>
                  <p class="text-sm text-gray-400">
                    {{ showSettled ? 'Aucun compte soldé trouvé.' : 'Aucun client avec dette en cours.' }}
                  </p>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="filteredClients.length > 0">
              <tr class="bg-slate-50 font-semibold text-sm">
                <td class="px-4 py-2.5 text-right text-gray-600">Totaux :</td>
                <td class="px-4 py-2.5 text-right text-gray-900">{{ formatAmount(totalDue) }}</td>
                <td class="px-4 py-2.5 text-right text-green-700">{{ formatAmount(totalPaid) }}</td>
                <td class="px-4 py-2.5 text-right" :class="totalSolde > 0 ? 'text-red-600' : 'text-green-600'">
                  {{ formatAmount(totalSolde) }}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>

    <!-- ══ Confirmation Solder le compte ══════════════ -->
    <Transition name="modal">
      <div
        v-if="soldeTarget !== null"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="soldeTarget = null"
      >
        <div class="modal-panel card p-6 w-full max-w-sm">
          <div class="flex items-start gap-3 mb-4">
            <div class="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 flex-shrink-0">✅</div>
            <div>
              <h3 class="font-bold text-gray-900">Solder le compte ?</h3>
              <p class="text-sm text-gray-500 mt-1">
                Un paiement de
                <strong class="text-gray-900">{{ formatAmount(soldeTarget.amount_solde) }} FCFA</strong>
                sera enregistré pour <strong class="text-gray-900">{{ soldeTarget.name }}</strong>.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button class="btn btn-secondary" @click="soldeTarget = null">Annuler</button>
            <button class="btn btn-warning" :disabled="isSaving" @click="doSolde">
              {{ isSaving ? 'En cours…' : 'Confirmer' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '../../stores/toast.store'
import PageHeader from '../../components/PageHeader.vue'
import type { Client } from '../../electron.d'

const router = useRouter()
const toast  = useToastStore()

const allClients  = ref<Client[]>([])
const isLoading   = ref(true)
const isSaving    = ref(false)
const showSettled = ref(false)
const search      = ref('')
const soldeTarget = ref<Client | null>(null)

// ─── Computed ────────────────────────────────────────────────────────────────

const displayedClients = computed(() =>
  allClients.value.filter(c =>
    showSettled.value ? c.amount_solde <= 0 : c.amount_solde > 0
  )
)

const filteredClients = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return displayedClients.value
  return displayedClients.value.filter(c => c.name.toLowerCase().includes(q))
})

const totalDue   = computed(() => filteredClients.value.reduce((s, c) => s + (c.amount_due ?? 0), 0))
const totalPaid  = computed(() => filteredClients.value.reduce((s, c) => s + (c.amount_payment ?? 0), 0))
const totalSolde = computed(() => filteredClients.value.reduce((s, c) => s + (c.amount_solde ?? 0), 0))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n ?? 0))
}

// ─── Data ────────────────────────────────────────────────────────────────────

async function loadClients() {
  isLoading.value = true
  try {
    const result = await window.electron.clients.list({ per_page: 9999 })
    allClients.value = result.data
  } finally {
    isLoading.value = false
  }
}

onMounted(loadClients)

function toggleView() {
  showSettled.value = !showSettled.value
  search.value = ''
}

// ─── Solder ──────────────────────────────────────────────────────────────────

function requestSolde(client: Client) {
  soldeTarget.value = client
}

async function doSolde() {
  if (!soldeTarget.value) return
  isSaving.value = true
  try {
    await window.electron.payments.create({
      client_id: soldeTarget.value.id,
      amount:    soldeTarget.value.amount_solde,
      date:      new Date().toISOString().split('T')[0],
    })
    toast.show(`Compte de ${soldeTarget.value.name} soldé avec succès`)
    soldeTarget.value = null
    await loadClients()
  } catch {
    toast.show('Impossible de solder ce compte', 'error')
  } finally {
    isSaving.value = false
  }
}

// ─── Impression ──────────────────────────────────────────────────────────────

function printAccounts() {
  window.electron.print()
}
</script>
