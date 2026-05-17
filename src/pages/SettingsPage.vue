<template>
  <div class="p-6 max-w-2xl">
    <h2 class="text-xl font-bold text-gray-900 mb-6">Paramètres</h2>

    <!-- Connexion serveur -->
    <section class="bg-white border rounded-xl p-5 mb-4">
      <h3 class="font-semibold text-gray-800 mb-1">Connexion au serveur</h3>
      <p class="text-xs text-gray-400 mb-4">
        URL de base de l'API Laravel (sans slash final).<br />
        Exemple : <code class="bg-gray-100 px-1 rounded">https://monserveur.com/api/v1</code>
      </p>

      <div class="flex gap-2">
        <input
          v-model="serverUrl"
          type="url"
          placeholder="http://monserveur.com/api/v1"
          class="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          @keydown.enter="save"
        />
        <button
          @click="testConnection"
          :disabled="isTesting"
          class="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          {{ isTesting ? '…' : 'Tester' }}
        </button>
        <button
          @click="save"
          :disabled="isSaving"
          class="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors"
        >
          Enregistrer
        </button>
      </div>

      <!-- Résultat du test -->
      <Transition name="fade">
        <p v-if="testResult !== null" class="mt-2 text-xs flex items-center gap-1.5"
           :class="testResult ? 'text-emerald-600' : 'text-red-500'">
          <span>{{ testResult ? '✓' : '✗' }}</span>
          <span>{{ testResult ? 'Serveur accessible' : 'Serveur inaccessible — vérifiez l\'URL et que le serveur est démarré' }}</span>
        </p>
      </Transition>

      <!-- Confirmation enregistrement -->
      <Transition name="fade">
        <p v-if="saveSuccess" class="mt-2 text-xs text-emerald-600 flex items-center gap-1.5">
          <span>✓</span> URL enregistrée. La prochaine synchronisation utilisera ce serveur.
        </p>
      </Transition>

      <Transition name="fade">
        <p v-if="saveError" class="mt-2 text-xs text-red-500">{{ saveError }}</p>
      </Transition>
    </section>

    <!-- À propos / version -->
    <section class="bg-white border rounded-xl p-5">
      <h3 class="font-semibold text-gray-800 mb-3">Application</h3>

      <dl class="text-sm space-y-2">
        <div class="flex justify-between">
          <dt class="text-gray-500">Application</dt>
          <dd class="font-medium text-gray-800">{{ appInfo?.appName ?? '—' }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-gray-500">Version installée</dt>
          <dd class="font-mono font-medium text-gray-800">v{{ appInfo?.version ?? '—' }}</dd>
        </div>
        <div class="flex justify-between items-center">
          <dt class="text-gray-500">Fichier de logs</dt>
          <dd class="flex items-center gap-2">
            <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-xs">{{ appInfo?.logPath ?? '—' }}</code>
            <button
              @click="openLogFolder"
              class="text-xs text-primary-600 hover:text-primary-700 flex-shrink-0"
              title="Ouvrir le dossier des logs"
            >
              Ouvrir
            </button>
          </dd>
        </div>
      </dl>

      <div class="mt-4 pt-4 border-t flex items-center gap-3">
        <button
          @click="checkUpdate"
          :disabled="isCheckingUpdate"
          class="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-40 transition-colors"
        >
          {{ isCheckingUpdate ? 'Vérification…' : 'Vérifier les mises à jour' }}
        </button>
        <span v-if="updateResult !== null" class="text-xs"
              :class="updateResult.available ? 'text-emerald-600' : 'text-gray-400'">
          {{ updateResult.available
            ? `Mise à jour disponible : v${updateResult.version}`
            : updateResult.devMode ? 'Mode développement' : 'Application à jour' }}
        </span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const serverUrl        = ref('')
const isTesting        = ref(false)
const isSaving         = ref(false)
const isCheckingUpdate = ref(false)
const testResult       = ref<boolean | null>(null)
const saveSuccess      = ref(false)
const saveError        = ref('')
const updateResult     = ref<{ available: boolean; version?: string; devMode?: boolean } | null>(null)
const appInfo          = ref<{ serverUrl: string; version: string; appName: string } | null>(null)

onMounted(async () => {
  appInfo.value   = await window.electron.settings.get()
  serverUrl.value = appInfo.value.serverUrl
})

async function testConnection(): Promise<void> {
  isTesting.value  = true
  testResult.value = null
  const { online } = await window.electron.settings.testConnection(serverUrl.value)
  testResult.value = online
  isTesting.value  = false
}

async function save(): Promise<void> {
  isSaving.value   = true
  saveSuccess.value = false
  saveError.value  = ''
  const result = await window.electron.settings.setServerUrl(serverUrl.value)
  if (result.success) {
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 4000)
  } else {
    saveError.value = result.error ?? 'Erreur inconnue'
  }
  isSaving.value = false
}

function openLogFolder(): void {
  window.electron.settings.openLogFolder()
}

async function checkUpdate(): Promise<void> {
  isCheckingUpdate.value = true
  updateResult.value     = null
  updateResult.value     = await window.electron.updater.check()
  isCheckingUpdate.value = false
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
