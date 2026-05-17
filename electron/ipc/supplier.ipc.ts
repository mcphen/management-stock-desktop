import { DatabaseService } from '../services/database.service'
import { SyncService } from '../services/sync.service'
import { registerCrudIpc } from './base.ipc'

export function registerSupplierIpc(db: DatabaseService, sync: SyncService): void {
  registerCrudIpc('suppliers', 'suppliers', db, sync)
}
