import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseService } from '../services/database.service'
import { SyncService } from '../services/sync.service'
import { parse, PositiveInt } from './schemas'
import { CaisseAccountCreateSchema, CaisseAccountUpdateSchema } from './schemas'

interface CaisseRow {
  id: number
  name: string
  type: string | null
  currency_code: string | null
  initial_balance: number
  active: number
  server_id: number | null
  sync_status: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

function withBalance(db: DatabaseService, c: CaisseRow) {
  const entrees = db.get<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM caisse_transactions
     WHERE caisse_id = ? AND type = 'entree' AND deleted_at IS NULL`,
    [c.id],
  )?.total ?? 0

  const sorties = db.get<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM caisse_transactions
     WHERE caisse_id = ? AND type = 'sortie' AND deleted_at IS NULL`,
    [c.id],
  )?.total ?? 0

  return {
    ...c,
    active: Boolean(c.active),
    balance_with_initial: (c.initial_balance ?? 0) + entrees - sorties,
  }
}

export function registerCaissesIpc(db: DatabaseService, _sync: SyncService): void {
  // LIST — avec calcul du solde par caisse
  ipcMain.handle('caisses:list', (_event, params: Record<string, unknown> = {}) => {
    let sql = `SELECT * FROM caisses WHERE deleted_at IS NULL`
    const args: unknown[] = []

    if (params['search']) {
      sql += ` AND (name LIKE ? OR type LIKE ? OR currency_code LIKE ?)`
      const s = `%${params['search']}%`
      args.push(s, s, s)
    }

    if (params['active'] !== undefined && params['active'] !== '') {
      sql += ` AND active = ?`
      args.push(params['active'] ? 1 : 0)
    }

    sql += ` ORDER BY updated_at DESC`

    const rows = db.all<CaisseRow>(sql, args)
    return rows.map(c => withBalance(db, c))
  })

  // GET
  ipcMain.handle('caisses:get', (_event, id: number) => {
    parse(PositiveInt, id, 'caisses:get id')
    const row = db.get<CaisseRow>(`SELECT * FROM caisses WHERE id = ? AND deleted_at IS NULL`, [id])
    if (!row) return undefined
    return withBalance(db, row)
  })

  // CREATE
  ipcMain.handle('caisses:create', (_event, data: Record<string, unknown>) => {
    const validated = parse(CaisseAccountCreateSchema, data, 'caisses:create')
    const now = new Date().toISOString()

    const payload: Record<string, unknown> = {
      name:            validated.name,
      type:            validated.type ?? null,
      currency_code:   validated.currency_code ?? 'XOF',
      initial_balance: validated.initial_balance ?? 0,
      active:          validated.active !== undefined ? (validated.active ? 1 : 0) : 1,
    }

    const columns = ['created_at', 'updated_at', 'sync_status', 'local_uuid', ...Object.keys(payload)]
    const values  = [now, now, 'pending', uuidv4(), ...Object.values(payload)]

    const result = db.run(
      `INSERT INTO caisses (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      values,
    )

    const id = result.lastInsertRowid as number

    db.enqueueMutation({
      idempotencyKey: uuidv4(),
      table:          'caisses',
      operation:      'create',
      localId:        id,
      data:           { ...payload, created_at: now, updated_at: now },
    })

    const row = db.get<CaisseRow>(`SELECT * FROM caisses WHERE id = ?`, [id])!
    return withBalance(db, row)
  })

  // UPDATE
  ipcMain.handle('caisses:update', (_event, id: number, data: Record<string, unknown>) => {
    parse(PositiveInt, id, 'caisses:update id')
    const validated = parse(CaisseAccountUpdateSchema, data, 'caisses:update')

    const payload: Record<string, unknown> = {}
    if (validated.name !== undefined)            payload['name']            = validated.name
    if (validated.type !== undefined)            payload['type']            = validated.type
    if (validated.currency_code !== undefined)   payload['currency_code']   = validated.currency_code
    if (validated.initial_balance !== undefined) payload['initial_balance'] = validated.initial_balance
    if (validated.active !== undefined)          payload['active']          = validated.active ? 1 : 0

    const now  = new Date().toISOString()
    const sets = Object.keys(payload).map(k => `${k} = ?`).join(', ')

    db.run(
      `UPDATE caisses SET ${sets}, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
      [...Object.values(payload), now, id],
    )

    const record = db.get<CaisseRow>(`SELECT * FROM caisses WHERE id = ?`, [id])!

    db.enqueueMutation({
      idempotencyKey: uuidv4(),
      table:          'caisses',
      operation:      'update',
      localId:        id,
      data:           { ...payload, server_id: record.server_id, updated_at: now },
    })

    return withBalance(db, record)
  })

  // DELETE (soft)
  ipcMain.handle('caisses:delete', (_event, id: number) => {
    parse(PositiveInt, id, 'caisses:delete id')

    const record = db.get<CaisseRow>(`SELECT * FROM caisses WHERE id = ? AND deleted_at IS NULL`, [id])
    if (!record) return { success: false, message: 'Introuvable.' }

    const now = new Date().toISOString()

    db.run(
      `UPDATE caisses SET deleted_at = ?, sync_status = 'deleted_pending' WHERE id = ?`,
      [now, id],
    )

    db.enqueueMutation({
      idempotencyKey: uuidv4(),
      table:          'caisses',
      operation:      'delete',
      localId:        id,
      data:           { server_id: record.server_id },
    })

    return { success: true }
  })
}
