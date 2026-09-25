import {
  setDoc,
  doc,
  Timestamp,
  updateDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  deleteField,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'
import type {
  Inspection,
  KlatkaData,
  OdgromowaData,
  Project,
  UserSettings,
} from '../types'
import { logger } from '../utils/logger'
import {
  ensureDate,
  buildInspectionStatusMap,
  toIzolacjaPayload,
} from '../utils'

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

  logger.log(
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

/** Płytka kopia obiektu bez kluczy o wartości `undefined` */
const withoutUndefinedFields = <T extends object>(data: T): T =>
  Object.fromEntries(
    Object.entries(data).filter(([, fieldValue]) => fieldValue !== undefined)
  ) as T

/**
 * Save an inspection to Firestore
 */
export const saveInspectionToFirestore = async (
  inspection: Inspection,
  inspectionId: string
): Promise<void> => {
  const sanitizedMeasurements = (inspection.measurements || []).map(
    ({ noGrounding, ...measurement }) =>
      noGrounding === undefined ? measurement : { ...measurement, noGrounding }
  )

  // Firestore odrzuca wartości `undefined`. Pola klatki/odgromowej nieistotne dla
  // danego wariantu (np. typKabla przy przyłączu napowietrznym) muszą zostać
  // pominięte, inaczej cały zapis inspekcji cicho pada w fire-and-forget `.catch()`.
  const sanitizedKlatkaData = inspection.klatkaData
    ? withoutUndefinedFields<KlatkaData>(inspection.klatkaData)
    : undefined
  const sanitizedOdgromowaData = inspection.odgromowaData
    ? withoutUndefinedFields<OdgromowaData>(inspection.odgromowaData)
    : undefined

  const isMieszkanie = (inspection.unitType || 'mieszkanie') === 'mieszkanie'

  const dataToSave = {
    projectId: inspection.projectId,
    buildingId: inspection.buildingId,
    address: inspection.address || '',
    apartmentNumber: inspection.apartmentNumber || '',
    ownerName: inspection.ownerName || '',
    date: Timestamp.fromDate(ensureDate(inspection.date)),
    technicianName: inspection.technicianName || '',
    technicianLicenseNumber: inspection.technicianLicenseNumber || '',
    technicianSignature: inspection.technicianSignature || '',
    reviewerName: inspection.reviewerName || '',
    reviewerLicenseNumber: inspection.reviewerLicenseNumber || '',
    reviewerSignature: inspection.reviewerSignature || '',
    notes: inspection.notes || '',
    measurements: sanitizedMeasurements,
    ownerSignature: inspection.ownerSignature || '',
    protocolNumber: inspection.protocolNumber || '',
    synced: false,
    status: inspection.status || 'COMPLETED',
    unitType: inspection.unitType || 'mieszkanie',
    createdAt: Timestamp.now(),
    ...(sanitizedKlatkaData ? { klatkaData: sanitizedKlatkaData } : {}),
    ...(sanitizedOdgromowaData
      ? { odgromowaData: sanitizedOdgromowaData }
      : {}),
    // Izolacja: tablica obiektów — `withoutUndefinedFields` czyści tylko płytko,
    // więc payload budowany jawnie (`toIzolacjaPayload`). Zapis jest `merge`,
    // więc przy zmianie typu z mieszkania na inny usuwamy pole jawnie — inaczej
    // stare dane zostałyby w dokumencie i wpływały na wynik protokołu.
    ...(!isMieszkanie
      ? { izolacjaData: deleteField() }
      : inspection.izolacjaData
        ? { izolacjaData: toIzolacjaPayload(inspection.izolacjaData) }
        : {}),
  }

  const batch = writeBatch(db)
  batch.set(doc(db, 'inspections', inspectionId), dataToSave, { merge: true })

  // Lekka kopia statusu w budynku — ekran projektu liczy statystyki z niej
  // zamiast pobierać wszystkie inspekcje. Mapa (nie licznik), więc ponowny
  // zapis tej samej inspekcji jest idempotentny.
  if (inspection.buildingId) {
    batch.set(
      doc(db, 'buildings', inspection.buildingId),
      { inspectionStatuses: { [inspectionId]: dataToSave.status } },
      { merge: true }
    )
  }

  await batch.commit()
}

/**
 * Delete an inspection from Firestore
 */
export const deleteInspectionFromFirestore = async (
  id: string,
  buildingId: string
): Promise<void> => {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'inspections', id))
  if (buildingId) {
    batch.set(
      doc(db, 'buildings', buildingId),
      { inspectionStatuses: { [id]: deleteField() } },
      { merge: true }
    )
  }
  await batch.commit()
}

/**
 * Map an inspection document to the domain type
 */
export const mapInspectionDoc = (
  docSnap: QueryDocumentSnapshot
): Inspection => {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    projectId: data.projectId,
    buildingId: data.buildingId,
    address: data.address,
    apartmentNumber: data.apartmentNumber,
    ownerName: data.ownerName || '',
    date: data.date?.toDate ? data.date.toDate() : new Date(),
    technicianName: data.technicianName || data.technician || '',
    technicianLicenseNumber: data.technicianLicenseNumber || '',
    technicianSignature: data.technicianSignature || '',
    reviewerName: data.reviewerName || '',
    reviewerLicenseNumber: data.reviewerLicenseNumber || '',
    reviewerSignature: data.reviewerSignature || '',
    measurements: data.measurements || [],
    notes: data.notes || '',
    ownerSignature: data.ownerSignature || data.signature || '',
    protocolNumber: data.protocolNumber,
    synced: data.synced ?? true,
    status: data.status || 'COMPLETED',
    unitType: data.unitType || 'mieszkanie',
    klatkaData: data.klatkaData || undefined,
    odgromowaData: data.odgromowaData || undefined,
    izolacjaData: data.izolacjaData || undefined,
  }
}

/**
 * Load all inspections of one building on demand (e.g. batch PDF download).
 * Served from the local cache when offline.
 */
export const getBuildingInspections = async (
  buildingId: string
): Promise<Inspection[]> => {
  const snapshot = await getDocs(
    query(collection(db, 'inspections'), where('buildingId', '==', buildingId))
  )
  return snapshot.docs.map(mapInspectionDoc)
}

/**
 * Overwrite a building's inspectionStatuses map with one computed from the
 * given inspections (self-healing when the map drifted or predates it)
 */
export const rebuildBuildingInspectionStatuses = async (
  buildingId: string,
  inspections: Pick<Inspection, 'id' | 'status'>[]
): Promise<void> => {
  await updateDoc(doc(db, 'buildings', buildingId), {
    inspectionStatuses: buildInspectionStatusMap(inspections),
  })
}

/**
 * One-off backfill: recompute inspectionStatuses for every building.
 * Downloads all inspections once — use from Settings, not on a hot path.
 * Returns the number of buildings updated.
 */
export const rebuildAllBuildingInspectionStatuses =
  async (): Promise<number> => {
    const [buildingsSnapshot, inspectionsSnapshot] = await Promise.all([
      getDocs(collection(db, 'buildings')),
      getDocs(collection(db, 'inspections')),
    ])

    const byBuilding: Record<string, Pick<Inspection, 'id' | 'status'>[]> = {}
    inspectionsSnapshot.forEach((docSnap) => {
      const data = docSnap.data()
      if (!data.buildingId) return
      ;(byBuilding[data.buildingId] ||= []).push({
        id: docSnap.id,
        status: data.status || 'COMPLETED',
      })
    })

    // Firestore batch limit = 500 operations
    const BATCH_SIZE = 450
    const buildingDocs = buildingsSnapshot.docs
    for (let i = 0; i < buildingDocs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db)
      for (const buildingDoc of buildingDocs.slice(i, i + BATCH_SIZE)) {
        batch.update(buildingDoc.ref, {
          inspectionStatuses: buildInspectionStatusMap(
            byBuilding[buildingDoc.id] || []
          ),
        })
      }
      await batch.commit()
    }

    logger.log(
      `✅ Rebuilt inspectionStatuses for ${buildingDocs.length} buildings (${inspectionsSnapshot.size} inspections)`
    )
    return buildingDocs.length
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
    logger.log(`✅ Retry successful for inspection ${inspection.id}`)
    return true
  } catch (error) {
    logger.error(`❌ Retry failed for inspection ${inspection.id}:`, error)
    return false
  }
}

/**
 * Save user settings to Firestore (users/{uid})
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
      reviewerName: settings.reviewerName.trim(),
      reviewerLicenseNumber: settings.reviewerLicenseNumber.trim(),
      reviewerSignatureBase64: settings.reviewerSignatureBase64 || '',
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  )
}

/**
 * Load user settings from Firestore (users/{uid})
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
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    licenseNumber:
      typeof data.licenseNumber === 'string' ? data.licenseNumber : '',
    signatureBase64:
      typeof data.signatureBase64 === 'string' ? data.signatureBase64 : '',
    reviewerName:
      typeof data.reviewerName === 'string' ? data.reviewerName : '',
    reviewerLicenseNumber:
      typeof data.reviewerLicenseNumber === 'string'
        ? data.reviewerLicenseNumber
        : '',
    reviewerSignatureBase64:
      typeof data.reviewerSignatureBase64 === 'string'
        ? data.reviewerSignatureBase64
        : '',
  }
}
