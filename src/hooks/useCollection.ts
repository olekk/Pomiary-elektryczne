import { useState, useEffect } from 'react'
import {
  onSnapshot,
  type Query,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { logger } from '../utils/logger'

interface UseCollectionResult<T> {
  data: T[]
  isLoading: boolean
  error: Error | null
}

/**
 * Generic hook for subscribing to a Firestore collection query.
 * Automatically subscribes on mount and unsubscribes on unmount.
 * Works offline via Firestore's persistentLocalCache.
 */
export function useCollection<T>(
  q: Query<DocumentData> | null,
  mapper: (doc: QueryDocumentSnapshot<DocumentData>) => T,
  label?: string
): UseCollectionResult<T> {
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!q) {
      setData([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const results: T[] = []
        snapshot.forEach((doc) => {
          results.push(mapper(doc))
        })

        if (label) {
          logger.log(
            `📥 ${label}: ${results.length} items (fromCache: ${snapshot.metadata.fromCache})`
          )
        }

        setData(results)
        setIsLoading(false)
        setError(null)
      },
      (err) => {
        logger.error(`❌ ${label || 'Collection'} subscription error:`, err)
        setError(err)
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
    // We intentionally omit `mapper` from deps to avoid infinite re-subscriptions.
    // Users should memoize or define mapper outside the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, label])

  return { data, isLoading, error }
}
