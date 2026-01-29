import { create } from 'zustand'
import type { User } from 'firebase/auth'
import type { Inspection, ProtectionType, Amperage } from '../types'
import { DEFAULT_K_FACTORS } from '../types'
import {
  saveInspectionToFirestore,
  loadInspectionsFromFirestore,
  deleteInspectionFromFirestore,
  retrySyncInspection,
  markInspectionAsSynced,
} from '../services'
import {
  generateInspectionId,
  generateMeasurementId,
  createMeasurement,
  renumberMeasurements,
  calculateZsDop,
  determineMeasurementResult,
} from '../utils'

interface InspectionState {
  // State
  user: User | null
  currentInspection: Inspection | null
  inspections: Inspection[]
  isOnline: boolean
  pendingSyncCount: number
  lastProtectionType: ProtectionType
  lastAmperage: Amperage
  lastKFactor: number

  // Actions - Auth Management
  setUser: (user: User | null) => void

  // Actions - Inspection Management
  createNewInspection: (
    address: string,
    apartmentNumber: string,
    technician: string
  ) => void
  setCurrentInspection: (inspection: Inspection | null) => void
  setSignature: (signature: string) => void

  // Actions - Measurement Management
  addMeasurement: (zsValue: number | null, noGrounding?: boolean) => void
  updateMeasurement: (id: string, zsValue: number | null) => void
  removeMeasurement: (id: string) => void

  // Actions - Persistence
  saveToFirestore: () => Promise<void>
  loadInspections: () => Promise<void>
  deleteInspection: (id: string) => Promise<void>

  // Actions - Sync Management
  retryPendingSync: () => Promise<void>
  setOnlineStatus: (status: boolean) => void

  // Actions - Settings
  setLastDefaults: (
    protectionType: ProtectionType,
    amperage: Amperage,
    kFactor: number
  ) => void
}

export const useInspectionStore = create<InspectionState>((set, get) => ({
  // Initial State
  user: null,
  currentInspection: null,
  inspections: [],
  isOnline: navigator.onLine,
  pendingSyncCount: 0,
  lastProtectionType: 'WNP',
  lastAmperage: 16,
  lastKFactor: DEFAULT_K_FACTORS.WNP,

  // ===== AUTH MANAGEMENT =====

  setUser: (user) => {
    set({ user })
  },

  // ===== INSPECTION MANAGEMENT =====

  createNewInspection: (address, apartmentNumber, technician) => {
    set({
      currentInspection: {
        address,
        apartmentNumber,
        technician,
        date: new Date(),
        measurements: [],
        synced: false,
      },
    })
  },

  setCurrentInspection: (inspection) => {
    set({ currentInspection: inspection })
  },

  setSignature: (signature) => {
    const { currentInspection } = get()
    if (currentInspection) {
      set({
        currentInspection: {
          ...currentInspection,
          signature,
        },
      })
    }
  },

  // ===== MEASUREMENT MANAGEMENT =====

  addMeasurement: (zsValue, noGrounding = false) => {
    const state = get()
    const { currentInspection, lastProtectionType, lastAmperage, lastKFactor } =
      state

    if (!currentInspection) return

    const pointNumber = currentInspection.measurements.length + 1
    const id = generateMeasurementId()

    const newMeasurement = createMeasurement(
      id,
      pointNumber,
      lastProtectionType,
      lastAmperage,
      lastKFactor,
      zsValue,
      noGrounding
    )

    set({
      currentInspection: {
        ...currentInspection,
        measurements: [...currentInspection.measurements, newMeasurement],
      },
    })
  },

  updateMeasurement: (id, zsValue) => {
    const state = get()
    const { currentInspection } = state

    if (!currentInspection) return

    const updatedMeasurements = currentInspection.measurements.map((m) => {
      if (m.id === id) {
        const zsDop = calculateZsDop(m.protectionType, m.amperage)
        const result = determineMeasurementResult(
          zsValue,
          zsDop,
          m.noGrounding || false
        )

        return {
          ...m,
          zsValue,
          zsDop,
          result,
        }
      }
      return m
    })

    set({
      currentInspection: {
        ...currentInspection,
        measurements: updatedMeasurements,
      },
    })
  },

  removeMeasurement: (id) => {
    const state = get()
    const { currentInspection } = state

    if (!currentInspection) return

    const filtered = currentInspection.measurements.filter((m) => m.id !== id)
    const renumbered = renumberMeasurements(filtered)

    set({
      currentInspection: {
        ...currentInspection,
        measurements: renumbered,
      },
    })
  },

  // ===== PERSISTENCE =====

  saveToFirestore: async () => {
    const { currentInspection, inspections } = get()

    if (!currentInspection) {
      throw new Error('Brak danych do zapisania')
    }

    // Generate ID locally for offline support
    const savedId = currentInspection.id || generateInspectionId()

    const dateToSave =
      currentInspection.date instanceof Date
        ? currentInspection.date
        : new Date(currentInspection.date)

    // Optimistic update: Update UI immediately
    const optimisticInspection: Inspection = {
      id: savedId,
      address: currentInspection.address,
      apartmentNumber: currentInspection.apartmentNumber,
      technician: currentInspection.technician,
      date: dateToSave,
      measurements: currentInspection.measurements,
      signature: currentInspection.signature,
      synced: false,
    }

    if (currentInspection.id) {
      // UPDATE: Update existing item
      const updatedList = inspections.map((insp) =>
        insp.id === currentInspection.id ? optimisticInspection : insp
      )
      set({
        inspections: updatedList,
        currentInspection: optimisticInspection,
      })
    } else {
      // CREATE: Add new item to the beginning
      set({
        inspections: [optimisticInspection, ...inspections],
        currentInspection: optimisticInspection,
      })
    }

    // Update pending count
    const newPendingCount = get().inspections.filter((i) => !i.synced).length
    set({ pendingSyncCount: newPendingCount })

    // Fire-and-forget: Save to Firebase in background
    saveInspectionToFirestore(currentInspection, savedId)
      .then(async () => {
        // Mark as synced in Firestore
        await markInspectionAsSynced(savedId)

        console.log(`✅ Inspection ${savedId} synced successfully`)
        const currentState = get()
        const syncedList = currentState.inspections.map((insp) =>
          insp.id === savedId ? { ...insp, synced: true } : insp
        )
        set({
          inspections: syncedList,
          pendingSyncCount: syncedList.filter((i) => !i.synced).length,
        })

        // Update currentInspection if it's the same
        if (currentState.currentInspection?.id === savedId) {
          set({
            currentInspection: {
              ...currentState.currentInspection,
              synced: true,
            },
          })
        }
      })
      .catch((error) => {
        console.error(`❌ Sync failed for inspection ${savedId}:`, error)
        if (error?.code === 'unavailable') {
          console.log('📴 Offline mode: Data queued for sync when online')
        }
      })
  },

  loadInspections: async () => {
    try {
      console.log('🔄 Loading inspections from Firestore...')
      const inspections = await loadInspectionsFromFirestore()
      set({
        inspections,
        pendingSyncCount: inspections.filter((i) => !i.synced).length,
      })
      console.log(`✅ Successfully loaded ${inspections.length} inspections`)
    } catch (error) {
      console.error('❌ Error loading inspections:', error)
      // Don't throw error to avoid blocking UI in offline mode
      // Keep existing inspections in state if load fails
    }
  },

  deleteInspection: async (id) => {
    try {
      await deleteInspectionFromFirestore(id)

      // Optimistic update: Remove from local list
      const { inspections } = get()
      set({
        inspections: inspections.filter((i) => i.id !== id),
      })
    } catch (error) {
      console.error('Error deleting inspection:', error)
      throw error
    }
  },

  // ===== SYNC MANAGEMENT =====

  retryPendingSync: async () => {
    const { inspections } = get()
    const pendingInspections = inspections.filter((i) => !i.synced)

    console.log(
      `🔄 Retrying sync for ${pendingInspections.length} pending inspections...`
    )

    // Try to sync each pending inspection
    for (const inspection of pendingInspections) {
      if (!inspection.id) continue

      const success = await retrySyncInspection(inspection)

      if (success) {
        const currentState = get()
        const syncedList = currentState.inspections.map((insp) =>
          insp.id === inspection.id ? { ...insp, synced: true } : insp
        )
        set({
          inspections: syncedList,
          pendingSyncCount: syncedList.filter((i) => !i.synced).length,
        })
      }
    }
  },

  setOnlineStatus: (status) => {
    set({ isOnline: status })

    // Auto-retry when coming back online
    if (status) {
      console.log('🌐 Connection restored! Auto-retrying pending syncs...')
      const { retryPendingSync } = get()
      retryPendingSync()
    }
  },

  // ===== SETTINGS =====

  setLastDefaults: (protectionType, amperage, kFactor) => {
    set({
      lastProtectionType: protectionType,
      lastAmperage: amperage,
      lastKFactor: kFactor,
    })
  },
}))
