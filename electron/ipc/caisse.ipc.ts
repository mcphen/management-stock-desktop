import { ipcMain } from 'electron'
import { DatabaseService } from '../services/database.service'
import { SyncService } from '../services/sync.service'
import { registerCrudIpc } from './base.ipc'

export function registerCaisseIpc(db: DatabaseService, sync: SyncService): void {
  registerCrudIpc('caisse', 'caisse_transactions', db, sync)

  ipcMain.handle('caisse:solde', () => {
    const entrees = db.get<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM caisse_transactions WHERE type = 'entree' AND deleted_at IS NULL`
    )?.total ?? 0

    const sorties = db.get<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM caisse_transactions WHERE type = 'sortie' AND deleted_at IS NULL`
    )?.total ?? 0

    return { entrees, sorties, solde: entrees - sorties }
  })
}
