import type { StateCreator } from 'zustand'
import type { Inspection } from '../../types'
import {
  saveInspectionToFirestore,
  loadInspectionsFromFirestore,
  deleteInspectionFromFirestore,
  markInspectionAsSynced,
} from '../../services'
import {
  generateInspectionId,
  generateMeasurementId,
  createMeasurement,
  renumberMeasurements,
  calculateZsDop,
  determineMeasurementResult,
} from '../../utils'

export interface InspectionSlice {
  currentInspection: Inspection | null
  inspections: Inspection[]
  pendingSyncCount: number
  createNewInspection: (
    projectId: string,
    address: string,
    apartmentNumber: string,
    technician: string
  ) => void
  setCurrentInspection: (inspection: Inspection | null) => void
  setSignature: (signature: string) => void
  addMeasurement: (zsValue: number | null, noGrounding?: boolean) => void
  updateMeasurement: (id: string, zsValue: number | null) => void
  removeMeasurement: (id: string) => void
  saveToFirestore: (signatureOverride?: string) => Promise<void>
  loadInspections: (projectId: string) => Promise<void>
  deleteInspection: (id: string) => Promise<void>
}

export const createInspectionSlice: StateCreator<
  InspectionSlice,
  [],
  [],
  InspectionSlice
> = (set, get) => ({
  currentInspection: null,
  inspections: [],
  pendingSyncCount: 0,

  createNewInspection: (projectId, address, apartmentNumber, technician) => {
    set({
      currentInspection: {
        projectId,
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
    set((state) => ({
      currentInspection: state.currentInspection
        ? { ...state.currentInspection, signature: signature }
        : null,
    }))
  },

  addMeasurement: (zsValue, noGrounding = false) => {
    const state = get() as any
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

  saveToFirestore: async (signatureOverride) => {
    const { currentInspection, inspections } = get() as any

    if (!currentInspection) {
      throw new Error('Brak danych do zapisania')
    }

    // Generate ID locally for offline support
    const savedId = currentInspection.id || generateInspectionId()

    const dateToSave =
      currentInspection.date instanceof Date
        ? currentInspection.date
        : new Date(currentInspection.date)

    // Use signatureOverride if provided, otherwise use store signature
    const signatureToSave =
      signatureOverride || currentInspection.signature || ''

    // Optimistic update: Update UI immediately
    const optimisticInspection: Inspection = {
      id: savedId,
      projectId: currentInspection.projectId,
      address: currentInspection.address,
      apartmentNumber: currentInspection.apartmentNumber,
      technician: currentInspection.technician,
      date: dateToSave,
      measurements: currentInspection.measurements,
      signature: signatureToSave,
      synced: false,
    }

    if (currentInspection.id) {
      // UPDATE: Update existing item
      const updatedList = inspections.map((insp: Inspection) =>
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
    const state = get() as any
    const newPendingCount = state.inspections.filter((i: Inspection) => !i.synced).length
    set({ pendingSyncCount: newPendingCount })

    // Fire-and-forget: Save to Firebase in background
    const inspectionToSave: Inspection = {
      ...currentInspection,
      signature: signatureToSave,
    }

    saveInspectionToFirestore(inspectionToSave, savedId)
      .then(async () => {
        // Mark as synced in Firestore
        await markInspectionAsSynced(savedId)

        console.log(`✅ Inspection ${savedId} synced successfully`)
        const currentState = get() as any
        const syncedList = currentState.inspections.map((insp: Inspection) =>
          insp.id === savedId ? { ...insp, synced: true } : insp
        )
        set({
          inspections: syncedList,
          pendingSyncCount: syncedList.filter((i: Inspection) => !i.synced).length,
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

  loadInspections: async (projectId) => {
    try {
      console.log(`🔄 Loading inspections for project ${projectId}...`)
      // Firebase SDK automatically uses cache when offline (persistentLocalCache)
      const inspections = await loadInspectionsFromFirestore(projectId)
      set({
        inspections,
        pendingSyncCount: inspections.filter((i) => !i.synced).length,
      })
      console.log(
        `✅ Successfully loaded ${inspections.length} inspections for project ${projectId}`
      )
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
})
