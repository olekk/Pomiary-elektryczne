import { describe, it, expect } from 'vitest'
import type {
  DocumentData,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import {
  inspectionFromDoc,
  inspectionFromSnapshot,
  buildingFromDoc,
  buildingFromSnapshot,
  projectFromDoc,
} from '../firestoreMappers'

const fakeTimestamp = (date: Date) => ({ toDate: () => date })

const fakeQueryDoc = (id: string, data: DocumentData) =>
  ({ id, data: () => data }) as unknown as QueryDocumentSnapshot

const fakeDocSnapshot = (id: string, data: DocumentData | null) =>
  ({
    id,
    exists: () => data !== null,
    data: () => data,
  }) as unknown as DocumentSnapshot

const inspectionDate = new Date('2026-06-15T10:00:00Z')

const fullInspectionData: DocumentData = {
  projectId: 'proj_1',
  buildingId: 'bldg_1',
  address: 'ul. Kwiatowa 15',
  apartmentNumber: '42',
  ownerName: 'Jan Kowalski',
  date: fakeTimestamp(inspectionDate),
  technicianName: 'Adam Nowak',
  technicianLicenseNumber: 'E/123',
  technicianSignature: 'data:image/png;base64,tech',
  reviewerName: 'Ewa Wiśniewska',
  reviewerLicenseNumber: 'D/456',
  reviewerSignature: 'data:image/png;base64,rev',
  measurements: [{ id: 'm1', pointNumber: 1 }],
  notes: 'notatka',
  ownerSignature: 'data:image/png;base64,owner',
  protocolNumber: 'KWIATOWA/42/2026/06/15/PROT',
  synced: false,
  status: 'INACCESSIBLE',
  unitType: 'lokal',
  klatkaData: { przylacze: 'kabelowe', pwpStatus: 'brak' },
}

describe('inspectionFromDoc', () => {
  it('maps a fully populated document, including klatkaData', () => {
    const result = inspectionFromDoc(fakeQueryDoc('insp_1', fullInspectionData))
    expect(result).toEqual({
      id: 'insp_1',
      projectId: 'proj_1',
      buildingId: 'bldg_1',
      address: 'ul. Kwiatowa 15',
      apartmentNumber: '42',
      ownerName: 'Jan Kowalski',
      date: inspectionDate,
      technicianName: 'Adam Nowak',
      technicianLicenseNumber: 'E/123',
      technicianSignature: 'data:image/png;base64,tech',
      reviewerName: 'Ewa Wiśniewska',
      reviewerLicenseNumber: 'D/456',
      reviewerSignature: 'data:image/png;base64,rev',
      measurements: [{ id: 'm1', pointNumber: 1 }],
      notes: 'notatka',
      ownerSignature: 'data:image/png;base64,owner',
      protocolNumber: 'KWIATOWA/42/2026/06/15/PROT',
      synced: false,
      status: 'INACCESSIBLE',
      unitType: 'lokal',
      klatkaData: { przylacze: 'kabelowe', pwpStatus: 'brak' },
    })
  })

  it('applies defaults for a minimal legacy document', () => {
    const result = inspectionFromDoc(
      fakeQueryDoc('insp_2', { projectId: 'p', buildingId: 'b' })
    )
    expect(result.address).toBe('')
    expect(result.apartmentNumber).toBe('')
    expect(result.ownerName).toBe('')
    expect(result.date).toBeInstanceOf(Date)
    expect(result.measurements).toEqual([])
    expect(result.notes).toBe('')
    expect(result.protocolNumber).toBe('')
    expect(result.synced).toBe(true)
    expect(result.status).toBe('COMPLETED')
    expect(result.unitType).toBe('mieszkanie')
    expect(result.klatkaData).toBeUndefined()
  })

  it('bridges legacy field names: technician → technicianName, signature → ownerSignature', () => {
    const result = inspectionFromDoc(
      fakeQueryDoc('insp_3', {
        projectId: 'p',
        buildingId: 'b',
        technician: 'Stary Technik',
        signature: 'data:image/png;base64,legacy',
      })
    )
    expect(result.technicianName).toBe('Stary Technik')
    expect(result.ownerSignature).toBe('data:image/png;base64,legacy')
  })

  it('prefers new field names over legacy ones when both exist', () => {
    const result = inspectionFromDoc(
      fakeQueryDoc('insp_4', {
        projectId: 'p',
        buildingId: 'b',
        technician: 'Stary',
        technicianName: 'Nowy',
        signature: 'legacy-sig',
        ownerSignature: 'new-sig',
      })
    )
    expect(result.technicianName).toBe('Nowy')
    expect(result.ownerSignature).toBe('new-sig')
  })

  it('preserves synced=false (does not coerce to the true default)', () => {
    const result = inspectionFromDoc(
      fakeQueryDoc('insp_5', { projectId: 'p', buildingId: 'b', synced: false })
    )
    expect(result.synced).toBe(false)
  })
})

describe('inspectionFromSnapshot', () => {
  it('returns null for a missing document', () => {
    expect(inspectionFromSnapshot(fakeDocSnapshot('insp_x', null))).toBeNull()
  })

  it('maps an existing document', () => {
    const result = inspectionFromSnapshot(
      fakeDocSnapshot('insp_1', fullInspectionData)
    )
    expect(result?.id).toBe('insp_1')
    expect(result?.klatkaData).toEqual({
      przylacze: 'kabelowe',
      pwpStatus: 'brak',
    })
  })
})

const buildingDate = new Date('2026-05-01T08:00:00Z')

describe('buildingFromDoc', () => {
  it('maps a structured-address document', () => {
    const result = buildingFromDoc(
      fakeQueryDoc('bldg_1', {
        projectId: 'proj_1',
        street: 'ul. Słoneczna 15',
        zipCode: '40-000',
        city: 'Katowice',
        createdAt: fakeTimestamp(buildingDate),
        updatedAt: fakeTimestamp(buildingDate),
        userId: 'user_1',
      })
    )
    expect(result).toEqual({
      id: 'bldg_1',
      projectId: 'proj_1',
      name: undefined,
      street: 'ul. Słoneczna 15',
      zipCode: '40-000',
      city: 'Katowice',
      createdAt: buildingDate,
      updatedAt: buildingDate,
      userId: 'user_1',
    })
  })

  it('falls back to legacy name field for street on old documents', () => {
    const result = buildingFromDoc(
      fakeQueryDoc('bldg_2', { projectId: 'p', name: 'ul. Stara 1, Katowice' })
    )
    expect(result.street).toBe('ul. Stara 1, Katowice')
    expect(result.zipCode).toBe('')
    expect(result.city).toBe('')
    expect(result.userId).toBe('')
    expect(result.createdAt).toBeInstanceOf(Date)
  })
})

describe('buildingFromSnapshot', () => {
  it('returns null for a missing document', () => {
    expect(buildingFromSnapshot(fakeDocSnapshot('bldg_x', null))).toBeNull()
  })

  it('maps an existing document', () => {
    const result = buildingFromSnapshot(
      fakeDocSnapshot('bldg_1', { projectId: 'p', street: 'ul. Nowa 2' })
    )
    expect(result?.id).toBe('bldg_1')
    expect(result?.street).toBe('ul. Nowa 2')
  })
})

describe('projectFromDoc', () => {
  it('maps a full document', () => {
    const created = new Date('2026-01-23T12:00:00Z')
    const result = projectFromDoc(
      fakeQueryDoc('proj_1', {
        name: 'Spółdzielnia Knurów',
        status: 'archived',
        createdAt: fakeTimestamp(created),
      })
    )
    expect(result).toEqual({
      id: 'proj_1',
      name: 'Spółdzielnia Knurów',
      status: 'archived',
      createdAt: created,
    })
  })

  it('defaults status to active and createdAt to now', () => {
    const result = projectFromDoc(fakeQueryDoc('proj_2', { name: 'Nowy' }))
    expect(result.status).toBe('active')
    expect(result.createdAt).toBeInstanceOf(Date)
  })
})
