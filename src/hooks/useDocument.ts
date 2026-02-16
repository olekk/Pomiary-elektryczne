import { useState, useEffect, useRef } from 'react'
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

  const docPath = docRef?.path ?? '__null__'

  const docRefRef = useRef(docRef)
  docRefRef.current = docRef

  const mapperRef = useRef(mapper)
  mapperRef.current = mapper

  useEffect(() => {
    const currentDocRef = docRefRef.current

    if (!currentDocRef) {
      setData(null)
      setIsLoading(false)
      logger.log(`📭 ${label || 'Document'}: ref is null, skipping subscription`)
      return
    }

    logger.log(`🔌 ${label || 'Document'}: subscribing (path=${docPath})`)

    let snapshotReceived = false

    const unsubscribe = onSnapshot(
      currentDocRef,
      { includeMetadataChanges: true },
      (snap) => {
        snapshotReceived = true
        if (snap.exists()) {
          const result = mapperRef.current(snap)
          setData(result)
          if (label) {
            logger.log(
              `📥 ${label}: loaded (fromCache: ${snap.metadata.fromCache})`
            )
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
        snapshotReceived = true
        logger.error(`❌ ${label || 'Document'} error:`, err)
        setError(err)
        setIsLoading(false)
      }
    )

    // Safety timeout: if onSnapshot never fires (iOS Safari stuck state),
    // force isLoading to false so the UI doesn't hang permanently.
    const timeoutId = setTimeout(() => {
      if (!snapshotReceived) {
        logger.warn(`⏰ ${label || 'Document'}: no snapshot after 5s, forcing isLoading=false (path=${docPath})`)
        setIsLoading(false)
      }
    }, 5000)

    return () => {
      clearTimeout(timeoutId)
      logger.log(`🔌 ${label || 'Document'}: unsubscribing (path=${docPath})`)
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docPath, label])

  return { data, isLoading, error }
}
