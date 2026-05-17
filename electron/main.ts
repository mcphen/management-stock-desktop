import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { DatabaseService } from './services/database.service'
import { SyncService } from './services/sync.service'
import { CryptoService } from './services/crypto.service'
import { NetworkService } from './services/network.service'
import { registerAuthIpc } from './ipc/auth.ipc'
import { registerClientIpc } from './ipc/client.ipc'
import { registerSupplierIpc } from './ipc/supplier.ipc'
import { registerArticleIpc } from './ipc/article.ipc'
import { registerInvoiceIpc } from './ipc/invoice.ipc'
import { registerDeliveryNoteIpc } from './ipc/delivery-note.ipc'
import { registerPaymentIpc } from './ipc/payment.ipc'
import { registerCaisseIpc } from './ipc/caisse.ipc'
import { registerSyncIpc } from './ipc/sync.ipc'
import { registerSettingsIpc } from './ipc/settings.ipc'
import { setupUpdater } from './ipc/updater.ipc'
import { setupLogger, log } from './services/logger.service'

let mainWindow: BrowserWindow | null = null

// Services — instanciés DANS bootstrap(), après app.whenReady()
let db:      DatabaseService
let crypto:  CryptoService
let network: NetworkService
let sync:    SyncService

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload:          join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          true,
      webSecurity:      true,
    },
    show: false,
    backgroundColor: '#f9fafb',
  })

  // CSP via en-têtes de réponse
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:* https://*;",
        ],
      },
    })
  })

  const devUrl = process.env['VITE_DEV_SERVER_URL']
  if (devUrl) {
    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => { mainWindow = null })
}

async function bootstrap(): Promise<void> {
  setupLogger()
  log.info('Bootstrap démarré')

  db      = new DatabaseService()
  crypto  = new CryptoService()
  network = new NetworkService()
  sync    = new SyncService(db, crypto, network)

  await db.initialize()
  log.info('Base de données initialisée')

  await crypto.initialize()
  sync.initialize()
  log.info(`Sync initialisé — serveur: ${sync.serverUrl}`)

  // Enregistrement des IPC handlers
  registerAuthIpc(db, crypto, sync)
  registerClientIpc(db, sync)
  registerSupplierIpc(db, sync)
  registerArticleIpc(db, sync)
  registerInvoiceIpc(db, sync)
  registerDeliveryNoteIpc(db, sync)
  registerPaymentIpc(db, sync)
  registerCaisseIpc(db, sync)
  registerSyncIpc(sync, network)
  registerSettingsIpc(sync, network)

  // Impression via webContents (window.print() non supporté dans Electron)
  ipcMain.handle('app:print', () => {
    if (!mainWindow) return
    mainWindow.webContents.print({ silent: false, printBackground: true })
  })

  createWindow()
  setupUpdater(() => mainWindow)

  // Polling connectivité et auto-sync
  network.startPolling(10_000)
  network.onConnectivityChange((isOnline) => {
    log.info(`Connectivité changée — online=${isOnline}`)
    mainWindow?.webContents.send('network:status', { online: isOnline })
    if (isOnline) {
      sync.syncAll((event, data) => mainWindow?.webContents.send(event, data))
        .catch((err: Error) => log.error('Sync auto échouée', err.message))
    }
  })

  sync.startAutoSync(30_000, (event, data) => {
    mainWindow?.webContents.send(event, data)
  })
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  log.info('Fenêtre fermée — arrêt de l\'app')
  sync?.stopAutoSync()
  network?.stopPolling()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// Bloquer la navigation externe
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      event.preventDefault()
    }
  })
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
})
