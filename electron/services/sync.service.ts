import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseService } from './database.service'
import { CryptoService } from './crypto.service'
import { NetworkService, UnauthorizedError } from './network.service'
import { log } from './logger.service'

interface SyncMeta {
  lastSyncedAt: string | null
  deviceId: string
  serverUrl: string
}

interface SyncPullResponse {
  pulled_at: string
  data: Record<string, unknown[]>
}

interface SyncPushResponse {
  accepted:  Array<{ local_id: string; server_id: number; table: string }>
  conflicts: Array<{ local_id: string; server_id: number; server_record: unknown; server_updated_at: string }>
  rejected:  Array<{ local_id: string; reason: string }>
  synced_at: string
}

type SyncEventEmitter = (event: string, data: unknown) => void

const SYNCABLE_TABLES = [
  'clients', 'suppliers', 'articles', 'article_items',
  'invoices', 'invoice_items', 'delivery_notes', 'delivery_note_items',
  'payments', 'transactions', 'caisses', 'caisse_transactions',
  'monthly_expenses',
] as const

// Natural-key columns used to match server records when server_id is unknown locally
// (e.g. record created offline before first sync)
const NATURAL_KEYS: Partial<Record<string, string[]>> = {
  monthly_expenses: ['month', 'year'],
}

// FK columns whose values are server IDs that must be translated to local SQLite IDs
const FK_MAP: Record<string, Record<string, string>> = {
  articles:            { supplier_id: 'suppliers' },
  article_items:       { article_id: 'articles' },
  invoices:            { client_id: 'clients' },
  invoice_items:       { invoice_id: 'invoices', article_item_id: 'article_items', article_id: 'articles' },
  delivery_notes:      { client_id: 'clients', invoice_id: 'invoices' },
  delivery_note_items: { delivery_note_id: 'delivery_notes', article_item_id: 'article_items', article_id: 'articles' },
  payments:            { client_id: 'clients' },
  transactions:        { client_id: 'clients', invoice_id: 'invoices' },
  caisse_transactions: { payment_id: 'payments', transaction_id: 'transactions', caisse_id: 'caisses' },
}

export class SyncService {
  private metaPath!: string
  private _meta!: SyncMeta
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null
  private isSyncing = false

  constructor(
    private db: DatabaseService,
    private crypto: CryptoService,
    private network: NetworkService,
  ) {}

  initialize(): void {
    const userDataPath = app.getPath('userData')
    mkdirSync(userDataPath, { recursive: true })
    this.metaPath = join(userDataPath, 'sync-meta.json')
    this._meta    = this.loadMeta()
  }

  private loadMeta(): SyncMeta {
    if (existsSync(this.metaPath)) {
      try {
        return JSON.parse(readFileSync(this.metaPath, 'utf8')) as SyncMeta
      } catch { /* ignore */ }
    }
    return { lastSyncedAt: null, deviceId: uuidv4(), serverUrl: 'https://samabois.com/api/v1' }
  }

  private saveMeta(): void {
    writeFileSync(this.metaPath, JSON.stringify(this._meta, null, 2), 'utf8')
  }

  get serverUrl(): string  { return this._meta.serverUrl }
  get deviceId(): string   { return this._meta.deviceId }
  get lastSyncedAt(): string | null { return this._meta.lastSyncedAt }

  setServerUrl(url: string): void {
    this._meta.serverUrl = url
    this.saveMeta()
  }

  resetLastSyncedAt(): void {
    this._meta.lastSyncedAt = null
    this.saveMeta()
  }

  startAutoSync(intervalMs: number, emit: SyncEventEmitter): void {
    this.autoSyncTimer = setInterval(async () => {
      if (this.network.isOnline && !this.isSyncing) {
        await this.syncAll(emit)
      }
    }, intervalMs)
  }

  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer)
      this.autoSyncTimer = null
    }
  }

  async syncAll(emit?: SyncEventEmitter): Promise<{ pulled: number; pushed: number; conflicts: number }> {
    if (this.isSyncing) return { pulled: 0, pushed: 0, conflicts: 0 }

    this.isSyncing = true
    emit?.('sync:started', { at: new Date().toISOString() })

    let pulled = 0, pushed = 0, conflicts = 0

    try {
      const token = await this.crypto.getToken()
      if (!token) throw new Error('Non authentifié.')

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'X-Device-Id':   this.deviceId,
      }

      // 1. PUSH mutations locales
      const mutations = this.db.getPendingMutations()

      if (mutations.length > 0) {
        const pushPayload = {
          device_id: this.deviceId,
          mutations: mutations.map((m) => ({
            table:            m.table_name,
            operation:        m.operation,
            data:             JSON.parse(m.data) as Record<string, unknown>,
            local_id:         String(m.local_id),
            idempotency_key:  m.idempotency_key,
            client_timestamp: m.client_timestamp,
          })),
        }

        const pushResult = await this.network.fetchJson<SyncPushResponse>(
          `${this.serverUrl}/sync/push`,
          { method: 'POST', headers, body: JSON.stringify(pushPayload) }
        )

        for (const accepted of pushResult.accepted) {
          const mutation = mutations.find((m) => String(m.local_id) === accepted.local_id)
          if (mutation) {
            this.db.markMutationSent(mutation.id)
            this.db.run(
              `UPDATE ${accepted.table} SET server_id = ?, sync_status = 'synced' WHERE id = ?`,
              [accepted.server_id, accepted.local_id]
            )
            pushed++
          }
        }

        for (const conflict of pushResult.conflicts) {
          const mutation = mutations.find((m) => String(m.local_id) === conflict.local_id)
          if (mutation) {
            const localRecord = this.db.get(`SELECT * FROM ${mutation.table_name} WHERE id = ?`, [mutation.local_id])
            this.db.saveConflict({ tableName: mutation.table_name, localId: mutation.local_id, serverRecord: conflict.server_record, localRecord })
            this.db.run(`UPDATE ${mutation.table_name} SET sync_status = 'conflict' WHERE id = ?`, [mutation.local_id])
            conflicts++
          }
        }

        for (const rejected of pushResult.rejected) {
          const mutation = mutations.find((m) => String(m.local_id) === rejected.local_id)
          if (mutation) this.db.markMutationFailed(mutation.id, rejected.reason)
        }
      }

      // 2. PULL delta depuis le serveur
      const sinceParam = this._meta.lastSyncedAt
        ? `&since=${encodeURIComponent(this._meta.lastSyncedAt)}`
        : ''
      const pullUrl = `${this.serverUrl}/sync/pull?tables[]=${SYNCABLE_TABLES.join('&tables[]=')}${sinceParam}`
      const pullResult = await this.network.fetchJson<SyncPullResponse>(pullUrl, { headers })

      // Traiter les tables dans l'ordre des dépendances FK pour éviter les violations
      pulled = this.db.transaction(() => {
        let count = 0
        for (const table of SYNCABLE_TABLES) {
          const records = pullResult.data[table] as Record<string, unknown>[] | undefined
          if (!records?.length) continue
          for (const record of records) {
            this.upsertRecord(table, record)
            count++
          }
        }
        return count
      })

      this._meta.lastSyncedAt = pullResult.pulled_at
      this.saveMeta()

      log.info(`Sync terminée — pulled=${pulled} pushed=${pushed} conflicts=${conflicts}`)
      emit?.('sync:completed', { pulled, pushed, conflicts, at: new Date().toISOString() })

    } catch (err) {
      if (err instanceof UnauthorizedError) {
        log.warn('Sync annulée — token expiré, redirection vers login')
        emit?.('auth:expired', {})
      } else {
        const message = err instanceof Error ? err.message : String(err)
        log.error('Sync échouée', message)
        emit?.('sync:error', { message })
      }
    } finally {
      this.isSyncing = false
    }

    return { pulled, pushed, conflicts }
  }

  private upsertRecord(table: string, record: Record<string, unknown>): void {
    const serverId = record['id'] as number | undefined
    if (!serverId) return

    const existing = this.db.get<{ id: number; sync_status: string }>(
      `SELECT id, sync_status FROM ${table} WHERE server_id = ?`,
      [serverId]
    )

    // Fallback: match by natural key when server_id is unknown locally (record created offline)
    let naturalMatch: { id: number; sync_status: string } | undefined
    if (!existing && NATURAL_KEYS[table]) {
      const nk = NATURAL_KEYS[table]!
      const where = nk.map(k => `${k} = ?`).join(' AND ')
      const vals  = nk.map(k => record[k])
      naturalMatch = this.db.get<{ id: number; sync_status: string }>(
        `SELECT id, sync_status FROM ${table} WHERE ${where} AND deleted_at IS NULL`,
        vals,
      )
    }

    const target = existing ?? naturalMatch

    if (target?.sync_status === 'conflict' || target?.sync_status === 'pending') return

    // Translate FK server-IDs → local SQLite IDs before building columns
    const remapped: Record<string, unknown> = { ...record }
    for (const [fkCol, refTable] of Object.entries(FK_MAP[table] ?? {})) {
      if (remapped[fkCol] != null) {
        const ref = this.db.get<{ id: number }>(`SELECT id FROM ${refTable} WHERE server_id = ?`, [remapped[fkCol]])
        remapped[fkCol] = ref?.id ?? null
      }
    }

    // Ne garder que les colonnes qui existent dans la table SQLite locale
    const knownColumns = new Set(this.db.getTableColumns(table))
    const columns = Object.keys(remapped).filter((k) => k !== 'id' && knownColumns.has(k))
    const values  = columns.map((c) => remapped[c])

    if (target) {
      const sets = columns.map((c) => `${c} = ?`).join(', ')
      this.db.run(
        `UPDATE ${table} SET ${sets}, server_id = ?, sync_status = 'synced', synced_at = datetime('now') WHERE id = ?`,
        [...values, serverId, target.id]
      )
    } else {
      const cols = [...columns, 'server_id', 'sync_status', 'synced_at'].join(', ')
      const phs  = [...columns.map(() => '?'), '?', "'synced'", "datetime('now')"].join(', ')
      this.db.run(`INSERT INTO ${table} (${cols}) VALUES (${phs})`, [...values, serverId])
    }
  }
}
