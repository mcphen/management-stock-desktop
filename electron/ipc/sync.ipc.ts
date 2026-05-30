import { ipcMain } from 'electron'
import { SyncService } from '../services/sync.service'
import { NetworkService } from '../services/network.service'
import { parse, PositiveInt } from './schemas'
import { z } from 'zod'

const ResolutionSchema = z.enum(['keep_local', 'keep_server'])

export function registerSyncIpc(sync: SyncService, network: NetworkService): void {
  ipcMain.handle('sync:now', async () => {
    if (!network.isOnline) {
      return { success: false, message: 'Hors ligne — sync impossible.' }
    }
    const result = await sync.syncAll()
    return { success: true, ...result }
  })

  ipcMain.handle('sync:getStatus', () => ({
    isOnline:    network.isOnline,
    lastSyncedAt: sync.lastSyncedAt,
    serverUrl:    sync.serverUrl,
  }))

  ipcMain.handle('sync:getPendingCount', (_event) => {
    return sync['db'].getPendingCount()
  })

  ipcMain.handle('sync:resolveConflict', (_event, conflictId: number, resolution: unknown) => {
    parse(PositiveInt, conflictId, 'sync:resolveConflict conflictId')
    const res = parse(ResolutionSchema, resolution, 'sync:resolveConflict resolution')
    sync['db'].resolveConflict(conflictId, res)
    return { success: true }
  })

  ipcMain.handle('sync:resetFull', async () => {
    sync.resetLastSyncedAt()
    if (!network.isOnline) {
      return { success: false, message: 'Hors ligne — sync impossible.' }
    }
    const result = await sync.syncAll()
    return { success: true, ...result }
  })
}
