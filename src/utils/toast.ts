/**
 * Lightweight imperative toast notifications.
 * Works outside React – perfect for utility functions like PDF generation.
 */

type ToastType = 'info' | 'success' | 'error'

interface ToastOptions {
  /** Auto-dismiss delay in ms (default 3000). Set 0 to keep until manually dismissed. */
  duration?: number
  type?: ToastType
}

interface ToastHandle {
  /** Update the message, optionally the type, and optionally a new auto-dismiss duration (ms). */
  update: (message: string, type?: ToastType, duration?: number) => void
  /** Remove the toast immediately. */
  dismiss: () => void
}

const CONTAINER_ID = 'toast-container'

function getOrCreateContainer(): HTMLElement {
  let container = document.getElementById(CONTAINER_ID)
  if (!container) {
    container = document.createElement('div')
    container.id = CONTAINER_ID
    Object.assign(container.style, {
      position: 'fixed',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '99999',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      pointerEvents: 'none',
      width: '100%',
      maxWidth: '420px',
      padding: '0 16px',
      boxSizing: 'border-box',
    })
    document.body.appendChild(container)
  }
  return container
}

const STYLES: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  info: {
    bg: 'rgba(30, 41, 59, 0.95)',   // slate-800
    border: '1px solid rgba(59, 130, 246, 0.5)',  // blue-500/50
    text: '#e2e8f0',  // slate-200
    icon: '⏳',
  },
  success: {
    bg: 'rgba(20, 83, 45, 0.95)',   // green-900
    border: '1px solid rgba(34, 197, 94, 0.6)',   // green-500/60
    text: '#bbf7d0',  // green-200
    icon: '✅',
  },
  error: {
    bg: 'rgba(127, 29, 29, 0.9)',   // red-900
    border: '1px solid rgba(239, 68, 68, 0.6)',   // red-500/60
    text: '#fecaca',  // red-200
    icon: '❌',
  },
}

function applyStyles(el: HTMLElement, type: ToastType) {
  const s = STYLES[type]
  Object.assign(el.style, {
    background: s.bg,
    border: s.border,
    color: s.text,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  })
}

/**
 * Show a toast notification.
 *
 * @example
 * const t = showToast('Generowanie PDF…', { type: 'info', duration: 0 })
 * // later…
 * t.update('PDF wygenerowany!', 'success')
 * t.dismiss()              // or let auto-dismiss handle it
 */
export function showToast(message: string, options: ToastOptions = {}): ToastHandle {
  const { duration = 3000, type = 'info' } = options
  const container = getOrCreateContainer()

  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', 'polite')

  Object.assign(el.style, {
    padding: '12px 20px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '500',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: '1.4',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    pointerEvents: 'auto',
    opacity: '0',
    transform: 'translateY(-12px) scale(0.95)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    boxSizing: 'border-box',
  })

  applyStyles(el, type)

  const iconSpan = document.createElement('span')
  iconSpan.style.fontSize = '18px'
  iconSpan.style.flexShrink = '0'
  iconSpan.textContent = STYLES[type].icon

  const textSpan = document.createElement('span')
  textSpan.style.flex = '1'
  textSpan.textContent = message

  el.appendChild(iconSpan)
  el.appendChild(textSpan)
  container.appendChild(el)

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = '1'
      el.style.transform = 'translateY(0) scale(1)'
    })
  })

  let dismissTimer: ReturnType<typeof setTimeout> | null = null

  function dismiss() {
    if (dismissTimer) clearTimeout(dismissTimer)
    el.style.opacity = '0'
    el.style.transform = 'translateY(-12px) scale(0.95)'
    setTimeout(() => {
      el.remove()
      // Clean up empty container
      if (container.childElementCount === 0) {
        container.remove()
      }
    }, 300)
  }

  function scheduleDismiss(ms: number) {
    if (ms > 0) {
      if (dismissTimer) clearTimeout(dismissTimer)
      dismissTimer = setTimeout(dismiss, ms)
    }
  }

  scheduleDismiss(duration)

  return {
    update(newMessage: string, newType?: ToastType, newDuration?: number) {
      const resolvedType = newType ?? type
      textSpan.textContent = newMessage
      iconSpan.textContent = STYLES[resolvedType].icon
      applyStyles(el, resolvedType)
      // Reset auto-dismiss on update
      scheduleDismiss(newDuration ?? (duration || 3000))
    },
    dismiss,
  }
}
