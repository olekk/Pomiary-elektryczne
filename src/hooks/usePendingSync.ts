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
import { logger } from '../utils/logger'

const pendingMapper = (doc: import('firebase/firestore').QueryDocumentSnapshot) => {
  const data = doc.data()
  return {
    id: doc.id,
    projectId: data.projectId,
    buildingId: data.buildingId,
    address: data.address,
    apartmentNumber: data.apartmentNumber,
    ownerName: data.ownerName || '',
    date: data.date?.toDate ? data.date.toDate() : new Date(),
    technicianName: data.technicianName || '',
    technicianLicenseNumber: data.technicianLicenseNumber || '',
    technicianSignature: data.technicianSignature || '',
    measurements: data.measurements || [],
    notes: data.notes || '',
    ownerSignature: data.ownerSignature || '',
    protocolNumber: data.protocolNumber || '',
    synced: data.synced ?? false,
    status: data.status || 'COMPLETED',
  } as Inspection
}

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

  const { data: pendingInspections } = useCollection<Inspection>(q, pendingMapper, 'pending-sync', 'PendingSync')

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
