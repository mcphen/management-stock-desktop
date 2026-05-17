import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../pages/LoginPage.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('../layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },

        // Tableaux de bord
        { path: 'dashboard',         name: 'dashboard',         component: () => import('../pages/DashboardPage.vue') },
        { path: 'dashboard/stock',   name: 'dashboard-stock',   component: () => import('../pages/PlaceholderPage.vue') },
        { path: 'dashboard/clients', name: 'dashboard-clients', component: () => import('../pages/PlaceholderPage.vue') },
        { path: 'dashboard/caisse',  name: 'dashboard-caisse',  component: () => import('../pages/PlaceholderPage.vue') },

        // Gestion des stocks
        { path: 'articles',            name: 'articles',            component: () => import('../pages/ArticlesPage.vue') },
        { path: 'articles/create',     name: 'articles-create',     component: () => import('../pages/Articles/Create.vue') },
        { path: 'articles/vue-globale',name: 'articles-vue-globale',component: () => import('../pages/Articles/GlobalView.vue') },
        { path: 'articles/:id',        name: 'articles-show',       component: () => import('../pages/Articles/Show.vue') },

        // Gestion des factures
        { path: 'invoices',            name: 'invoices',        component: () => import('../pages/Invoices/Index.vue') },
        { path: 'invoices/create',     name: 'invoices-create', component: () => import('../pages/Invoices/Create.vue') },
        { path: 'invoices/:id',        name: 'invoices-show',   component: () => import('../pages/Invoices/Show.vue') },
        { path: 'invoices/:id/edit',   name: 'invoices-edit',   component: () => import('../pages/Invoices/Edit.vue') },

        // Gestion des clients
        { path: 'clients',         name: 'clients',          component: () => import('../pages/Clients/Index.vue') },
        { path: 'clients/:id',     name: 'clients-show',     component: () => import('../pages/Clients/Show.vue') },
        { path: 'clients/comptes', name: 'clients-comptes',  component: () => import('../pages/Clients/Accounts.vue') },

        // Finances
        { path: 'caisse',               name: 'caisse',               component: () => import('../pages/CaissePage.vue') },
        { path: 'caisse/historique',    name: 'caisse-historique',    component: () => import('../pages/PlaceholderPage.vue') },
        { path: 'caisse/transfers',     name: 'caisse-transfers',     component: () => import('../pages/PlaceholderPage.vue') },
        { path: 'depenses-mensuelles',  name: 'depenses-mensuelles',  component: () => import('../pages/PlaceholderPage.vue') },

        // Pages conservées (non dans le menu principal)
        { path: 'suppliers',      name: 'suppliers',     component: () => import('../pages/SuppliersPage.vue') },
        { path: 'delivery-notes', name: 'delivery-notes',component: () => import('../pages/DeliveryNotesPage.vue') },
        { path: 'payments',       name: 'payments',      component: () => import('../pages/PaymentsPage.vue') },
        { path: 'sync',           name: 'sync',          component: () => import('../pages/SyncPage.vue') },
        { path: 'settings',       name: 'settings',      component: () => import('../pages/SettingsPage.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.isAuthenticated && !to.meta.public) {
    await auth.init()
    if (!auth.isAuthenticated) {
      return { name: 'login' }
    }
  }

  if (auth.isAuthenticated && to.name === 'login') {
    return { name: 'dashboard' }
  }
})

export { router }
