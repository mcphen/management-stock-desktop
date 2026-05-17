# Management Stock Desktop

Application desktop offline-first construite avec Electron + Vue 3 + TypeScript.

## Installation

```bash
npm install
```

> **Note Windows** : `better-sqlite3` et `keytar` sont des modules natifs. Ils nécessitent Python et les Build Tools Visual Studio.
> ```
> npm install --global windows-build-tools
> ```

## Développement

```bash
# Démarrer en mode dev (Vite + Electron)
npm run electron:dev
```

## Build production

```bash
npm run build:win
```
Le `.exe` installer se trouve dans `release/`.

## Architecture

```
electron/               → Main process (Node.js, accès SQLite/filesystem)
  main.ts               → Initialisation Electron, fenêtre, bootstrap
  preload.ts            → Bridge sécurisé via contextBridge
  services/
    database.service.ts → SQLite local (WAL mode, migrations versionnées)
    sync.service.ts     → Synchronisation pull/push avec l'API Laravel
    crypto.service.ts   → Chiffrement AES-256-GCM + keytar (OS keychain)
    network.service.ts  → Détection connectivité
  ipc/                  → Handlers IPC par domaine métier

src/                    → Renderer process (Vue 3, pas d'accès Node)
  stores/               → Pinia stores (auth, sync, clients...)
  pages/                → Pages Vue par domaine
  layouts/              → AppLayout avec sidebar + status bar
  electron.d.ts         → Types de l'API exposée par le preload

## Sécurité

- contextIsolation: true, nodeIntegration: false, sandbox: true
- Token Sanctum stocké dans l'OS keychain via keytar (jamais en clair)
- Toutes les communications renderer↔main via IPC typé
- CSP stricte dans les BrowserWindows
- SQLite accédé uniquement depuis le main process
```

## Synchronisation offline

1. Chaque mutation (create/update/delete) est immédiatement persistée en SQLite local avec `sync_status = 'pending'`
2. Une mutation est ajoutée à la `sync_queue` avec une clé d'idempotence UUID
3. Dès que le réseau est disponible, `SyncService` pousse les mutations vers `POST /api/v1/sync/push`
4. En parallèle, il tire les nouvelles données depuis `GET /api/v1/sync/pull?since=<last_sync>`
5. Les conflits (serveur plus récent que la mutation locale) sont signalés dans l'UI avec option de résolution

## Configuration

Modifier l'URL du serveur dans les settings Electron Store (`sync-meta.json` dans AppData).
