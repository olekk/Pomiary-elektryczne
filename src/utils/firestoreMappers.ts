import type {
  DocumentData,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import type { Building, Inspection, Project } from '../types'

// Single source of truth for mapping Firestore documents to domain objects.
// Every read is defensive (`data.field || fallback`) because the schema evolved
// incrementally and old documents lack newer fields — `technician` → `technicianName`,
// `signature` → `ownerSignature`, `name` → `street`/`zipCode`/`city` are all renames
// that only these fallbacks bridge. Add new Inspection/Building fields here, once.

const firestoreDate = (value: { toDate?: () => Date } | undefined): Date =>
  value?.toDate ? value.toDate() : new Date()

const mapInspection = (id: string, data: DocumentData): Inspection => ({
  id,
  projectId: data.projectId,
  buildingId: data.buildingId,
  address: data.address || '',
  apartmentNumber: data.apartmentNumber || '',
  ownerName: data.ownerName || '',
  date: firestoreDate(data.date),
  technicianName: data.technicianName || data.technician || '',
  technicianLicenseNumber: data.technicianLicenseNumber || '',
  technicianSignature: data.technicianSignature || '',
  reviewerName: data.reviewerName || '',
  reviewerLicenseNumber: data.reviewerLicenseNumber || '',
  reviewerSignature: data.reviewerSignature || '',
  measurements: data.measurements || [],
  notes: data.notes || '',
  ownerSignature: data.ownerSignature || data.signature || '',
  protocolNumber: data.protocolNumber || '',
  synced: data.synced ?? true,
  status: data.status || 'COMPLETED',
  unitType: data.unitType || 'mieszkanie',
  klatkaData: data.klatkaData || undefined,
})

const mapBuilding = (id: string, data: DocumentData): Building => ({
  id,
  projectId: data.projectId,
  name: data.name,
  street: data.street || data.name || '',
  zipCode: data.zipCode || '',
  city: data.city || '',
  createdAt: firestoreDate(data.createdAt),
  updatedAt: firestoreDate(data.updatedAt),
  userId: data.userId || '',
})

/** Collection (`useCollection`) mapper for `inspections` documents. */
export const inspectionFromDoc = (doc: QueryDocumentSnapshot): Inspection =>
  mapInspection(doc.id, doc.data())

/** Single-document (`useDocument`) mapper for `inspections` documents. */
export const inspectionFromSnapshot = (
  snap: DocumentSnapshot
): Inspection | null =>
  snap.exists() ? mapInspection(snap.id, snap.data()) : null

/** Collection (`useCollection`) mapper for `buildings` documents. */
export const buildingFromDoc = (doc: QueryDocumentSnapshot): Building =>
  mapBuilding(doc.id, doc.data())

/** Single-document (`useDocument`) mapper for `buildings` documents. */
export const buildingFromSnapshot = (
  snap: DocumentSnapshot
): Building | null => (snap.exists() ? mapBuilding(snap.id, snap.data()) : null)

/** Collection (`useCollection`) mapper for `projects` documents. */
export const projectFromDoc = (doc: QueryDocumentSnapshot): Project => {
  const data = doc.data()
  return {
    id: doc.id,
    name: data.name,
    status: data.status || 'active',
    createdAt: firestoreDate(data.createdAt),
  }
}
