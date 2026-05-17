import { DatabaseService } from '../services/database.service'
import { SyncService } from '../services/sync.service'
import { registerCrudIpc } from './base.ipc'

export function registerDeliveryNoteIpc(db: DatabaseService, sync: SyncService): void {
  registerCrudIpc('delivery-notes', 'delivery_notes', db, sync)
}
