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
  isInitialized: boolean
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
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
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
      logger.log(`📭 ${label || 'Collection'}: query is null, skipping subscription`)
      return
    }

    logger.log(`🔌 ${label || 'Collection'}: subscribing (key=${key})`)

    let snapshotReceived = false

    const unsubscribe = onSnapshot(
      currentQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        snapshotReceived = true
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
        setIsInitialized(true)
        setError(null)
      },
      (err) => {
        snapshotReceived = true
        logger.error(`❌ ${label || 'Collection'} subscription error:`, err)
        setError(err)
        setIsLoading(false)
      }
    )

    // Safety timeout: if onSnapshot never fires (iOS Safari stuck state),
    // force isLoading to false so the UI doesn't hang permanently.
    const timeoutId = setTimeout(() => {
      if (!snapshotReceived) {
        logger.warn(`⏰ ${label || 'Collection'}: no snapshot after 5s, forcing isLoading=false (key=${key})`)
        setIsLoading(false)
      }
    }, 5000)

    return () => {
      clearTimeout(timeoutId)
      logger.log(`🔌 ${label || 'Collection'}: unsubscribing (key=${key})`)
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { data, isLoading, isInitialized, error }
}
