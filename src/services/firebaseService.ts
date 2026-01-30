import {
  setDoc,
  doc,
  Timestamp,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Inspection, Project } from '../types'

/**
 * Save a project to Firestore
 */
export const saveProjectToFirestore = async (
  project: Project
): Promise<void> => {
  const createdAtDate =
    project.createdAt instanceof Date
      ? project.createdAt
      : new Date(project.createdAt)

  const dataToSave = {
    name: project.name,
    status: project.status,
    createdAt: Timestamp.fromDate(createdAtDate),
  }

  const docRef = doc(db, 'projects', project.id)
  await setDoc(docRef, dataToSave, { merge: true })
}

/**
 * Delete a project from Firestore
 */
export const deleteProjectFromFirestore = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'projects', id))
}

/**
 * Save an inspection to Firestore
 */
export const saveInspectionToFirestore = async (
  inspection: Inspection,
  inspectionId: string
): Promise<void> => {
  const dateToSave =
    inspection.date instanceof Date
      ? inspection.date
      : new Date(inspection.date)

  const dataToSave = {
    projectId: inspection.projectId,
    address: inspection.address || '',
    apartmentNumber: inspection.apartmentNumber || '',
    date: Timestamp.fromDate(dateToSave),
    technician: inspection.technician || '',
    measurements: inspection.measurements || [],
    signature: inspection.signature || '',
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
