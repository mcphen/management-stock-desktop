# Synchronisation offline ↔ serveur

## Principe général

L'app fonctionne **100% hors ligne** — toutes les opérations écrivent dans SQLite local.
Quand le réseau revient, les données sont synchronisées avec l'API Laravel.

```
[Utilisateur crée une facture]
         │
         ▼
  SQLite local          ←── toujours disponible, même hors ligne
  sync_status = 'pending'
  sync_queue ← mutation enregistrée
         │
         │  (réseau disponible)
         ▼
  PUSH → POST /api/v1/sync/push   ← envoie les mutations en attente
  PULL → GET  /api/v1/sync/pull   ← récupère les changements du serveur
         │
         ▼
  SQLite local
  sync_status = 'synced'
```

---

## Déclenchement de la sync

La synchronisation se déclenche dans 3 cas :

| Déclencheur | Délai |
|-------------|-------|
| Retour de la connexion | Immédiat |
| Auto-sync périodique | Toutes les 30 secondes |
| Bouton "Sync" dans la sidebar | Manuel |

La connectivité est vérifiée toutes les **10 secondes** via `GET {serverUrl}/sync/status`.

---

## Phase PUSH — envoyer les modifications locales

Les mutations en attente sont stockées dans la table `sync_queue`.

Chaque mutation contient :
- `table_name` : la table concernée (`clients`, `invoices`, etc.)
- `operation` : `create` / `update` / `delete`
- `local_id` : l'ID SQLite local
- `data` : les données en JSON
- `idempotency_key` : UUID unique pour éviter les doublons en cas de retry

Le serveur répond avec :
- `accepted[]` → la mutation a été appliquée, on reçoit le `server_id`
- `conflicts[]` → le serveur a une version plus récente → conflit enregistré
- `rejected[]` → erreur applicative → `attempts` incrémenté (max 5)

---

## Phase PULL — récupérer les changements du serveur

```
GET /api/v1/sync/pull?tables[]=clients&tables[]=invoices&...&since=2024-01-15T10:00:00Z
```

Le paramètre `since` est le timestamp de la dernière sync réussie (stocké dans `sync-meta.json`).
Au premier lancement (ou après reset), `since` est absent → **pull complet**.

### Problème critique résolu : translation des FK

Le serveur retourne des enregistrements avec ses propres IDs MySQL :
```json
{ "id": 42, "supplier_id": 7, "essence": "Ayous" }
```

Mais dans SQLite, `articles.supplier_id` est une FK vers `suppliers.id` (local autoincrement),
**pas** vers `suppliers.server_id`. Un fournisseur MySQL id=7 peut avoir local id=3.

**Sans translation** → `FOREIGN KEY constraint failed` à chaque sync.

**Solution** dans `sync.service.ts` → `FK_MAP` :

```typescript
const FK_MAP = {
  articles:            { supplier_id: 'suppliers' },
  article_items:       { article_id: 'articles' },
  invoices:            { client_id: 'clients' },
  invoice_items:       { invoice_id: 'invoices', article_item_id: 'article_items' },
  delivery_notes:      { client_id: 'clients', invoice_id: 'invoices' },
  delivery_note_items: { delivery_note_id: 'delivery_notes', article_item_id: 'article_items' },
  payments:            { client_id: 'clients' },
  transactions:        { client_id: 'clients', invoice_id: 'invoices' },
  caisse_transactions: { payment_id: 'payments', transaction_id: 'transactions' },
}
```

Avant chaque INSERT/UPDATE, chaque colonne FK est traduite :
```typescript
SELECT id FROM suppliers WHERE server_id = 7
// → retourne 3 → on insère supplier_id = 3
```

### Ordre de traitement des tables (SYNCABLE_TABLES)

Les tables sont traitées dans l'ordre des dépendances FK, à l'intérieur d'une transaction :

```
clients → suppliers → articles → article_items
→ invoices → invoice_items
→ delivery_notes → delivery_note_items
→ payments → transactions → caisse_transactions
```

**Ne pas changer cet ordre** sans vérifier les dépendances FK.

### Filtrage des colonnes inconnues

Le serveur peut retourner des colonnes qui n'existent pas dans SQLite (ex: `uuid`, `remote_id`).
Avant insertion, les colonnes sont filtrées via `PRAGMA table_info` :

```typescript
const knownColumns = new Set(this.db.getTableColumns(table))
const columns = Object.keys(record).filter(k => k !== 'id' && knownColumns.has(k))
```

---

## Gestion des conflits

Un conflit survient quand :
- L'app modifie un enregistrement **en local** (sync_status = 'pending')
- ET le serveur a une version **plus récente** du même enregistrement

Le conflit est enregistré dans `sync_conflicts` et l'enregistrement local passe en `sync_status = 'conflict'`.

Les conflits sont visibles via `window.electron.sync` et peuvent être résolus :
- `keep_local` → force la version locale
- `keep_server` → écrase avec la version serveur

**Actuellement** : il n'y a pas encore d'UI de résolution de conflits dans l'app.
Les conflits sont en attente dans `sync_conflicts`.

---

## Fichier sync-meta.json

Stocké dans `%APPDATA%\management-stock-desktop\sync-meta.json`.

```json
{
  "lastSyncedAt": "2024-03-15T14:32:00.000Z",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "serverUrl": "http://monserveur.com/api/v1"
}
```

- `lastSyncedAt` : timestamp envoyé dans le paramètre `since` du pull suivant
- `deviceId` : UUID unique par installation, utilisé pour identifier l'appareil côté serveur
- `serverUrl` : configurable depuis la page Paramètres de l'app

---

## Ajouter une nouvelle table à la sync

1. Créer la migration SQLite dans `database.service.ts`
2. Ajouter la table dans `SYNCABLE_TABLES` de `sync.service.ts` **au bon endroit** (respecter les FK)
3. Ajouter les FK de cette table dans `FK_MAP` si elle a des clés étrangères
4. S'assurer que le modèle Laravel correspondant est dans `SyncController::SYNCABLE`
5. Créer le fichier IPC `electron/ipc/ma-table.ipc.ts`
6. L'enregistrer dans `main.ts` et exposer dans `preload.ts`
