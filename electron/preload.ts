import { contextBridge, ipcRenderer } from 'electron'

/**
 * API exposée au renderer via contextBridge.
 * Le renderer accède UNIQUEMENT à ces méthodes — jamais à Node.js directement.
 */

type IpcListener = (...args: unknown[]) => void

function invoke(channel: string, ...args: unknown[]): Promise<unknown> {
  return ipcRenderer.invoke(channel, ...args)
}

function on(channel: string, listener: IpcListener): () => void {
  const wrappedListener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => listener(...args)
  ipcRenderer.on(channel, wrappedListener)
  return () => ipcRenderer.removeListener(channel, wrappedListener)
}

contextBridge.exposeInMainWorld('electron', {
  // ── Auth ────────────────────────────────────────────────────────────────
  auth: {
    login:        (email: string, password: string, deviceName: string) =>
                    invoke('auth:login', { email, password, deviceName }),
    logout:       () => invoke('auth:logout'),
    getSession:   () => invoke('auth:getSession'),
    refreshToken: () => invoke('auth:refreshToken'),
  },

  // ── Clients ─────────────────────────────────────────────────────────────
  clients: {
    list:    (params?: Record<string, unknown>) => invoke('clients:list', params),
    get:     (id: number)                       => invoke('clients:get', id),
    create:  (data: Record<string, unknown>)    => invoke('clients:create', data),
    update:  (id: number, data: Record<string, unknown>) => invoke('clients:update', id, data),
    delete:  (id: number)                       => invoke('clients:delete', id),
    balance: (id: number)                       => invoke('clients:balance', id),
  },

  // ── Fournisseurs ─────────────────────────────────────────────────────────
  suppliers: {
    list:   (params?: Record<string, unknown>) => invoke('suppliers:list', params),
    get:    (id: number)                       => invoke('suppliers:get', id),
    create: (data: Record<string, unknown>)    => invoke('suppliers:create', data),
    update: (id: number, data: Record<string, unknown>) => invoke('suppliers:update', id, data),
    delete: (id: number)                       => invoke('suppliers:delete', id),
  },

  // ── Articles ─────────────────────────────────────────────────────────────
  articles: {
    list:   (params?: Record<string, unknown>) => invoke('articles:list', params),
    get:    (id: number)                       => invoke('articles:get', id),
    create: (data: Record<string, unknown>)    => invoke('articles:create', data),
    update: (id: number, data: Record<string, unknown>) => invoke('articles:update', id, data),
    delete: (id: number)                       => invoke('articles:delete', id),
    items:  (articleId: number)                => invoke('articles:items', articleId),
  },

  // ── Article Items ─────────────────────────────────────────────────────────
  articleItems: {
    list:   (params?: Record<string, unknown>) => invoke('article-items:list', params),
    get:    (id: number)                       => invoke('article-items:get', id),
    create: (data: Record<string, unknown>)    => invoke('article-items:create', data),
    update: (id: number, data: Record<string, unknown>) => invoke('article-items:update', id, data),
    delete: (id: number)                       => invoke('article-items:delete', id),
  },

  // ── Factures ─────────────────────────────────────────────────────────────
  invoices: {
    list:       (params?: Record<string, unknown>) => invoke('invoices:list', params),
    get:        (id: number)                       => invoke('invoices:get', id),
    items:      (invoiceId: number)                => invoke('invoices:items', invoiceId),
    create:     (data: Record<string, unknown>)    => invoke('invoices:create', data),
    update:     (id: number, data: Record<string, unknown>) => invoke('invoices:update', id, data),
    delete:     (id: number)                       => invoke('invoices:delete', id),
    updateItem: (invoiceId: number, itemId: number, data: Record<string, unknown>) => invoke('invoices:update-item', invoiceId, itemId, data),
    removeItem: (invoiceId: number, itemId: number) => invoke('invoices:remove-item', invoiceId, itemId),
    addItem:    (invoiceId: number, data: Record<string, unknown>) => invoke('invoices:add-item', invoiceId, data),
  },

  // ── Bons de livraison ────────────────────────────────────────────────────
  deliveryNotes: {
    list:    (params?: Record<string, unknown>) => invoke('delivery-notes:list', params),
    get:     (id: number)                       => invoke('delivery-notes:get', id),
    create:  (data: Record<string, unknown>)    => invoke('delivery-notes:create', data),
    update:  (id: number, data: Record<string, unknown>) => invoke('delivery-notes:update', id, data),
    delete:  (id: number)                       => invoke('delivery-notes:delete', id),
    convert: (id: number)                       => invoke('delivery-notes:convert', id),
  },

  // ── Paiements ────────────────────────────────────────────────────────────
  payments: {
    list:   (params?: Record<string, unknown>) => invoke('payments:list', params),
    get:    (id: number)                       => invoke('payments:get', id),
    create: (data: Record<string, unknown>)    => invoke('payments:create', data),
    delete: (id: number)                       => invoke('payments:delete', id),
  },

  // ── Caisse ───────────────────────────────────────────────────────────────
  caisse: {
    list:   (params?: Record<string, unknown>) => invoke('caisse:list', params),
    solde:  ()                                 => invoke('caisse:solde'),
    create: (data: Record<string, unknown>)    => invoke('caisse:create', data),
    delete: (id: number)                       => invoke('caisse:delete', id),
  },

  // ── Synchronisation ──────────────────────────────────────────────────────
  sync: {
    now:           ()    => invoke('sync:now'),
    getStatus:     ()    => invoke('sync:getStatus'),
    getPendingCount: ()  => invoke('sync:getPendingCount'),
    resolveConflict: (localId: string, resolution: 'keep_local' | 'keep_server') =>
                         invoke('sync:resolveConflict', localId, resolution),
  },

  // ── Paramètres ───────────────────────────────────────────────────────────
  settings: {
    get:            ()            => invoke('settings:get'),
    setServerUrl:   (url: string) => invoke('settings:setServerUrl', url),
    testConnection: (url?: string) => invoke('settings:testConnection', url),
    openLogFolder:  ()            => invoke('settings:openLogFolder'),
  },

  // ── Auto-updater ─────────────────────────────────────────────────────────
  updater: {
    check:    () => invoke('updater:check'),
    download: () => invoke('updater:download'),
    install:  () => invoke('updater:install'),
  },

  // ── Impression ───────────────────────────────────────────────────────────
  print: () => invoke('app:print'),

  // ── Événements (renderer écoute le main) ────────────────────────────────
  on,
})
