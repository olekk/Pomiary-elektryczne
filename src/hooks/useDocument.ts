import { useState, useEffect } from 'react'
import {
  onSnapshot,
  type DocumentReference,
  type DocumentData,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { logger } from '../utils/logger'

interface UseDocumentResult<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
}

/**
 * Generic hook for subscribing to a single Firestore document.
 * Automatically subscribes on mount and unsubscribes on unmount.
 * Works offline via Firestore's persistentLocalCache.
 */
export function useDocument<T>(
  docRef: DocumentReference<DocumentData> | null,
  mapper: (snap: DocumentSnapshot<DocumentData>) => T | null,
  label?: string
): UseDocumentResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!docRef) {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const result = mapper(snap)
          setData(result)
          if (label) {
            logger.log(`📥 ${label}: loaded`)
          }
        } else {
          setData(null)
          if (label) {
            logger.log(`📭 ${label}: not found`)
          }
        }
        setIsLoading(false)
        setError(null)
      },
      (err) => {
        logger.error(`❌ ${label || 'Document'} error:`, err)
        setError(err)
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docRef, label])

  return { data, isLoading, error }
}
