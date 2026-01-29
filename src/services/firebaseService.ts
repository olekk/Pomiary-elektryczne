import {
  collection,
  setDoc,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  deleteDoc,
  updateDoc,
  where,
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
 * Load all projects from Firestore
 */
export const loadProjectsFromFirestore = async (): Promise<Project[]> => {
  const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'))

  try {
    const querySnapshot = await getDocs(q)
    const projects: Project[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      projects.push({
        id: doc.id,
        name: data.name,
        status: data.status || 'active',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      })
    })

    console.log(`📥 Loaded ${projects.length} projects from Firestore`)
    return projects
  } catch (error) {
    console.error('Error loading projects:', error)
    return []
  }
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
 * Load inspections for a specific project from Firestore
 * Supports offline cache - will return cached data if network is unavailable
 * OPTYMALIZACJA: Pobiera tylko pomiary należące do konkretnego projektu
 */
export const loadInspectionsFromFirestore = async (
  projectId: string
): Promise<Inspection[]> => {
  const q = query(
    collection(db, 'inspections'),
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc')
  )

  try {
    // Firebase automatically uses cache when offline (thanks to persistentLocalCache)
    const querySnapshot = await getDocs(q)

    const inspections: Inspection[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      inspections.push({
        id: doc.id,
        projectId: data.projectId,
        address: data.address,
        apartmentNumber: data.apartmentNumber,
        date: data.date?.toDate ? data.date.toDate() : new Date(),
        technician: data.technician,
        measurements: data.measurements || [],
        signature: data.signature,
        synced: data.synced ?? true,
      })
    })

    console.log(
      `📥 Loaded ${inspections.length} inspections for project ${projectId}`
    )
    return inspections
  } catch (error) {
    console.error('Error loading inspections:', error)
    // Return empty array instead of throwing - allows app to work offline
    return []
  }
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
