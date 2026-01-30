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
})
