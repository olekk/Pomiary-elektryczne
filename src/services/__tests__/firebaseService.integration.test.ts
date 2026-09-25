/**
 * Integration tests for firebaseService.ts
 *
 * Runs against a real Firebase Emulator — no mocks.
 * Start emulator first: `firebase emulators:start --only firestore`
 * Then run:              `npm run test:integration`
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
} from 'vitest'
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
import { DEFAULT_ODGROMOWA_DATA } from '../../constants/odgromowa'

// ── Mock the firebase module so production code uses our emulator db ──
let testDb: Firestore

vi.mock('../../firebase', () => ({
  get db() {
    return testDb
  },
}))

// ── Lazy-import production functions AFTER mock is registered ──
let saveProjectToFirestore: (typeof import('../firebaseService'))['saveProjectToFirestore']
let deleteProjectFromFirestore: (typeof import('../firebaseService'))['deleteProjectFromFirestore']
let deleteBuildingFromFirestore: (typeof import('../firebaseService'))['deleteBuildingFromFirestore']
let saveInspectionToFirestore: (typeof import('../firebaseService'))['saveInspectionToFirestore']
let deleteInspectionFromFirestore: (typeof import('../firebaseService'))['deleteInspectionFromFirestore']
let markInspectionAsSynced: (typeof import('../firebaseService'))['markInspectionAsSynced']
let saveUserSettingsToFirestore: (typeof import('../firebaseService'))['saveUserSettingsToFirestore']
let getUserSettingsFromFirestore: (typeof import('../firebaseService'))['getUserSettingsFromFirestore']
let getBuildingInspections: (typeof import('../firebaseService'))['getBuildingInspections']
let rebuildBuildingInspectionStatuses: (typeof import('../firebaseService'))['rebuildBuildingInspectionStatuses']
let rebuildAllBuildingInspectionStatuses: (typeof import('../firebaseService'))['rebuildAllBuildingInspectionStatuses']

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
  getBuildingInspections = mod.getBuildingInspections
  rebuildBuildingInspectionStatuses = mod.rebuildBuildingInspectionStatuses
  rebuildAllBuildingInspectionStatuses =
    mod.rebuildAllBuildingInspectionStatuses
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

    await saveProjectToFirestore(project)

    const snap = await getDoc(doc(testDb, 'projects', 'proj-rt-1'))
    expect(snap.exists()).toBe(true)

    const data = snap.data()!
    expect(data.name).toBe('Round Trip')
    expect(data.status).toBe('active')
    expect(data.createdAt).toBeInstanceOf(Timestamp)
  })

  it('update does not create a duplicate document', async () => {
    const project = makeProject({ id: 'proj-dup-1', name: 'Original' })
    await saveProjectToFirestore(project)

    // Update the same project
    await saveProjectToFirestore({ ...project, name: 'Updated' })

    // Only one document should exist
    const snap = await getDoc(doc(testDb, 'projects', 'proj-dup-1'))
    expect(snap.exists()).toBe(true)
    expect(snap.data()!.name).toBe('Updated')

    // Verify no extra docs in the collection with this ID area
    const allProjects = await getDocs(collection(testDb, 'projects'))
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

    await saveInspectionToFirestore(inspection, inspId)

    const snap = await getDoc(doc(testDb, 'inspections', inspId))
    expect(snap.exists()).toBe(true)

    const data = snap.data()!
    expect(data.projectId).toBe('test-project-1')
    expect(data.buildingId).toBe('test-building-1')
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

  it('saves odgromowaData round-trip, dropping undefined optional fields', async () => {
    const inspId = 'insp-odgr-1'
    await saveInspectionToFirestore(
      makeInspection({
        unitType: 'odgromowa',
        measurements: [],
        odgromowaData: {
          ...DEFAULT_ODGROMOWA_DATA,
          przewodyUziomoweInne: undefined,
          zlacza: [
            { nr: 'K1', ciaglosc: 'zachowana', rUziemienia: 4.2 },
            { nr: 'K2', ciaglosc: 'brak', rUziemienia: null },
          ],
          wynik: 'nadaje-po-usunieciu',
          zalecenia: ['naprawa-ciaglosci'],
        },
      }),
      inspId
    )

    const data = (await getDoc(doc(testDb, 'inspections', inspId))).data()!
    expect(data.unitType).toBe('odgromowa')
    expect(data.odgromowaData.wynik).toBe('nadaje-po-usunieciu')
    expect(data.odgromowaData.zlacza).toEqual([
      { nr: 'K1', ciaglosc: 'zachowana', rUziemienia: 4.2 },
      { nr: 'K2', ciaglosc: 'brak', rUziemienia: null },
    ])
    expect(data.odgromowaData.zalecenia).toEqual(['naprawa-ciaglosci'])
    expect('przewodyUziomoweInne' in data.odgromowaData).toBe(false)
  })

  it('saves izolacjaData round-trip without nested undefined fields', async () => {
    const inspId = 'insp-izol-1'
    await saveInspectionToFirestore(
      makeInspection({
        unitType: 'mieszkanie',
        izolacjaData: {
          ukladSieci: 'TN-C',
          materialPrzewodow: 'Al',
          napiecieProbiercze: '250',
          obwody: [
            {
              id: 'o1',
              rodzaj: 'gniazda',
              nazwaInny: undefined,
              ocena: 'w-normie',
            },
            {
              id: 'o2',
              rodzaj: 'inny',
              nazwaInny: ' Garaż ',
              ocena: 'ponizej-normy',
            },
          ],
        },
      }),
      inspId
    )

    const data = (await getDoc(doc(testDb, 'inspections', inspId))).data()!
    expect(data.izolacjaData).toEqual({
      ukladSieci: 'TN-C',
      materialPrzewodow: 'Al',
      napiecieProbiercze: '250',
      obwody: [
        { id: 'o1', rodzaj: 'gniazda', ocena: 'w-normie' },
        {
          id: 'o2',
          rodzaj: 'inny',
          nazwaInny: 'Garaż',
          ocena: 'ponizej-normy',
        },
      ],
    })
  })

  it('removes izolacjaData when the unit type changes away from mieszkanie', async () => {
    const inspId = 'insp-izol-2'
    const izolacjaData = {
      ukladSieci: 'TN-S' as const,
      materialPrzewodow: 'Cu' as const,
      napiecieProbiercze: '500' as const,
      obwody: [
        { id: 'o1', rodzaj: 'gniazda' as const, ocena: 'w-normie' as const },
      ],
    }
    await saveInspectionToFirestore(
      makeInspection({ unitType: 'mieszkanie', izolacjaData }),
      inspId
    )
    await saveInspectionToFirestore(
      makeInspection({ unitType: 'lokal', izolacjaData }),
      inspId
    )

    const data = (await getDoc(doc(testDb, 'inspections', inspId))).data()!
    expect(data.unitType).toBe('lokal')
    expect('izolacjaData' in data).toBe(false)
  })

  it('old mieszkanie without izolacjaData saves without the field', async () => {
    const inspId = 'insp-izol-3'
    await saveInspectionToFirestore(
      makeInspection({ unitType: 'mieszkanie' }),
      inspId
    )
    const data = (await getDoc(doc(testDb, 'inspections', inspId))).data()!
    expect('izolacjaData' in data).toBe(false)
  })

  it('update does not duplicate the document', async () => {
    const inspection = makeInspection()
    const inspId = 'insp-dup-1'

    await saveInspectionToFirestore(inspection, inspId)
    await saveInspectionToFirestore(
      { ...inspection, notes: 'Updated notes' },
      inspId
    )

    const snap = await getDoc(doc(testDb, 'inspections', inspId))
    expect(snap.data()!.notes).toBe('Updated notes')

    const all = await getDocs(collection(testDb, 'inspections'))
    expect(all.size).toBe(1)
  })

  it('markInspectionAsSynced sets synced to true', async () => {
    const inspId = 'insp-sync-1'
    await saveInspectionToFirestore(makeInspection(), inspId)

    await markInspectionAsSynced(inspId)

    const snap = await getDoc(doc(testDb, 'inspections', inspId))
    expect(snap.data()!.synced).toBe(true)
  })

  it('deleteInspectionFromFirestore removes the document', async () => {
    const inspId = 'insp-del-1'
    await saveInspectionToFirestore(makeInspection(), inspId)

    await deleteInspectionFromFirestore(inspId, 'test-building-1')

    const snap = await getDoc(doc(testDb, 'inspections', inspId))
    expect(snap.exists()).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════
// 2b. Building inspectionStatuses map (lightweight per-building stats)
// ═════════════════════════════════════════════════════════════════════
describe('building inspectionStatuses', () => {
  const buildingId = 'test-building-1'

  const readStatuses = async () =>
    (await getDoc(doc(testDb, 'buildings', buildingId))).data()
      ?.inspectionStatuses

  beforeEach(async () => {
    await setDoc(doc(testDb, 'buildings', buildingId), {
      projectId: 'test-project-1',
      street: 'ul. Testowa 1',
      zipCode: '40-000',
      city: 'Katowice',
    })
  })

  it('saving an inspection adds its status to the building map', async () => {
    await saveInspectionToFirestore(makeInspection(), 'insp-a')
    await saveInspectionToFirestore(
      makeInspection({ status: 'INACCESSIBLE' }),
      'insp-b'
    )

    expect(await readStatuses()).toEqual({
      'insp-a': 'COMPLETED',
      'insp-b': 'INACCESSIBLE',
    })
  })

  it('re-saving with a changed status keeps a single entry', async () => {
    await saveInspectionToFirestore(
      makeInspection({ status: 'INACCESSIBLE' }),
      'insp-a'
    )
    await saveInspectionToFirestore(makeInspection(), 'insp-a')

    expect(await readStatuses()).toEqual({ 'insp-a': 'COMPLETED' })
  })

  it('does not overwrite other building fields', async () => {
    await saveInspectionToFirestore(makeInspection(), 'insp-a')

    const data = (await getDoc(doc(testDb, 'buildings', buildingId))).data()!
    expect(data.street).toBe('ul. Testowa 1')
    expect(data.projectId).toBe('test-project-1')
  })

  it('deleting an inspection removes its entry from the map', async () => {
    await saveInspectionToFirestore(makeInspection(), 'insp-a')
    await saveInspectionToFirestore(makeInspection(), 'insp-b')

    await deleteInspectionFromFirestore('insp-a', buildingId)

    expect(await readStatuses()).toEqual({ 'insp-b': 'COMPLETED' })
  })

  it('rebuildBuildingInspectionStatuses replaces the whole map', async () => {
    await saveInspectionToFirestore(makeInspection(), 'insp-stale')

    await rebuildBuildingInspectionStatuses(buildingId, [
      { id: 'insp-x', status: 'INACCESSIBLE' },
    ])

    expect(await readStatuses()).toEqual({ 'insp-x': 'INACCESSIBLE' })
  })

  it('rebuildAllBuildingInspectionStatuses backfills from existing inspections', async () => {
    // Legacy data: inspections written directly, building has no map yet
    await setDoc(doc(testDb, 'inspections', 'legacy-1'), {
      buildingId,
      projectId: 'test-project-1',
      status: 'COMPLETED',
    })
    await setDoc(doc(testDb, 'inspections', 'legacy-2'), {
      buildingId,
      projectId: 'test-project-1',
      status: 'INACCESSIBLE',
    })
    await setDoc(doc(testDb, 'buildings', 'empty-building'), {
      projectId: 'test-project-1',
    })

    const count = await rebuildAllBuildingInspectionStatuses()

    expect(count).toBe(2)
    expect(await readStatuses()).toEqual({
      'legacy-1': 'COMPLETED',
      'legacy-2': 'INACCESSIBLE',
    })
    const empty = await getDoc(doc(testDb, 'buildings', 'empty-building'))
    expect(empty.data()!.inspectionStatuses).toEqual({})
  })

  it('getBuildingInspections returns only that building', async () => {
    await saveInspectionToFirestore(makeInspection(), 'insp-a')
    await saveInspectionToFirestore(
      makeInspection({ buildingId: 'other-building' }),
      'insp-other'
    )

    const result = await getBuildingInspections(buildingId)

    expect(result.map((i) => i.id)).toEqual(['insp-a'])
    expect(result[0].status).toBe('COMPLETED')
  })
})

// ═════════════════════════════════════════════════════════════════════
// 3. Cascading delete — Project
// ═════════════════════════════════════════════════════════════════════
describe('deleteProjectFromFirestore (cascading)', () => {
  const PROJECT_ID = 'proj-cascade-1'

  async function seedProjectTree() {
    // Project
    await setDoc(doc(testDb, 'projects', PROJECT_ID), {
      name: 'Cascade Test',
      status: 'active',
      createdAt: Timestamp.now(),
    })

    // 2 buildings belonging to the project
    for (const bId of ['bld-c1', 'bld-c2']) {
      await setDoc(doc(testDb, 'buildings', bId), {
        projectId: PROJECT_ID,
        street: 'ul. Cascade',
        zipCode: '00-000',
        city: 'Testowo',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        userId: 'test-user',
      })
    }

    // 3 inspections belonging to the project
    for (const iId of ['insp-c1', 'insp-c2', 'insp-c3']) {
      await setDoc(doc(testDb, 'inspections', iId), {
        projectId: PROJECT_ID,
        buildingId: 'bld-c1',
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

    await deleteProjectFromFirestore(PROJECT_ID)

    // Project gone
    const projSnap = await getDoc(doc(testDb, 'projects', PROJECT_ID))
    expect(projSnap.exists()).toBe(false)

    // All buildings gone
    const bldQuery = query(
      collection(testDb, 'buildings'),
      where('projectId', '==', PROJECT_ID)
    )
    const bldSnap = await getDocs(bldQuery)
    expect(bldSnap.size).toBe(0)

    // All inspections gone
    const inspQuery = query(
      collection(testDb, 'inspections'),
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
    await setDoc(doc(testDb, 'buildings', BUILDING_ID), {
      projectId: 'some-project',
      street: 'ul. Building Cascade',
      zipCode: '00-000',
      city: 'Testowo',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      userId: 'test-user',
    })

    for (const iId of ['insp-bc1', 'insp-bc2']) {
      await setDoc(doc(testDb, 'inspections', iId), {
        projectId: 'some-project',
        buildingId: BUILDING_ID,
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

    await deleteBuildingFromFirestore(BUILDING_ID)

    const bldSnap = await getDoc(doc(testDb, 'buildings', BUILDING_ID))
    expect(bldSnap.exists()).toBe(false)

    const inspQuery = query(
      collection(testDb, 'inspections'),
      where('buildingId', '==', BUILDING_ID)
    )
    const inspSnap = await getDocs(inspQuery)
    expect(inspSnap.size).toBe(0)
  })

  it('does not remove inspections from other buildings', async () => {
    await seedBuildingTree()

    // Add an inspection for a DIFFERENT building
    await setDoc(doc(testDb, 'inspections', 'insp-other'), {
      projectId: 'some-project',
      buildingId: 'other-building-id',
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

    await deleteBuildingFromFirestore(BUILDING_ID)

    // Other building's inspection should survive
    const otherSnap = await getDoc(doc(testDb, 'inspections', 'insp-other'))
    expect(otherSnap.exists()).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════
// 5. User Settings
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

    await saveInspectionToFirestore(inspection, 'insp-req-1')

    const snap = await getDoc(doc(testDb, 'inspections', 'insp-req-1'))
    const data = snap.data()!
    expect(data.projectId).toBe('req-proj-1')
    expect(data.buildingId).toBe('req-bld-1')
    // These must never be empty / undefined
    expect(data.projectId).toBeTruthy()
    expect(data.buildingId).toBeTruthy()
  })

  it('projectId and buildingId are queryable (used by cascading deletes)', async () => {
    await saveInspectionToFirestore(
      makeInspection({ projectId: 'qp-1', buildingId: 'qb-1' }),
      'insp-q1'
    )
    await saveInspectionToFirestore(
      makeInspection({ projectId: 'qp-2', buildingId: 'qb-2' }),
      'insp-q2'
    )

    const q1 = query(
      collection(testDb, 'inspections'),
      where('projectId', '==', 'qp-1')
    )
    const snap1 = await getDocs(q1)
    expect(snap1.size).toBe(1)
    expect(snap1.docs[0].id).toBe('insp-q1')

    const q2 = query(
      collection(testDb, 'inspections'),
      where('buildingId', '==', 'qb-2')
    )
    const snap2 = await getDocs(q2)
    expect(snap2.size).toBe(1)
    expect(snap2.docs[0].id).toBe('insp-q2')
  })
})
