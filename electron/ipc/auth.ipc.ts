import { ipcMain, net } from 'electron'
import { DatabaseService } from '../services/database.service'
import { CryptoService } from '../services/crypto.service'
import { SyncService } from '../services/sync.service'
import { log } from '../services/logger.service'

function httpPost(url: string, body: unknown, headers: Record<string, string> = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = net.request({ url, method: 'POST' })
    req.setHeader('Content-Type', 'application/json')
    req.setHeader('Accept', 'application/json')
    Object.entries(headers).forEach(([k, v]) => req.setHeader(k, v))

    let data = ''
    req.on('response', (resp) => {
      resp.on('data', (chunk) => { data += chunk.toString() })
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data) as unknown
          if (resp.statusCode >= 400) {
            reject(new Error(JSON.stringify(parsed)))
          } else {
            resolve(parsed)
          }
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(JSON.stringify(body))
    req.end()
  })
}

export function registerAuthIpc(db: DatabaseService, crypto: CryptoService, sync: SyncService): void {
  ipcMain.handle('auth:login', async (_event, { email, password, deviceName }: {
    email: string; password: string; deviceName: string
  }) => {
    const result = await httpPost(`${sync.serverUrl}/auth/login`, {
      email,
      password,
      device_name: deviceName,
    }) as { token: string; user: { id: number; name: string; email: string }; expires_at: string }

    await crypto.saveToken(result.token)
    log.info(`Connexion réussie — user=${result.user.email}`)

    db.run(
      `INSERT OR REPLACE INTO users (id, name, email, token, updated_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      [result.user.id, result.user.name, result.user.email, '***']
    )

    return { user: result.user, expiresAt: result.expires_at }
  })

  ipcMain.handle('auth:logout', async () => {
    const token = await crypto.getToken()
    if (token) {
      try {
        await httpPost(`${sync.serverUrl}/auth/logout`, {}, { Authorization: `Bearer ${token}` })
      } catch { /* ignorer si offline */ }
    }
    await crypto.deleteToken()
    db.run(`DELETE FROM users`)
    return { success: true }
  })

  ipcMain.handle('auth:getSession', async () => {
    const token = await crypto.getToken()
    if (!token) return null

    const user = db.get<{ id: number; name: string; email: string }>(
      `SELECT id, name, email FROM users LIMIT 1`
    )
    return user ? { user, hasToken: true } : null
  })

  ipcMain.handle('auth:refreshToken', async () => {
    const token = await crypto.getToken()
    if (!token) throw new Error('Pas de token actif.')

    const result = await httpPost(
      `${sync.serverUrl}/auth/refresh-token`,
      { device_name: 'desktop' },
      { Authorization: `Bearer ${token}` }
    ) as { token: string; expires_at: string }

    await crypto.saveToken(result.token)
    return { expiresAt: result.expires_at }
  })
}
