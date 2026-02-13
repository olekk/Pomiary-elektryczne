import { useState, useEffect, useRef } from 'react'
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
 * Serialize a Firestore Query to a stable string key.
 * This prevents useEffect from re-subscribing when the Query object
 * is structurally identical but referentially different (new object).
 */
function getQueryKey(q: Query<DocumentData> | null): string {
  if (!q) return '__null__'
  // Use the internal _query representation for stable identity.
  // Fallback to type + path if internal API is unavailable.
  try {
    const internal = q as unknown as { _query?: unknown }
    if (internal._query) {
      return JSON.stringify(internal._query)
    }
  } catch {
    // ignore
  }
  return `${q.type}::${q.firestore.app.name}::${JSON.stringify(q)}`
}

/**
 * Generic hook for subscribing to a Firestore collection query.
 * Automatically subscribes on mount and unsubscribes on unmount.
 * Works offline via Firestore's persistentLocalCache.
 *
 * Key design decisions for offline resilience:
 * - The query object is serialized to a stable string key so that
 *   structurally identical queries don't cause re-subscriptions.
 * - `includeMetadataChanges: true` ensures the callback fires
 *   immediately from cache when offline.
 * - Stale data is preserved during re-subscriptions so the UI
 *   never flickers to empty/loading when navigating back.
 * - Errors in onSnapshot don't wipe existing data.
 */
export function useCollection<T>(
  q: Query<DocumentData> | null,
  mapper: (doc: QueryDocumentSnapshot<DocumentData>) => T,
  label?: string
): UseCollectionResult<T> {
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Stable string key derived from the query structure.
  const queryKey = getQueryKey(q)

  // Keep the latest query ref accessible inside the effect
  // without adding it as a dependency.
  const queryRef = useRef(q)
  queryRef.current = q

  // Keep the latest mapper ref to avoid re-subscriptions when
  // the mapper is an inline function.
  const mapperRef = useRef(mapper)
  mapperRef.current = mapper

  useEffect(() => {
    const currentQuery = queryRef.current

    if (!currentQuery) {
      setData([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const unsubscribe = onSnapshot(
      currentQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const results: T[] = []
        snapshot.forEach((doc) => {
          results.push(mapperRef.current(doc))
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
        // Intentionally NOT clearing data here — keep stale data visible
        // so the UI doesn't break on transient network errors.
      }
    )

    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, label])

  return { data, isLoading, error }
}
