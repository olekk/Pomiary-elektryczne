import { useEffect } from 'react'

/**
 * Conditionally loads vConsole when `?debug=1` is in the URL.
 * vConsole intercepts all console.* calls and displays them
 * in a floating overlay — perfect for debugging on mobile.
 */
export const DebugConsole: React.FC = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('debug') !== '1') return

    let vConsoleInstance: unknown = null

    import('vconsole').then((mod) => {
      const VConsole = mod.default
      vConsoleInstance = new VConsole({ theme: 'dark' })
      console.log('🛠️ vConsole initialized')
      console.log('📱 User Agent:', navigator.userAgent)
      console.log('🌐 Online:', navigator.onLine)
      console.log('📍 URL:', window.location.href)
    })

    return () => {
      if (vConsoleInstance && typeof (vConsoleInstance as { destroy: () => void }).destroy === 'function') {
        (vConsoleInstance as { destroy: () => void }).destroy()
      }
    }
  }, [])

  return null
}
