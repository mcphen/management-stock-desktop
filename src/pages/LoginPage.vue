<template>
  <div class="min-h-screen flex bg-slate-100">

    <!-- Panneau gauche décoratif -->
    <div class="hidden lg:flex flex-col justify-between w-1/2 bg-gray-900 text-white p-12">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center font-bold text-xl">S</div>
        <span class="text-xl font-bold tracking-tight">SAMABOIS</span>
      </div>
      <div>
        <p class="text-3xl font-bold leading-snug text-white mb-3">
          Gestion de stock<br />hors ligne & en ligne
        </p>
        <p class="text-gray-400 text-sm leading-relaxed">
          Vos données sont synchronisées automatiquement avec le serveur dès que la connexion est disponible.
        </p>
      </div>
      <p class="text-gray-600 text-xs">© {{ year }} SAMABOIS</p>
    </div>

    <!-- Panneau droit formulaire -->
    <div class="flex-1 flex items-center justify-center p-8">
      <div class="w-full max-w-sm">

        <!-- Logo mobile -->
        <div class="lg:hidden flex items-center gap-2 mb-8">
          <div class="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center font-bold text-white">S</div>
          <span class="font-bold text-gray-900">SAMABOIS</span>
        </div>

        <h2 class="text-2xl font-bold text-gray-900 mb-1">Connexion</h2>
        <p class="text-sm text-gray-500 mb-8">Accédez à votre espace de gestion</p>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Adresse e-mail</label>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="field"
              placeholder="votre@email.com"
              :disabled="auth.isLoading"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                class="field pr-10"
                placeholder="••••••••"
                :disabled="auth.isLoading"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                @click="showPassword = !showPassword"
                tabindex="-1"
              >{{ showPassword ? 'Cacher' : 'Voir' }}</button>
            </div>
          </div>

          <Transition name="page">
            <div v-if="auth.error" class="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <span class="flex-shrink-0 mt-0.5">⚠</span>
              <span>{{ auth.error }}</span>
            </div>
          </Transition>

          <button
            type="submit"
            :disabled="auth.isLoading"
            class="btn btn-primary w-full justify-center py-2.5"
          >
            <span v-if="auth.isLoading" class="flex items-center gap-2">
              <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-dashoffset="10" />
              </svg>
              Connexion en cours…
            </span>
            <span v-else>Se connecter</span>
          </button>
        </form>

        <!-- Statut réseau + config URL -->
        <div class="mt-8 space-y-3">
          <div class="flex items-center gap-2 text-xs text-gray-400">
            <span class="w-2 h-2 rounded-full flex-shrink-0" :class="isOnline ? 'bg-emerald-400' : 'bg-slate-300'"></span>
            <span>{{ isOnline ? `Serveur accessible` : 'Hors ligne — une connexion est requise pour la première utilisation' }}</span>
          </div>

          <!-- Config serveur collapsible -->
          <div class="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              @click="showServerConfig = !showServerConfig"
              class="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <span>Configurer l'URL du serveur</span>
              <span class="transition-transform" :class="showServerConfig ? 'rotate-180' : ''">▾</span>
            </button>
            <div v-if="showServerConfig" class="px-3 pb-3 space-y-2 border-t border-gray-100 bg-gray-50">
              <p class="text-[11px] text-gray-400 pt-2">
                URL actuelle : <code class="bg-white px-1 rounded border">{{ currentServerUrl }}</code>
              </p>
              <div class="flex gap-2">
                <input
                  v-model="newServerUrl"
                  type="url"
                  placeholder="http://monserveur.com/api/v1"
                  class="flex-1 border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  type="button"
                  @click="applyServerUrl"
                  :disabled="isApplyingUrl"
                  class="px-3 py-1.5 bg-primary-600 text-white text-xs rounded hover:bg-primary-700 disabled:opacity-40"
                >
                  {{ isApplyingUrl ? '…' : 'OK' }}
                </button>
              </div>
              <p v-if="urlFeedback" class="text-[11px]" :class="urlFeedbackOk ? 'text-emerald-600' : 'text-red-500'">
                {{ urlFeedback }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'

const auth           = useAuthStore()
const router         = useRouter()
const email          = ref('')
const password       = ref('')
const showPassword   = ref(false)
const isOnline       = ref(false)
const year           = new Date().getFullYear()

const showServerConfig = ref(false)
const currentServerUrl = ref('')
const newServerUrl     = ref('')
const isApplyingUrl    = ref(false)
const urlFeedback      = ref('')
const urlFeedbackOk    = ref(false)

onMounted(async () => {
  const [status, settings] = await Promise.all([
    window.electron.sync.getStatus(),
    window.electron.settings.get(),
  ])
  isOnline.value       = status.isOnline
  currentServerUrl.value = settings.serverUrl
  newServerUrl.value   = settings.serverUrl
})

async function applyServerUrl(): Promise<void> {
  isApplyingUrl.value = true
  urlFeedback.value   = ''
  const result = await window.electron.settings.setServerUrl(newServerUrl.value)
  if (result.success) {
    currentServerUrl.value = newServerUrl.value
    urlFeedbackOk.value    = true
    urlFeedback.value      = 'URL enregistrée. Test de connexion…'
    const { online } = await window.electron.settings.testConnection(newServerUrl.value)
    isOnline.value   = online
    urlFeedback.value = online ? 'Serveur accessible ✓' : 'URL enregistrée mais serveur inaccessible'
  } else {
    urlFeedbackOk.value = false
    urlFeedback.value   = result.error ?? 'URL invalide'
  }
  isApplyingUrl.value = false
}

async function handleLogin(): Promise<void> {
  try {
    await auth.login(email.value, password.value)
    router.push('/dashboard')
  } catch { /* error in auth.error */ }
}
</script>
