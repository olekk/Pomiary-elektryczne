import type { StateCreator } from 'zustand'
import type { Inspection } from '../../types'
import type { Unsubscribe } from 'firebase/firestore'
import {
  saveInspectionToFirestore,
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
  ensureDate,
  generateProtocolNumber,
} from '../../utils'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '../../firebase'

// Module-level unsubscribe reference for cleanup
let unsubscribeInspections: Unsubscribe | null = null

export interface InspectionSlice {
  currentInspection: Inspection | null
  inspections: Inspection[]
  pendingSyncCount: number
  isLoadingInspections: boolean
  loadedBuildingId: string | null // 🛡️ Ghost Data Protection: Track loaded building
  createNewInspection: (
    projectId: string,
    buildingId: string,
    address: string,
    apartmentNumber: string
  ) => void
  setCurrentInspection: (inspection: Inspection | null) => void
  setOwnerSignature: (ownerSignature: string) => void
  updateInspectionNotes: (notes: string) => void
  addMeasurement: (
    room: import('../../types').Room,
    protectionType: import('../../types').ProtectionType,
    amperage: import('../../types').Amperage,
    zsValue: number | null,
    noGrounding?: import('../../types').NoGroundingType
  ) => void
  updateMeasurement: (id: string, zsValue: number | null) => void
  removeMeasurement: (id: string) => void
  saveToFirestore: (ownerSignatureOverride?: string) => Promise<void>
  subscribeToInspections: (buildingId: string) => void
  unsubscribeFromInspections: () => void
  deleteInspection: (id: string) => Promise<void>
  markInspectionAsSynced: (inspectionId: string) => void
  resetInspections: () => void
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
  isLoadingInspections: true,
  loadedBuildingId: null, // 🛡️ Ghost Data Protection: Initially null

  createNewInspection: (
    projectId,
    buildingId,
    address,
    apartmentNumber
  ) => {
    const state = get() as InspectionSlice & {
      technicianName: string
      technicianSignature: string
    }
    const date = new Date()
    const protocolNumber = generateProtocolNumber(
      date,
      apartmentNumber,
      address
    )

    set({
      currentInspection: {
        projectId,
        buildingId,
        address,
        apartmentNumber,
        technicianName: state.technicianName,
        technicianSignature: state.technicianSignature,
        date,
        protocolNumber,
        notes: '',
        measurements: [],
        synced: false,
      },
    })
  },

  setCurrentInspection: (inspection) => {
    set({ currentInspection: inspection })
  },

  setOwnerSignature: (ownerSignature) => {
    set((state) => ({
      currentInspection: state.currentInspection
        ? { ...state.currentInspection, ownerSignature }
        : null,
    }))
  },

  updateInspectionNotes: (notes) => {
    set((state) => ({
      currentInspection: state.currentInspection
        ? { ...state.currentInspection, notes }
        : null,
    }))
  },

  addMeasurement: (room, protectionType, amperage, zsValue, noGrounding) => {
    const state = get() as InspectionSlice
    const { currentInspection } = state

    if (!currentInspection) return

    const pointNumber = currentInspection.measurements.length + 1
    const id = generateMeasurementId()

    const newMeasurement = createMeasurement(
      id,
      pointNumber,
      room,
      protectionType,
      amperage,
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
          m.noGrounding
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

  saveToFirestore: async (ownerSignatureOverride) => {
    const { currentInspection, inspections } = get() as InspectionSlice

    if (!currentInspection) {
      throw new Error('Brak danych do zapisania')
    }

    // Generate ID locally for offline support
    const savedId = currentInspection.id || generateInspectionId()

    // Use signatureOverride if provided, otherwise use store signature
    const ownerSignatureToSave =
      ownerSignatureOverride || currentInspection.ownerSignature || ''

    // Optimistic update: Update UI immediately
    const optimisticInspection: Inspection = {
      id: savedId,
      projectId: currentInspection.projectId,
      buildingId: currentInspection.buildingId,
      address: currentInspection.address,
      apartmentNumber: currentInspection.apartmentNumber,
      technicianName: currentInspection.technicianName,
      technicianSignature: currentInspection.technicianSignature || '',
      date: ensureDate(currentInspection.date),
      measurements: currentInspection.measurements,
      notes: currentInspection.notes || '',
      ownerSignature: ownerSignatureToSave,
      protocolNumber: currentInspection.protocolNumber,
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
    const state = get() as InspectionSlice
    const newPendingCount = state.inspections.filter(
      (i: Inspection) => !i.synced
    ).length
    set({ pendingSyncCount: newPendingCount })

    // Fire-and-forget: Save to Firebase in background
    const inspectionToSave: Inspection = {
      ...currentInspection,
      notes: currentInspection.notes || '',
      ownerSignature: ownerSignatureToSave,
    }

    saveInspectionToFirestore(inspectionToSave, savedId)
      .then(async () => {
        // Mark as synced in Firestore
        await markInspectionAsSynced(savedId)

        console.log(`✅ Inspection ${savedId} synced successfully`)
        const currentState = get() as InspectionSlice
        const syncedList = currentState.inspections.map((insp: Inspection) =>
          insp.id === savedId ? { ...insp, synced: true } : insp
        )
        set({
          inspections: syncedList,
          pendingSyncCount: syncedList.filter((i: Inspection) => !i.synced)
            .length,
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

  /**
   * Subscribe to inspections with Realtime Listener (Offline-First + Stale-While-Revalidate)
   * - Shows stale data immediately (no spinner if we have data)
   * - Updates in background when fresh data arrives
   * - includeMetadataChanges: true for faster offline responsiveness
   * - Ghost Data Protection: Clears data when switching buildings
   */
  subscribeToInspections: (buildingId: string) => {
    console.log(
      `🔔 Subscribing to inspections for building ${buildingId} (Stale-While-Revalidate)...`
    )

    const { inspections, loadedBuildingId } = get()

    // 🛡️ GHOST DATA PROTECTION: Check if building ID changed
    if (loadedBuildingId !== buildingId) {
      console.log(
        `🧹 Building changed (${loadedBuildingId} → ${buildingId}) - clearing ghost data`
      )
      set({
        inspections: [], // Clear old building data immediately
        loadedBuildingId: buildingId, // Update loaded building ID
        isLoadingInspections: true, // Show spinner for new building
        pendingSyncCount: 0, // Reset pending count
      })
    } else {
      // 🎯 STALE-WHILE-REVALIDATE: Same building, check if we have stale data
      if (inspections.length === 0) {
        console.log('📭 No stale data - showing spinner')
        set({ isLoadingInspections: true })
      } else {
        console.log(
          `♻️  Showing ${inspections.length} stale inspections while revalidating`
        )
      }
    }

    // Cleanup existing subscription to avoid duplicates
    if (unsubscribeInspections) {
      console.log('🧹 Cleaning up existing inspections subscription')
      unsubscribeInspections()
    }

    const q = query(
      collection(db, 'inspections'),
      where('buildingId', '==', buildingId),
      orderBy('createdAt', 'desc')
    )

    unsubscribeInspections = onSnapshot(
      q,
      {
        // 🚀 Include metadata changes for faster offline updates (pending writes)
        includeMetadataChanges: true,
      },
      (snapshot) => {
        const inspections: Inspection[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()

          inspections.push({
            id: doc.id,
            projectId: data.projectId,
            buildingId: data.buildingId,
            address: data.address,
            apartmentNumber: data.apartmentNumber,
            date: data.date?.toDate ? data.date.toDate() : new Date(),
            technicianName: data.technicianName || data.technician || '',
            technicianSignature: data.technicianSignature || '',
            measurements: data.measurements || [],
            notes: data.notes || '',
            ownerSignature: data.ownerSignature || data.signature || '',
            protocolNumber: data.protocolNumber,
            synced: data.synced ?? true,
          })
        })

        const pendingCount = inspections.filter((i) => !i.synced).length

        console.log(
          `📥 Inspections snapshot: ${inspections.length} inspections, ${pendingCount} pending (fromCache: ${snapshot.metadata.fromCache}, hasPendingWrites: ${snapshot.metadata.hasPendingWrites})`
        )

        set({
          inspections,
          pendingSyncCount: pendingCount,
          isLoadingInspections: false,
        })
      },
      (error) => {
        console.error(
          '❌ Inspections subscription error:',
          error.code,
          error.message
        )
        // Set loading to false even on error to prevent infinite spinner
        set({ isLoadingInspections: false })
      }
    )
  },

  /**
   * Unsubscribe from inspections realtime listener
   * Call this on component unmount or when switching projects
   */
  unsubscribeFromInspections: () => {
    console.log('🔕 Unsubscribing from inspections')
    if (unsubscribeInspections) {
      unsubscribeInspections()
      unsubscribeInspections = null
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

  /**
   * Mark inspection as synced (called from offlineSlice retry logic)
   * This is the ONLY proper way to update synced status from outside
   */
  markInspectionAsSynced: (inspectionId: string) => {
    const { inspections, currentInspection } = get()

    const syncedList = inspections.map((insp) =>
      insp.id === inspectionId ? { ...insp, synced: true } : insp
    )

    const newPendingCount = syncedList.filter((i) => !i.synced).length

    console.log(
      `✅ Marked inspection ${inspectionId} as synced (${newPendingCount} pending)`
    )

    set({
      inspections: syncedList,
      pendingSyncCount: newPendingCount,
    })

    // Update currentInspection if it's the same
    if (currentInspection?.id === inspectionId) {
      set({
        currentInspection: {
          ...currentInspection,
          synced: true,
        },
      })
    }
  },

  resetInspections: () => {
    console.log('🧹 Resetting inspections state')
    set({
      currentInspection: null,
      inspections: [],
      pendingSyncCount: 0,
      isLoadingInspections: true,
      loadedBuildingId: null,
    })
  },
})
