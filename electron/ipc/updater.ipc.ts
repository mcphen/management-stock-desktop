import { ipcMain, BrowserWindow, app } from 'electron'
import { autoUpdater, UpdateInfo } from 'electron-updater'
import { log } from '../services/logger.service'

const isDev = !!process.env['VITE_DEV_SERVER_URL']

export function setupUpdater(getWindow: () => BrowserWindow | null): void {
  // En mode dev, on expose des handlers no-op pour ne pas casser le preload
  if (isDev) {
    ipcMain.handle('updater:check', () => ({ available: false, devMode: true }))
    ipcMain.handle('updater:download', () => ({}))
    ipcMain.handle('updater:install', () => ({}))
    return
  }

  process.env['GH_TOKEN'] = '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'

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info(`Mise à jour disponible — version=${info.version}`)
    getWindow()?.webContents.send('updater:available', {
      version:      info.version,
      releaseNotes: info.releaseNotes ?? null,
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log.info(`Mise à jour téléchargée — version=${info.version}`)
    getWindow()?.webContents.send('updater:downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err: Error) => {
    log.error('[updater]', err.message)
  })

  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      if (!result) return { available: false }
      const current = app.getVersion()
      const latest  = result.updateInfo.version
      const available = latest !== current
      return { available, version: latest }
    } catch {
      return { available: false }
    }
  })

  ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate())

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // Vérification automatique 15 secondes après le démarrage
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => { /* pas de réseau, silencieux */ })
  }, 15_000)
}
