import { safeStorage, app } from 'electron'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

/**
 * CryptoService — stockage sécurisé sans module natif externe.
 *
 * Utilise `electron.safeStorage` (DPAPI sur Windows, libsecret sur Linux,
 * Keychain sur macOS) pour chiffrer les secrets avant de les écrire sur disque.
 * Aucune dépendance native à compiler.
 */
export class CryptoService {
  private masterKey!: Buffer
  private readonly secretsPath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    this.secretsPath   = join(userDataPath, 'secrets.enc')
  }

  async initialize(): Promise<void> {
    let rawKey = this.loadSecret('master_key')

    if (!rawKey) {
      rawKey = randomBytes(32).toString('hex')
      this.saveSecret('master_key', rawKey)
    }

    this.masterKey = Buffer.from(rawKey, 'hex')
  }

  // ── Token API ────────────────────────────────────────────────────────────

  async saveToken(token: string): Promise<void> {
    this.saveSecret('api_token', token)
  }

  async getToken(): Promise<string | null> {
    return this.loadSecret('api_token')
  }

  async deleteToken(): Promise<void> {
    this.saveSecret('api_token', '')
  }

  // ── Chiffrement AES-256-GCM ──────────────────────────────────────────────

  encrypt(plaintext: string): string {
    const iv        = randomBytes(12)
    const key       = scryptSync(this.masterKey, 'mgt-stock-salt', 32)
    const cipher    = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag   = cipher.getAuthTag()
    return Buffer.concat([iv, authTag, encrypted]).toString('base64')
  }

  decrypt(ciphertext: string): string {
    const buf      = Buffer.from(ciphertext, 'base64')
    const iv       = buf.subarray(0, 12)
    const authTag  = buf.subarray(12, 28)
    const data     = buf.subarray(28)
    const key      = scryptSync(this.masterKey, 'mgt-stock-salt', 32)
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    return decipher.update(data) + decipher.final('utf8')
  }

  // ── Stockage chiffré via safeStorage ────────────────────────────────────

  private loadSecrets(): Record<string, string> {
    if (!existsSync(this.secretsPath)) return {}
    try {
      const raw       = readFileSync(this.secretsPath)
      const decrypted = safeStorage.decryptString(raw)
      return JSON.parse(decrypted) as Record<string, string>
    } catch {
      return {}
    }
  }

  private persistSecrets(secrets: Record<string, string>): void {
    const dir = this.secretsPath.replace(/[^/\\]+$/, '')
    mkdirSync(dir, { recursive: true })
    const encrypted = safeStorage.encryptString(JSON.stringify(secrets))
    writeFileSync(this.secretsPath, encrypted)
  }

  private saveSecret(key: string, value: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage non disponible sur ce système.')
    }
    const secrets  = this.loadSecrets()
    secrets[key]   = value
    this.persistSecrets(secrets)
  }

  private loadSecret(key: string): string | null {
    if (!safeStorage.isEncryptionAvailable()) return null
    const secrets = this.loadSecrets()
    return secrets[key] || null
  }
}
