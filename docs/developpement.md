# Guide de développement

## Prérequis

| Outil | Version minimale | Installation |
|-------|-----------------|--------------|
| Node.js | 20.x LTS | https://nodejs.org |
| npm | 10.x | inclus avec Node |
| PHP | 8.2 | via Laragon |
| Git | — | https://git-scm.com |
| Windows | 10 ou 11 | — |

> **macOS/Linux** : le code TypeScript compile, mais `better-sqlite3` et
> `electron-builder` ciblent Windows. Possible de développer sur Mac,
> impossible de builder l'installeur sans CI ou VM.

---

## Installation

```bash
# 1. Cloner le repo
git clone https://github.com/mcphen/management-stock-desktop.git
cd management-stock-desktop

# 2. Installer les dépendances
npm install
# Le postinstall recompile automatiquement better-sqlite3 pour Electron

# 3. Vérifier que le backend Laravel tourne
# (dans un autre terminal)
cd c:\laragon\www\HASSAN\management-stock
php artisan serve
# → http://localhost:8000
```

---

## Lancer en mode développement

```bash
npm run electron:dev
```

Cette commande lance en parallèle (via `concurrently`) :
1. **Vite dev server** sur `http://localhost:5173` (renderer avec HMR)
2. **TypeScript watch** — recompile le main process à chaque changement
3. **Electron** — attend que Vite soit prêt, puis ouvre la fenêtre

Les DevTools s'ouvrent automatiquement en mode dev.

### Autres scripts utiles

```bash
npm run build:electron    # Compile TypeScript → dist-electron/
npm run build:renderer    # Compile Vue/Vite → dist/
npm run typecheck         # Vérifie les types sans compiler
npm run start             # Lance l'app compilée (sans dev server)
```

---

## Structure de développement à connaître

### Ajouter une nouvelle page

1. Créer `src/pages/MaPage.vue`
2. Ajouter la route dans `src/router/index.ts`
3. Ajouter le lien dans `src/layouts/AppLayout.vue` si nécessaire

### Ajouter un nouveau handler IPC

1. Créer ou modifier `electron/ipc/mon-domaine.ipc.ts`
2. Enregistrer dans `electron/main.ts` → `bootstrap()`
3. Exposer dans `electron/preload.ts` → `contextBridge.exposeInMainWorld`
4. Ajouter les types dans `src/electron.d.ts`
5. `npm run build:electron` pour recompiler

### Modifier le schéma SQLite

1. Ajouter une méthode `migration_002()` dans `electron/services/database.service.ts`
2. L'appeler dans `runMigrations()` avec `if (version < 2) { ... }`
3. **Ne jamais modifier** `migration_001()` — les bases existantes des clients ne seront pas remises à zéro

---

## Problème connu — ELECTRON_RUN_AS_NODE

### Symptôme
```
TypeError: Cannot read properties of undefined (reading 'whenReady')
```

### Cause
La variable d'environnement machine `ELECTRON_RUN_AS_NODE=1` force Electron à se
comporter comme Node.js pur. Toutes les APIs Electron (`app`, `BrowserWindow`, etc.)
sont indisponibles.

### Solution déjà en place
Le script `scripts/electron-launch.js` supprime cette variable **avant** de spawner
Electron, ce qui est plus fiable que `cross-env ELECTRON_RUN_AS_NODE=` (qui met une
chaîne vide au lieu de vraiment supprimer la variable).

```javascript
// scripts/electron-launch.js
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE   // ← clé du fix
spawn(electronPath, ['.'], { env })
```

**Ne pas revenir** à un lancement direct `electron .` dans les scripts npm.

---

## Données locales en développement

La base SQLite de développement est dans :
```
%APPDATA%\management-stock-desktop\management-stock.db
```

Pour repartir de zéro (réinitialiser la DB) :
```bash
# Fermer l'app d'abord, puis :
del "%APPDATA%\management-stock-desktop\management-stock.db"
del "%APPDATA%\management-stock-desktop\management-stock.db-wal"
del "%APPDATA%\management-stock-desktop\management-stock.db-shm"
del "%APPDATA%\management-stock-desktop\sync-meta.json"
```

Au prochain démarrage, la migration recrée tout depuis zéro.

---

## Configurer l'URL du serveur

L'URL est stockée dans `%APPDATA%\management-stock-desktop\sync-meta.json`.

En développement, elle pointe sur `http://localhost:8000/api/v1` par défaut.

Pour la changer sans redémarrer l'app :
- **Via l'UI** : menu Paramètres → "Connexion au serveur"
- **Via le fichier** : modifier `sync-meta.json` à la main puis redémarrer

---

## Checklist avant de committer

- [ ] `npm run typecheck` passe sans erreur
- [ ] `npm run build:electron` compile sans erreur
- [ ] `npm run build:renderer` compile sans erreur
- [ ] L'app se lance correctement avec `npm run start`
- [ ] Tester la page/fonctionnalité modifiée en mode dev (`npm run electron:dev`)
- [ ] Les données se synchronisent correctement si le backend tourne
