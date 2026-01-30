import { create } from 'zustand'
import type { User } from 'firebase/auth'
import type { Inspection, Project, ProtectionType, Amperage } from '../types'
import { DEFAULT_K_FACTORS } from '../types'
import {
  saveInspectionToFirestore,
  loadInspectionsFromFirestore,
  deleteInspectionFromFirestore,
  retrySyncInspection,
  markInspectionAsSynced,
  saveProjectToFirestore,
  loadProjectsFromFirestore,
  deleteProjectFromFirestore,
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
  // State - Auth
  user: User | null

  // State - Projects
  projects: Project[]
  currentProjectId: string | null

  // State - Inspections
  currentInspection: Inspection | null
  inspections: Inspection[]

  // State - Offline
  isOnline: boolean
  pendingSyncCount: number

  // State - Settings
  lastProtectionType: ProtectionType
  lastAmperage: Amperage
  lastKFactor: number

  // Actions - Auth Management
  setUser: (user: User | null) => void

  // Actions - Project Management
  createNewProject: (name: string) => Promise<void>
  loadProjects: () => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setCurrentProjectId: (projectId: string | null) => void

  // Actions - Inspection Management
  createNewInspection: (
    projectId: string,
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
  saveToFirestore: (signatureOverride?: string) => Promise<void>
  loadInspections: (projectId: string) => Promise<void>
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
  // Initial State - Auth
  user: null,

  // Initial State - Projects
  projects: [],
  currentProjectId: null,

  // Initial State - Inspections
  currentInspection: null,
  inspections: [],

  // Initial State - Offline
  isOnline: navigator.onLine,
  pendingSyncCount: 0,

  // Initial State - Settings
  lastProtectionType: 'WNP',
  lastAmperage: 16,
  lastKFactor: DEFAULT_K_FACTORS.WNP,

  // ===== AUTH MANAGEMENT =====

  setUser: (user) => {
    set({ user })
  },

  // ===== PROJECT MANAGEMENT =====

  createNewProject: async (name) => {
    const projectId = `proj_${Date.now()}`
    const newProject: Project = {
      id: projectId,
      name,
      createdAt: new Date(),
      status: 'active',
    }

    // Optimistic update
    set((state) => ({
      projects: [newProject, ...state.projects],
    }))

    // Save to Firestore
    try {
      await saveProjectToFirestore(newProject)
      console.log(`✅ Project ${projectId} saved successfully`)
    } catch (error) {
      console.error(`❌ Failed to save project ${projectId}:`, error)
    }
  },

  loadProjects: async () => {
    try {
      console.log('🔄 Loading projects from Firestore...')
      const projects = await loadProjectsFromFirestore()
      set({ projects })
      console.log(`✅ Successfully loaded ${projects.length} projects`)
    } catch (error) {
      console.error('❌ Error loading projects:', error)
    }
  },

  deleteProject: async (id) => {
    try {
      await deleteProjectFromFirestore(id)

      // Optimistic update
      const { projects } = get()
      set({
        projects: projects.filter((p) => p.id !== id),
      })

      console.log(`✅ Project ${id} deleted successfully`)
    } catch (error) {
      console.error('Error deleting project:', error)
      throw error
    }
  },

  setCurrentProjectId: (projectId) => {
    set({ currentProjectId: projectId })
  },

  // ===== INSPECTION MANAGEMENT =====

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

  saveToFirestore: async (signatureOverride) => {
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
    const inspectionToSave: Inspection = {
      ...currentInspection,
      signature: signatureToSave,
    }

    saveInspectionToFirestore(inspectionToSave, savedId)
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

  loadInspections: async (projectId) => {
    try {
      console.log(`🔄 Loading inspections for project ${projectId}...`)
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
