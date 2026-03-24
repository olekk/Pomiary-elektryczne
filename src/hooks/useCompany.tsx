import React, { createContext, useContext, useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from './useAuth'
import { logger } from '../utils/logger'
import type { CompanyRole } from '../types'

interface CompanyContextValue {
  /** The stable company ID (e.g. "hc-instal-a7k29m") */
  companyId: string | null
  /** Current user's role in the company */
  role: CompanyRole | null
  /** Human-readable company name */
  companyName: string
  /** Whether company resolution is still loading */
  isCompanyLoading: boolean
}

const CompanyContext = createContext<CompanyContextValue>({
  companyId: null,
  role: null,
  companyName: '',
  isCompanyLoading: true,
})

export const useCompany = () => useContext(CompanyContext)

/**
 * CompanyProvider resolves the current user's company membership.
 *
 * Strategy (single-company model):
 * 1. Read /users/{uid}.companyId for fast resolution
 * 2. Then subscribe to /companies/{companyId}/members/{uid} for role
 * 3. Subscribe to /companies/{companyId} for company name
 */
export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth()

  const [companyId, setCompanyId] = useState<string | null>(null)
  const [role, setRole] = useState<CompanyRole | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [isCompanyLoading, setIsCompanyLoading] = useState(true)

  // Step 1: Resolve companyId from /users/{uid}
  useEffect(() => {
    if (!user?.uid) {
      setCompanyId(null)
      setRole(null)
      setCompanyName('')
      setIsCompanyLoading(false)
      return
    }

    setIsCompanyLoading(true)

    const userDocRef = doc(db, 'users', user.uid)
    const unsubscribe = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          const cid = typeof data.companyId === 'string' ? data.companyId : null
          setCompanyId(cid)
          if (!cid) {
            logger.warn('⚠️ User has no companyId assigned')
            setIsCompanyLoading(false)
          }
        } else {
          logger.warn('⚠️ User document does not exist')
          setCompanyId(null)
          setIsCompanyLoading(false)
        }
      },
      (error) => {
        logger.error('❌ Error reading user document:', error)
        setIsCompanyLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user?.uid])

  // Step 2: Once companyId is known, subscribe to member doc (for role) and company doc (for name)
  useEffect(() => {
    if (!user?.uid || !companyId) {
      if (!companyId && user?.uid) {
        setRole(null)
        setCompanyName('')
      }
      return
    }

    logger.log(`🏢 Resolving company membership: ${companyId}`)

    // Subscribe to member document
    const memberRef = doc(db, 'companies', companyId, 'members', user.uid)
    const unsubMember = onSnapshot(
      memberRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setRole(data.role as CompanyRole)
          logger.log(`✅ Company role resolved: ${data.role}`)
        } else {
          logger.warn('⚠️ No member document found')
          setRole(null)
        }
        setIsCompanyLoading(false)
      },
      (error) => {
        logger.error('❌ Error reading member document:', error)
        setIsCompanyLoading(false)
      }
    )

    // Subscribe to company document (for name)
    const companyRef = doc(db, 'companies', companyId)
    const unsubCompany = onSnapshot(
      companyRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setCompanyName(typeof data.name === 'string' ? data.name : '')
        }
      },
      (error) => {
        logger.error('❌ Error reading company document:', error)
      }
    )

    return () => {
      unsubMember()
      unsubCompany()
    }
  }, [user?.uid, companyId])

  return (
    <CompanyContext.Provider
      value={{ companyId, role, companyName, isCompanyLoading }}
    >
      {children}
    </CompanyContext.Provider>
  )
}
