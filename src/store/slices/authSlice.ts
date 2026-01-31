import type { User } from 'firebase/auth'
import type { StateCreator } from 'zustand'

export interface AuthSlice {
  user: User | null
  setUser: (user: User | null) => void
  resetAuth: () => void
}

export const createAuthSlice: StateCreator<
  AuthSlice,
  [],
  [],
  AuthSlice
> = (set) => ({
  user: null,

  setUser: (user) => {
    set({ user })
  },

  resetAuth: () => {
    console.log('🧹 Resetting auth state')
    set({ user: null })
  },
})
