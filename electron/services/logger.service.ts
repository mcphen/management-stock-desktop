import log from 'electron-log/main'
import { app } from 'electron'
import { join } from 'path'

const isDev = !!process.env['VITE_DEV_SERVER_URL']

export function setupLogger(): void {
  // Fichier : %APPDATA%\management-stock-desktop\logs\main.log
  log.transports.file.resolvePathFn = () =>
    join(app.getPath('userData'), 'logs', 'main.log')

  // Rotation : max 5 Mo par fichier (electron-log archive automatiquement en main.old.log)
  log.transports.file.maxSize = 5 * 1024 * 1024

  // Format : [2024-03-15 14:32:00.123] [INFO]  message
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'

  // En dev : afficher aussi dans la console
  log.transports.console.level = isDev ? 'debug' : false

  // Niveau minimum écrit dans le fichier
  log.transports.file.level = 'info'

  // Intercepter les console.* non migrés (filet de sécurité)
  log.errorHandler.startCatching({ onError: ({ error }) => {
    log.error('[uncaught]', error)
  }})

  log.info('='.repeat(60))
  log.info(`App démarrée  version=${app.getVersion()}  dev=${isDev}`)
  log.info('='.repeat(60))
}

export { log }
