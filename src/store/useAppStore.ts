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
