import { ipcMain, app, shell } from 'electron'
import { join } from 'path'
import { SyncService } from '../services/sync.service'
import { NetworkService } from '../services/network.service'

export function registerSettingsIpc(sync: SyncService, network: NetworkService): void {
  ipcMain.handle('settings:get', () => ({
    serverUrl: sync.serverUrl,
    version:   app.getVersion(),
    appName:   app.getName(),
    logPath:   join(app.getPath('userData'), 'logs', 'main.log'),
  }))

  ipcMain.handle('settings:openLogFolder', () => {
    shell.openPath(join(app.getPath('userData'), 'logs'))
  })

  ipcMain.handle('settings:setServerUrl', (_event, url: string) => {
    try {
      new URL(url)
    } catch {
      return { success: false, error: 'URL invalide — exemple : http://monserveur.com/api/v1' }
    }
    const clean = url.replace(/\/+$/, '')
    sync.setServerUrl(clean)
    network.setCheckUrl(`${clean}/sync/status`)
    return { success: true }
  })

  ipcMain.handle('settings:testConnection', async (_event, url?: string) => {
    const target = url
      ? `${url.replace(/\/+$/, '')}/sync/status`
      : `${sync.serverUrl}/sync/status`
    const online = await network.testUrl(target)
    return { online }
  })
}
