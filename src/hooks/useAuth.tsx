import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth } from '../firebase'
import { logger } from '../utils/logger'

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

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        logger.log('✅ User authenticated:', firebaseUser.email)
      } else {
        logger.log('❌ User logged out')
      }
      setUser(firebaseUser)
      setIsAuthChecking(false)
    })

    return () => unsubscribe()
  }, [])

  const signOutUser = async () => {
    logger.log('🧹 Signing out from Firebase...')
    await signOut(auth)
    logger.log('✅ Logout complete')
  }

  return (
    <AuthContext.Provider value={{ user, isAuthChecking, signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}
