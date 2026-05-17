import { ipcMain } from 'electron'
import { SyncService } from '../services/sync.service'
import { NetworkService } from '../services/network.service'

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

  ipcMain.handle('sync:resolveConflict', (_event, conflictId: number, resolution: 'keep_local' | 'keep_server') => {
    sync['db'].resolveConflict(conflictId, resolution)
    return { success: true }
  })
}
