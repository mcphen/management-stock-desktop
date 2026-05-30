<template>
  <div class="p-6 space-y-5">

    <!-- Header -->
    <PageHeader
      :title="caisse ? caisse.name : 'Détail caisse'"
      :breadcrumbs="[
        { label: 'Tableau de bord', to: '/dashboard' },
        { label: 'Finances' },
        { label: 'Caisses', to: '/caisse' },
        { label: caisse?.name ?? '…' },
      ]"
    >
      <div class="flex items-center gap-2 flex-wrap">
        <button @click="router.push('/caisse')"
          class="flex items-center gap-1.5 text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-lg transition-colors">
          <ArrowLeftIcon :size="14" /> Retour
        </button>
        <button @click="openEntreeModal"
          class="flex items-center gap-1.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg transition-colors">
          <PlusIcon :size="14" /> Nouvelle entrée
        </button>
        <button @click="openSortieModal"
          class="flex items-center gap-1.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-colors">
          <MinusIcon :size="14" /> Nouvelle sortie
        </button>
        <button @click="openTransferModal"
          class="flex items-center gap-1.5 text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg transition-colors">
          <ArrowRightLeftIcon :size="14" /> Transférer
        </button>
        <button @click="openEditModal"
          class="flex items-center gap-1.5 text-sm border border-slate-200 bg-white hover:bg-slate-50 text-amber-600 border-amber-200 px-3 py-2 rounded-lg transition-colors">
          <PencilIcon :size="14" /> Modifier caisse
        </button>
        <button @click="toggleActive" v-if="caisse"
          class="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-lg transition-colors"
          :class="caisse.active
            ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500'
            : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'">
          <BanIcon v-if="caisse.active" :size="14" />
          <CheckCircleIcon v-else :size="14" />
          {{ caisse.active ? 'Désactiver' : 'Activer' }}
        </button>
        <button @click="printPage"
          class="flex items-center gap-1.5 text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-lg transition-colors">
          <PrinterIcon :size="14" /> Imprimer
        </button>
      </div>
    </PageHeader>

    <!-- Skeleton -->
    <template v-if="loadingCaisse">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div v-for="n in 4" :key="n" class="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
          <div class="h-3 bg-slate-100 rounded w-1/2 mb-3" />
          <div class="h-7 bg-slate-100 rounded w-2/3" />
        </div>
      </div>
    </template>

    <template v-else-if="caisse">

      <!-- Caisse info + résumé -->
      <div class="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4">

        <!-- Caisse info -->
        <div class="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4 lg:col-span-1">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" :class="iconBg(caisse.type)">
            <component :is="iconFor(caisse.type)" :size="22" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <p class="font-bold text-slate-800 truncate">{{ caisse.name }}</p>
              <span class="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                :class="caisse.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                {{ caisse.active ? 'ACTIVE' : 'INACTIVE' }}
              </span>
            </div>
            <p class="text-xs text-slate-400 mb-3">{{ labelType(caisse.type) }} · {{ caisse.currency_code || 'XOF' }}</p>
            <div class="space-y-1 text-xs text-slate-500">
              <div class="flex justify-between">
                <span>Mis à jour</span>
                <span class="font-medium">{{ formatDate(caisse.updated_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Résumé : 6 stats sur 2 colonnes -->
        <div class="lg:col-span-2 xl:col-span-3 bg-white border border-slate-200 rounded-xl p-5">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Résumé</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">

            <div>
              <p class="text-[11px] text-slate-400 mb-0.5">Solde initial</p>
              <p class="text-base font-bold text-slate-700">{{ formatPrice(caisse.initial_balance) }}</p>
            </div>

            <div>
              <p class="text-[11px] text-slate-400 mb-0.5">Total entrées</p>
              <p class="text-base font-bold text-emerald-600">{{ formatPrice(summary.entrees) }}</p>
            </div>

            <div>
              <p class="text-[11px] text-slate-400 mb-0.5">Total sorties</p>
              <p class="text-base font-bold text-red-500">{{ formatPrice(summary.sorties) }}</p>
            </div>

            <div>
              <p class="text-[11px] text-slate-400 mb-0.5">Transferts entrants</p>
              <p class="text-base font-bold text-emerald-500">{{ formatPrice(summary.transfers_in) }}</p>
            </div>

            <div>
              <p class="text-[11px] text-slate-400 mb-0.5">Transferts sortants</p>
              <p class="text-base font-bold text-red-400">{{ formatPrice(summary.transfers_out) }}</p>
            </div>

            <div class="border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-6">
              <p class="text-[11px] text-slate-400 mb-0.5">Solde final calculé</p>
              <p class="text-base font-bold" :class="soldeFinal >= 0 ? 'text-slate-800' : 'text-red-600'">
                {{ formatPrice(soldeFinal) }}
              </p>
            </div>

          </div>
        </div>
      </div>

      <!-- Transactions table -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">

        <!-- Toolbar -->
        <div class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
          <span class="text-sm font-semibold text-slate-700 mr-1">Transactions</span>
          <input v-model="filters.start_date" type="date"
            class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          <span class="text-slate-400 text-xs">→</span>
          <input v-model="filters.end_date" type="date"
            class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          <select v-model="filters.type"
            class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            <option value="">Tous types</option>
            <option value="entree">Entrées</option>
            <option value="sortie">Sorties</option>
          </select>
          <button @click="applyFilters"
            class="flex items-center gap-1.5 text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg transition-colors">
            <FilterIcon :size="13" /> Filtrer
          </button>
          <div class="flex-1" />
          <select v-model.number="filters.per_page" @change="currentPage = 1; sliceTransactions()"
            class="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-500 focus:outline-none">
            <option :value="10">10 / page</option>
            <option :value="15">15 / page</option>
            <option :value="25">25 / page</option>
            <option :value="50">50 / page</option>
          </select>
        </div>

        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
              <th class="text-left px-4 py-3 font-semibold">Date</th>
              <th class="text-left px-4 py-3 font-semibold">Objet</th>
              <th class="text-center px-4 py-3 font-semibold">Type</th>
              <th class="text-right px-4 py-3 font-semibold">Montant</th>
              <th class="text-right px-4 py-3 font-semibold">Solde</th>
              <th class="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="loadingTxns">
              <td colspan="6" class="py-10 text-center text-slate-400 text-xs">Chargement…</td>
            </tr>
            <tr v-else-if="pageTransactions.length === 0">
              <td colspan="6" class="py-10 text-center text-slate-400 text-xs">Aucune transaction</td>
            </tr>
            <tr v-else v-for="t in pageTransactions" :key="t.id"
              class="hover:bg-slate-50/60 transition-colors group"
              :class="{ 'opacity-60 line-through': isTransfer(t) && false }">
              <td class="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{{ formatDate(t.date) }}</td>
              <td class="px-4 py-3 text-slate-700 max-w-[220px]">
                <p class="truncate" :title="t.objet">{{ t.objet || '—' }}</p>
                <p v-if="t.description" class="text-[11px] text-slate-400 truncate mt-0.5">{{ t.description }}</p>
                <span v-if="isTransfer(t)"
                  class="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 mt-0.5">
                  Transfert
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  :class="t.type === 'entree' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'">
                  {{ t.type === 'entree' ? 'Entrée' : 'Sortie' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right font-semibold whitespace-nowrap"
                :class="t.type === 'entree' ? 'text-emerald-600' : 'text-red-500'">
                {{ t.type === 'entree' ? '+' : '−' }}{{ formatPrice(t.amount) }}
              </td>
              <td class="px-4 py-3 text-right text-slate-600 font-medium whitespace-nowrap text-xs">
                {{ formatPrice(t.running_balance) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <!-- Transfert : badge seul, pas d'actions -->
                  <template v-if="isTransfer(t)">
                    <span class="text-[10px] text-indigo-400 italic px-2">Transfert</span>
                  </template>
                  <!-- Paiement client : Corriger paiement -->
                  <template v-else-if="t.type === 'entree' && isPaymentClient(t)">
                    <button @click="openCorrectPaymentModal(t)"
                      class="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors">
                      <WrenchIcon :size="10" /> Corriger paiement
                    </button>
                  </template>
                  <!-- Entrée diverse ou sortie : Modifier + Supprimer -->
                  <template v-else>
                    <button @click="t.type === 'entree' ? openEditEntreeModal(t) : openEditSortieModal(t)"
                      class="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white transition-colors">
                      <PencilIcon :size="10" /> Modifier
                    </button>
                    <button @click="confirmDeleteTxn(t)"
                      class="flex items-center justify-center w-6 h-6 rounded-md bg-red-100 hover:bg-red-200 text-red-500 transition-colors">
                      <Trash2Icon :size="11" />
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Footer pagination + soldes -->
        <div class="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60">
          <p class="text-xs text-slate-500">
            Ouverture : <strong class="text-slate-700">{{ formatPrice(pageOpeningBalance) }}</strong>
            &nbsp;·&nbsp; Clôture : <strong class="text-slate-700">{{ formatPrice(pageClosingBalance) }}</strong>
          </p>
          <div class="flex items-center gap-1">
            <button @click="goToPage(currentPage - 1)" :disabled="currentPage <= 1"
              class="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
              <ChevronLeftIcon :size="13" />
            </button>
            <button v-for="p in visiblePages" :key="p" @click="goToPage(p)"
              class="w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors"
              :class="p === currentPage ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-100'">
              {{ p }}
            </button>
            <button @click="goToPage(currentPage + 1)" :disabled="currentPage >= lastPage"
              class="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
              <ChevronRightIcon :size="13" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ Modals ════════════════════════════════════════════ -->

    <!-- Entrée -->
    <ModalWrapper v-if="showEntree" :title="editEntreeId ? 'Modifier une entrée' : 'Nouvelle entrée'" @close="closeEntree">
      <form @submit.prevent="submitEntree" class="space-y-4">

        <!-- Type d'entrée -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-2">Type d'entrée</label>
          <div class="flex items-center gap-5">
            <label class="flex items-center gap-2 cursor-pointer" :class="editEntreeId ? 'opacity-50 cursor-not-allowed' : ''">
              <input type="radio" value="paiement_client" v-model="entreeForm.entreeType" :disabled="!!editEntreeId"
                class="accent-blue-600" />
              <span class="text-sm text-slate-700">Paiement client</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer" :class="editEntreeId ? 'opacity-50 cursor-not-allowed' : ''">
              <input type="radio" value="entree_diverse" v-model="entreeForm.entreeType" :disabled="!!editEntreeId"
                class="accent-blue-600" />
              <span class="text-sm text-slate-700">Entrée diverse</span>
            </label>
          </div>
        </div>

        <!-- Recherche client (paiement_client only) -->
        <div v-if="entreeForm.entreeType === 'paiement_client'">
          <label class="block text-xs font-semibold text-slate-600 mb-1.5">Client</label>
          <div class="relative">
            <input
              v-model="clientQuery"
              type="text"
              :disabled="!!editEntreeId"
              placeholder="Rechercher un client…"
              v-bind="inputClass"
              @focus="onClientFocus"
              @input="onClientInput"
              @blur="onClientBlur"
            />
            <div v-if="showClientDropdown"
              class="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              <div v-if="filteredClients.length === 0"
                class="px-3 py-2 text-sm text-slate-400">Aucun client trouvé</div>
              <button v-for="c in filteredClients" :key="c.id" type="button"
                @mousedown.prevent="selectClient(c)"
                class="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                {{ c.name }}
              </button>
            </div>
          </div>
          <p v-if="entreeForm.client_id" class="text-xs text-slate-400 mt-1">
            Client sélectionné : <strong class="text-slate-600">{{ clientQuery }}</strong>
          </p>
        </div>

        <!-- Montant -->
        <FieldGroup label="Montant *">
          <input v-model.number="entreeForm.amount" type="number" min="0" step="0.01" required v-bind="inputClass" />
        </FieldGroup>

        <!-- Description -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1.5">
            Description
            <span class="text-slate-400 font-normal ml-1">(obligatoire si entrée diverse ou aucun client sélectionné)</span>
          </label>
          <input v-model="entreeForm.description" type="text" v-bind="inputClass"
            :required="entreeDescriptionRequired" />
        </div>

        <!-- Date -->
        <FieldGroup label="Date *">
          <input v-model="entreeForm.date" type="date" required v-bind="inputClass" />
        </FieldGroup>

        <!-- Caisse (readonly) -->
        <FieldGroup label="Caisse">
          <input :value="caisse?.name" type="text" readonly
            class="w-full border border-slate-100 rounded-lg px-3 py-2 text-sm text-slate-500 bg-slate-50 cursor-not-allowed" />
        </FieldGroup>

        <ModalFooter @cancel="closeEntree"
          :submit-label="editEntreeId ? 'Mettre à jour' : 'Enregistrer'"
          submit-color="emerald" :loading="submittingTxn" />
      </form>
    </ModalWrapper>

    <!-- Sortie -->
    <ModalWrapper v-if="showSortie" :title="editSortieId ? 'Modifier une sortie' : 'Nouvelle sortie'" @close="closeSortie">
      <form @submit.prevent="submitSortie" class="space-y-4">

        <!-- Montant -->
        <FieldGroup label="Montant *">
          <input v-model.number="sortieForm.amount" type="number" min="0.01" step="0.01" required v-bind="inputClass" />
        </FieldGroup>

        <!-- Description (obligatoire) -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1.5">
            Description
            <span class="text-slate-400 font-normal ml-1">(obligatoire)</span>
          </label>
          <input v-model="sortieForm.description" type="text" required v-bind="inputClass"
            placeholder="Ex : Achat fournitures, loyer…" />
        </div>

        <!-- Justificatif (optionnel) -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1.5">
            Justificatif
            <span class="text-slate-400 font-normal ml-1">(optionnel)</span>
          </label>
          <input type="file" @change="onJustificatifChange"
            class="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200 border border-slate-200 rounded-lg px-2 py-1.5 bg-white" />
          <p v-if="sortieForm.justificatifName" class="text-xs text-slate-400 mt-1">
            Fichier sélectionné : <span class="text-slate-600 font-medium">{{ sortieForm.justificatifName }}</span>
          </p>
        </div>

        <!-- Date -->
        <FieldGroup label="Date *">
          <input v-model="sortieForm.date" type="date" required v-bind="inputClass" />
        </FieldGroup>

        <!-- Caisse (readonly) -->
        <FieldGroup label="Caisse">
          <input :value="caisse?.name" type="text" readonly
            class="w-full border border-slate-100 rounded-lg px-3 py-2 text-sm text-slate-500 bg-slate-50 cursor-not-allowed" />
        </FieldGroup>

        <ModalFooter @cancel="closeSortie"
          :submit-label="editSortieId ? 'Mettre à jour' : 'Enregistrer'"
          submit-color="red" :loading="submittingTxn" />
      </form>
    </ModalWrapper>


    <!-- Transfert entre caisses -->
    <ModalWrapper v-if="showTransfer" title="Transfert entre caisses" @close="showTransfer = false">
      <form @submit.prevent="submitTransfer" class="space-y-4">
        <div class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600">
          <span class="text-slate-400 text-xs">Caisse source</span>
          <p class="font-semibold text-slate-800 mt-0.5">{{ caisse?.name }} ({{ caisse?.currency_code || 'XOF' }})</p>
        </div>
        <FieldGroup label="Caisse destination *">
          <select v-model.number="transferForm.destination_caisse_id" required v-bind="inputClass">
            <option :value="0">— Sélectionner une caisse —</option>
            <option v-for="c in otherCaisses" :key="c.id" :value="c.id">
              {{ c.name }} ({{ c.currency_code || 'XOF' }})
            </option>
          </select>
        </FieldGroup>
        <FieldGroup label="Montant source *">
          <input v-model.number="transferForm.amount_source" type="number" min="0.01" step="0.01" required v-bind="inputClass" />
        </FieldGroup>

        <!-- Section FX : affiché uniquement si les devises diffèrent -->
        <div v-if="showFx" class="border border-slate-200 rounded-lg p-3 space-y-3 bg-amber-50/50">
          <p class="text-xs font-semibold text-amber-700">Conversion de devises</p>
          <FieldGroup label="Taux de change">
            <input v-model.number="transferForm.exchange_rate" type="number" min="0.000001" step="0.000001" v-bind="inputClass" />
          </FieldGroup>
          <FieldGroup label="Montant destination">
            <input v-model.number="transferForm.amount_destination" type="number" min="0.01" step="0.01" v-bind="inputClass" />
          </FieldGroup>
        </div>

        <FieldGroup label="Description (facultative)">
          <input v-model="transferForm.description" type="text" v-bind="inputClass" placeholder="Motif du transfert…" />
        </FieldGroup>
        <FieldGroup label="Date *">
          <input v-model="transferForm.transfer_date" type="date" required v-bind="inputClass" />
        </FieldGroup>
        <ModalFooter @cancel="showTransfer = false" submit-label="Transférer" submit-color="indigo" :loading="submittingTransfer" />
      </form>
    </ModalWrapper>

    <!-- Modifier caisse -->
    <ModalWrapper v-if="showEdit" title="Modifier la caisse" @close="showEdit = false">
      <form @submit.prevent="submitEdit" class="space-y-4">
        <FieldGroup label="Nom *">
          <input v-model="editForm.name" type="text" required v-bind="inputClass" />
        </FieldGroup>
        <FieldGroup label="Type">
          <select v-model="editForm.type" v-bind="inputClass">
            <option value="">— Type —</option>
            <option value="especes">Espèces</option>
            <option value="banque">Banque</option>
            <option value="mobile_money">Mobile Money</option>
          </select>
        </FieldGroup>
        <div class="grid grid-cols-2 gap-3">
          <FieldGroup label="Devise">
            <select v-model="editForm.currency_code" v-bind="inputClass">
              <option value="XOF">XOF</option>
              <option value="XAF">XAF</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Solde initial">
            <input v-model.number="editForm.initial_balance" type="number" min="0" v-bind="inputClass" />
          </FieldGroup>
        </div>
        <label class="flex items-center gap-3 cursor-pointer select-none">
          <div @click="editForm.active = !editForm.active"
            class="relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0"
            :class="editForm.active ? 'bg-blue-600' : 'bg-slate-200'">
            <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
              :class="editForm.active ? 'translate-x-4' : 'translate-x-0'" />
          </div>
          <span class="text-sm text-slate-700">Caisse active</span>
        </label>
        <ModalFooter @cancel="showEdit = false" submit-label="Enregistrer" submit-color="blue" :loading="submittingEdit" />
      </form>
    </ModalWrapper>

    <!-- Corriger paiement client -->
    <ModalWrapper v-if="showCorrectPayment" title="Corriger paiement client" @close="closeCorrectPayment">
      <form @submit.prevent="submitCorrectPayment" class="space-y-4">
        <FieldGroup label="Client">
          <input :value="correctPaymentForm.client_name" type="text" readonly
            class="w-full border border-slate-100 rounded-lg px-3 py-2 text-sm text-slate-500 bg-slate-50 cursor-not-allowed" />
        </FieldGroup>
        <FieldGroup label="Montant *">
          <input v-model.number="correctPaymentForm.amount" type="number" min="0.01" step="0.01" required v-bind="inputClass" />
        </FieldGroup>
        <FieldGroup label="Date *">
          <input v-model="correctPaymentForm.date" type="date" required v-bind="inputClass" />
        </FieldGroup>
        <FieldGroup label="Description (optionnel)">
          <input v-model="correctPaymentForm.description" type="text" v-bind="inputClass" />
        </FieldGroup>
        <FieldGroup label="Motif de correction (optionnel)">
          <input v-model="correctPaymentForm.reason" type="text" v-bind="inputClass" placeholder="Ex : erreur de saisie…" />
        </FieldGroup>
        <div class="flex items-center justify-between pt-1">
          <button type="button" @click="confirmDeletePayment"
            :disabled="submittingCorrectPayment"
            class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50">
            <Trash2Icon :size="13" /> Supprimer
          </button>
          <div class="flex items-center gap-2">
            <button type="button" @click="closeCorrectPayment"
              class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
            <button type="submit" :disabled="submittingCorrectPayment"
              class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              <LoaderIcon v-if="submittingCorrectPayment" :size="13" class="animate-spin" />
              {{ submittingCorrectPayment ? 'En cours…' : 'Corriger' }}
            </button>
          </div>
        </div>
      </form>
    </ModalWrapper>

    <!-- Supprimer transaction -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="pendingDeleteTxn" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" @click="pendingDeleteTxn = null" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div class="p-5">
              <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2Icon :size="18" class="text-red-500" />
              </div>
              <h3 class="text-base font-semibold text-slate-800 mb-1">Supprimer la transaction ?</h3>
              <p class="text-sm text-slate-500">
                <strong class="text-slate-700">{{ pendingDeleteTxn.objet }}</strong> —
                <span :class="pendingDeleteTxn.type === 'entree' ? 'text-emerald-600' : 'text-red-500'">
                  {{ pendingDeleteTxn.type === 'entree' ? '+' : '−' }}{{ formatPrice(pendingDeleteTxn.amount) }}
                </span>
              </p>
            </div>
            <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
              <button @click="pendingDeleteTxn = null"
                class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
              <button @click="doDeleteTxn" :disabled="deletingTxn"
                class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                <LoaderIcon v-if="deletingTxn" :size="13" class="animate-spin" />
                {{ deletingTxn ? 'Suppression…' : 'Supprimer' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, h, defineComponent, type Component } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ArrowLeftIcon, PlusIcon, MinusIcon, PencilIcon, FilterIcon, Trash2Icon,
  LoaderIcon, ChevronLeftIcon, ChevronRightIcon, ArrowRightLeftIcon,
  WalletIcon, BanknoteIcon, BuildingIcon, SmartphoneIcon, XIcon,
  WrenchIcon, PrinterIcon, BanIcon, CheckCircleIcon,
} from 'lucide-vue-next'
import PageHeader from '../../../components/PageHeader.vue'
import { useToastStore } from '../../../stores/toast.store'
import type { Caisse, CaisseTransaction } from '../../../electron.d'

const router = useRouter()
const route  = useRoute()
const toast  = useToastStore()

const caisseId = computed(() => Number(route.params['id']))

// ── Sub-components ─────────────────────────────────────────
const inputClass = { class: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white placeholder-slate-400' }

const FieldGroup = defineComponent({
  props: { label: String },
  setup(props, { slots }) {
    return () => h('div', [
      h('label', { class: 'block text-xs font-semibold text-slate-600 mb-1.5' }, props.label),
      slots.default?.(),
    ])
  },
})

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-600 hover:bg-emerald-700',
  red:     'bg-red-500 hover:bg-red-600',
  amber:   'bg-amber-500 hover:bg-amber-600',
  blue:    'bg-blue-600 hover:bg-blue-700',
  indigo:  'bg-indigo-500 hover:bg-indigo-600',
}

const ModalFooter = defineComponent({
  props: { submitLabel: String, submitColor: { type: String, default: 'blue' }, loading: Boolean },
  emits: ['cancel'],
  setup(props, { emit }) {
    return () => h('div', { class: 'flex items-center justify-end gap-2 pt-1' }, [
      h('button', { type: 'button', onClick: () => emit('cancel'), class: 'px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors' }, 'Annuler'),
      h('button', { type: 'submit', disabled: props.loading, class: `flex items-center gap-2 px-4 py-2 ${colorMap[props.submitColor ?? 'blue']} disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors` }, [
        props.loading ? h(LoaderIcon as Component, { size: 13, class: 'animate-spin' }) : null,
        props.loading ? 'En cours…' : props.submitLabel,
      ]),
    ])
  },
})

const ModalWrapper = defineComponent({
  props: { title: String },
  emits: ['close'],
  setup(props, { slots, emit }) {
    return () => h(
      // Teleport workaround — render inline (parent has stacking context)
      'div',
      { class: 'fixed inset-0 z-50 flex items-center justify-center p-4' },
      [
        h('div', { class: 'absolute inset-0 bg-black/40 backdrop-blur-[2px]', onClick: () => emit('close') }),
        h('div', { class: 'relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden' }, [
          h('div', { class: 'flex items-center justify-between px-5 py-4 border-b border-slate-100' }, [
            h('h3', { class: 'text-base font-semibold text-slate-800' }, props.title),
            h('button', { onClick: () => emit('close'), class: 'text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors' },
              h(XIcon as Component, { size: 16 })),
          ]),
          h('div', { class: 'px-5 py-4' }, slots.default?.()),
        ]),
      ]
    )
  },
})

// ── Caisse ──────────────────────────────────────────────────
const caisse        = ref<Caisse | null>(null)
const loadingCaisse = ref(true)
const summary    = ref({ entrees: 0, sorties: 0, transfers_in: 0, transfers_out: 0 })
const soldeFinal = computed(() =>
  (caisse.value?.initial_balance ?? 0)
  + summary.value.entrees
  + summary.value.transfers_in
  - summary.value.sorties
  - summary.value.transfers_out
)

async function loadCaisse() {
  loadingCaisse.value = true
  try {
    caisse.value  = await window.electron.caisses.get(caisseId.value) ?? null
    if (caisse.value) summary.value = await window.electron.caisse.summary(caisseId.value)
  } catch { toast.show('Impossible de charger la caisse', 'error') }
  finally  { loadingCaisse.value = false }
}

async function refreshSummary() {
  summary.value = await window.electron.caisse.summary(caisseId.value)
}

// ── Transactions ─────────────────────────────────────────────
interface TxnWithBalance extends CaisseTransaction { running_balance: number }

const allTransactions  = ref<TxnWithBalance[]>([])
const pageTransactions = ref<TxnWithBalance[]>([])
const loadingTxns      = ref(false)
const currentPage      = ref(1)
const filters = ref({ start_date: '', end_date: '', type: '', per_page: 15 })

const lastPage = computed(() =>
  Math.max(1, Math.ceil(allTransactions.value.length / filters.value.per_page))
)
const visiblePages = computed(() => {
  const pages: number[] = []
  for (let p = Math.max(1, currentPage.value - 2); p <= Math.min(lastPage.value, currentPage.value + 2); p++) pages.push(p)
  return pages
})
const pageOpeningBalance = computed(() => {
  const idx = (currentPage.value - 1) * filters.value.per_page
  if (idx === 0) return caisse.value?.initial_balance ?? 0
  return allTransactions.value[idx - 1]?.running_balance ?? 0
})
const pageClosingBalance = computed(() => {
  const end = Math.min(currentPage.value * filters.value.per_page, allTransactions.value.length)
  return end === 0 ? (caisse.value?.initial_balance ?? 0) : (allTransactions.value[end - 1]?.running_balance ?? 0)
})

function isTransfer(t: CaisseTransaction): boolean {
  const o = (t.objet ?? '').toLowerCase()
  return o.startsWith('transfert vers') || o.startsWith('transfert de')
}

function isPaymentClient(t: CaisseTransaction): boolean {
  if (t.payment_id) return true
  return (t.objet ?? '').toLowerCase().startsWith('paiement')
}

function computeRunningBalance(txns: CaisseTransaction[]): TxnWithBalance[] {
  let bal = caisse.value?.initial_balance ?? 0
  return txns.map((t) => { bal += t.type === 'entree' ? t.amount : -t.amount; return { ...t, running_balance: bal } })
}

function sliceTransactions() {
  const s = (currentPage.value - 1) * filters.value.per_page
  pageTransactions.value = allTransactions.value.slice(s, s + filters.value.per_page)
}

function goToPage(p: number) {
  currentPage.value = Math.max(1, Math.min(p, lastPage.value))
  sliceTransactions()
}

async function loadTransactions() {
  loadingTxns.value = true
  try {
    const params: Record<string, unknown> = {}
    if (filters.value.start_date) params['start_date'] = filters.value.start_date
    if (filters.value.end_date)   params['end_date']   = filters.value.end_date
    if (filters.value.type)       params['type']        = filters.value.type
    const raw = await window.electron.caisse.listByCaisse(caisseId.value, params)
    allTransactions.value = computeRunningBalance(raw)
    currentPage.value = lastPage.value
    sliceTransactions()
  } catch { toast.show('Impossible de charger les transactions', 'error') }
  finally  { loadingTxns.value = false }
}

function applyFilters() { currentPage.value = 1; loadTransactions() }

// ── Nouvelle entrée ──────────────────────────────────────────
const showEntree    = ref(false)
const submittingTxn = ref(false)
const editEntreeId  = ref<number | null>(null)
const entreeForm = ref({
  entreeType: 'paiement_client' as 'paiement_client' | 'entree_diverse',
  client_id:   null as number | null,
  amount:      0,
  description: '',
  date:        today(),
})

// Client typeahead
const allClients         = ref<{ id: number; name: string }[]>([])
const clientQuery        = ref('')
const showClientDropdown = ref(false)

const filteredClients = computed(() => {
  const q = clientQuery.value.toLowerCase().trim()
  if (!q) return allClients.value.slice(0, 40)
  return allClients.value.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 40)
})

const entreeDescriptionRequired = computed(() =>
  entreeForm.value.entreeType === 'entree_diverse' || !entreeForm.value.client_id
)

async function loadClients() {
  if (allClients.value.length) return
  try {
    const res = await window.electron.clients.list({ per_page: 500 })
    allClients.value = res.data
  } catch { /* silent */ }
}

function onClientFocus() { loadClients(); showClientDropdown.value = true }
function onClientInput()  {
  entreeForm.value.client_id = null
  showClientDropdown.value = true
}
function onClientBlur()   { setTimeout(() => { showClientDropdown.value = false }, 150) }
function selectClient(c: { id: number; name: string }) {
  entreeForm.value.client_id = c.id
  clientQuery.value          = c.name
  showClientDropdown.value   = false
}

function openEntreeModal() {
  editEntreeId.value  = null
  clientQuery.value   = ''
  entreeForm.value    = { entreeType: 'paiement_client', client_id: null, amount: 0, description: '', date: today() }
  showEntree.value    = true
  loadClients()
}

function openEditEntreeModal(t: TxnWithBalance) {
  editEntreeId.value  = t.id
  clientQuery.value   = ''
  entreeForm.value    = { entreeType: 'entree_diverse', client_id: null, amount: t.amount, description: t.objet ?? '', date: t.date.slice(0, 10) }
  showEntree.value    = true
}

function closeEntree() { showEntree.value = false; editEntreeId.value = null }

async function submitEntree() {
  if (entreeForm.value.entreeType === 'paiement_client' && !entreeForm.value.client_id) {
    toast.show('Veuillez sélectionner un client', 'error'); return
  }
  submittingTxn.value = true
  try {
    if (editEntreeId.value) {
      // Modification d'une entrée diverse
      await window.electron.caisse.update(editEntreeId.value, {
        objet: entreeForm.value.description, amount: entreeForm.value.amount, date: entreeForm.value.date,
      })
      toast.show('Entrée modifiée')
    } else if (entreeForm.value.entreeType === 'paiement_client') {
      // Crée un paiement client + transaction caisse liée par payment_id
      const client = allClients.value.find((c) => c.id === entreeForm.value.client_id)
      const payment = await window.electron.payments.create({ client_id: entreeForm.value.client_id!, amount: entreeForm.value.amount, date: entreeForm.value.date })
      await window.electron.caisse.create({
        type: 'entree', caisse_id: caisseId.value,
        objet: `Paiement ${client?.name ?? ''}`.trim(),
        description: entreeForm.value.description || null,
        amount: entreeForm.value.amount, date: entreeForm.value.date,
        payment_id: payment.id,
      })
      toast.show('Paiement client enregistré')
    } else {
      await window.electron.caisse.create({
        type: 'entree', caisse_id: caisseId.value,
        objet: entreeForm.value.description, amount: entreeForm.value.amount, date: entreeForm.value.date,
      })
      toast.show('Entrée enregistrée')
    }
    closeEntree()
    await Promise.all([loadTransactions(), refreshSummary()])
  } catch { toast.show("Impossible d'enregistrer l'entrée", 'error') }
  finally  { submittingTxn.value = false }
}

// ── Nouvelle sortie ──────────────────────────────────────────
const showSortie   = ref(false)
const editSortieId = ref<number | null>(null)
const sortieForm   = ref({ amount: 0, description: '', date: today(), justificatifName: '' })

function onJustificatifChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  sortieForm.value.justificatifName = file?.name ?? ''
}

function openSortieModal() {
  editSortieId.value = null
  sortieForm.value   = { amount: 0, description: '', date: today(), justificatifName: '' }
  showSortie.value   = true
}

function openEditSortieModal(t: TxnWithBalance) {
  editSortieId.value = t.id
  sortieForm.value   = { amount: t.amount, description: t.objet ?? '', date: t.date.slice(0, 10), justificatifName: '' }
  showSortie.value   = true
}

function closeSortie() { showSortie.value = false; editSortieId.value = null }

async function submitSortie() {
  submittingTxn.value = true
  try {
    if (editSortieId.value) {
      await window.electron.caisse.update(editSortieId.value, {
        objet: sortieForm.value.description, amount: sortieForm.value.amount, date: sortieForm.value.date,
      })
      toast.show('Sortie modifiée')
    } else {
      await window.electron.caisse.create({
        type: 'sortie', caisse_id: caisseId.value,
        objet: sortieForm.value.description, amount: sortieForm.value.amount, date: sortieForm.value.date,
      })
      toast.show('Sortie enregistrée')
    }
    closeSortie()
    await Promise.all([loadTransactions(), refreshSummary()])
  } catch { toast.show("Impossible d'enregistrer la sortie", 'error') }
  finally  { submittingTxn.value = false }
}


// ── Transfert ────────────────────────────────────────────────
const showTransfer       = ref(false)
const submittingTransfer = ref(false)
const allCaisses         = ref<Caisse[]>([])
const otherCaisses       = computed(() => allCaisses.value.filter((c) => c.id !== caisseId.value))
const transferForm = ref({
  destination_caisse_id: 0,
  amount_source:         0,
  exchange_rate:         null as number | null,
  amount_destination:    null as number | null,
  transfer_date:         today(),
  description:           '',
})

const showFx = computed(() => {
  const dest = allCaisses.value.find((c) => c.id === transferForm.value.destination_caisse_id)
  if (!dest) return false
  return (dest.currency_code || 'XOF') !== (caisse.value?.currency_code || 'XOF')
})

watch(() => [showFx.value, transferForm.value.amount_source, transferForm.value.exchange_rate] as const,
  ([fx, amt, rate]) => {
    if (fx && amt && rate && amt > 0 && rate > 0) {
      transferForm.value.amount_destination = Number((amt * rate).toFixed(2))
    }
  }
)

async function openTransferModal() {
  transferForm.value = { destination_caisse_id: 0, amount_source: 0, exchange_rate: null, amount_destination: null, transfer_date: today(), description: '' }
  showTransfer.value = true
  if (!allCaisses.value.length) {
    try { allCaisses.value = await window.electron.caisses.list() } catch { /* silent */ }
  }
}

async function submitTransfer() {
  if (!transferForm.value.destination_caisse_id) { toast.show('Sélectionnez la caisse destination', 'error'); return }
  if (!transferForm.value.amount_source || transferForm.value.amount_source <= 0) { toast.show('Montant source invalide', 'error'); return }
  if (transferForm.value.destination_caisse_id === caisseId.value) { toast.show('La caisse destination doit être différente de la source', 'error'); return }
  if (showFx.value) {
    if (!transferForm.value.exchange_rate || transferForm.value.exchange_rate <= 0) { toast.show('Le taux de change est obligatoire', 'error'); return }
    if (!transferForm.value.amount_destination || transferForm.value.amount_destination <= 0) { toast.show('Le montant destination est obligatoire', 'error'); return }
  }
  if (transferForm.value.amount_source > soldeFinal.value) {
    toast.show('Solde insuffisant dans la caisse source', 'error'); return
  }
  submittingTransfer.value = true
  try {
    await window.electron.caisse.transfer({
      source_caisse_id:      caisseId.value,
      destination_caisse_id: transferForm.value.destination_caisse_id,
      amount_source:         transferForm.value.amount_source,
      exchange_rate:         showFx.value ? (transferForm.value.exchange_rate ?? null) : null,
      amount_destination:    showFx.value ? (transferForm.value.amount_destination ?? null) : null,
      description:           transferForm.value.description || undefined,
      transfer_date:         transferForm.value.transfer_date,
    })
    toast.show('Transfert effectué')
    showTransfer.value = false
    await Promise.all([loadTransactions(), refreshSummary()])
  } catch { toast.show('Impossible d\'effectuer le transfert', 'error') }
  finally  { submittingTransfer.value = false }
}

// ── Supprimer transaction ────────────────────────────────────
const pendingDeleteTxn = ref<TxnWithBalance | null>(null)
const deletingTxn      = ref(false)

function confirmDeleteTxn(t: TxnWithBalance) { pendingDeleteTxn.value = t }

async function doDeleteTxn() {
  if (!pendingDeleteTxn.value) return
  deletingTxn.value = true
  try {
    await window.electron.caisse.delete(pendingDeleteTxn.value.id)
    toast.show('Transaction supprimée')
    pendingDeleteTxn.value = null
    await Promise.all([loadTransactions(), refreshSummary()])
  } catch { toast.show('Suppression impossible', 'error') }
  finally  { deletingTxn.value = false }
}

// ── Modifier caisse ──────────────────────────────────────────
const showEdit       = ref(false)
const submittingEdit = ref(false)
const editForm = ref({ name: '', type: '' as Caisse['type'] | '', currency_code: 'XOF', initial_balance: 0, active: true })

function openEditModal() {
  if (!caisse.value) return
  editForm.value = { name: caisse.value.name, type: caisse.value.type ?? '', currency_code: caisse.value.currency_code ?? 'XOF', initial_balance: caisse.value.initial_balance ?? 0, active: !!caisse.value.active }
  showEdit.value = true
}

async function submitEdit() {
  submittingEdit.value = true
  try {
    await window.electron.caisses.update(caisseId.value, { ...editForm.value, type: editForm.value.type || null })
    toast.show('Caisse mise à jour')
    showEdit.value = false
    await loadCaisse()
  } catch { toast.show('Impossible de mettre à jour la caisse', 'error') }
  finally  { submittingEdit.value = false }
}

// ── Corriger paiement client ─────────────────────────────────
const showCorrectPayment       = ref(false)
const submittingCorrectPayment = ref(false)
const correctPaymentForm = ref({
  transaction_id: 0,
  client_name:    '',
  amount:         0,
  date:           today(),
  description:    '',
  reason:         '',
})

function openCorrectPaymentModal(t: TxnWithBalance) {
  const clientName = t.objet?.replace(/^Paiement\s*/i, '') ?? ''
  correctPaymentForm.value = {
    transaction_id: t.id,
    client_name:    clientName,
    amount:         t.amount,
    date:           t.date.slice(0, 10),
    description:    t.description ?? '',
    reason:         '',
  }
  showCorrectPayment.value = true
}

function closeCorrectPayment() { showCorrectPayment.value = false; submittingCorrectPayment.value = false }

async function submitCorrectPayment() {
  submittingCorrectPayment.value = true
  try {
    await window.electron.caisse.correctPayment({
      transaction_id: correctPaymentForm.value.transaction_id,
      amount:         correctPaymentForm.value.amount,
      date:           correctPaymentForm.value.date,
      description:    correctPaymentForm.value.description || null,
      reason:         correctPaymentForm.value.reason || null,
    })
    toast.show('Paiement corrigé')
    closeCorrectPayment()
    await Promise.all([loadTransactions(), refreshSummary()])
  } catch { toast.show('Impossible de corriger le paiement', 'error') }
  finally  { submittingCorrectPayment.value = false }
}

async function confirmDeletePayment() {
  if (!confirm('Supprimer ce paiement ? Le paiement client et la transaction seront supprimés.')) return
  submittingCorrectPayment.value = true
  try {
    await window.electron.caisse.deletePayment(correctPaymentForm.value.transaction_id)
    toast.show('Paiement supprimé')
    closeCorrectPayment()
    await Promise.all([loadTransactions(), refreshSummary()])
  } catch { toast.show('Suppression impossible', 'error') }
  finally  { submittingCorrectPayment.value = false }
}

// ── Toggle actif ──────────────────────────────────────────────
async function toggleActive() {
  if (!caisse.value) return
  const next = !caisse.value.active
  try {
    await window.electron.caisses.update(caisseId.value, { active: next ? 1 : 0 })
    caisse.value = { ...caisse.value, active: next }
    toast.show(next ? 'Caisse activée' : 'Caisse désactivée')
  } catch { toast.show('Impossible de modifier le statut', 'error') }
}

// ── Impression ────────────────────────────────────────────────
function printPage() { window.electron.print() }

// ── Helpers ──────────────────────────────────────────────────
function today(): string { return new Date().toISOString().split('T')[0]! }

function formatPrice(n: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(Number(n || 0))
}

function formatDate(d: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function labelType(t: string | null): string {
  const n = (t ?? '').toLowerCase()
  if (n === 'especes')      return 'Espèces'
  if (n === 'banque')       return 'Banque'
  if (n === 'mobile_money') return 'Mobile Money'
  return t || 'Non défini'
}

function iconFor(t: string | null): Component {
  const n = (t ?? '').toLowerCase()
  if (n === 'especes')      return BanknoteIcon
  if (n === 'banque')       return BuildingIcon
  if (n === 'mobile_money') return SmartphoneIcon
  return WalletIcon
}

function iconBg(t: string | null): string {
  const n = (t ?? '').toLowerCase()
  if (n === 'especes')      return 'bg-emerald-100 text-emerald-600'
  if (n === 'banque')       return 'bg-blue-100 text-blue-600'
  if (n === 'mobile_money') return 'bg-amber-100 text-amber-600'
  return 'bg-slate-100 text-slate-500'
}

onMounted(async () => { await loadCaisse(); await loadTransactions() })
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.18s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; }
</style>
