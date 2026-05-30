import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseService } from '../services/database.service'
import { SyncService } from '../services/sync.service'
import { parse, PositiveInt, MonthlyExpenseCreateSchema, MonthlyExpenseUpdateSchema } from './schemas'

interface MonthlyExpenseRow {
  id: number
  month: number
  year: number
  amount: number
  user_id: number | null
  server_id: number | null
  sync_status: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export function registerMonthlyExpensesIpc(db: DatabaseService, _sync: SyncService): void {
  // LIST
  ipcMain.handle('monthly-expenses:list', (_event, params: Record<string, unknown> = {}) => {
    let sql = `SELECT * FROM monthly_expenses WHERE deleted_at IS NULL`
    const args: unknown[] = []

    if (params['year']) {
      sql += ` AND year = ?`
      args.push(params['year'])
    }

    if (params['month']) {
      sql += ` AND month = ?`
      args.push(params['month'])
    }

    sql += ` ORDER BY year DESC, month DESC`

    const rows = db.all<MonthlyExpenseRow>(sql, args)
    const total = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0)

    return { data: rows, total }
  })

  // GET
  ipcMain.handle('monthly-expenses:get', (_event, id: number) => {
    parse(PositiveInt, id, 'monthly-expenses:get id')
    return db.get<MonthlyExpenseRow>(
      `SELECT * FROM monthly_expenses WHERE id = ? AND deleted_at IS NULL`,
      [id],
    )
  })

  // CREATE
  ipcMain.handle('monthly-expenses:create', (_event, data: Record<string, unknown>) => {
    const validated = parse(MonthlyExpenseCreateSchema, data, 'monthly-expenses:create')
    const now = new Date().toISOString()

    const currentUser = db.get<{ id: number }>(`SELECT id FROM users LIMIT 1`)

    const payload = {
      month:   validated.month,
      year:    validated.year,
      amount:  validated.amount,
      user_id: currentUser?.id ?? null,
    }

    const columns = ['created_at', 'updated_at', 'sync_status', 'local_uuid', ...Object.keys(payload)]
    const values  = [now, now, 'pending', uuidv4(), ...Object.values(payload)]

    const result = db.run(
      `INSERT INTO monthly_expenses (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      values,
    )

    const id = result.lastInsertRowid as number

    db.enqueueMutation({
      idempotencyKey: uuidv4(),
      table:          'monthly_expenses',
      operation:      'create',
      localId:        id,
      data:           { ...payload, created_at: now, updated_at: now },
    })

    return db.get<MonthlyExpenseRow>(`SELECT * FROM monthly_expenses WHERE id = ?`, [id])
  })

  // UPDATE
  ipcMain.handle('monthly-expenses:update', (_event, id: number, data: Record<string, unknown>) => {
    parse(PositiveInt, id, 'monthly-expenses:update id')
    const validated = parse(MonthlyExpenseUpdateSchema, data, 'monthly-expenses:update')

    const currentUser = db.get<{ id: number }>(`SELECT id FROM users LIMIT 1`)

    const payload: Record<string, unknown> = {}
    if (validated.month  !== undefined) payload['month']  = validated.month
    if (validated.year   !== undefined) payload['year']   = validated.year
    if (validated.amount !== undefined) payload['amount'] = validated.amount
    if (currentUser?.id)                payload['user_id'] = currentUser.id

    const now  = new Date().toISOString()
    const sets = Object.keys(payload).map(k => `${k} = ?`).join(', ')

    db.run(
      `UPDATE monthly_expenses SET ${sets}, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
      [...Object.values(payload), now, id],
    )

    const record = db.get<MonthlyExpenseRow>(`SELECT * FROM monthly_expenses WHERE id = ?`, [id])!

    db.enqueueMutation({
      idempotencyKey: uuidv4(),
      table:          'monthly_expenses',
      operation:      'update',
      localId:        id,
      data:           { ...payload, server_id: record.server_id, updated_at: now },
    })

    return record
  })

  // DELETE (soft)
  ipcMain.handle('monthly-expenses:delete', (_event, id: number) => {
    parse(PositiveInt, id, 'monthly-expenses:delete id')

    const record = db.get<MonthlyExpenseRow>(
      `SELECT * FROM monthly_expenses WHERE id = ? AND deleted_at IS NULL`,
      [id],
    )
    if (!record) return { success: false, message: 'Introuvable.' }

    const now = new Date().toISOString()

    db.run(
      `UPDATE monthly_expenses SET deleted_at = ?, sync_status = 'deleted_pending' WHERE id = ?`,
      [now, id],
    )

    db.enqueueMutation({
      idempotencyKey: uuidv4(),
      table:          'monthly_expenses',
      operation:      'delete',
      localId:        id,
      data:           { server_id: record.server_id },
    })

    return { success: true }
  })
}
