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
 * Generic hook for subscribing to a Firestore collection query.
 *
 * @param q         The Firestore query to subscribe to (or null to skip).
 * @param mapper    Converts a Firestore doc snapshot into your domain type.
 * @param key       A **stable** string that uniquely identifies this query
 *                  (e.g. a route param like `projectId`). Used as the sole
 *                  useEffect dependency so the subscription only restarts
 *                  when the logical query actually changes.
 * @param label     Optional label for debug logging.
 */
export function useCollection<T>(
  q: Query<DocumentData> | null,
  mapper: (doc: QueryDocumentSnapshot<DocumentData>) => T,
  key: string,
  label?: string
): UseCollectionResult<T> {
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Refs keep the latest values accessible inside the effect
  // without triggering re-subscriptions.
  const queryRef = useRef(q)
  queryRef.current = q

  const mapperRef = useRef(mapper)
  mapperRef.current = mapper

  useEffect(() => {
    const currentQuery = queryRef.current

    if (!currentQuery) {
      setData([])
      setIsLoading(false)
      return
    }

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
        // Keep stale data visible on transient errors.
      }
    )

    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { data, isLoading, error }
}
