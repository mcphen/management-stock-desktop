# Architecture technique

## Stack

| Couche | Technologie | Version |
|--------|-------------|---------|
| Shell desktop | Electron | 31.x |
| UI renderer | Vue 3 + TypeScript | 3.4.x |
| Styles | Tailwind CSS | 3.x |
| Base de données locale | better-sqlite3 | 11.x |
| Bundler renderer | Vite | 5.x |
| Icônes | lucide-vue-next | — |
| State management | Pinia | 2.x |
| Routeur | Vue Router | 4.x |
| Mises à jour | electron-updater | 6.x |

---

## Modèle de processus Electron

Electron fonctionne avec **deux processus distincts** qui ne partagent pas de mémoire :

```
┌─────────────────────────────────────────────────────┐
│  MAIN PROCESS (Node.js)  —  electron/main.ts        │
│                                                     │
│  - Crée la BrowserWindow                           │
│  - Instancie les services (DB, Sync, Crypto, Net)  │
│  - Enregistre les IPC handlers                     │
│  - Accès système complet (fichiers, réseau, etc.)  │
└────────────────┬────────────────────────────────────┘
                 │  IPC (ipcMain / ipcRenderer)
                 │  via contextBridge — canal sécurisé
┌────────────────▼────────────────────────────────────┐
│  RENDERER PROCESS (Chromium)  —  src/              │
│                                                     │
│  - Vue 3 SPA                                        │
│  - Accès UNIQUEMENT via window.electron.*          │
│  - Aucun accès Node.js direct (sandbox = true)     │
└─────────────────────────────────────────────────────┘
```

### Règle fondamentale

> Le renderer ne touche **jamais** la base de données directement.
> Il passe **toujours** par un appel IPC → main process → SQLite.

---

## Sécurité

Configuré dans `electron/main.ts` → `createWindow()` :

```typescript
webPreferences: {
  contextIsolation: true,   // renderer isolé du main
  nodeIntegration:  false,  // pas de require() dans le renderer
  sandbox:          true,   // sandbox Chromium activé
  webSecurity:      true,   // CORS et restrictions actives
}
```

Le **preload** (`electron/preload.ts`) est le seul pont entre les deux processus.
Il expose `window.electron` via `contextBridge.exposeInMainWorld()`.
Les types sont dans `src/electron.d.ts`.

**CSP** (Content Security Policy) appliquée via `onHeadersReceived` :
- `script-src 'self'` — pas d'injection de scripts externes
- `connect-src 'self' http://localhost:* https://*` — autorise l'API

---

## Structure des fichiers

```
management-stock-desktop/
├── electron/                   # Main process (compilé vers dist-electron/)
│   ├── main.ts                 # Point d'entrée, bootstrap des services
│   ├── preload.ts              # Pont IPC → window.electron
│   ├── ipc/                    # Handlers IPC par domaine
│   │   ├── auth.ipc.ts
│   │   ├── client.ipc.ts
│   │   ├── article.ipc.ts
│   │   ├── invoice.ipc.ts
│   │   ├── settings.ipc.ts     # URL serveur + version
│   │   ├── updater.ipc.ts      # Auto-updater
│   │   └── ...
│   └── services/
│       ├── database.service.ts # SQLite + migrations
│       ├── sync.service.ts     # Sync offline ↔ API
│       ├── crypto.service.ts   # Token chiffré (safeStorage)
│       └── network.service.ts  # Détection connectivité
│
├── src/                        # Renderer (compilé vers dist/)
│   ├── main.ts                 # Point d'entrée Vue
│   ├── App.vue
│   ├── electron.d.ts           # Types de window.electron
│   ├── router/index.ts
│   ├── stores/                 # Pinia stores
│   ├── layouts/AppLayout.vue   # Sidebar + UpdateBanner
│   ├── pages/                  # Pages par route
│   └── components/
│
├── scripts/
│   └── electron-launch.js      # Lance Electron en supprimant ELECTRON_RUN_AS_NODE
│
├── .github/workflows/
│   └── release.yml             # CI/CD GitHub Actions
│
└── docs/                       # ← tu es ici
```

---

## Base de données SQLite

Fichier stocké dans : `%APPDATA%\management-stock-desktop\management-stock.db`

### Schéma simplifié

```
clients          ←── invoices ←── invoice_items
suppliers        ←── articles ←── article_items
                 ←── delivery_notes ←── delivery_note_items
clients          ←── payments ←── caisse_transactions
clients          ←── transactions
```

### Colonnes de synchronisation (présentes dans chaque table)

| Colonne | Rôle |
|---------|------|
| `server_id` | ID MySQL correspondant sur le serveur |
| `sync_status` | `synced` / `pending` / `conflict` / `deleted_pending` |
| `synced_at` | Date de dernière sync réussie |
| `local_uuid` | UUID généré localement pour idempotence |
| `deleted_at` | Soft delete compatible avec Laravel |

### Migrations

Dans `database.service.ts` → `runMigrations()`.
Système basé sur `PRAGMA user_version`.

```typescript
if (version < 1) { this.db.exec(this.migration_001()); this.db.pragma('user_version = 1') }
if (version < 2) { this.db.exec(this.migration_002()); this.db.pragma('user_version = 2') }
// etc.
```

**Important** : toujours incrémenter le numéro, ne jamais modifier une migration existante.

---

## Services principaux

### DatabaseService
- Ouvre/crée le fichier SQLite
- Exécute les migrations au démarrage
- Expose `run()`, `get()`, `all()`, `transaction()`
- Gère la queue de mutations (`sync_queue`) et les conflits (`sync_conflicts`)

### SyncService
- **Push** : envoie les mutations locales en attente vers `POST /api/v1/sync/push`
- **Pull** : récupère les enregistrements modifiés depuis `GET /api/v1/sync/pull`
- Traduit les FK server-IDs → local SQLite IDs (via `FK_MAP`) avant insertion
- Traite les tables dans l'ordre des dépendances FK (voir `SYNCABLE_TABLES`)
- Auto-sync toutes les 30 secondes si en ligne

### CryptoService
- Stocke le token Sanctum chiffré via `electron.safeStorage` (DPAPI sur Windows)
- Double chiffrement : safeStorage + AES-256-GCM avec clé maître

### NetworkService
- Polling toutes les 10 secondes sur `{serverUrl}/sync/status`
- Émet `network:status` vers le renderer via `webContents.send()`
- Déclenche un sync immédiat dès que la connexion revient

---

## IPC — pattern de communication

Chaque domaine a son fichier `electron/ipc/xxx.ipc.ts` :

```typescript
// Main process — register
ipcMain.handle('clients:list', (_event, params) => {
  return db.all(`SELECT * FROM clients WHERE ...`, [...])
})

// Preload — expose
contextBridge.exposeInMainWorld('electron', {
  clients: { list: (params) => ipcRenderer.invoke('clients:list', params) }
})

// Renderer — utilise
const result = await window.electron.clients.list({ per_page: 50 })
```
