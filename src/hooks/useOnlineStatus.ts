import { useState, useEffect } from 'react'
import { logger } from '../utils/logger'

/**
 * Simple hook that tracks online/offline status via browser events.
 * Replaces offlineSlice.isOnline.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      logger.log('🌐 UI detected: Online')
      setIsOnline(true)
    }

    const handleOffline = () => {
      logger.log('📴 UI detected: Offline')
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
