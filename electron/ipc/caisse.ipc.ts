import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseService } from '../services/database.service'
import { SyncService } from '../services/sync.service'
import { registerCrudIpc } from './base.ipc'
import { CaisseCreateSchema } from './schemas'

interface CaisseTxnRow {
  id: number
  payment_id: number | null
  caisse_id: number | null
  objet: string
  amount: number
  date: string
}

export function registerCaisseIpc(db: DatabaseService, sync: SyncService): void {
  registerCrudIpc('caisse', 'caisse_transactions', db, sync, {
    createSchema: CaisseCreateSchema,
  })

  ipcMain.handle('caisse:solde', () => {
    const entrees = db.get<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM caisse_transactions WHERE type = 'entree' AND deleted_at IS NULL`
    )?.total ?? 0

    const sorties = db.get<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM caisse_transactions WHERE type = 'sortie' AND deleted_at IS NULL`
    )?.total ?? 0

    return { entrees, sorties, solde: entrees - sorties }
  })

  ipcMain.handle('caisse:summary', (_event, caisseId: number) => {
    const q = (sql: string, args: unknown[]) =>
      db.get<{ total: number }>(sql, args)?.total ?? 0

    const base = `FROM caisse_transactions WHERE caisse_id = ? AND deleted_at IS NULL`
    const isTransferIn  = `AND type = 'entree' AND objet LIKE 'Transfert de%'`
    const isTransferOut = `AND type = 'sortie' AND objet LIKE 'Transfert vers%'`
    const isRegularIn   = `AND type = 'entree' AND (objet NOT LIKE 'Transfert de%' OR objet IS NULL)`
    const isRegularOut  = `AND type = 'sortie' AND (objet NOT LIKE 'Transfert vers%' OR objet IS NULL)`

    const entrees           = q(`SELECT COALESCE(SUM(amount),0) as total ${base} ${isRegularIn}`,  [caisseId])
    const sorties           = q(`SELECT COALESCE(SUM(amount),0) as total ${base} ${isRegularOut}`, [caisseId])
    const transfers_in      = q(`SELECT COALESCE(SUM(amount),0) as total ${base} ${isTransferIn}`, [caisseId])
    const transfers_out     = q(`SELECT COALESCE(SUM(amount),0) as total ${base} ${isTransferOut}`,[caisseId])

    return { entrees, sorties, transfers_in, transfers_out }
  })

  ipcMain.handle('caisse:listByCaisse', (_event, caisseId: number, params: Record<string, unknown> = {}) => {
    let sql = `SELECT * FROM caisse_transactions WHERE caisse_id = ? AND deleted_at IS NULL`
    const args: unknown[] = [caisseId]

    if (params['type'])       { sql += ` AND type = ?`; args.push(params['type']) }
    if (params['start_date']) { sql += ` AND date >= ?`; args.push(params['start_date']) }
    if (params['end_date'])   { sql += ` AND date <= ?`; args.push(params['end_date']) }

    sql += ` ORDER BY date ASC, id ASC`
    return db.all(sql, args)
  })

  ipcMain.handle('caisse:transfer', (_event, payload: {
    source_caisse_id: number
    destination_caisse_id: number
    amount_source: number
    exchange_rate?: number | null
    amount_destination?: number | null
    description?: string
    transfer_date: string
  }) => {
    const { source_caisse_id, destination_caisse_id, amount_source, amount_destination, description, transfer_date } = payload
    const src  = db.get<{ name: string }>('SELECT name FROM caisses WHERE id = ?', [source_caisse_id])
    const dest = db.get<{ name: string }>('SELECT name FROM caisses WHERE id = ?', [destination_caisse_id])
    if (!src || !dest) throw new Error('Caisse introuvable.')

    // Si FX: montant destination peut différer du montant source
    const amountDest = amount_destination ?? amount_source
    const now = new Date().toISOString()

    const sortieResult = db.run(
      `INSERT INTO caisse_transactions (type, amount, objet, description, date, caisse_id, created_at, updated_at, sync_status, local_uuid)
       VALUES ('sortie', ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [amount_source, `Transfert vers ${dest.name}`, description || null, transfer_date, source_caisse_id, now, now, uuidv4()]
    )
    db.enqueueMutation({ idempotencyKey: uuidv4(), table: 'caisse_transactions', operation: 'create', localId: sortieResult.lastInsertRowid as number, data: { type: 'sortie', amount: amount_source, objet: `Transfert vers ${dest.name}`, description: description || null, date: transfer_date, caisse_id: source_caisse_id, created_at: now, updated_at: now } })

    const entreeResult = db.run(
      `INSERT INTO caisse_transactions (type, amount, objet, description, date, caisse_id, created_at, updated_at, sync_status, local_uuid)
       VALUES ('entree', ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [amountDest, `Transfert de ${src.name}`, description || null, transfer_date, destination_caisse_id, now, now, uuidv4()]
    )
    db.enqueueMutation({ idempotencyKey: uuidv4(), table: 'caisse_transactions', operation: 'create', localId: entreeResult.lastInsertRowid as number, data: { type: 'entree', amount: amountDest, objet: `Transfert de ${src.name}`, description: description || null, date: transfer_date, caisse_id: destination_caisse_id, created_at: now, updated_at: now } })

    return { success: true }
  })

  // ── Corriger paiement client ──────────────────────────────────────────────
  ipcMain.handle('caisse:correctPayment', (_event, payload: {
    transaction_id: number
    amount: number
    date: string
    description?: string | null
    reason?: string | null
  }) => {
    const { transaction_id, amount, date, description } = payload
    const txn = db.get<CaisseTxnRow>(
      'SELECT id, payment_id, caisse_id, objet, amount, date FROM caisse_transactions WHERE id = ? AND deleted_at IS NULL',
      [transaction_id]
    )
    if (!txn) throw new Error('Transaction introuvable.')

    const now = new Date().toISOString()

    db.run(
      'UPDATE caisse_transactions SET amount = ?, date = ?, description = ?, updated_at = ?, sync_status = ? WHERE id = ?',
      [amount, date, description || null, now, 'pending', transaction_id]
    )
    db.enqueueMutation({
      idempotencyKey: uuidv4(), table: 'caisse_transactions', operation: 'update',
      localId: transaction_id,
      data: { amount, date, description: description || null, updated_at: now },
    })

    if (txn.payment_id) {
      db.run(
        'UPDATE payments SET amount = ?, date = ?, updated_at = ?, sync_status = ? WHERE id = ?',
        [amount, date, now, 'pending', txn.payment_id]
      )
      db.enqueueMutation({
        idempotencyKey: uuidv4(), table: 'payments', operation: 'update',
        localId: txn.payment_id,
        data: { amount, date, updated_at: now },
      })
    }

    return { success: true }
  })

  // ── Supprimer paiement client (transaction + payment liés) ────────────────
  ipcMain.handle('caisse:deletePayment', (_event, transactionId: number) => {
    const txn = db.get<CaisseTxnRow>(
      'SELECT id, payment_id FROM caisse_transactions WHERE id = ? AND deleted_at IS NULL',
      [transactionId]
    )
    if (!txn) throw new Error('Transaction introuvable.')

    const now = new Date().toISOString()

    db.run(
      'UPDATE caisse_transactions SET deleted_at = ?, sync_status = ? WHERE id = ?',
      [now, 'deleted_pending', transactionId]
    )
    db.enqueueMutation({
      idempotencyKey: uuidv4(), table: 'caisse_transactions', operation: 'delete',
      localId: transactionId, data: {},
    })

    if (txn.payment_id) {
      db.run(
        'UPDATE payments SET deleted_at = ?, sync_status = ? WHERE id = ?',
        [now, 'deleted_pending', txn.payment_id]
      )
      db.enqueueMutation({
        idempotencyKey: uuidv4(), table: 'payments', operation: 'delete',
        localId: txn.payment_id, data: {},
      })
    }

    return { success: true }
  })
}
