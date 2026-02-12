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
      licenseNumber:
        typeof parsed.licenseNumber === 'string' ? parsed.licenseNumber : '',
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
        licenseNumber: settings.licenseNumber.trim(),
        signatureBase64: settings.signatureBase64 || '',
      })
    )
  } catch (error) {
    console.error('Error saving user settings to local storage:', error)
  }
}

export interface UserSettingsSlice {
  technicianName: string
  technicianLicenseNumber: string
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
  technicianLicenseNumber: '',
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
        technicianLicenseNumber: sourceSettings?.licenseNumber || '',
        technicianSignature: sourceSettings?.signatureBase64 || '',
      })

      // Refresh local backup from latest known-good settings source
      if (sourceSettings) {
        saveUserSettingsToLocal(userId, sourceSettings)
      }
    } catch (error) {
      // AbortError jest normalnym zachowaniem (np. przy szybkim przełączaniu auth state)
      // Nie logujemy go jako błąd krytyczny
      const isAbortError = error instanceof Error && error.name === 'AbortError'
      
      if (isAbortError) {
        console.log('⚠️ User settings load was aborted (this is OK)')
      } else {
        console.error('Error loading user settings from cloud:', error)
      }

      const localFallbackSettings = readUserSettingsFromLocal(userId)
      if (!localFallbackSettings) {
        // Jeśli to AbortError i nie ma lokalnych ustawień, nie rzucaj błędu
        // Aplikacja może działać z pustymi ustawieniami
        if (isAbortError) {
          console.log('⚠️ No local fallback settings, continuing with empty state')
          set({
            technicianName: '',
            technicianLicenseNumber: '',
            technicianSignature: '',
          })
          return
        }
        throw error
      }

      console.warn('Using local fallback user settings')
      set({
        technicianName: localFallbackSettings.displayName,
        technicianLicenseNumber: localFallbackSettings.licenseNumber,
        technicianSignature: localFallbackSettings.signatureBase64,
      })
    } finally {
      set({ isUserSettingsLoading: false })
    }
  },

  saveUserSettings: async (userId, settings) => {
    // KROK 1: Prepare data (validation już jest w wywołującym komponencie)
    
    // KROK 2: Optimistic Update - zapisz lokalnie i zaktualizuj Zustand NATYCHMIAST
    saveUserSettingsToLocal(userId, settings)
    
    set({
      technicianName: settings.displayName.trim(),
      technicianLicenseNumber: settings.licenseNumber.trim(),
      technicianSignature: settings.signatureBase64 || '',
    })

    // KROK 3: Background sync (Fire-and-Forget) - NIE blokuje UI!
    saveUserSettingsToFirestore(userId, settings)
      .then(() => {
        console.log('✅ User settings synced to Firestore')
      })
      .catch((error) => {
        console.error('❌ Failed to sync user settings to Firestore:', error)
        // Dane są już zapisane lokalnie, więc użytkownik nie traci pracy
        // Firebase spróbuje ponownie gdy będzie internet
      })
  },

  resetUserSettings: () => {
    set({
      technicianName: '',
      technicianLicenseNumber: '',
      technicianSignature: '',
      isUserSettingsLoading: false,
    })
  },
})
