import { DatabaseService } from '../services/database.service'
import { SyncService } from '../services/sync.service'
import { registerCrudIpc } from './base.ipc'
import { PaymentCreateSchema } from './schemas'

export function registerPaymentIpc(db: DatabaseService, sync: SyncService): void {
  registerCrudIpc('payments', 'payments', db, sync, {
    createSchema: PaymentCreateSchema,
  })
}
