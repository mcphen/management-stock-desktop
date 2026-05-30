type RendererErrorDetails = {
  title: string
  message: string
  stack?: string
}

let isShowingError = false

function normalizeReason(reason: unknown): RendererErrorDetails {
  if (reason instanceof Error) {
    return {
      title: 'Erreur inattendue',
      message: reason.message || "Une erreur est survenue dans l'interface.",
      stack: reason.stack,
    }
  }

  if (typeof reason === 'string') {
    return {
      title: 'Erreur inattendue',
      message: reason,
    }
  }

  return {
    title: 'Erreur inattendue',
    message: "L'interface a rencontre une erreur et ne peut pas continuer correctement.",
  }
}

function reportError(details: RendererErrorDetails): void {
  window.electron?.reportRendererError?.({
    message: details.message,
    stack: details.stack,
  }).catch(() => undefined)
}

function injectErrorStyles(): void {
  if (document.getElementById('renderer-error-styles')) return

  const style = document.createElement('style')
  style.id = 'renderer-error-styles'
  style.textContent = `
    html, body { min-height: 100%; margin: 0; background: #f9fafb; }
    .renderer-error {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 32px;
      color: #0f172a;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    .renderer-error__panel {
      width: min(100%, 520px);
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      padding: 28px;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
    }
    .renderer-error__eyebrow {
      margin: 0 0 12px;
      color: #2563eb;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .renderer-error h1 { margin: 0; font-size: 24px; line-height: 1.2; }
    .renderer-error__message { margin: 12px 0 0; color: #475569; line-height: 1.55; }
    .renderer-error__actions { display: flex; margin-top: 24px; }
    .renderer-error button {
      border: 0;
      border-radius: 8px;
      background: #2563eb;
      color: #ffffff;
      padding: 10px 16px;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .renderer-error details { margin-top: 20px; color: #64748b; font-size: 13px; }
    .renderer-error pre {
      overflow: auto;
      max-height: 220px;
      padding: 12px;
      border-radius: 8px;
      background: #f1f5f9;
      white-space: pre-wrap;
    }
  `
  document.head.append(style)
}

function createErrorView(details: RendererErrorDetails): HTMLElement {
  const wrapper = document.createElement('main')
  wrapper.className = 'renderer-error'
  wrapper.setAttribute('role', 'alert')

  const panel = document.createElement('section')
  panel.className = 'renderer-error__panel'

  const eyebrow = document.createElement('p')
  eyebrow.className = 'renderer-error__eyebrow'
  eyebrow.textContent = 'Gestion Stock'

  const title = document.createElement('h1')
  title.textContent = details.title

  const message = document.createElement('p')
  message.className = 'renderer-error__message'
  message.textContent = details.message

  const actions = document.createElement('div')
  actions.className = 'renderer-error__actions'

  const reloadButton = document.createElement('button')
  reloadButton.type = 'button'
  reloadButton.textContent = 'Recharger'
  reloadButton.addEventListener('click', () => {
    window.electron?.reload?.().catch(() => window.location.reload())
  })

  actions.append(reloadButton)
  panel.append(eyebrow, title, message, actions)

  if (details.stack) {
    const detailsBlock = document.createElement('details')
    const summary = document.createElement('summary')
    summary.textContent = 'Details techniques'

    const stack = document.createElement('pre')
    stack.textContent = details.stack

    detailsBlock.append(summary, stack)
    panel.append(detailsBlock)
  }

  wrapper.append(panel)
  return wrapper
}

export function showRendererError(reason: unknown): void {
  if (isShowingError) return
  isShowingError = true

  const details = normalizeReason(reason)
  reportError(details)
  injectErrorStyles()
  document.body.replaceChildren(createErrorView(details))
}

export function installRendererErrorBoundary(): void {
  window.onerror = (_message, _source, _lineno, _colno, error) => {
    showRendererError(error ?? _message)
    return false
  }

  window.onunhandledrejection = (event) => {
    showRendererError(event.reason)
  }

  window.addEventListener('error', (event) => {
    showRendererError(event.error ?? event.message)
  })

  window.addEventListener('unhandledrejection', (event) => {
    showRendererError(event.reason)
  })
}
