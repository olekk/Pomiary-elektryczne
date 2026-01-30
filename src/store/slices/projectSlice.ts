import type { StateCreator } from 'zustand'
import type { Project } from '../../types'
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
  createNewProject: (name: string) => Promise<void>
  subscribeToProjects: () => void
  unsubscribeFromProjects: () => void
  deleteProject: (id: string) => Promise<void>
  setCurrentProjectId: (projectId: string | null) => void
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
        console.log(`✅ Project ${projectId} saved successfully`)
      })
      .catch((error) => {
        console.error(`❌ Failed to save project ${projectId}:`, error)
        if (error?.code === 'unavailable') {
          console.log('📴 Offline mode: Data queued for sync when online')
        }
      })
  },

  /**
   * Subscribe to projects with Realtime Listener (Offline-First)
   * - Immediately returns cached data
   * - Automatically syncs with server in background
   * - No need to manually check navigator.onLine
   */
  subscribeToProjects: () => {
    console.log('🔔 Subscribing to projects (Offline-First)...')
    set({ isLoadingProjects: true })

    // Cleanup existing subscription to avoid duplicates
    if (unsubscribeProjects) {
      console.log('🧹 Cleaning up existing subscription')
      unsubscribeProjects()
    }

    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'))

    unsubscribeProjects = onSnapshot(
      q,
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

        console.log(
          `📥 Projects snapshot received: ${projects.length} projects (fromCache: ${snapshot.metadata.fromCache})`
        )

        set({ projects, isLoadingProjects: false })
      },
      (error) => {
        console.error('❌ Projects subscription error:', error.code, error.message)
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
    console.log('🔕 Unsubscribing from projects')
    if (unsubscribeProjects) {
      unsubscribeProjects()
      unsubscribeProjects = null
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
})
