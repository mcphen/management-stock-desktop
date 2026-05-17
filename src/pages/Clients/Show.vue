<template>
  <div class="p-6">
    <PageHeader
      :title="`👤 Compte client : ${client?.name ?? '…'}`"
      :breadcrumbs="[
        { label: 'Tableau de bord', to: '/dashboard' },
        { label: 'Clients', to: '/clients' },
        { label: client?.name ?? '…' },
      ]"
    >
      <button class="btn btn-primary btn-sm" @click="showPaymentModal = true">💰 Ajouter un Paiement</button>
      <button class="btn btn-secondary btn-sm" @click="showOldPaymentModal = true">📂 Ancien compte</button>
      <button class="btn btn-warning btn-sm" @click="confirmSolde">✅ Solder le compte</button>
      <button class="btn btn-secondary btn-sm" @click="router.push('/clients')">← Retour</button>
    </PageHeader>

    <!-- Skeleton -->
    <div v-if="isLoading" class="space-y-5">
      <div class="grid grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="rounded-2xl p-5 h-24 skeleton"></div>
      </div>
      <div class="card p-5 h-16 skeleton"></div>
      <div class="card p-5 h-48 skeleton"></div>
    </div>

    <template v-else>
      <!-- ── KPI Cards ──────────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="rounded-2xl p-5 text-white shadow-sm" style="background:#2563eb;">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold uppercase tracking-wide opacity-75">Factures</span>
            <span class="text-2xl">📋</span>
          </div>
          <p class="text-2xl font-bold leading-tight">{{ totalInvoices }}</p>
          <p class="text-xs opacity-70 mt-1">Factures clients</p>
        </div>

        <div class="rounded-2xl p-5 text-white shadow-sm" style="background:#475569;">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold uppercase tracking-wide opacity-75">Montant Facture</span>
            <span class="text-2xl">📄</span>
          </div>
          <p class="text-2xl font-bold leading-tight">{{ formatAmount(client!.amount_due) }}</p>
          <p class="text-xs opacity-70 mt-1">FCFA</p>
        </div>

        <div class="rounded-2xl p-5 text-white shadow-sm" style="background:#0891b2;">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold uppercase tracking-wide opacity-75">Montant Payé</span>
            <span class="text-2xl">✅</span>
          </div>
          <p class="text-2xl font-bold leading-tight">{{ formatAmount(client!.amount_payment) }}</p>
          <p class="text-xs opacity-70 mt-1">FCFA</p>
        </div>

        <div
          class="rounded-2xl p-5 text-white shadow-sm"
          :style="client!.amount_solde > 0 ? 'background:#dc2626;' : 'background:#16a34a;'"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold uppercase tracking-wide opacity-75">Solde Restant</span>
            <span class="text-2xl">{{ client!.amount_solde > 0 ? '⚠️' : '💚' }}</span>
          </div>
          <p class="text-2xl font-bold leading-tight">{{ formatAmount(client!.amount_solde) }}</p>
          <p class="text-xs opacity-70 mt-1">FCFA</p>
        </div>
      </div>

      <!-- ── Fiche client ───────────────────────────────── -->
      <div class="card overflow-hidden mb-6">
        <div class="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Nom</p>
            <p class="text-sm font-semibold text-gray-900">{{ client!.name }}</p>
          </div>
          <div v-if="client!.phone">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Téléphone</p>
            <p class="text-sm font-semibold text-gray-900">{{ client!.phone }}</p>
          </div>
          <div v-if="client!.email">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Email</p>
            <p class="text-sm font-semibold text-primary-600">{{ client!.email }}</p>
          </div>
          <div v-if="client!.address">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Adresse</p>
            <p class="text-sm font-semibold text-gray-900">{{ client!.address }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Sync</p>
            <span class="badge" :class="syncBadge(client!.sync_status).cls">{{ syncBadge(client!.sync_status).label }}</span>
          </div>
        </div>
      </div>

      <!-- ── Onglets ────────────────────────────────────── -->
      <div class="card overflow-hidden">
        <!-- Tab bar -->
        <div class="px-5 pt-4 border-b border-gray-100 flex gap-1">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="pb-3 px-1 mr-5 text-sm font-semibold border-b-2 transition-colors"
            :class="activeTab === tab.key
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-400 hover:text-gray-700'"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- ── Onglet : Compte du client ─────────────────── -->
        <div v-if="activeTab === 'compte'">
          <!-- En-tête section -->
          <div class="px-5 py-3 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
            <span class="text-sm font-semibold text-gray-600">
              {{ transactions.length }} transaction(s)
            </span>
            <button class="btn btn-secondary btn-sm" @click="printAccount">🖨 Imprimer compte client</button>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="data-table w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Numéro de Facture</th>
                  <th class="text-right">Montant Facture</th>
                  <th class="text-right">Paiement</th>
                  <th class="text-right">Solde Cumulé</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in transactions"
                  :key="`${row.type}-${row.id}`"
                  :class="row.type === 'payment' ? 'bg-green-50/40' : ''"
                >
                  <td class="text-gray-500 text-xs font-mono">{{ formatDate(row.date) }}</td>
                  <td>
                    <span
                      class="badge"
                      :class="row.type === 'invoice' ? 'badge-yellow' : 'badge-green'"
                    >
                      {{ row.type === 'invoice' ? '📄 Facture' : '💳 Paiement' }}
                    </span>
                  </td>
                  <td>
                    <router-link
                      v-if="row.type === 'invoice'"
                      :to="`/invoices/${row.id}`"
                      class="text-primary-600 hover:underline font-medium text-sm"
                    >
                      {{ row.matricule ?? `#${row.id}` }}
                    </router-link>
                    <span v-else class="text-gray-300 text-sm">—</span>
                  </td>
                  <td class="text-right">
                    <span v-if="row.type === 'invoice'" class="font-medium text-sm">{{ formatAmount(row.amount) }}</span>
                    <span v-else class="text-gray-300 text-sm">—</span>
                  </td>
                  <td class="text-right">
                    <span v-if="row.type === 'payment'" class="text-green-700 font-medium text-sm">{{ formatAmount(row.amount) }}</span>
                    <span v-else class="text-gray-300 text-sm">—</span>
                  </td>
                  <td class="text-right font-semibold text-sm"
                    :class="row.cumul > 0 ? 'text-red-600' : 'text-green-600'"
                  >
                    {{ formatAmount(index === transactions.length - 1 ? (client?.amount_solde ?? row.cumul) : row.cumul) }}
                  </td>
                  <td class="text-center">
                    <router-link
                      v-if="row.type === 'invoice'"
                      :to="`/invoices/${row.id}`"
                      class="btn btn-primary btn-sm"
                    >Voir</router-link>
                    <div v-else class="flex justify-center gap-1">
                      <button class="btn btn-secondary btn-sm" @click="openEditPayment(row)">Modifier</button>
                      <button class="btn btn-danger btn-sm" @click="requestDeletePayment(row.id)">Supprimer</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="transactions.length === 0">
                  <td colspan="7" class="py-14 text-center">
                    <p class="text-2xl mb-2">📭</p>
                    <p class="text-sm text-gray-400">Aucune transaction pour ce client.</p>
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="transactions.length > 0">
                <tr class="bg-slate-50 font-semibold text-sm">
                  <td colspan="3" class="px-4 py-2.5 text-right text-gray-600">Total facturé :</td>
                  <td class="px-4 py-2.5 text-right text-gray-900">{{ formatAmount(client!.amount_due) }}</td>
                  <td class="px-4 py-2.5 text-right text-green-700">{{ formatAmount(client!.amount_payment) }}</td>
                  <td class="px-4 py-2.5 text-right" :class="client!.amount_solde > 0 ? 'text-red-600' : 'text-green-600'">
                    {{ formatAmount(client!.amount_solde) }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- ── Onglet : Historique des paiements ─────────── -->
        <div v-if="activeTab === 'paiements'">
          <div class="px-5 py-3 border-b border-gray-100 bg-slate-50">
            <span class="text-sm font-semibold text-gray-600">{{ payments.length }} paiement(s)</span>
          </div>
          <div class="overflow-x-auto">
            <table class="data-table w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th class="text-right">Montant (FCFA)</th>
                  <th class="text-center">Sync</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in payments" :key="p.id" class="bg-green-50/30">
                  <td class="text-gray-500 text-xs font-mono">{{ formatDate(p.date) }}</td>
                  <td class="text-right font-semibold text-green-700">{{ formatAmount(p.amount) }}</td>
                  <td class="text-center">
                    <span class="badge" :class="syncBadge(p.sync_status).cls">{{ syncBadge(p.sync_status).label }}</span>
                  </td>
                  <td class="text-center">
                    <button class="btn btn-secondary btn-sm mr-1" @click="openEditPaymentFromList(p)">Modifier</button>
                    <button class="btn btn-danger btn-sm" @click="requestDeletePayment(p.id)">Supprimer</button>
                  </td>
                </tr>
                <tr v-if="payments.length === 0">
                  <td colspan="4" class="py-14 text-center">
                    <p class="text-2xl mb-2">💳</p>
                    <p class="text-sm text-gray-400">Aucun paiement enregistré.</p>
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="payments.length > 0">
                <tr class="bg-slate-50 font-semibold text-sm">
                  <td class="px-4 py-2.5 text-right text-gray-600">Total payé :</td>
                  <td class="px-4 py-2.5 text-right text-green-700">{{ formatAmount(client!.amount_payment) }}</td>
                  <td></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ Modal : Ajouter / Modifier un paiement ══════ -->
    <Transition name="modal">
      <div
        v-if="showPaymentModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closePaymentModal"
      >
        <div class="modal-panel card w-full max-w-md p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-base font-bold text-gray-900">{{ editingPaymentId ? 'Modifier le paiement' : 'Ajouter un Paiement' }}</h3>
            <button class="text-gray-400 hover:text-gray-600 text-xl leading-none" @click="closePaymentModal">✕</button>
          </div>
          <form @submit.prevent="handlePayment" class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input v-model="paymentForm.date" type="date" required class="field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Montant du Paiement *</label>
              <input v-model.number="paymentForm.amount" type="number" min="1" required class="field" placeholder="0" />
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
              <button type="button" class="btn btn-secondary" @click="closePaymentModal">Annuler</button>
              <button type="submit" class="btn btn-primary" :disabled="isSaving">
                {{ isSaving ? 'Enregistrement…' : editingPaymentId ? 'Modifier' : 'Ajouter' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ══ Modal : Ancien compte ════════════════════════ -->
    <Transition name="modal">
      <div
        v-if="showOldPaymentModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showOldPaymentModal = false"
      >
        <div class="modal-panel card w-full max-w-sm p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-base font-bold text-gray-900">Ancien compte</h3>
            <button class="text-gray-400 hover:text-gray-600 text-xl leading-none" @click="showOldPaymentModal = false">✕</button>
          </div>
          <form @submit.prevent="addOldPayment" class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Montant ancien compte *</label>
              <input v-model.number="oldAmount" type="number" min="1" required class="field" placeholder="0" />
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
              <button type="button" class="btn btn-secondary" @click="showOldPaymentModal = false">Annuler</button>
              <button type="submit" class="btn btn-primary" :disabled="isSaving">
                {{ isSaving ? 'Enregistrement…' : 'Ajouter' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ══ Confirmation suppression paiement ════════════ -->
    <Transition name="modal">
      <div
        v-if="deletePaymentId !== null"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="deletePaymentId = null"
      >
        <div class="modal-panel card p-6 w-full max-w-sm">
          <div class="flex items-start gap-3 mb-4">
            <div class="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">⚠</div>
            <div>
              <h3 class="font-bold text-gray-900">Supprimer ce paiement ?</h3>
              <p class="text-sm text-gray-500 mt-1">Cette action est irréversible.</p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button class="btn btn-secondary" @click="deletePaymentId = null">Annuler</button>
            <button class="btn btn-danger" @click="doDeletePayment">Oui, supprimer</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ Confirmation solder le compte ════════════════ -->
    <Transition name="modal">
      <div
        v-if="showSoldeModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showSoldeModal = false"
      >
        <div class="modal-panel card p-6 w-full max-w-sm">
          <div class="flex items-start gap-3 mb-4">
            <div class="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 flex-shrink-0">✅</div>
            <div>
              <h3 class="font-bold text-gray-900">Solder le compte ?</h3>
              <p class="text-sm text-gray-500 mt-1">
                Un paiement de <strong>{{ formatAmount(client?.amount_solde ?? 0) }} FCFA</strong> sera enregistré pour solder le compte.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button class="btn btn-secondary" @click="showSoldeModal = false">Annuler</button>
            <button class="btn btn-warning" :disabled="isSaving" @click="doSoldeCompte">
              {{ isSaving ? 'En cours…' : 'Confirmer' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '../../stores/toast.store'
import PageHeader from '../../components/PageHeader.vue'
import type { Client, Invoice, Payment } from '../../electron.d'

const route  = useRoute()
const router = useRouter()
const toast  = useToastStore()

const clientId = Number(route.params.id)

const client     = ref<Client | null>(null)
const invoices   = ref<Invoice[]>([])
const payments   = ref<Payment[]>([])
const isLoading  = ref(true)
const isSaving   = ref(false)

const activeTab  = ref<'compte' | 'paiements'>('compte')
const tabs = [
  { key: 'compte',    label: '📜 Compte du Client' },
  { key: 'paiements', label: '📊 Historique des paiements' },
] as const

// Payment modal
const showPaymentModal  = ref(false)
const editingPaymentId  = ref<number | null>(null)
const paymentForm = reactive({
  date:   new Date().toISOString().split('T')[0],
  amount: 0,
})

// Old payment modal
const showOldPaymentModal = ref(false)
const oldAmount = ref(0)

// Delete payment
const deletePaymentId = ref<number | null>(null)

// Solder compte
const showSoldeModal = ref(false)

// ─── Computed ───────────────────────────────────────────────────────────────

const totalInvoices = computed(() => invoices.value.length)

type TxRow = {
  id: number
  type: 'invoice' | 'payment'
  date: string
  amount: number
  matricule?: string | null
  cumul: number
}

const transactions = computed<TxRow[]>(() => {
  const rows: Omit<TxRow, 'cumul'>[] = [
    ...invoices.value.map((inv) => ({
      id:        inv.id,
      type:      'invoice' as const,
      date:      inv.date,
      amount:    inv.total_price,
      matricule: inv.matricule,
    })),
    ...payments.value.map((p) => ({
      id:     p.id,
      type:   'payment' as const,
      date:   p.date,
      amount: p.amount,
    })),
  ]

  rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let cumul = 0
  return rows.map((r) => {
    cumul += r.type === 'invoice' ? r.amount : -r.amount
    return { ...r, cumul }
  })
})

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatAmount(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n ?? 0))
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

function syncBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    synced:          { label: '✓ Sync',     cls: 'badge-green' },
    pending:         { label: '⏳ Attente',  cls: 'badge-yellow' },
    conflict:        { label: '⚠ Conflit',  cls: 'badge-red' },
    deleted_pending: { label: '🗑 Supprimé', cls: 'badge-gray' },
  }
  return map[s] ?? { label: s, cls: 'badge-gray' }
}

// ─── Chargement ─────────────────────────────────────────────────────────────

async function loadAll() {
  isLoading.value = true
  try {
    const [c, inv, pay] = await Promise.all([
      window.electron.clients.get(clientId),
      window.electron.invoices.list({ client_id: clientId, per_page: 9999 }),
      window.electron.payments.list({ client_id: clientId, per_page: 9999 }),
    ])
    if (!c) { router.push('/clients'); return }
    client.value   = c
    invoices.value = inv.data
    payments.value = pay.data
  } finally {
    isLoading.value = false
  }
}

onMounted(loadAll)

// ─── Paiements ──────────────────────────────────────────────────────────────

function openEditPayment(row: TxRow) {
  editingPaymentId.value = row.id
  paymentForm.date   = row.date.slice(0, 10)
  paymentForm.amount = row.amount
  showPaymentModal.value = true
}

function openEditPaymentFromList(p: Payment) {
  editingPaymentId.value = p.id
  paymentForm.date   = p.date.slice(0, 10)
  paymentForm.amount = p.amount
  showPaymentModal.value = true
}

function closePaymentModal() {
  showPaymentModal.value = false
  editingPaymentId.value = null
  paymentForm.date   = new Date().toISOString().split('T')[0]
  paymentForm.amount = 0
}

async function handlePayment() {
  isSaving.value = true
  try {
    if (editingPaymentId.value !== null) {
      await window.electron.payments.delete(editingPaymentId.value)
      await window.electron.payments.create({ client_id: clientId, ...paymentForm })
      toast.show('Paiement modifié')
    } else {
      await window.electron.payments.create({ client_id: clientId, ...paymentForm })
      toast.show('Paiement enregistré avec succès')
    }
    closePaymentModal()
    await loadAll()
  } catch {
    toast.show('Une erreur est survenue', 'error')
  } finally {
    isSaving.value = false
  }
}

async function addOldPayment() {
  if (!oldAmount.value || oldAmount.value <= 0) return
  isSaving.value = true
  try {
    await window.electron.payments.create({
      client_id: clientId,
      amount:    oldAmount.value,
      date:      new Date().toISOString().split('T')[0],
    })
    toast.show('Ancien compte enregistré avec succès')
    showOldPaymentModal.value = false
    oldAmount.value = 0
    await loadAll()
  } catch {
    toast.show('Une erreur est survenue', 'error')
  } finally {
    isSaving.value = false
  }
}

function requestDeletePayment(id: number) { deletePaymentId.value = id }

async function doDeletePayment() {
  if (deletePaymentId.value === null) return
  try {
    await window.electron.payments.delete(deletePaymentId.value)
    toast.show('Paiement supprimé')
    await loadAll()
  } catch {
    toast.show('Impossible de supprimer ce paiement', 'error')
  } finally {
    deletePaymentId.value = null
  }
}

// ─── Solder le compte ────────────────────────────────────────────────────────

function confirmSolde() {
  if (!client.value || client.value.amount_solde <= 0) {
    toast.show('Le compte est déjà soldé', 'error')
    return
  }
  showSoldeModal.value = true
}

async function doSoldeCompte() {
  if (!client.value) return
  isSaving.value = true
  try {
    await window.electron.payments.create({
      client_id: clientId,
      amount:    client.value.amount_solde,
      date:      new Date().toISOString().split('T')[0],
    })
    toast.show('Compte soldé avec succès')
    showSoldeModal.value = false
    await loadAll()
  } catch {
    toast.show('Impossible de solder le compte', 'error')
  } finally {
    isSaving.value = false
  }
}

// ─── Impression ──────────────────────────────────────────────────────────────

function printAccount() {
  window.electron.print()
}
</script>
