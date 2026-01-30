import type { User } from 'firebase/auth'
import type { StateCreator } from 'zustand'

export interface AuthSlice {
  user: User | null
  setUser: (user: User | null) => void
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
})
