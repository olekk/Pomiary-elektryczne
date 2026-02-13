import type { StateCreator } from 'zustand'
import type { Building } from '../../types'
import { logger } from '../../utils/logger'
import type { Unsubscribe } from 'firebase/firestore'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { deleteBuildingFromFirestore } from '../../services'

// Module-level unsubscribe reference for cleanup
let unsubscribeBuildings: Unsubscribe | null = null

export interface BuildingSlice {
  buildings: Building[]
  isLoadingBuildings: boolean
  loadedProjectId: string | null // 🛡️ Ghost Data Protection: Track loaded project
  subscribeToBuildings: (projectId: string) => void
  unsubscribeFromBuildings: () => void
  addBuilding: (projectId: string, street: string, zipCode: string, city: string, userId: string) => Promise<void>
  deleteBuilding: (id: string) => Promise<void>
  resetBuildings: () => void
}

export const createBuildingSlice: StateCreator<
  BuildingSlice,
  [],
  [],
  BuildingSlice
> = (set, get) => ({
  buildings: [],
  isLoadingBuildings: true,
  loadedProjectId: null, // 🛡️ Ghost Data Protection: Initially null

  /**
   * Subscribe to buildings with Realtime Listener (Offline-First + Stale-While-Revalidate)
   * - Shows stale data immediately (no spinner if we have data)
   * - Updates in background when fresh data arrives
   * - includeMetadataChanges: true for faster offline responsiveness
   * - Ghost Data Protection: Clears data when switching projects
   */
  subscribeToBuildings: (projectId: string) => {
    logger.log(
      `🔔 Subscribing to buildings for project ${projectId} (Stale-While-Revalidate)...`
    )

    const { buildings, loadedProjectId } = get()

    // 🛡️ GHOST DATA PROTECTION: Check if project ID changed
    if (loadedProjectId !== projectId) {
      logger.log(
        `🧹 Project changed (${loadedProjectId} → ${projectId}) - clearing ghost data`
      )
      set({
        buildings: [], // Clear old project data immediately
        loadedProjectId: projectId, // Update loaded project ID
        isLoadingBuildings: true, // Show spinner for new project
      })
    } else {
      // 🎯 STALE-WHILE-REVALIDATE: Same project, check if we have stale data
      if (buildings.length === 0) {
        logger.log('📭 No stale data - showing spinner')
        set({ isLoadingBuildings: true })
      } else {
        logger.log(
          `♻️  Showing ${buildings.length} stale buildings while revalidating`
        )
      }
    }

    // Cleanup existing subscription to avoid duplicates
    if (unsubscribeBuildings) {
      logger.log('🧹 Cleaning up existing buildings subscription')
      unsubscribeBuildings()
    }

    const q = query(
      collection(db, 'buildings'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    )

    unsubscribeBuildings = onSnapshot(
      q,
      {
        // 🚀 Include metadata changes for faster offline updates (pending writes)
        includeMetadataChanges: true,
      },
      (snapshot) => {
        const buildings: Building[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()
          buildings.push({
            id: doc.id,
            projectId: data.projectId,
            name: data.name, // Stare dane
            street: data.street || data.name || '', // Nowe dane lub fallback na stare
            zipCode: data.zipCode || '',
            city: data.city || '',
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(),
            updatedAt: data.updatedAt?.toDate
              ? data.updatedAt.toDate()
              : new Date(),
            userId: data.userId || '',
          })
        })

        logger.log(
          `📥 Buildings snapshot: ${buildings.length} buildings (fromCache: ${snapshot.metadata.fromCache}, hasPendingWrites: ${snapshot.metadata.hasPendingWrites})`
        )

        set({
          buildings,
          isLoadingBuildings: false,
        })
      },
      (error) => {
        logger.error(
          '❌ Buildings subscription error:',
          error.code,
          error.message
        )
        // Set loading to false even on error to prevent infinite spinner
        set({ isLoadingBuildings: false })
      }
    )
  },

  /**
   * Unsubscribe from buildings realtime listener
   * Call this on component unmount or when switching projects
   */
  unsubscribeFromBuildings: () => {
    logger.log('🔕 Unsubscribing from buildings')
    if (unsubscribeBuildings) {
      unsubscribeBuildings()
      unsubscribeBuildings = null
    }
  },

  /**
   * Add a new building (Offline-First with Optimistic Update)
   */
  addBuilding: async (projectId: string, street: string, zipCode: string, city: string, userId: string) => {
    logger.log(`➕ Adding building: ${street}, ${zipCode} ${city} to project ${projectId}`)

    // KROK 1: Optimistic Update - dodaj do lokalnej listy NATYCHMIAST
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const optimisticBuilding: Building = {
      id: tempId,
      projectId,
      street,
      zipCode,
      city,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
    }

    const { buildings } = get()
    set({
      buildings: [optimisticBuilding, ...buildings],
    })

    // KROK 2: Background sync (Fire-and-Forget)
    addDoc(collection(db, 'buildings'), {
      projectId,
      street,
      zipCode,
      city,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
      .then((docRef) => {
        logger.log(`✅ Building created with ID: ${docRef.id}`)
        
        // Replace temporary ID with real ID (onSnapshot will also handle this)
        const updatedBuildings = get().buildings.map((b) =>
          b.id === tempId ? { ...b, id: docRef.id } : b
        )
        set({ buildings: updatedBuildings })
      })
      .catch((error) => {
        logger.error('❌ Error adding building:', error)
        // Rollback optimistic update on error
        const { buildings } = get()
        set({
          buildings: buildings.filter((b) => !b.id.startsWith('temp_')),
        })
        // NIE rzucamy błędu - użytkownik już widzi budynek w UI
        // onSnapshot później zsynchronizuje poprawny stan
      })
  },

  /**
   * Delete a building with cascading delete (Optimistic Update)
   * Removes building AND all related inspections atomically
   */
  deleteBuilding: async (id: string) => {
    logger.log(`🗑️  Deleting building: ${id}`)

    // KROK 1: Optimistic Update - usuń z lokalnej listy NATYCHMIAST
    const { buildings } = get()
    set({
      buildings: buildings.filter((b) => b.id !== id),
    })

    // KROK 2: Background sync (Fire-and-Forget) - cascading delete w tle
    deleteBuildingFromFirestore(id)
      .then(() => {
        logger.log(`✅ Building ${id} deleted successfully with cascading delete`)
      })
      .catch((error) => {
        logger.error(`❌ Error deleting building ${id}:`, error)
        // TODO: Można dodać rollback - przywrócić budynek do listy
      })
  },

  /**
   * Reset buildings state (called on logout)
   */
  resetBuildings: () => {
    logger.log('🧹 Resetting buildings state')
    if (unsubscribeBuildings) {
      unsubscribeBuildings()
      unsubscribeBuildings = null
    }
    set({
      buildings: [],
      isLoadingBuildings: true,
      loadedProjectId: null,
    })
  },
})
