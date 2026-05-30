import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { writeFile } from 'fs/promises'
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
import { registerCaissesIpc } from './ipc/caisses.ipc'
import { registerCaisseIpc } from './ipc/caisse.ipc'
import { registerMonthlyExpensesIpc } from './ipc/monthly-expenses.ipc'
import { registerDashboardIpc } from './ipc/dashboard.ipc'
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

const ZOOM_STEP = 0.1
const MIN_ZOOM_FACTOR = 0.5
const MAX_ZOOM_FACTOR = 2

function loadRenderer(window: BrowserWindow): void {
  const devUrl = process.env['VITE_DEV_SERVER_URL']
  if (devUrl) {
    window.loadURL(devUrl)
    window.webContents.openDevTools()
  } else {
    window.loadFile(join(__dirname, '../dist/index.html'))
  }
}

function reloadRenderer(window: BrowserWindow): void {
  if (window.isDestroyed()) return
  loadRenderer(window)
}

function printWindow(window: BrowserWindow): void {
  if (window.isDestroyed()) return
  window.webContents.print({ silent: false, printBackground: true })
}

function sanitizePdfFileName(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || 'document'
}

async function exportWindowToPdf(window: BrowserWindow, fileName = 'document'): Promise<{ canceled: boolean; filePath?: string }> {
  if (window.isDestroyed()) return { canceled: true }

  const defaultPath = join(app.getPath('documents'), `${sanitizePdfFileName(fileName)}.pdf`)
  const result = await dialog.showSaveDialog(window, {
    title: 'Exporter en PDF',
    defaultPath,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })

  if (result.canceled || !result.filePath) return { canceled: true }

  const pdf = await window.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    margins: {
      marginType: 'default',
    },
  })

  await writeFile(result.filePath, pdf)
  return { canceled: false, filePath: result.filePath }
}

async function exportInvoicePdfFromServer(invoiceId: number): Promise<{ canceled: boolean; filePath?: string; error?: string }> {
  const window = mainWindow
  if (!window || window.isDestroyed()) return { canceled: true }

  const invoice = db.get<{ id: number; server_id: number | null; matricule: string | null }>(
    'SELECT id, server_id, matricule FROM invoices WHERE id = ? AND deleted_at IS NULL',
    [invoiceId],
  )

  if (!invoice) {
    return { canceled: false, error: 'Facture introuvable.' }
  }

  if (!invoice.server_id) {
    return {
      canceled: false,
      error: 'Cette facture doit etre synchronisee avant de generer le PDF officiel.',
    }
  }

  const token = await crypto.getToken()
  if (!token) {
    return { canceled: false, error: 'Session expiree. Reconnectez-vous avant de generer le PDF.' }
  }

  const fileName = sanitizePdfFileName(`SAMABOIS-${invoice.matricule ?? `facture-${invoice.id}`}`)
  const result = await dialog.showSaveDialog(window, {
    title: 'Exporter la facture en PDF',
    defaultPath: join(app.getPath('documents'), `${fileName}.pdf`),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })

  if (result.canceled || !result.filePath) return { canceled: true }

  const response = await fetch(`${sync.serverUrl.replace(/\/+$/, '')}/invoices/${invoice.server_id}/pdf`, {
    headers: {
      Accept: 'application/pdf',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    return {
      canceled: false,
      error: `Generation PDF impossible cote serveur (${response.status}).`,
    }
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/pdf')) {
    return { canceled: false, error: "Le serveur n'a pas retourne un PDF valide." }
  }

  const pdf = Buffer.from(await response.arrayBuffer())
  await writeFile(result.filePath, pdf)

  return { canceled: false, filePath: result.filePath }
}

function quitApplication(): void {
  sync?.stopAutoSync()
  network?.stopPolling()
  app.quit()
}

function setZoom(window: BrowserWindow, factor: number): void {
  const nextFactor = Math.min(MAX_ZOOM_FACTOR, Math.max(MIN_ZOOM_FACTOR, factor))
  window.webContents.setZoomFactor(nextFactor)
}

function adjustZoom(window: BrowserWindow, delta: number): void {
  setZoom(window, window.webContents.getZoomFactor() + delta)
}

function installWindowShortcuts(window: BrowserWindow): void {
  window.webContents.on('before-input-event', (event, input) => {
    const cmdOrCtrl = input.control || input.meta
    const key = input.key.toLowerCase()

    if (cmdOrCtrl && key === 'p') {
      event.preventDefault()
      printWindow(window)
      return
    }

    if (cmdOrCtrl && input.shift && key === 'r') {
      event.preventDefault()
      window.webContents.reloadIgnoringCache()
      return
    }

    if (input.key === 'F5' || (cmdOrCtrl && key === 'r')) {
      event.preventDefault()
      reloadRenderer(window)
      return
    }

    if (cmdOrCtrl && key === 'q') {
      event.preventDefault()
      quitApplication()
      return
    }

    if (input.key === 'F11') {
      event.preventDefault()
      window.setFullScreen(!window.isFullScreen())
      return
    }

    if (cmdOrCtrl && (key === '+' || key === '=')) {
      event.preventDefault()
      adjustZoom(window, ZOOM_STEP)
      return
    }

    if (cmdOrCtrl && key === '-') {
      event.preventDefault()
      adjustZoom(window, -ZOOM_STEP)
      return
    }

    if (cmdOrCtrl && key === '0') {
      event.preventDefault()
      setZoom(window, 1)
      return
    }

    if (process.env['VITE_DEV_SERVER_URL'] && cmdOrCtrl && input.shift && key === 'i') {
      event.preventDefault()
      window.webContents.toggleDevTools()
    }
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function loadRendererGonePage(window: BrowserWindow, details: Electron.RenderProcessGoneDetails): void {
  const reason = escapeHtml(details.reason)
  const exitCode = details.exitCode === undefined ? '' : `<p class="meta">Code de sortie : ${details.exitCode}</p>`
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gestion Stock - Erreur</title>
  <style>
    html, body { min-height: 100%; margin: 0; background: #f9fafb; }
    body { display: grid; place-items: center; padding: 32px; color: #0f172a; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    main { width: min(100%, 520px); border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; padding: 28px; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08); }
    .eyebrow { margin: 0 0 12px; color: #2563eb; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    h1 { margin: 0; font-size: 24px; line-height: 1.2; }
    p { margin: 12px 0 0; color: #475569; line-height: 1.55; }
    .meta { color: #64748b; font-size: 13px; }
    button { margin-top: 24px; border: 0; border-radius: 8px; background: #2563eb; color: #fff; padding: 10px 16px; font: inherit; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <main role="alert">
    <p class="eyebrow">Gestion Stock</p>
    <h1>L'interface a cesse de repondre</h1>
    <p>Le moteur d'affichage a ete interrompu. Vous pouvez recharger l'application pour reprendre votre travail.</p>
    <p class="meta">Raison : ${reason}</p>
    ${exitCode}
    <button id="reload" type="button">Recharger</button>
  </main>
  <script>
    document.getElementById('reload').addEventListener('click', function () {
      if (window.electron && window.electron.reload) {
        window.electron.reload()
      } else {
        window.location.reload()
      }
    })
  </script>
</body>
</html>`

  window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
}

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

  loadRenderer(mainWindow)
  installWindowShortcuts(mainWindow)

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
  registerCaissesIpc(db, sync)
  registerCaisseIpc(db, sync)
  registerMonthlyExpensesIpc(db, sync)
  registerDashboardIpc(db)
  registerSyncIpc(sync, network)
  registerSettingsIpc(sync, network)

  // Impression via webContents (window.print() non supporté dans Electron)
  ipcMain.handle('app:print', () => {
    if (!mainWindow) return
    printWindow(mainWindow)
  })
  ipcMain.handle('app:export-pdf', async (_, fileName?: string) => {
    if (!mainWindow) return { canceled: true }
    return exportWindowToPdf(mainWindow, fileName)
  })
  ipcMain.handle('app:export-invoice-pdf', async (_, invoiceId: number) => {
    return exportInvoicePdfFromServer(invoiceId)
  })
  ipcMain.handle('app:reload', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    reloadRenderer(mainWindow)
  })
  ipcMain.handle('app:renderer-error', (_, data: { message?: string; stack?: string }) => {
    log.error('Erreur renderer', data.message ?? 'Erreur inconnue', data.stack ?? '')
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

app.on('render-process-gone', (_, webContents, details) => {
  if (details.reason === 'clean-exit') return

  log.error(`Renderer interrompu - reason=${details.reason}, exitCode=${details.exitCode}`)
  const window = BrowserWindow.fromWebContents(webContents)
  if (window && !window.isDestroyed()) {
    loadRendererGonePage(window, details)
    window.show()
  }
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
