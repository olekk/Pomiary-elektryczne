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
 *
 * Key design decisions for offline resilience:
 * - Uses `docRef.path` as a stable string key for useEffect so that
 *   structurally identical refs don't cause re-subscriptions.
 * - `includeMetadataChanges: true` ensures the callback fires
 *   immediately from cache when offline (critical fix — without it
 *   onSnapshot may wait forever for a server response).
 * - Stale data is preserved on errors so the UI doesn't flash to
 *   "Unknown building" on transient network failures.
 */
export function useDocument<T>(
  docRef: DocumentReference<DocumentData> | null,
  mapper: (snap: DocumentSnapshot<DocumentData>) => T | null,
  label?: string
): UseDocumentResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Stable string key: the document path (e.g. "buildings/abc123").
  const docPath = docRef?.path ?? '__null__'

  // Keep the latest refs accessible inside the effect
  // without adding them as dependencies.
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
      // CRITICAL: includeMetadataChanges ensures the callback fires
      // immediately from the offline cache. Without this flag,
      // Firestore may wait indefinitely for a server response.
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
        // Intentionally NOT clearing data here — keep stale data visible
        // so the UI doesn't break on transient network errors.
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
