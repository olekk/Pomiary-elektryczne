import { useMemo, useCallback } from 'react'
import {
  collection,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useCollection } from './useCollection'
import { useCompany } from './useCompany'
import { retrySyncInspection } from '../services'
import type { Inspection } from '../types'
import { logger } from '../utils/logger'

const pendingMapper = (doc: import('firebase/firestore').QueryDocumentSnapshot) => {
  const data = doc.data()
  return {
    id: doc.id,
    projectId: data.projectId,
    buildingId: data.buildingId,
    companyId: data.companyId || '',
    createdBy: data.createdBy || '',
    assignedTo: data.assignedTo || '',
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
    unitType: data.unitType || 'mieszkanie',
  } as Inspection
}

/**
 * Hook that tracks pending (unsynced) inspections and provides retry logic.
 * Uses company-scoped inspection collection.
 */
export function usePendingSync() {
  const { companyId } = useCompany()

  const q = useMemo(
    () =>
      companyId
        ? query(
            collection(db, 'companies', companyId, 'inspections'),
            where('synced', '==', false)
          )
        : null,
    [companyId]
  )

  const { data: pendingInspections } = useCollection<Inspection>(q, pendingMapper, `pending-sync-${companyId || 'none'}`, 'PendingSync')

  const pendingSyncCount = pendingInspections.length

  const retryPendingSync = useCallback(async () => {
    if (!companyId) return
    logger.log(
      `🔄 Retrying sync for ${pendingInspections.length} pending inspections...`
    )
    for (const inspection of pendingInspections) {
      if (!inspection.id) continue
      await retrySyncInspection(companyId, inspection)
    }
  }, [companyId, pendingInspections])

  return { pendingSyncCount, retryPendingSync }
}
