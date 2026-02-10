import type { StateCreator } from 'zustand'
import type { UserSettings } from '../../types'
import {
  getUserSettingsFromFirestore,
  saveUserSettingsToFirestore,
} from '../../services'

export interface UserSettingsSlice {
  technicianName: string
  technicianSignature: string
  isUserSettingsLoading: boolean
  loadUserSettings: (userId: string) => Promise<void>
  saveUserSettings: (userId: string, settings: UserSettings) => Promise<void>
  resetUserSettings: () => void
}

export const createUserSettingsSlice: StateCreator<
  UserSettingsSlice,
  [],
  [],
  UserSettingsSlice
> = (set) => ({
  technicianName: '',
  technicianSignature: '',
  isUserSettingsLoading: false,

  loadUserSettings: async (userId) => {
    set({ isUserSettingsLoading: true })

    try {
      const settings = await getUserSettingsFromFirestore(userId)

      set({
        technicianName: settings?.displayName || '',
        technicianSignature: settings?.signatureBase64 || '',
      })
    } catch (error) {
      console.error('Error loading user settings:', error)
      throw error
    } finally {
      set({ isUserSettingsLoading: false })
    }
  },

  saveUserSettings: async (userId, settings) => {
    await saveUserSettingsToFirestore(userId, settings)

    set({
      technicianName: settings.displayName.trim(),
      technicianSignature: settings.signatureBase64 || '',
    })
  },

  resetUserSettings: () => {
    set({
      technicianName: '',
      technicianSignature: '',
      isUserSettingsLoading: false,
    })
  },
})
