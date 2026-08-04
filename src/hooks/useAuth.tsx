import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth } from '../firebase'
import { logger } from '../utils/logger'

const AUTH_CACHE_KEY = 'cachedAuthUid'

/** Persist just enough info so we can skip the loading screen on cold start. */
function cacheAuthState(user: User | null) {
  try {
    if (user) {
      localStorage.setItem(AUTH_CACHE_KEY, user.uid)
    } else {
      localStorage.removeItem(AUTH_CACHE_KEY)
    }
  } catch { /* ignore */ }
}

function hasCachedAuth(): boolean {
  try {
    return !!localStorage.getItem(AUTH_CACHE_KEY)
  } catch { return false }
}

interface AuthContextValue {
  user: User | null
  isAuthChecking: boolean
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthChecking: true,
  signOutUser: async () => {},
})

// Context, hook, and provider are intentionally co-located; the hook export
// breaks Fast Refresh for this file only, which is acceptable here.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // If we have a cached UID, assume user is logged in → skip loading spinner.
  // onAuthStateChanged will provide the real User object shortly.
  const cachedLoggedIn = hasCachedAuth()
  const [user, setUser] = useState<User | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(!cachedLoggedIn)

  useEffect(() => {
    let resolved = false

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      resolved = true
      if (firebaseUser) {
        logger.log('✅ User authenticated:', firebaseUser.email)
      } else {
        logger.log('❌ User logged out')
      }
      cacheAuthState(firebaseUser)
      setUser(firebaseUser)
      setIsAuthChecking(false)
    })

    // Safety timeout: if onAuthStateChanged never fires (e.g. IndexedDB hang),
    // stop blocking the UI after 3 seconds.
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        logger.warn('⏰ Auth check timed out after 3s, unblocking UI')
        setIsAuthChecking(false)
      }
    }, 3000)

    return () => {
      clearTimeout(timeoutId)
      unsubscribe()
    }
  }, [])

  const signOutUser = async () => {
    logger.log('🧹 Signing out from Firebase...')
    cacheAuthState(null)
    await signOut(auth)
    logger.log('✅ Logout complete')
  }

  return (
    <AuthContext.Provider value={{ user, isAuthChecking, signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}
