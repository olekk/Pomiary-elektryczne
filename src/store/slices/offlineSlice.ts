import type { StateCreator } from 'zustand'
import type { ProtectionType, Amperage, Inspection } from '../../types'
import { DEFAULT_K_FACTORS } from '../../types'
import { retrySyncInspection } from '../../services'

export interface OfflineSlice {
  isOnline: boolean
  lastProtectionType: ProtectionType
  lastAmperage: Amperage
  lastKFactor: number
  setOnlineStatus: (status: boolean) => void
  retryPendingSync: () => Promise<void>
  setLastDefaults: (
    protectionType: ProtectionType,
    amperage: Amperage,
    kFactor: number
  ) => void
}

export const createOfflineSlice: StateCreator<
  OfflineSlice,
  [],
  [],
  OfflineSlice
> = (set, get) => ({
  isOnline: navigator.onLine,
  lastProtectionType: 'WNP',
  lastAmperage: 16,
  lastKFactor: DEFAULT_K_FACTORS.WNP,

  setOnlineStatus: (status) => {
    set({ isOnline: status })
  },

  retryPendingSync: async () => {
    const state = get() as any
    const { inspections, markInspectionAsSynced } = state
    const pendingInspections = inspections.filter((i: Inspection) => !i.synced)

    console.log(
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

  setLastDefaults: (protectionType, amperage, kFactor) => {
    set({
      lastProtectionType: protectionType,
      lastAmperage: amperage,
      lastKFactor: kFactor,
    })
  },
})
