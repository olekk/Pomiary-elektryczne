/**
 * Integration tests for firebaseService.ts
 *
 * Runs against a real Firebase Emulator — no mocks.
 * Start emulator first: `firebase emulators:start --only firestore`
 * Then run:              `npm run test:integration`
 *
 * NOTE: All service functions now require a companyId as the first parameter.
 * Tests create data under /companies/{TEST_COMPANY_ID}/... paths.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  Timestamp,
  type Firestore,
} from 'firebase/firestore'

import {
  getTestDb,
  destroyTestApp,
  clearFirestoreData,
  makeProject,
  makeInspection,
  makeUserSettings,
} from './testSetup.integration'

// ── Test company ID ──
const TEST_COMPANY_ID = 'test-company-abc123'

// Helper: path builder for company-scoped collections
const companyPath = (sub: string) => `companies/${TEST_COMPANY_ID}/${sub}`

// ── Mock the firebase module so production code uses our emulator db ──
let testDb: Firestore

vi.mock('../../firebase', () => ({
  get db() {
    return testDb
  },
}))

// ── Lazy-import production functions AFTER mock is registered ──
let saveProjectToFirestore: typeof import('../firebaseService')['saveProjectToFirestore']
let deleteProjectFromFirestore: typeof import('../firebaseService')['deleteProjectFromFirestore']
let deleteBuildingFromFirestore: typeof import('../firebaseService')['deleteBuildingFromFirestore']
let saveInspectionToFirestore: typeof import('../firebaseService')['saveInspectionToFirestore']
let deleteInspectionFromFirestore: typeof import('../firebaseService')['deleteInspectionFromFirestore']
let markInspectionAsSynced: typeof import('../firebaseService')['markInspectionAsSynced']
let saveUserSettingsToFirestore: typeof import('../firebaseService')['saveUserSettingsToFirestore']
let getUserSettingsFromFirestore: typeof import('../firebaseService')['getUserSettingsFromFirestore']

// ── Lifecycle ────────────────────────────────────────────────────────
beforeAll(async () => {
  testDb = getTestDb()

  // Dynamic import so the mock is already active
  const mod = await import('../firebaseService')
  saveProjectToFirestore = mod.saveProjectToFirestore
  deleteProjectFromFirestore = mod.deleteProjectFromFirestore
  deleteBuildingFromFirestore = mod.deleteBuildingFromFirestore
  saveInspectionToFirestore = mod.saveInspectionToFirestore
  deleteInspectionFromFirestore = mod.deleteInspectionFromFirestore
  markInspectionAsSynced = mod.markInspectionAsSynced
  saveUserSettingsToFirestore = mod.saveUserSettingsToFirestore
  getUserSettingsFromFirestore = mod.getUserSettingsFromFirestore
})

beforeEach(async () => {
  await clearFirestoreData()
})

afterAll(async () => {
  await destroyTestApp()
})

// ═════════════════════════════════════════════════════════════════════
// 1. Project CRUD
// ═════════════════════════════════════════════════════════════════════
describe('saveProjectToFirestore', () => {
  it('saves a project and reads it back (round-trip)', async () => {
    const project = makeProject({ id: 'proj-rt-1', name: 'Round Trip' })

    await saveProjectToFirestore(TEST_COMPANY_ID, project)

    const snap = await getDoc(doc(testDb, companyPath('projects'), 'proj-rt-1'))
    expect(snap.exists()).toBe(true)

    const data = snap.data()!
    expect(data.name).toBe('Round Trip')
    expect(data.status).toBe('active')
    expect(data.createdAt).toBeInstanceOf(Timestamp)
  })

  it('update does not create a duplicate document', async () => {
    const project = makeProject({ id: 'proj-dup-1', name: 'Original' })
    await saveProjectToFirestore(TEST_COMPANY_ID, project)

    // Update the same project
    await saveProjectToFirestore(TEST_COMPANY_ID, { ...project, name: 'Updated' })

    // Only one document should exist
    const snap = await getDoc(doc(testDb, companyPath('projects'), 'proj-dup-1'))
    expect(snap.exists()).toBe(true)
    expect(snap.data()!.name).toBe('Updated')

    // Verify no extra docs in the collection with this ID area
    const allProjects = await getDocs(collection(testDb, companyPath('projects')))
    expect(allProjects.size).toBe(1)
  })
})

// ═════════════════════════════════════════════════════════════════════
// 2. Inspection CRUD
// ═════════════════════════════════════════════════════════════════════
describe('saveInspectionToFirestore', () => {
  it('saves an inspection and reads back all fields (round-trip)', async () => {
    const inspection = makeInspection()
    const inspId = 'insp-rt-1'

    await saveInspectionToFirestore(TEST_COMPANY_ID, inspection, inspId)

    const snap = await getDoc(doc(testDb, companyPath('inspections'), inspId))
    expect(snap.exists()).toBe(true)

    const data = snap.data()!
    expect(data.projectId).toBe('test-project-1')
    expect(data.buildingId).toBe('test-building-1')
    expect(data.companyId).toBe(TEST_COMPANY_ID)
    expect(data.address).toBe('ul. Testowa 1')
    expect(data.apartmentNumber).toBe('1A')
    expect(data.ownerName).toBe('Jan Testowy')
    expect(data.technicianName).toBe('Tech Testowy')
    expect(data.notes).toBe('Test notes')
    expect(data.protocolNumber).toBe('PROT-001')
    expect(data.synced).toBe(false)
    expect(data.status).toBe('COMPLETED')
    expect(data.unitType).toBe('mieszkanie')
    expect(data.measurements).toHaveLength(1)
    expect(data.measurements[0].room).toBe('Kuchnia')
    expect(data.date).toBeInstanceOf(Timestamp)
    expect(data.createdAt).toBeInstanceOf(Timestamp)
  })

  it('update does not duplicate the document', async () => {
    const inspection = makeInspection()
    const inspId = 'insp-dup-1'

    await saveInspectionToFirestore(TEST_COMPANY_ID, inspection, inspId)
    await saveInspectionToFirestore(
      TEST_COMPANY_ID,
      { ...inspection, notes: 'Updated notes' },
      inspId
    )

    const snap = await getDoc(doc(testDb, companyPath('inspections'), inspId))
    expect(snap.data()!.notes).toBe('Updated notes')

    const all = await getDocs(collection(testDb, companyPath('inspections')))
    expect(all.size).toBe(1)
  })

  it('markInspectionAsSynced sets synced to true', async () => {
    const inspId = 'insp-sync-1'
    await saveInspectionToFirestore(TEST_COMPANY_ID, makeInspection(), inspId)

    await markInspectionAsSynced(TEST_COMPANY_ID, inspId)

    const snap = await getDoc(doc(testDb, companyPath('inspections'), inspId))
    expect(snap.data()!.synced).toBe(true)
  })

  it('deleteInspectionFromFirestore removes the document', async () => {
    const inspId = 'insp-del-1'
    await saveInspectionToFirestore(TEST_COMPANY_ID, makeInspection(), inspId)

    await deleteInspectionFromFirestore(TEST_COMPANY_ID, inspId)

    const snap = await getDoc(doc(testDb, companyPath('inspections'), inspId))
    expect(snap.exists()).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════
// 3. Cascading delete — Project
// ═════════════════════════════════════════════════════════════════════
describe('deleteProjectFromFirestore (cascading)', () => {
  const PROJECT_ID = 'proj-cascade-1'

  async function seedProjectTree() {
    // Project
    await setDoc(doc(testDb, companyPath('projects'), PROJECT_ID), {
      name: 'Cascade Test',
      status: 'active',
      createdAt: Timestamp.now(),
      createdBy: 'test-user',
    })

    // 2 buildings belonging to the project
    for (const bId of ['bld-c1', 'bld-c2']) {
      await setDoc(doc(testDb, companyPath('buildings'), bId), {
        projectId: PROJECT_ID,
        street: 'ul. Cascade',
        zipCode: '00-000',
        city: 'Testowo',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        userId: 'test-user',
        createdBy: 'test-user',
      })
    }

    // 3 inspections belonging to the project
    for (const iId of ['insp-c1', 'insp-c2', 'insp-c3']) {
      await setDoc(doc(testDb, companyPath('inspections'), iId), {
        projectId: PROJECT_ID,
        buildingId: 'bld-c1',
        companyId: TEST_COMPANY_ID,
        createdBy: 'test-user',
        address: 'ul. Cascade 1',
        apartmentNumber: '1',
        date: Timestamp.now(),
        technicianName: 'Tech',
        measurements: [],
        protocolNumber: 'P-001',
        synced: false,
        status: 'COMPLETED',
        unitType: 'mieszkanie',
        createdAt: Timestamp.now(),
      })
    }
  }

  it('removes project, all buildings, and all inspections', async () => {
    await seedProjectTree()

    await deleteProjectFromFirestore(TEST_COMPANY_ID, PROJECT_ID)

    // Project gone
    const projSnap = await getDoc(doc(testDb, companyPath('projects'), PROJECT_ID))
    expect(projSnap.exists()).toBe(false)

    // All buildings gone
    const bldQuery = query(
      collection(testDb, companyPath('buildings')),
      where('projectId', '==', PROJECT_ID)
    )
    const bldSnap = await getDocs(bldQuery)
    expect(bldSnap.size).toBe(0)

    // All inspections gone
    const inspQuery = query(
      collection(testDb, companyPath('inspections')),
      where('projectId', '==', PROJECT_ID)
    )
    const inspSnap = await getDocs(inspQuery)
    expect(inspSnap.size).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════
// 4. Cascading delete — Building
// ═════════════════════════════════════════════════════════════════════
describe('deleteBuildingFromFirestore (cascading)', () => {
  const BUILDING_ID = 'bld-cascade-1'

  async function seedBuildingTree() {
    await setDoc(doc(testDb, companyPath('buildings'), BUILDING_ID), {
      projectId: 'some-project',
      street: 'ul. Building Cascade',
      zipCode: '00-000',
      city: 'Testowo',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      userId: 'test-user',
      createdBy: 'test-user',
    })

    for (const iId of ['insp-bc1', 'insp-bc2']) {
      await setDoc(doc(testDb, companyPath('inspections'), iId), {
        projectId: 'some-project',
        buildingId: BUILDING_ID,
        companyId: TEST_COMPANY_ID,
        createdBy: 'test-user',
        address: 'ul. Building Cascade 1',
        apartmentNumber: '1',
        date: Timestamp.now(),
        technicianName: 'Tech',
        measurements: [],
        protocolNumber: 'P-B1',
        synced: false,
        status: 'COMPLETED',
        unitType: 'mieszkanie',
        createdAt: Timestamp.now(),
      })
    }
  }

  it('removes building and all its inspections', async () => {
    await seedBuildingTree()

    await deleteBuildingFromFirestore(TEST_COMPANY_ID, BUILDING_ID)

    const bldSnap = await getDoc(doc(testDb, companyPath('buildings'), BUILDING_ID))
    expect(bldSnap.exists()).toBe(false)

    const inspQuery = query(
      collection(testDb, companyPath('inspections')),
      where('buildingId', '==', BUILDING_ID)
    )
    const inspSnap = await getDocs(inspQuery)
    expect(inspSnap.size).toBe(0)
  })

  it('does not remove inspections from other buildings', async () => {
    await seedBuildingTree()

    // Add an inspection for a DIFFERENT building
    await setDoc(doc(testDb, companyPath('inspections'), 'insp-other'), {
      projectId: 'some-project',
      buildingId: 'other-building-id',
      companyId: TEST_COMPANY_ID,
      createdBy: 'test-user',
      address: 'ul. Other',
      apartmentNumber: '2',
      date: Timestamp.now(),
      technicianName: 'Tech',
      measurements: [],
      protocolNumber: 'P-OTHER',
      synced: false,
      status: 'COMPLETED',
      unitType: 'mieszkanie',
      createdAt: Timestamp.now(),
    })

    await deleteBuildingFromFirestore(TEST_COMPANY_ID, BUILDING_ID)

    // Other building's inspection should survive
    const otherSnap = await getDoc(doc(testDb, companyPath('inspections'), 'insp-other'))
    expect(otherSnap.exists()).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════
// 5. User Settings (global — NOT company-scoped)
// ═════════════════════════════════════════════════════════════════════
describe('UserSettings (save & load)', () => {
  it('saves and loads user settings (round-trip)', async () => {
    const settings = makeUserSettings()

    await saveUserSettingsToFirestore('user-rt-1', settings)

    const loaded = await getUserSettingsFromFirestore('user-rt-1')
    expect(loaded).not.toBeNull()
    expect(loaded!.displayName).toBe('Test User')
    expect(loaded!.licenseNumber).toBe('LIC-12345')
    expect(loaded!.signatureBase64).toBe('data:image/png;base64,dGVzdA==')
  })

  it('returns null for non-existent user', async () => {
    const loaded = await getUserSettingsFromFirestore('non-existent-id')
    expect(loaded).toBeNull()
  })

  it('trims whitespace from displayName and licenseNumber', async () => {
    const settings = makeUserSettings({
      displayName: '  Spaces User  ',
      licenseNumber: '  LIC-999  ',
    })

    await saveUserSettingsToFirestore('user-trim-1', settings)

    const loaded = await getUserSettingsFromFirestore('user-trim-1')
    expect(loaded!.displayName).toBe('Spaces User')
    expect(loaded!.licenseNumber).toBe('LIC-999')
  })
})

// ═════════════════════════════════════════════════════════════════════
// 6. Required fields enforcement
// ═════════════════════════════════════════════════════════════════════
describe('Required fields enforcement', () => {
  it('inspection always writes projectId and buildingId', async () => {
    const inspection = makeInspection({
      projectId: 'req-proj-1',
      buildingId: 'req-bld-1',
    })

    await saveInspectionToFirestore(TEST_COMPANY_ID, inspection, 'insp-req-1')

    const snap = await getDoc(doc(testDb, companyPath('inspections'), 'insp-req-1'))
    const data = snap.data()!
    expect(data.projectId).toBe('req-proj-1')
    expect(data.buildingId).toBe('req-bld-1')
    expect(data.companyId).toBe(TEST_COMPANY_ID)
    // These must never be empty / undefined
    expect(data.projectId).toBeTruthy()
    expect(data.buildingId).toBeTruthy()
  })

  it('projectId and buildingId are queryable (used by cascading deletes)', async () => {
    await saveInspectionToFirestore(
      TEST_COMPANY_ID,
      makeInspection({ projectId: 'qp-1', buildingId: 'qb-1' }),
      'insp-q1'
    )
    await saveInspectionToFirestore(
      TEST_COMPANY_ID,
      makeInspection({ projectId: 'qp-2', buildingId: 'qb-2' }),
      'insp-q2'
    )

    const q1 = query(
      collection(testDb, companyPath('inspections')),
      where('projectId', '==', 'qp-1')
    )
    const snap1 = await getDocs(q1)
    expect(snap1.size).toBe(1)
    expect(snap1.docs[0].id).toBe('insp-q1')

    const q2 = query(
      collection(testDb, companyPath('inspections')),
      where('buildingId', '==', 'qb-2')
    )
    const snap2 = await getDocs(q2)
    expect(snap2.size).toBe(1)
    expect(snap2.docs[0].id).toBe('insp-q2')
  })
})
