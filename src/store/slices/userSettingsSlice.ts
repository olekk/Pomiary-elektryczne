import type { StateCreator } from 'zustand'
import type { UserSettings } from '../../types'
import {
  getUserSettingsFromFirestore,
  saveUserSettingsToFirestore,
} from '../../services'

const USER_SETTINGS_STORAGE_KEY = 'userSettings'

const getUserSettingsStorageKey = (userId: string): string =>
  `${USER_SETTINGS_STORAGE_KEY}:${userId}`

const readUserSettingsFromLocal = (userId: string): UserSettings | null => {
  try {
    const raw = localStorage.getItem(getUserSettingsStorageKey(userId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<UserSettings>
    return {
      displayName:
        typeof parsed.displayName === 'string' ? parsed.displayName : '',
      signatureBase64:
        typeof parsed.signatureBase64 === 'string'
          ? parsed.signatureBase64
          : '',
    }
  } catch (error) {
    console.error('Error reading user settings from local storage:', error)
    return null
  }
}

const saveUserSettingsToLocal = (
  userId: string,
  settings: UserSettings
): void => {
  try {
    localStorage.setItem(
      getUserSettingsStorageKey(userId),
      JSON.stringify({
        displayName: settings.displayName.trim(),
        signatureBase64: settings.signatureBase64 || '',
      })
    )
  } catch (error) {
    console.error('Error saving user settings to local storage:', error)
  }
}

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
      const localFallbackSettings = readUserSettingsFromLocal(userId)
      const sourceSettings = settings || localFallbackSettings

      set({
        technicianName: sourceSettings?.displayName || '',
        technicianSignature: sourceSettings?.signatureBase64 || '',
      })

      // Refresh local backup from latest known-good settings source
      if (sourceSettings) {
        saveUserSettingsToLocal(userId, sourceSettings)
      }
    } catch (error) {
      console.error('Error loading user settings from cloud:', error)

      const localFallbackSettings = readUserSettingsFromLocal(userId)
      if (!localFallbackSettings) {
        throw error
      }

      console.warn('Using local fallback user settings')
      set({
        technicianName: localFallbackSettings.displayName,
        technicianSignature: localFallbackSettings.signatureBase64,
      })
    } finally {
      set({ isUserSettingsLoading: false })
    }
  },

  saveUserSettings: async (userId, settings) => {
    await saveUserSettingsToFirestore(userId, settings)
    saveUserSettingsToLocal(userId, settings)

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
