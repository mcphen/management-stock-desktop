<template>
  <div class="flex h-screen overflow-hidden bg-slate-50">

    <!-- ══ Sidebar ══════════════════════════════════════════ -->
    <aside
      class="flex flex-col flex-shrink-0 border-r border-white/5"
      style="width:240px; background:#0f172a;"
    >

      <!-- Logo -->
      <div class="flex items-center gap-3 px-4 py-4 border-b" style="border-color:rgba(255,255,255,0.07)">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
          style="background:linear-gradient(135deg,#3b82f6,#1d4ed8)"
        >S</div>
        <div class="min-w-0">
          <p class="text-sm font-bold text-white leading-tight">SAMABOIS</p>
          <p class="text-[11px] text-slate-500 mt-0.5">
            Gestion de stock<span v-if="appVersion"> - v{{ appVersion }}</span>
          </p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-2 py-3 overflow-y-auto space-y-0.5 text-[13px]">

        <SidebarGroup
          label="Tableaux de bord"
          :icon="LayoutDashboardIcon"
          name="dashboard"
          :active="activeMenu === 'dashboard'"
          @toggle="toggleMenu('dashboard')"
        >
          <SidebarLink to="/dashboard"         label="Vue générale" />
          <SidebarLink to="/dashboard/stock"   label="Stock" />
          <SidebarLink to="/dashboard/clients" label="Clients & Comptabilité" />
          <SidebarLink to="/dashboard/caisse"  label="Caisse & Trésorerie" />
        </SidebarGroup>

        <SidebarGroup
          label="Gestion des stocks"
          :icon="PackageIcon"
          name="stocks"
          :active="activeMenu === 'stocks'"
          @toggle="toggleMenu('stocks')"
        >
          <SidebarLink to="/articles/create"      label="Ajouter un stock" />
          <SidebarLink to="/articles"             label="Liste du stock" />
          <SidebarLink to="/articles/vue-globale" label="Vue globale" />
        </SidebarGroup>

        <SidebarGroup
          label="Factures"
          :icon="FileTextIcon"
          name="invoices"
          :active="activeMenu === 'invoices'"
          @toggle="toggleMenu('invoices')"
        >
          <SidebarLink to="/invoices/create" label="Nouvelle facture" />
          <SidebarLink to="/invoices"        label="Liste des factures" />
        </SidebarGroup>

        <SidebarGroup
          label="Clients"
          :icon="UsersIcon"
          name="clients"
          :active="activeMenu === 'clients'"
          @toggle="toggleMenu('clients')"
        >
          <SidebarLink to="/clients"         label="Liste des clients" />
          <SidebarLink to="/clients/comptes" label="Comptes clients" />
        </SidebarGroup>

        <SidebarGroup
          label="Finances"
          :icon="LandmarkIcon"
          name="finances"
          :active="activeMenu === 'finances'"
          @toggle="toggleMenu('finances')"
        >
          <SidebarLink to="/caisse"              label="Caisse" />
          <SidebarLink to="/caisse/historique"   label="Historique" />
          <SidebarLink to="/caisse/transfers"    label="Transferts" />
          <SidebarLink to="/depenses-mensuelles" label="Dépenses mensuelles" />
        </SidebarGroup>

      </nav>

      <!-- Bottom bar -->
      <div class="border-t px-3 py-3 space-y-1" style="border-color:rgba(255,255,255,0.07)">

        <!-- Paramètres -->
        <RouterLink
          to="/settings"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left"
          :class="route.path === '/settings' ? 'bg-white/10 text-slate-200' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'"
        >
          <SettingsIcon :size="13" class="flex-shrink-0" />
          <span class="text-[11px]">Paramètres</span>
        </RouterLink>

        <!-- Sync button -->
        <button
          @click="sync.syncNow()"
          :disabled="!sync.isOnline || sync.syncState === 'syncing'"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left disabled:opacity-40"
          :class="sync.isOnline ? 'hover:bg-white/8' : ''"
          :title="sync.lastSyncedAt ? `Dernière sync: ${formatDate(sync.lastSyncedAt)}` : 'Jamais synchronisé'"
        >
          <span
            class="w-2 h-2 rounded-full flex-shrink-0 ring-2"
            :class="sync.isOnline ? 'bg-emerald-400 ring-emerald-400/30' : 'bg-slate-600 ring-slate-600/30'"
          ></span>
          <span class="text-[11px] text-slate-400 flex-1 truncate">{{ sync.statusLabel }}</span>
          <span
            v-if="sync.pendingCount > 0"
            class="text-[10px] font-bold bg-amber-500 text-black rounded-full px-1.5 py-0.5 leading-none"
          >{{ sync.pendingCount }}</span>
        </button>

        <!-- User + logout -->
        <div class="flex items-center gap-2.5 px-3 py-2 rounded-lg">
          <div
            class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style="background:linear-gradient(135deg,#6366f1,#4f46e5)"
          >
            {{ auth.user?.name?.charAt(0)?.toUpperCase() ?? '?' }}
          </div>
          <span class="text-[11px] text-slate-400 flex-1 truncate min-w-0">{{ auth.user?.name }}</span>
          <button
            @click="auth.logout(router)"
            title="Déconnexion"
            class="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 p-0.5 rounded"
          >
            <LogOutIcon :size="13" />
          </button>
        </div>

      </div>
    </aside>

    <!-- ══ Main content ══════════════════════════════════════ -->
    <main class="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
      <Transition name="slide-down">
        <div
          v-if="sessionExpiredVisible"
          class="bg-red-600 text-white text-sm text-center py-2.5 px-4 font-medium"
        >
          Session expirée — redirection vers la page de connexion…
        </div>
      </Transition>
      <UpdateBanner />
      <RouterView v-slot="{ Component, route }" class="flex-1">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>

  </div>
</template>

<script setup lang="ts">
import { ref, watch, defineComponent, h, type PropType, type Component } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { onMounted, onUnmounted } from 'vue'
import {
  LayoutDashboardIcon,
  PackageIcon,
  FileTextIcon,
  UsersIcon,
  LandmarkIcon,
  ChevronDownIcon,
  LogOutIcon,
  Settings2Icon as SettingsIcon,
} from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth.store'
import { useSyncStore } from '../stores/sync.store'
import UpdateBanner from '../components/UpdateBanner.vue'

const auth   = useAuthStore()
const sync   = useSyncStore()
const route  = useRoute()
const router = useRouter()

const sessionExpiredVisible = ref(false)
const appVersion = ref('')

// ── Active menu detection ──────────────────────────────────
const activeMenu = ref<string | null>(null)

const routeMenuMap: [string, string][] = [
  ['/dashboard',           'dashboard'],
  ['/articles',            'stocks'],
  ['/invoices',            'invoices'],
  ['/clients',             'clients'],
  ['/caisse',              'finances'],
  ['/depenses-mensuelles', 'finances'],
]

function detectMenu(path: string) {
  for (const [prefix, menu] of routeMenuMap) {
    if (path === prefix || path.startsWith(prefix + '/')) {
      activeMenu.value = menu
      return
    }
  }
}

watch(() => route.path, detectMenu, { immediate: true })

function toggleMenu(name: string) {
  activeMenu.value = activeMenu.value === name ? null : name
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR')
}

onMounted(() => {
  sync.init()
  window.electron.settings.get()
    .then((info) => { appVersion.value = info.version })
    .catch(() => { appVersion.value = '' })

  window.electron.on('auth:expired', () => {
    sessionExpiredVisible.value = true
    setTimeout(() => {
      sessionExpiredVisible.value = false
      auth.logout(router)
    }, 3000)
  })
})

onUnmounted(() => {
  sync.cleanup()
})

// ── SidebarGroup ───────────────────────────────────────────
const SidebarGroup = defineComponent({
  props: {
    label:  String,
    icon:   [Object, Function] as PropType<Component>,
    name:   String,
    active: Boolean,
  },
  emits: ['toggle'],
  setup(props, { emit, slots }) {
    return () => h('div', { class: 'mb-px' }, [

      // Group header button
      h('button', {
        onClick: () => emit('toggle'),
        class: [
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-left',
          props.active
            ? 'bg-blue-600/15 text-blue-400'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        ].join(' '),
      }, [
        props.icon
          ? h(props.icon as Component, {
              size: 15,
              strokeWidth: 1.75,
              class: 'flex-shrink-0',
            })
          : null,
        h('span', { class: 'flex-1 font-medium text-[12px] leading-none' }, props.label),
        h(ChevronDownIcon, {
          size: 13,
          strokeWidth: 2,
          class: 'flex-shrink-0 transition-transform duration-200 ' + (props.active ? 'rotate-180' : ''),
        }),
      ]),

      // Sub-links
      props.active
        ? h('div', {
            class: 'ml-[22px] mt-0.5 pl-3 border-l border-white/10 space-y-px pb-1',
          }, slots.default?.())
        : null,
    ])
  },
})

// ── SidebarLink ────────────────────────────────────────────

const SidebarLink = defineComponent({
  props: { to: String, label: String },
  setup(props) {
    return () => {
      const isActive = route.path === props.to
      return h(RouterLink, {
        to: props.to!,
        class: [
          'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition-all duration-100',
          isActive
            ? 'bg-blue-600 text-white font-semibold shadow-sm'
            : 'text-slate-500 hover:text-slate-200 hover:bg-white/5',
        ].join(' '),
      }, () => [
        h('span', {
          class: [
            'w-1 h-1 rounded-full flex-shrink-0',
            isActive ? 'bg-white' : 'bg-slate-600',
          ].join(' '),
        }),
        props.label,
      ])
    }
  },
})
</script>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.25s ease; }
.slide-down-enter-from, .slide-down-leave-to       { opacity: 0; transform: translateY(-100%); }
</style>
