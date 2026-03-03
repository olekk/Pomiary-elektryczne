/**
 * Firebase Emulator test setup helpers.
 *
 * Provides an emulator-connected Firestore instance, data cleanup,
 * and factory functions for deterministic test data.
 */
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app'
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore'

// ── Emulator constants ──────────────────────────────────────────────
const EMULATOR_HOST = '127.0.0.1'
const EMULATOR_PORT = 8080
const TEST_PROJECT_ID = 'pomiary-test'

// ── Singleton emulator app / db ─────────────────────────────────────
let testApp: FirebaseApp | null = null
let testDb: Firestore | null = null

/**
 * Returns a Firestore instance connected to the local emulator.
 * Creates a fresh Firebase app on first call; reuses it afterwards.
 */
export function getTestDb(): Firestore {
  if (testDb) return testDb

  testApp = initializeApp(
    { projectId: TEST_PROJECT_ID },
    `test-app-${Date.now()}`
  )
  testDb = getFirestore(testApp)
  connectFirestoreEmulator(testDb, EMULATOR_HOST, EMULATOR_PORT)
  return testDb
}

/**
 * Tear down the test Firebase app (call in afterAll).
 */
export async function destroyTestApp(): Promise<void> {
  if (testApp) {
    await deleteApp(testApp)
    testApp = null
    testDb = null
  }
}

/**
 * Wipe all Firestore data via the emulator REST endpoint.
 * Call in `beforeEach` for full test isolation.
 */
export async function clearFirestoreData(): Promise<void> {
  const url = `http://${EMULATOR_HOST}:${EMULATOR_PORT}/emulator/v1/projects/${TEST_PROJECT_ID}/databases/(default)/documents`
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(
      `Failed to clear Firestore emulator data: ${res.status} ${res.statusText}`
    )
  }
}

// ── Factory helpers ─────────────────────────────────────────────────
import type { Project, Inspection, UserSettings } from '../../types'

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'test-project-1',
    name: 'Test Project',
    createdAt: new Date('2025-01-15T10:00:00Z'),
    status: 'active',
    ...overrides,
  }
}

export function makeInspection(
  overrides: Partial<Inspection> = {}
): Inspection {
  return {
    projectId: 'test-project-1',
    buildingId: 'test-building-1',
    address: 'ul. Testowa 1',
    apartmentNumber: '1A',
    ownerName: 'Jan Testowy',
    date: new Date('2025-01-15T12:00:00Z'),
    technicianName: 'Tech Testowy',
    technicianLicenseNumber: 'LIC-001',
    technicianSignature: '',
    notes: 'Test notes',
    measurements: [
      {
        id: 'm1',
        pointNumber: 1,
        room: 'Kuchnia',
        protectionType: 'WNP',
        amperage: 16,
        zsValue: 1.5,
        zsDop: 2.88,
        result: 'TAK',
        socketType: 'Gniazdo 230V',
      },
    ],
    ownerSignature: '',
    protocolNumber: 'PROT-001',
    synced: false,
    status: 'COMPLETED',
    unitType: 'mieszkanie',
    ...overrides,
  }
}

export function makeUserSettings(
  overrides: Partial<UserSettings> = {}
): UserSettings {
  return {
    displayName: 'Test User',
    licenseNumber: 'LIC-12345',
    signatureBase64: 'data:image/png;base64,dGVzdA==',
    ...overrides,
  }
}
