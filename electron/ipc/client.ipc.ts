import { ipcMain } from 'electron'
import { DatabaseService } from '../services/database.service'
import { SyncService } from '../services/sync.service'
import { registerCrudIpc } from './base.ipc'
import { parse, PositiveInt, ClientCreateSchema, ClientUpdateSchema } from './schemas'

export function registerClientIpc(db: DatabaseService, sync: SyncService): void {
  registerCrudIpc('clients', 'clients', db, sync, {
    createSchema: ClientCreateSchema,
    updateSchema: ClientUpdateSchema,
  })

  ipcMain.handle('clients:balance', (_event, id: number) => {
    parse(PositiveInt, id, 'clients:balance id')

    const invoicesSum = db.get<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE client_id = ? AND type = 'invoice' AND deleted_at IS NULL`,
      [id]
    )?.total ?? 0

    const paymentsSum = db.get<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE client_id = ? AND type = 'payment' AND deleted_at IS NULL`,
      [id]
    )?.total ?? 0

    const client = db.get<{ credit_disponible: number }>(
      `SELECT credit_disponible FROM clients WHERE id = ?`,
      [id]
    )

    return {
      client_id:  id,
      total_due:  invoicesSum,
      total_paid: paymentsSum,
      balance:    invoicesSum - paymentsSum,
      credit:     client?.credit_disponible ?? 0,
    }
  })
}
