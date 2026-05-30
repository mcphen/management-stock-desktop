import { DatabaseService } from '../services/database.service'
import { SyncService } from '../services/sync.service'
import { registerCrudIpc } from './base.ipc'
import { SupplierCreateSchema, SupplierUpdateSchema } from './schemas'

export function registerSupplierIpc(db: DatabaseService, sync: SyncService): void {
  registerCrudIpc('suppliers', 'suppliers', db, sync, {
    createSchema: SupplierCreateSchema,
    updateSchema: SupplierUpdateSchema,
  })
}
