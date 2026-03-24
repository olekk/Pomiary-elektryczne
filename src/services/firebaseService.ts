import {
  setDoc,
  doc,
  Timestamp,
  deleteDoc,
  updateDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Inspection, Project, UserSettings } from '../types'
import { logger } from '../utils/logger'
import { ensureDate } from '../utils'
import { generateCompanyId, generateSlug } from '../utils/companyId'

// ══════════════════════════════════════════════════════════════════════════════
// Company management
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new company with a member record for the owner.
 * Returns the stable companyId.
 */
export const createCompany = async (
  name: string,
  ownerId: string
): Promise<string> => {
  const companyId = generateCompanyId(name)
  const slug = generateSlug(name)

  const batch = writeBatch(db)

  // Company document
  const companyRef = doc(db, 'companies', companyId)
  batch.set(companyRef, {
    name,
    slug,
    createdAt: serverTimestamp(),
    ownerId,
  })

  // Owner member document
  const memberRef = doc(db, 'companies', companyId, 'members', ownerId)
  batch.set(memberRef, {
    userId: ownerId,
    role: 'owner',
    active: true,
    joinedAt: serverTimestamp(),
  })

  // Update user's companyId
  const userRef = doc(db, 'users', ownerId)
  batch.update(userRef, { companyId })

  await batch.commit()
  logger.log(`✅ Company "${name}" created with ID: ${companyId}`)
  return companyId
}

/**
 * Update company name (owner/admin only — enforced by Firestore rules).
 */
export const updateCompanyName = async (
  companyId: string,
  newName: string
): Promise<void> => {
  const companyRef = doc(db, 'companies', companyId)
  await updateDoc(companyRef, { name: newName })
}

// ══════════════════════════════════════════════════════════════════════════════
// Projects (company-scoped)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Save a project to Firestore under a company.
 */
export const saveProjectToFirestore = async (
  companyId: string,
  project: Project
): Promise<void> => {
  const dataToSave = {
    name: project.name,
    status: project.status,
    createdAt: Timestamp.fromDate(ensureDate(project.createdAt)),
    createdBy: project.createdBy || '',
  }

  const docRef = doc(db, 'companies', companyId, 'projects', project.id)
  await setDoc(docRef, dataToSave, { merge: true })
}

/**
 * Delete a project from Firestore with cascading delete.
 * Removes the project AND all related buildings AND all related inspections atomically.
 * Owner/admin only.
 */
export const deleteProjectFromFirestore = async (
  companyId: string,
  id: string
): Promise<void> => {
  const batch = writeBatch(db)

  // 1. Add project deletion to batch
  const projectRef = doc(db, 'companies', companyId, 'projects', id)
  batch.delete(projectRef)

  // 2. Query and delete all related buildings
  const buildingsQuery = query(
    collection(db, 'companies', companyId, 'buildings'),
    where('projectId', '==', id)
  )
  const buildingsSnapshot = await getDocs(buildingsQuery)

  logger.log(
    `🗑️  Cascading delete: Found ${buildingsSnapshot.size} buildings to delete for project ${id}`
  )

  buildingsSnapshot.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref)
  })

  // 3. Query and delete all related inspections
  const inspectionsQuery = query(
    collection(db, 'companies', companyId, 'inspections'),
    where('projectId', '==', id)
  )
  const inspectionsSnapshot = await getDocs(inspectionsQuery)

  logger.log(
    `🗑️  Cascading delete: Found ${inspectionsSnapshot.size} inspections to delete for project ${id}`
  )

  inspectionsSnapshot.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref)
  })

  // 4. Execute atomic batch operation (all or nothing)
  await batch.commit()

  logger.log(
    `✅ Successfully deleted project ${id} with ${buildingsSnapshot.size} buildings and ${inspectionsSnapshot.size} inspections`
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Buildings (company-scoped)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Delete a building from Firestore with cascading delete.
 * Removes the building AND all related inspections atomically.
 * Owner/admin only.
 */
export const deleteBuildingFromFirestore = async (
  companyId: string,
  id: string
): Promise<void> => {
  const batch = writeBatch(db)

  // 1. Add building deletion to batch
  const buildingRef = doc(db, 'companies', companyId, 'buildings', id)
  batch.delete(buildingRef)

  // 2. Query and delete all related inspections
  const inspectionsQuery = query(
    collection(db, 'companies', companyId, 'inspections'),
    where('buildingId', '==', id)
  )
  const inspectionsSnapshot = await getDocs(inspectionsQuery)

  logger.log(
    `🗑️  Cascading delete: Found ${inspectionsSnapshot.size} inspections to delete for building ${id}`
  )

  inspectionsSnapshot.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref)
  })

  // 3. Execute atomic batch operation (all or nothing)
  await batch.commit()

  logger.log(
    `✅ Successfully deleted building ${id} and ${inspectionsSnapshot.size} related inspections`
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Inspections (company-scoped)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Save an inspection to Firestore under a company.
 */
export const saveInspectionToFirestore = async (
  companyId: string,
  inspection: Inspection,
  inspectionId: string
): Promise<void> => {
  const sanitizedMeasurements = (inspection.measurements || []).map(
    ({ noGrounding, ...measurement }) =>
      noGrounding === undefined
        ? measurement
        : { ...measurement, noGrounding }
  )

  const dataToSave = {
    projectId: inspection.projectId,
    buildingId: inspection.buildingId,
    companyId,
    createdBy: inspection.createdBy || '',
    assignedTo: inspection.assignedTo || '',
    address: inspection.address || '',
    apartmentNumber: inspection.apartmentNumber || '',
    ownerName: inspection.ownerName || '',
    date: Timestamp.fromDate(ensureDate(inspection.date)),
    technicianName: inspection.technicianName || '',
    technicianLicenseNumber: inspection.technicianLicenseNumber || '',
    technicianSignature: inspection.technicianSignature || '',
    notes: inspection.notes || '',
    measurements: sanitizedMeasurements,
    ownerSignature: inspection.ownerSignature || '',
    protocolNumber: inspection.protocolNumber || '',
    synced: false,
    status: inspection.status || 'COMPLETED',
    unitType: inspection.unitType || 'mieszkanie',
    createdAt: Timestamp.now(),
  }

  const docRef = doc(db, 'companies', companyId, 'inspections', inspectionId)
  await setDoc(docRef, dataToSave, { merge: true })
}

/**
 * Delete an inspection from Firestore.
 */
export const deleteInspectionFromFirestore = async (
  companyId: string,
  id: string
): Promise<void> => {
  await deleteDoc(doc(db, 'companies', companyId, 'inspections', id))
}

/**
 * Mark inspection as synced in Firestore.
 */
export const markInspectionAsSynced = async (
  companyId: string,
  id: string
): Promise<void> => {
  const docRef = doc(db, 'companies', companyId, 'inspections', id)
  await updateDoc(docRef, { synced: true })
}

/**
 * Retry syncing a pending inspection.
 */
export const retrySyncInspection = async (
  companyId: string,
  inspection: Inspection
): Promise<boolean> => {
  if (!inspection.id) return false

  try {
    await saveInspectionToFirestore(companyId, inspection, inspection.id)
    await markInspectionAsSynced(companyId, inspection.id)
    logger.log(`✅ Retry successful for inspection ${inspection.id}`)
    return true
  } catch (error) {
    logger.error(`❌ Retry failed for inspection ${inspection.id}:`, error)
    return false
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// User settings (global /users/{uid} — NOT company-scoped)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Save user settings to Firestore (users/{uid}).
 */
export const saveUserSettingsToFirestore = async (
  userId: string,
  settings: UserSettings
): Promise<void> => {
  const docRef = doc(db, 'users', userId)

  await setDoc(
    docRef,
    {
      displayName: settings.displayName.trim(),
      licenseNumber: settings.licenseNumber.trim(),
      signatureBase64: settings.signatureBase64 || '',
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  )
}

/**
 * Load user settings from Firestore (users/{uid}).
 */
export const getUserSettingsFromFirestore = async (
  userId: string
): Promise<UserSettings | null> => {
  const docRef = doc(db, 'users', userId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    return null
  }

  const data = snapshot.data()

  return {
    displayName:
      typeof data.displayName === 'string' ? data.displayName : '',
    licenseNumber:
      typeof data.licenseNumber === 'string' ? data.licenseNumber : '',
    signatureBase64:
      typeof data.signatureBase64 === 'string' ? data.signatureBase64 : '',
    companyId:
      typeof data.companyId === 'string' ? data.companyId : undefined,
  }
}
