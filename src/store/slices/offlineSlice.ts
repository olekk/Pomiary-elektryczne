import type { StateCreator } from 'zustand'
import type { Inspection } from '../../types'
import { retrySyncInspection } from '../../services'
import type { InspectionSlice } from './inspectionSlice'
import { logger } from '../../utils/logger'

export interface OfflineSlice {
  isOnline: boolean
  setOnlineStatus: (status: boolean) => void
  retryPendingSync: () => Promise<void>
}

export const createOfflineSlice: StateCreator<
  OfflineSlice,
  [],
  [],
  OfflineSlice
> = (set, get) => ({
  isOnline: navigator.onLine,

  setOnlineStatus: (status) => {
    set({ isOnline: status })
  },

  retryPendingSync: async () => {
    const state = get() as OfflineSlice & InspectionSlice
    const { inspections, markInspectionAsSynced } = state
    const pendingInspections = inspections.filter((i: Inspection) => !i.synced)

    logger.log(
      `🔄 Retrying sync for ${pendingInspections.length} pending inspections...`
    )

    // Try to sync each pending inspection
    for (const inspection of pendingInspections) {
      if (!inspection.id) continue

      const success = await retrySyncInspection(inspection)

      if (success) {
        // ✅ DELEGATE to inspectionSlice - NO cross-slice pollution
        markInspectionAsSynced(inspection.id)
      }
    }
  },
})
