import type { StateCreator } from 'zustand'
import type { Building } from '../../types'
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
  addBuilding: (projectId: string, name: string, userId: string) => Promise<void>
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
    console.log(
      `🔔 Subscribing to buildings for project ${projectId} (Stale-While-Revalidate)...`
    )

    const { buildings, loadedProjectId } = get()

    // 🛡️ GHOST DATA PROTECTION: Check if project ID changed
    if (loadedProjectId !== projectId) {
      console.log(
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
        console.log('📭 No stale data - showing spinner')
        set({ isLoadingBuildings: true })
      } else {
        console.log(
          `♻️  Showing ${buildings.length} stale buildings while revalidating`
        )
      }
    }

    // Cleanup existing subscription to avoid duplicates
    if (unsubscribeBuildings) {
      console.log('🧹 Cleaning up existing buildings subscription')
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
            name: data.name,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(),
            updatedAt: data.updatedAt?.toDate
              ? data.updatedAt.toDate()
              : new Date(),
            userId: data.userId || '',
          })
        })

        console.log(
          `📥 Buildings snapshot: ${buildings.length} buildings (fromCache: ${snapshot.metadata.fromCache}, hasPendingWrites: ${snapshot.metadata.hasPendingWrites})`
        )

        set({
          buildings,
          isLoadingBuildings: false,
        })
      },
      (error) => {
        console.error(
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
    console.log('🔕 Unsubscribing from buildings')
    if (unsubscribeBuildings) {
      unsubscribeBuildings()
      unsubscribeBuildings = null
    }
  },

  /**
   * Add a new building (Offline-First with Optimistic Update)
   */
  addBuilding: async (projectId: string, name: string, userId: string) => {
    try {
      console.log(`➕ Adding building: ${name} to project ${projectId}`)

      // Optimistic update: Generate temporary ID and add to local state
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const optimisticBuilding: Building = {
        id: tempId,
        projectId,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId,
      }

      const { buildings } = get()
      set({
        buildings: [optimisticBuilding, ...buildings],
      })

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'buildings'), {
        projectId,
        name,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      console.log(`✅ Building created with ID: ${docRef.id}`)

      // Replace temporary ID with real ID (onSnapshot will handle this, but we can do it immediately)
      const updatedBuildings = get().buildings.map((b) =>
        b.id === tempId ? { ...b, id: docRef.id } : b
      )
      set({ buildings: updatedBuildings })
    } catch (error) {
      console.error('❌ Error adding building:', error)
      // Rollback optimistic update on error
      const { buildings } = get()
      set({
        buildings: buildings.filter((b) => !b.id.startsWith('temp_')),
      })
      throw error
    }
  },

  /**
   * Delete a building with cascading delete (Optimistic Update)
   * Removes building AND all related inspections atomically
   */
  deleteBuilding: async (id: string) => {
    try {
      console.log(`🗑️  Deleting building: ${id}`)

      // Optimistic update: Remove from local list
      const { buildings } = get()
      set({
        buildings: buildings.filter((b) => b.id !== id),
      })

      // Delete from Firestore with cascading delete
      await deleteBuildingFromFirestore(id)

      console.log(`✅ Building ${id} deleted successfully with cascading delete`)
    } catch (error) {
      console.error('❌ Error deleting building:', error)
      throw error
    }
  },

  /**
   * Reset buildings state (called on logout)
   */
  resetBuildings: () => {
    console.log('🧹 Resetting buildings state')
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
