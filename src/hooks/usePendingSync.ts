import { useMemo, useCallback } from 'react'
import {
  collection,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useCollection } from './useCollection'
import { retrySyncInspection } from '../services'
import type { Inspection } from '../types'
import { inspectionFromDoc } from '../utils'
import { logger } from '../utils/logger'

/**
 * Hook that tracks pending (unsynced) inspections and provides retry logic.
 * Replaces offlineSlice.retryPendingSync and pendingSyncCount.
 */
export function usePendingSync() {
  const q = useMemo(
    () =>
      query(
        collection(db, 'inspections'),
        where('synced', '==', false)
      ),
    []
  )

  const { data: pendingInspections } = useCollection<Inspection>(q, inspectionFromDoc, 'pending-sync', 'PendingSync')

  const pendingSyncCount = pendingInspections.length

  const retryPendingSync = useCallback(async () => {
    logger.log(
      `🔄 Retrying sync for ${pendingInspections.length} pending inspections...`
    )
    for (const inspection of pendingInspections) {
      if (!inspection.id) continue
      await retrySyncInspection(inspection)
    }
  }, [pendingInspections])

  return { pendingSyncCount, retryPendingSync }
}
