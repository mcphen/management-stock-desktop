import { net } from 'electron'

export class UnauthorizedError extends Error {
  constructor() { super('HTTP 401: token expiré ou invalide') }
}

type ConnectivityCallback = (isOnline: boolean) => void

export class NetworkService {
  private _isOnline = false
  private callbacks: ConnectivityCallback[] = []
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private checkUrl: string

  constructor(checkUrl = 'https://samabois.com/api/v1/sync/status') {
    this.checkUrl = checkUrl
  }

  get isOnline(): boolean {
    return this._isOnline
  }

  onConnectivityChange(cb: ConnectivityCallback): void {
    this.callbacks.push(cb)
  }

  startPolling(intervalMs = 10_000): void {
    this.check()
    this.pollInterval = setInterval(() => this.check(), intervalMs)
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  setCheckUrl(url: string): void {
    this.checkUrl = url
  }

  async testUrl(url: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      try {
        const request = net.request({ url, method: 'GET' })
        request.on('response', (resp) => resolve(resp.statusCode < 500))
        request.on('error', () => resolve(false))
        setTimeout(() => resolve(false), 5000)
        request.end()
      } catch {
        resolve(false)
      }
    })
  }

  private async check(): Promise<void> {
    const wasOnline = this._isOnline

    try {
      const request = net.request({ url: this.checkUrl, method: 'GET' })

      const online = await new Promise<boolean>((resolve) => {
        request.on('response', (resp) => resolve(resp.statusCode < 500))
        request.on('error', () => resolve(false))
        setTimeout(() => resolve(false), 5000)
        request.end()
      })

      this._isOnline = online
    } catch {
      this._isOnline = false
    }

    if (this._isOnline !== wasOnline) {
      this.callbacks.forEach((cb) => cb(this._isOnline))
    }
  }

  async fetchJson<T>(url: string, options: {
    method?: string
    headers?: Record<string, string>
    body?: string
  } = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      const request = net.request({
        url,
        method: options.method ?? 'GET',
      })

      if (options.headers) {
        Object.entries(options.headers).forEach(([k, v]) => request.setHeader(k, v))
      }

      let data = ''
      request.on('response', (resp) => {
        resp.on('data', (chunk) => { data += chunk.toString() })
        resp.on('end', () => {
          try {
            if (resp.statusCode === 401) {
              reject(new UnauthorizedError())
            } else if (resp.statusCode >= 400) {
              reject(new Error(`HTTP ${resp.statusCode}: ${data}`))
            } else {
              resolve(JSON.parse(data) as T)
            }
          } catch (e) {
            reject(e)
          }
        })
      })

      request.on('error', reject)

      if (options.body) {
        request.write(options.body)
      }

      request.end()
    })
  }
}
