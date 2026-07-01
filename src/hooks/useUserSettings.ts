import { useState, useEffect, useCallback } from 'react'
import { onSnapshot, doc } from 'firebase/firestore'
import { db } from '../firebase'
import type { UserSettings } from '../types'
import { saveUserSettingsToFirestore } from '../services'
import { logger } from '../utils/logger'

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
      reviewerName:
        typeof parsed.reviewerName === 'string' ? parsed.reviewerName : '',
      reviewerLicenseNumber:
        typeof parsed.reviewerLicenseNumber === 'string' ? parsed.reviewerLicenseNumber : '',
      reviewerSignatureBase64:
        typeof parsed.reviewerSignatureBase64 === 'string'
          ? parsed.reviewerSignatureBase64
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
        reviewerName: settings.reviewerName.trim(),
        reviewerLicenseNumber: settings.reviewerLicenseNumber.trim(),
        reviewerSignatureBase64: settings.reviewerSignatureBase64 || '',
      })
    )
  } catch (error) {
    console.error('Error saving user settings to local storage:', error)
  }
}

interface UseUserSettingsResult {
  technicianName: string
  technicianLicenseNumber: string
  technicianSignature: string
  reviewerName: string
  reviewerLicenseNumber: string
  reviewerSignature: string
  isLoading: boolean
  save: (settings: UserSettings) => Promise<void>
}

/**
 * Hook for user settings with Firestore onSnapshot + localStorage fallback.
 * Replaces userSettingsSlice.
 */
export function useUserSettings(userId: string | undefined): UseUserSettingsResult {
  const [technicianName, setTechnicianName] = useState('')
  const [technicianLicenseNumber, setTechnicianLicenseNumber] = useState('')
  const [technicianSignature, setTechnicianSignature] = useState('')
  const [reviewerName, setReviewerName] = useState('')
  const [reviewerLicenseNumber, setReviewerLicenseNumber] = useState('')
  const [reviewerSignature, setReviewerSignature] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setTechnicianName('')
      setTechnicianLicenseNumber('')
      setTechnicianSignature('')
      setReviewerName('')
      setReviewerLicenseNumber('')
      setReviewerSignature('')
      setIsLoading(false)
      return
    }

    // Load localStorage fallback immediately (sync, fast)
    const localSettings = readUserSettingsFromLocal(userId)
    if (localSettings) {
      setTechnicianName(localSettings.displayName)
      setTechnicianLicenseNumber(localSettings.licenseNumber)
      setTechnicianSignature(localSettings.signatureBase64)
      setReviewerName(localSettings.reviewerName)
      setReviewerLicenseNumber(localSettings.reviewerLicenseNumber)
      setReviewerSignature(localSettings.reviewerSignatureBase64)
    }

    // Subscribe to Firestore for live updates
    const docRef = doc(db, 'users', userId)
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          const name = typeof data.displayName === 'string' ? data.displayName : ''
          const license = typeof data.licenseNumber === 'string' ? data.licenseNumber : ''
          const signature = typeof data.signatureBase64 === 'string' ? data.signatureBase64 : ''
          const revName = typeof data.reviewerName === 'string' ? data.reviewerName : ''
          const revLicense = typeof data.reviewerLicenseNumber === 'string' ? data.reviewerLicenseNumber : ''
          const revSignature = typeof data.reviewerSignatureBase64 === 'string' ? data.reviewerSignatureBase64 : ''

          setTechnicianName(name)
          setTechnicianLicenseNumber(license)
          setTechnicianSignature(signature)
          setReviewerName(revName)
          setReviewerLicenseNumber(revLicense)
          setReviewerSignature(revSignature)

          // Refresh local backup
          saveUserSettingsToLocal(userId, {
            displayName: name,
            licenseNumber: license,
            signatureBase64: signature,
            reviewerName: revName,
            reviewerLicenseNumber: revLicense,
            reviewerSignatureBase64: revSignature,
          })
        }
        setIsLoading(false)
      },
      (error) => {
        logger.error('Error loading user settings from Firestore:', error)
        // Already loaded from localStorage fallback above
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [userId])

  const save = useCallback(
    async (settings: UserSettings) => {
      if (!userId) return

      // Optimistic update
      setTechnicianName(settings.displayName.trim())
      setTechnicianLicenseNumber(settings.licenseNumber.trim())
      setTechnicianSignature(settings.signatureBase64 || '')
      setReviewerName(settings.reviewerName.trim())
      setReviewerLicenseNumber(settings.reviewerLicenseNumber.trim())
      setReviewerSignature(settings.reviewerSignatureBase64 || '')

      // Save locally
      saveUserSettingsToLocal(userId, settings)

      // Background sync
      saveUserSettingsToFirestore(userId, settings)
        .then(() => {
          logger.log('✅ User settings synced to Firestore')
        })
        .catch((error) => {
          logger.error('❌ Failed to sync user settings to Firestore:', error)
        })
    },
    [userId]
  )

  return { technicianName, technicianLicenseNumber, technicianSignature, reviewerName, reviewerLicenseNumber, reviewerSignature, isLoading, save }
}
