import type { StateCreator } from 'zustand'
import type { Project } from '../../types'
import {
  saveProjectToFirestore,
  loadProjectsFromFirestore,
  deleteProjectFromFirestore,
} from '../../services'

export interface ProjectSlice {
  projects: Project[]
  currentProjectId: string | null
  createNewProject: (name: string) => Promise<void>
  loadProjects: () => Promise<void>
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

  loadProjects: async () => {
    try {
      console.log('🔄 Loading projects from Firestore...')
      // Firebase SDK automatically uses cache when offline (persistentLocalCache)
      const projects = await loadProjectsFromFirestore()
      set({ projects })
      console.log(`✅ Successfully loaded ${projects.length} projects`)
    } catch (error) {
      console.error('❌ Error loading projects:', error)
      // Don't throw error to avoid blocking UI in offline mode
      // Keep existing projects in state if load fails
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
