<template>
  <div class="p-6">
    <PageHeader
      :title="invoice ? `Facture ${invoice.matricule ?? '#' + invoice.id}` : 'Chargement…'"
      :breadcrumbs="[
        { label: 'Tableau de bord', to: '/dashboard' },
        { label: 'Factures', to: '/invoices' },
        { label: 'Détail facture' },
      ]"
    >
      <div class="flex items-center gap-2">
        <button class="btn btn-secondary btn-sm" @click="window.electron.print()" :disabled="isLoading">
          <PrinterIcon :size="13" />
          <span class="hidden sm:inline">Imprimer</span>
        </button>
        <button
          v-if="invoice && invoice.status !== 'canceled'"
          class="btn btn-warning btn-sm"
          @click="router.push(`/invoices/${invoiceId}/edit`)"
          :disabled="isLoading"
        >
          <PencilIcon :size="13" />
          <span class="hidden sm:inline">Modifier</span>
        </button>
        <button
          v-if="invoice && invoice.status !== 'canceled'"
          class="btn btn-danger btn-sm"
          @click="confirmCancel = true"
          :disabled="isLoading"
        >
          <XCircleIcon :size="13" />
          <span class="hidden sm:inline">Annuler</span>
        </button>
        <button class="btn btn-ghost btn-sm" @click="router.push('/invoices')">
          <ArrowLeftIcon :size="13" />
          <span class="hidden sm:inline">Retour</span>
        </button>
      </div>
    </PageHeader>

    <!-- Skeleton -->
    <div v-if="isLoading" class="space-y-4">
      <div class="card p-6 h-28 skeleton"></div>
      <div class="card p-6 h-64 skeleton"></div>
    </div>

    <template v-else-if="invoice">

      <!-- ── En-tête facture ─────────────────────── -->
      <div class="card p-6 mb-4">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">

          <!-- Client info -->
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Client</p>
            <p class="text-xl font-bold text-slate-900">
              {{ invoice.client_name ?? `Client #${invoice.client_id}` }}
            </p>
          </div>

          <!-- Facture info -->
          <div class="sm:text-right">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Facture</p>
            <p class="text-2xl font-bold text-blue-600">
              {{ invoice.matricule ?? `#${invoice.id}` }}
            </p>
            <p class="text-xs text-slate-400 mt-1">{{ formatDate(invoice.date) }}</p>
            <span class="badge mt-2 inline-flex" :class="statusBadge(invoice.status)">
              {{ statusLabel(invoice.status) }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── Table des articles ───────────────────── -->
      <div class="card overflow-hidden mb-4">
        <div class="card-section">
          <span class="card-section-label">Détail des colis</span>
          <span class="text-[11px] text-slate-400">{{ items.length }} colis</span>
        </div>

        <div class="overflow-x-auto">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Essence</th>
                <th>N° Colis</th>
                <th class="text-right">Longueur</th>
                <th class="text-right">Épaisseur</th>
                <th class="text-right hidden sm:table-cell">Nb P.</th>
                <th class="text-right">Volume (m³)</th>
                <th class="text-right hidden md:table-cell">Prix/m³</th>
                <th class="text-right">Prix total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="items.length === 0">
                <td colspan="8" class="py-16 text-center">
                  <p class="text-sm text-slate-400">Aucun article dans cette facture.</p>
                </td>
              </tr>
              <tr v-for="item in items" :key="item.id">
                <td><span class="badge badge-blue">{{ item.essence ?? '—' }}</span></td>
                <td class="font-mono text-xs font-bold text-slate-800">{{ item.numero_colis ?? '—' }}</td>
                <td class="text-right text-slate-600 text-xs">{{ item.longueur ?? '—' }}</td>
                <td class="text-right text-slate-600 text-xs">{{ item.epaisseur ?? '—' }}</td>
                <td class="text-right text-slate-600 text-xs hidden sm:table-cell">{{ item.nombre_piece ?? '—' }}</td>
                <td class="text-right font-semibold text-slate-800">{{ formatVolume(item.volume) }}</td>
                <td class="text-right text-slate-400 text-xs hidden md:table-cell">{{ formatPrice(item.price) }}</td>
                <td class="text-right font-bold text-slate-900">{{ formatPrice(item.total_price_item) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="items.length > 0">
              <tr class="bg-slate-50 text-sm">
                <td colspan="5" class="text-right text-slate-500 font-medium">Nombre de colis :</td>
                <td class="text-right font-bold text-slate-900">{{ items.length }}</td>
                <td class="hidden md:table-cell"></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- ── Total ──────────────────────────────── -->
      <div class="flex justify-end">
        <div class="card px-8 py-5 text-right min-w-64">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total facture</p>
          <p class="text-3xl font-bold text-slate-900">{{ formatPrice(invoice.total_price) }}</p>
          <p class="text-xs text-slate-400 mt-1 font-medium">FCFA</p>
        </div>
      </div>

    </template>

    <!-- Not found -->
    <div v-else class="card p-12 text-center">
      <FileTextIcon :size="40" class="mx-auto mb-3 text-slate-200" />
      <p class="text-sm text-slate-400 font-medium">Facture introuvable</p>
      <button class="btn btn-secondary btn-sm mt-4" @click="router.push('/invoices')">
        <ArrowLeftIcon :size="13" /> Retour à la liste
      </button>
    </div>

    <!-- ── Modal confirmation annulation ─────────── -->
    <Transition name="modal">
      <div
        v-if="confirmCancel"
        class="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
        @click.self="confirmCancel = false"
      >
        <div class="modal-panel card-raised p-6 w-full max-w-sm">
          <div class="flex items-start gap-3 mb-5">
            <div class="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangleIcon :size="17" class="text-red-600" />
            </div>
            <div>
              <h3 class="font-bold text-slate-900">Annuler cette facture ?</h3>
              <p class="text-sm text-slate-500 mt-1">
                Tous les articles seront remis en disponible. Cette action est irréversible.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button class="btn btn-secondary btn-sm" @click="confirmCancel = false">Fermer</button>
            <button class="btn btn-danger btn-sm" :disabled="isCanceling" @click="doCancelInvoice">
              <XCircleIcon :size="13" />
              {{ isCanceling ? 'Annulation…' : 'Oui, annuler' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { PrinterIcon, ArrowLeftIcon, XCircleIcon, AlertTriangleIcon, PencilIcon, FileTextIcon } from 'lucide-vue-next'
import PageHeader from '../../components/PageHeader.vue'
import { useToastStore } from '../../stores/toast.store'
import type { Invoice, InvoiceItem } from '../../electron.d'

const router = useRouter()
const route  = useRoute()
const toast  = useToastStore()

const invoiceId = Number(route.params.id)

const isLoading     = ref(true)
const isCanceling   = ref(false)
const confirmCancel = ref(false)
const invoice = ref<Invoice | null>(null)
const items   = ref<InvoiceItem[]>([])

async function loadAll() {
  isLoading.value = true
  const [inv, invItems] = await Promise.all([
    window.electron.invoices.get(invoiceId),
    window.electron.invoices.items(invoiceId),
  ])
  invoice.value = inv ?? null
  items.value   = invItems
  isLoading.value = false
}

async function doCancelInvoice() {
  if (!invoice.value) return
  isCanceling.value = true
  try {
    await window.electron.invoices.update(invoiceId, { status: 'canceled' })
    invoice.value.status = 'canceled'
    toast.show('Facture annulée')
    confirmCancel.value = false
  } catch {
    toast.show("Impossible d'annuler cette facture", 'error')
  } finally {
    isCanceling.value = false
  }
}

function formatDate(d: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatVolume(v: number | null | undefined): string {
  return v != null ? parseFloat(String(v)).toFixed(3) : '0.000'
}

function formatPrice(p: number | null | undefined): string {
  return new Intl.NumberFormat('de-DE').format(p ? Math.round(p) : 0)
}

function statusLabel(s: string) {
  return { pending: 'En attente', validated: 'Validée', canceled: 'Annulée' }[s] ?? s
}
function statusBadge(s: string) {
  return { pending: 'badge-yellow', validated: 'badge-green', canceled: 'badge-red' }[s] ?? 'badge-gray'
}

onMounted(loadAll)
</script>
