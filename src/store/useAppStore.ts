import { create } from 'zustand'
import { createAuthSlice, type AuthSlice } from './slices/authSlice'
import { createProjectSlice, type ProjectSlice } from './slices/projectSlice'
import {
  createInspectionSlice,
  type InspectionSlice,
} from './slices/inspectionSlice'
import { createOfflineSlice, type OfflineSlice } from './slices/offlineSlice'

type AppStore = AuthSlice & ProjectSlice & InspectionSlice & OfflineSlice

export const useAppStore = create<AppStore>()((...a) => ({
  ...createAuthSlice(...a),
  ...createProjectSlice(...a),
  ...createInspectionSlice(...a),
  ...createOfflineSlice(...a),
}))

/**
 * 🛡️ GHOST DATA PROTECTION: Reset all stores to initial state
 * Call this BEFORE signOut to prevent data leaking between user sessions
 */
export const resetAllStores = () => {
  const store = useAppStore.getState()
  
  console.log('🧹 Resetting ALL stores (Ghost Data Protection)')
  
  // Reset each slice using their dedicated reset methods
  store.resetAuth()
  store.resetProjects()
  store.resetInspections()
  
  console.log('✅ All stores cleared successfully')
}
