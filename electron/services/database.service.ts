import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'deleted_pending'

export interface LocalRecord {
  id: number
  server_id: number | null
  sync_status: SyncStatus
  synced_at: string | null
  updated_at: string
  created_at: string
  deleted_at: string | null
}

export class DatabaseService {
  private db!: Database.Database
  private readonly dbPath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    mkdirSync(userDataPath, { recursive: true })
    this.dbPath = join(userDataPath, 'management-stock.db')
  }

  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath)

    // WAL mode pour de meilleures performances concurrentes
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('synchronous = NORMAL')

    this.runMigrations()
  }

  private runMigrations(): void {
    const version = (this.db.pragma('user_version', { simple: true }) as number) ?? 0

    if (version < 1) {
      this.db.exec(this.migration_001())
      this.db.pragma('user_version = 1')
    }
  }

  private syncColumns(): string {
    return `
      server_id   INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('synced','pending','conflict','deleted_pending')),
      synced_at   TEXT,
      local_uuid  TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
      deleted_at  TEXT
    `
  }

  private migration_001(): string {
    return `
      CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        email       TEXT NOT NULL UNIQUE,
        token       TEXT,
        created_at  TEXT DEFAULT (datetime('now')),
        updated_at  TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS clients (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        name              TEXT NOT NULL,
        slug              TEXT,
        address           TEXT,
        phone             TEXT,
        email             TEXT,
        amount_due        REAL DEFAULT 0,
        amount_payment    REAL DEFAULT 0,
        amount_solde      REAL DEFAULT 0,
        credit_disponible REAL DEFAULT 0,
        created_at        TEXT DEFAULT (datetime('now')),
        updated_at        TEXT DEFAULT (datetime('now')),
        ${this.syncColumns()}
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        slug_name  TEXT,
        address    TEXT,
        phone      TEXT,
        email      TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        ${this.syncColumns()}
      );

      CREATE TABLE IF NOT EXISTS articles (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        essence         TEXT NOT NULL,
        supplier_id     INTEGER REFERENCES suppliers(id),
        contract_number TEXT,
        indisponible    INTEGER DEFAULT 0,
        price_per_m3    REAL,
        category        TEXT,
        nombre_de_colis INTEGER DEFAULT 0,
        volume          REAL DEFAULT 0,
        created_at      TEXT DEFAULT (datetime('now')),
        updated_at      TEXT DEFAULT (datetime('now')),
        ${this.syncColumns()}
      );

      CREATE TABLE IF NOT EXISTS article_items (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id    INTEGER REFERENCES articles(id),
        numero_colis  TEXT,
        longueur      REAL,
        largeur       REAL,
        epaisseur     REAL,
        nombre_piece  INTEGER,
        volume        REAL,
        indisponible  INTEGER DEFAULT 0,
        created_at    TEXT DEFAULT (datetime('now')),
        updated_at    TEXT DEFAULT (datetime('now')),
        ${this.syncColumns()}
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id     INTEGER REFERENCES clients(id),
        date          TEXT NOT NULL,
        matricule     TEXT,
        sequence      INTEGER,
        total_price   REAL DEFAULT 0,
        montant_solde REAL DEFAULT 0,
        status        TEXT DEFAULT 'pending',
        created_at    TEXT DEFAULT (datetime('now')),
        updated_at    TEXT DEFAULT (datetime('now')),
        ${this.syncColumns()}
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id       INTEGER REFERENCES invoices(id),
        article_item_id  INTEGER REFERENCES article_items(id),
        article_id       INTEGER REFERENCES articles(id),
        price            REAL DEFAULT 0,
        total_price_item REAL DEFAULT 0,
        nombre_de_colis_vendu INTEGER,
        volume_vendu     REAL,
        created_at       TEXT DEFAULT (datetime('now')),
        updated_at       TEXT DEFAULT (datetime('now')),
        ${this.syncColumns()}
      );

      CREATE TABLE IF NOT EXISTS delivery_notes (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id   INTEGER REFERENCES clients(id),
        invoice_id  INTEGER REFERENCES invoices(id),
        date        TEXT NOT NULL,
        matricule   TEXT,
        sequence    INTEGER,
        total_price REAL DEFAULT 0,
        status      TEXT DEFAULT 'pending',
        notes       TEXT,
        created_at  TEXT DEFAULT (datetime('now')),
        updated_at  TEXT DEFAULT (datetime('now')),
        ${this.syncColumns()}
      );

      CREATE TABLE IF NOT EXISTS delivery_note_items (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        delivery_note_id     INTEGER REFERENCES delivery_notes(id),
        article_item_id      INTEGER REFERENCES article_items(id),
        article_id           INTEGER REFERENCES articles(id),
        price                REAL DEFAULT 0,
        total_price_item     REAL DEFAULT 0,
        nombre_de_colis_vendu INTEGER,
        volume_vendu         REAL,
        created_at           TEXT DEFAULT (datetime('now')),
        updated_at           TEXT DEFAULT (datetime('now')),
        ${this.syncColumns()}
      );

      CREATE TABLE IF NOT EXISTS payments (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id  INTEGER REFERENCES clients(id),
        amount     REAL NOT NULL,
        date       TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        ${this.syncColumns()}
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id        INTEGER REFERENCES clients(id),
        invoice_id       INTEGER REFERENCES invoices(id),
        type             TEXT NOT NULL,
        amount           REAL NOT NULL,
        transaction_date TEXT NOT NULL,
        old_transaction  TEXT,
        created_at       TEXT DEFAULT (datetime('now')),
        updated_at       TEXT DEFAULT (datetime('now')),
        ${this.syncColumns()}
      );

      CREATE TABLE IF NOT EXISTS caisse_transactions (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        type           TEXT NOT NULL CHECK(type IN ('entree','sortie')),
        amount         REAL NOT NULL,
        objet          TEXT NOT NULL,
        description    TEXT,
        payment_id     INTEGER REFERENCES payments(id),
        transaction_id INTEGER REFERENCES transactions(id),
        date           TEXT NOT NULL,
        created_at     TEXT DEFAULT (datetime('now')),
        updated_at     TEXT DEFAULT (datetime('now')),
        ${this.syncColumns()}
      );

      -- Table de suivi des conflits de synchronisation
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name    TEXT NOT NULL,
        local_id      INTEGER NOT NULL,
        server_record TEXT NOT NULL,
        local_record  TEXT NOT NULL,
        resolved      INTEGER DEFAULT 0,
        resolution    TEXT,
        created_at    TEXT DEFAULT (datetime('now'))
      );

      -- Table de queue des mutations offline
      CREATE TABLE IF NOT EXISTS sync_queue (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        idempotency_key  TEXT NOT NULL UNIQUE,
        table_name       TEXT NOT NULL,
        operation        TEXT NOT NULL CHECK(operation IN ('create','update','delete')),
        local_id         INTEGER NOT NULL,
        data             TEXT NOT NULL,
        client_timestamp TEXT NOT NULL,
        attempts         INTEGER DEFAULT 0,
        last_error       TEXT,
        created_at       TEXT DEFAULT (datetime('now'))
      );

      -- Index pour les queries de sync (recherche par updated_at)
      CREATE INDEX IF NOT EXISTS idx_clients_updated_at       ON clients(updated_at);
      CREATE INDEX IF NOT EXISTS idx_suppliers_updated_at     ON suppliers(updated_at);
      CREATE INDEX IF NOT EXISTS idx_articles_updated_at      ON articles(updated_at);
      CREATE INDEX IF NOT EXISTS idx_article_items_updated_at ON article_items(updated_at);
      CREATE INDEX IF NOT EXISTS idx_invoices_updated_at      ON invoices(updated_at);
      CREATE INDEX IF NOT EXISTS idx_payments_updated_at      ON payments(updated_at);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_table         ON sync_queue(table_name);
    `
  }

  // ── Méthodes génériques ────────────────────────────────────────────────

  getTableColumns(table: string): string[] {
    return this.all<{ name: string }>(`PRAGMA table_info("${table}")`).map((c) => c.name)
  }

  run(sql: string, params: unknown[] = []): Database.RunResult {
    return this.db.prepare(sql).run(...params)
  }

  get<T = unknown>(sql: string, params: unknown[] = []): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined
  }

  all<T = unknown>(sql: string, params: unknown[] = []): T[] {
    return this.db.prepare(sql).all(...params) as T[]
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)()
  }

  // ── Sync queue ────────────────────────────────────────────────────────────

  enqueueMutation(payload: {
    idempotencyKey: string
    table: string
    operation: 'create' | 'update' | 'delete'
    localId: number
    data: Record<string, unknown>
  }): void {
    this.run(
      `INSERT OR IGNORE INTO sync_queue
        (idempotency_key, table_name, operation, local_id, data, client_timestamp)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        payload.idempotencyKey,
        payload.table,
        payload.operation,
        payload.localId,
        JSON.stringify(payload.data),
      ]
    )
  }

  getPendingMutations(): Array<{
    id: number
    idempotency_key: string
    table_name: string
    operation: string
    local_id: number
    data: string
    client_timestamp: string
    attempts: number
  }> {
    return this.all(
      `SELECT * FROM sync_queue WHERE attempts < 5 ORDER BY created_at ASC LIMIT 200`
    )
  }

  markMutationSent(id: number): void {
    this.run(`DELETE FROM sync_queue WHERE id = ?`, [id])
  }

  markMutationFailed(id: number, error: string): void {
    this.run(
      `UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
      [error, id]
    )
  }

  getPendingCount(): number {
    const row = this.get<{ count: number }>('SELECT COUNT(*) as count FROM sync_queue')
    return row?.count ?? 0
  }

  // ── Gestion des conflits ──────────────────────────────────────────────────

  saveConflict(payload: {
    tableName: string
    localId: number
    serverRecord: unknown
    localRecord: unknown
  }): void {
    this.run(
      `INSERT INTO sync_conflicts (table_name, local_id, server_record, local_record)
       VALUES (?, ?, ?, ?)`,
      [
        payload.tableName,
        payload.localId,
        JSON.stringify(payload.serverRecord),
        JSON.stringify(payload.localRecord),
      ]
    )
  }

  getUnresolvedConflicts(): unknown[] {
    return this.all(`SELECT * FROM sync_conflicts WHERE resolved = 0 ORDER BY created_at DESC`)
  }

  resolveConflict(conflictId: number, resolution: 'keep_local' | 'keep_server'): void {
    this.run(
      `UPDATE sync_conflicts SET resolved = 1, resolution = ? WHERE id = ?`,
      [resolution, conflictId]
    )
  }
}
