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
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Inspection, Project } from '../types'
import { ensureDate } from '../utils'

/**
 * Save a project to Firestore
 */
export const saveProjectToFirestore = async (
  project: Project
): Promise<void> => {
  const dataToSave = {
    name: project.name,
    status: project.status,
    createdAt: Timestamp.fromDate(ensureDate(project.createdAt)),
  }

  const docRef = doc(db, 'projects', project.id)
  await setDoc(docRef, dataToSave, { merge: true })
}

/**
 * Delete a project from Firestore with cascading delete
 * Removes the project AND all related buildings AND all related inspections in a single atomic operation
 */
export const deleteProjectFromFirestore = async (id: string): Promise<void> => {
  const batch = writeBatch(db)

  // 1. Add project deletion to batch
  const projectRef = doc(db, 'projects', id)
  batch.delete(projectRef)

  // 2. Query and delete all related buildings
  const buildingsQuery = query(
    collection(db, 'buildings'),
    where('projectId', '==', id)
  )
  const buildingsSnapshot = await getDocs(buildingsQuery)

  console.log(
    `🗑️  Cascading delete: Found ${buildingsSnapshot.size} buildings to delete for project ${id}`
  )

  buildingsSnapshot.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref)
  })

  // 3. Query and delete all related inspections (faster than searching by buildingId)
  const inspectionsQuery = query(
    collection(db, 'inspections'),
    where('projectId', '==', id)
  )
  const inspectionsSnapshot = await getDocs(inspectionsQuery)

  console.log(
    `🗑️  Cascading delete: Found ${inspectionsSnapshot.size} inspections to delete for project ${id}`
  )

  inspectionsSnapshot.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref)
  })

  // 4. Execute atomic batch operation (all or nothing)
  await batch.commit()

  console.log(
    `✅ Successfully deleted project ${id} with ${buildingsSnapshot.size} buildings and ${inspectionsSnapshot.size} inspections`
  )
}

/**
 * Delete a building from Firestore with cascading delete
 * Removes the building AND all related inspections in a single atomic operation
 */
export const deleteBuildingFromFirestore = async (
  id: string
): Promise<void> => {
  const batch = writeBatch(db)

  // 1. Add building deletion to batch
  const buildingRef = doc(db, 'buildings', id)
  batch.delete(buildingRef)

  // 2. Query and delete all related inspections
  const inspectionsQuery = query(
    collection(db, 'inspections'),
    where('buildingId', '==', id)
  )
  const inspectionsSnapshot = await getDocs(inspectionsQuery)

  console.log(
    `🗑️  Cascading delete: Found ${inspectionsSnapshot.size} inspections to delete for building ${id}`
  )

  inspectionsSnapshot.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref)
  })

  // 3. Execute atomic batch operation (all or nothing)
  await batch.commit()

  console.log(
    `✅ Successfully deleted building ${id} and ${inspectionsSnapshot.size} related inspections`
  )
}

/**
 * Save an inspection to Firestore
 */
export const saveInspectionToFirestore = async (
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
    address: inspection.address || '',
    apartmentNumber: inspection.apartmentNumber || '',
    date: Timestamp.fromDate(ensureDate(inspection.date)),
    technician: inspection.technician || '',
    notes: inspection.notes || '',
    measurements: sanitizedMeasurements,
    signature: inspection.signature || '',
    protocolNumber: inspection.protocolNumber || '',
    synced: false,
    createdAt: Timestamp.now(),
  }

  const docRef = doc(db, 'inspections', inspectionId)
  await setDoc(docRef, dataToSave, { merge: true })
}

/**
 * Delete an inspection from Firestore
 */
export const deleteInspectionFromFirestore = async (
  id: string
): Promise<void> => {
  await deleteDoc(doc(db, 'inspections', id))
}

/**
 * Mark inspection as synced in Firestore
 */
export const markInspectionAsSynced = async (id: string): Promise<void> => {
  const docRef = doc(db, 'inspections', id)
  await updateDoc(docRef, { synced: true })
}

/**
 * Retry syncing a pending inspection
 */
export const retrySyncInspection = async (
  inspection: Inspection
): Promise<boolean> => {
  if (!inspection.id) return false

  try {
    await saveInspectionToFirestore(inspection, inspection.id)
    await markInspectionAsSynced(inspection.id)
    console.log(`✅ Retry successful for inspection ${inspection.id}`)
    return true
  } catch (error) {
    console.error(`❌ Retry failed for inspection ${inspection.id}:`, error)
    return false
  }
}
