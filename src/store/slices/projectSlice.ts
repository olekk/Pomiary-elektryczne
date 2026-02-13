import type { StateCreator } from 'zustand'
import type { Project } from '../../types'
import { logger } from '../../utils/logger'
import type { Unsubscribe } from 'firebase/firestore'
import {
  saveProjectToFirestore,
  deleteProjectFromFirestore,
} from '../../services'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'

// Module-level unsubscribe reference for cleanup
let unsubscribeProjects: Unsubscribe | null = null

export interface ProjectSlice {
  projects: Project[]
  currentProjectId: string | null
  isLoadingProjects: boolean
  loadedUserId: string | null // 🛡️ Ghost Data Protection: Track loaded user
  createNewProject: (name: string) => Promise<void>
  subscribeToProjects: (userId: string) => void
  unsubscribeFromProjects: () => void
  deleteProject: (id: string) => Promise<void>
  setCurrentProjectId: (projectId: string | null) => void
  resetProjects: () => void
}

export const createProjectSlice: StateCreator<
  ProjectSlice,
  [],
  [],
  ProjectSlice
> = (set, get) => ({
  projects: [],
  currentProjectId: null,
  isLoadingProjects: true,
  loadedUserId: null, // 🛡️ Ghost Data Protection: Initially null

  createNewProject: async (name) => {
    const projectId = `proj_${Date.now()}`
    const newProject: Project = {
      id: projectId,
      name,
      createdAt: new Date(),
      status: 'active',
    }

    // Optimistic update: Update UI immediately
    set((state) => ({
      projects: [newProject, ...state.projects],
    }))

    // Fire-and-forget: Save to Firestore in background
    saveProjectToFirestore(newProject)
      .then(() => {
        logger.log(`✅ Project ${projectId} saved successfully`)
      })
      .catch((error) => {
        console.error(`❌ Failed to save project ${projectId}:`, error)
        if (error?.code === 'unavailable') {
          console.log('📴 Offline mode: Data queued for sync when online')
        }
      })
  },

  /**
   * Subscribe to projects with Realtime Listener (Offline-First + Stale-While-Revalidate)
   * - Shows stale data immediately (no spinner if we have data)
   * - Updates in background when fresh data arrives
   * - includeMetadataChanges: true for faster offline responsiveness
   * - Ghost Data Protection: Clears data when switching users
   */
  subscribeToProjects: (userId: string) => {
    logger.log(
      `🔔 Subscribing to projects for user ${userId} (Stale-While-Revalidate)...`
    )
    
    const { projects, loadedUserId } = get()
    
    // 🛡️ GHOST DATA PROTECTION: Check if user ID changed
    if (loadedUserId !== userId) {
      logger.log(
        `🧹 User changed (${loadedUserId} → ${userId}) - clearing ghost data`
      )
      set({ 
        projects: [], // Clear old user data immediately
        loadedUserId: userId, // Update loaded user ID
        isLoadingProjects: true, // Show spinner for new user
      })
    } else {
      // 🎯 STALE-WHILE-REVALIDATE: Same user, check if we have stale data
      if (projects.length === 0) {
        logger.log('📭 No stale data - showing spinner')
        set({ isLoadingProjects: true })
      } else {
        logger.log(
          `♻️  Showing ${projects.length} stale projects while revalidating`
        )
      }
    }

    // Cleanup existing subscription to avoid duplicates
    if (unsubscribeProjects) {
      logger.log('🧹 Cleaning up existing projects subscription')
      unsubscribeProjects()
    }

    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'))

    unsubscribeProjects = onSnapshot(
      q,
      {
        // 🚀 Include metadata changes for faster offline updates (pending writes)
        includeMetadataChanges: true,
      },
      (snapshot) => {
        const projects: Project[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()
          projects.push({
            id: doc.id,
            name: data.name,
            status: data.status || 'active',
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(),
          })
        })

        logger.log(
          `📥 Projects snapshot: ${projects.length} projects (fromCache: ${snapshot.metadata.fromCache}, hasPendingWrites: ${snapshot.metadata.hasPendingWrites})`
        )

        set({ projects, isLoadingProjects: false })
      },
      (error) => {
        logger.error(
          '❌ Projects subscription error:',
          error.code, error.message)
        // Set loading to false even on error to prevent infinite spinner
        set({ isLoadingProjects: false })
      }
    )
  },

  /**
   * Unsubscribe from projects realtime listener
   * Call this on component unmount or user logout
   */
  unsubscribeFromProjects: () => {
    logger.log('🔕 Unsubscribing from projects')
    if (unsubscribeProjects) {
      unsubscribeProjects()
      unsubscribeProjects = null
    }
  },

  deleteProject: async (id) => {
    // KROK 1: Optimistic Update - usuń z lokalnej listy NATYCHMIAST
    const { projects } = get()
    set({
      projects: projects.filter((p) => p.id !== id),
    })

    // KROK 2: Background sync (Fire-and-Forget)
    deleteProjectFromFirestore(id)
      .then(() => {
        logger.log(`🗑️  Deleting project: ${id} deleted successfully`)
      })
      .catch((error) => {
        logger.error('❌ Error creating project:', error)
        // TODO: Można dodać rollback - przywrócić projekt do listy
      })
  },

  setCurrentProjectId: (projectId) => {
    set({ currentProjectId: projectId })
  },

  resetProjects: () => {
    logger.log('🧹 Resetting projects state')
    set({ 
      projects: [], 
      currentProjectId: null, 
      isLoadingProjects: true,
      loadedUserId: null,
    })
  },
})
