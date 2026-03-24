/**
 * Migration Script: Flat collections → Company-scoped collections
 *
 * This script migrates existing production data from flat Firestore collections
 * into a company-scoped structure under /companies/{companyId}/...
 *
 * PREREQUISITES:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Download a service account key from Firebase Console:
 *    Project Settings → Service Accounts → Generate New Private Key
 * 3. Save the key as ./service-account-key.json (DO NOT COMMIT THIS FILE)
 *
 * USAGE:
 *   npx tsx scripts/migrate-to-companies.ts
 *
 * WHAT IT DOES:
 * 1. Creates default company "HC INSTAL" with stable slug-based ID
 * 2. Creates owner member records for the two existing users
 * 3. Copies /projects → /companies/{cid}/projects (preserving doc IDs)
 * 4. Copies /buildings → /companies/{cid}/buildings (preserving doc IDs)
 * 5. Copies /inspections → /companies/{cid}/inspections (preserving doc IDs)
 * 6. Sets companyId on /users/{uid} for each user
 * 7. Validates migration counts
 *
 * DOES NOT delete old collections — verify manually, then delete.
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Configuration ──────────────────────────────────────────────────────────

const COMPANY_NAME = 'HC INSTAL'
const DRY_RUN = process.argv.includes('--dry-run')

// ── Company ID generation (mirrors src/utils/companyId.ts) ─────────────────

function generateSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function randomSuffix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

function generateCompanyId(name: string): string {
  return `${generateSlug(name)}-${randomSuffix()}`
}

// ── Main migration ────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  Migration: Flat Collections → Company-Scoped')
  console.log(`  Company: "${COMPANY_NAME}"`)
  console.log(`  Mode: ${DRY_RUN ? '🟡 DRY RUN (no writes)' : '🔴 LIVE'}`)
  console.log('═══════════════════════════════════════════════════════\n')

  // Initialize Firebase Admin
  const serviceAccountPath = resolve(__dirname, '../service-account-key.json')
  let serviceAccount: ServiceAccount
  try {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))
  } catch {
    console.error('❌ Could not read service-account-key.json')
    console.error('   Download it from Firebase Console → Project Settings → Service Accounts')
    console.error(`   Expected path: ${serviceAccountPath}`)
    process.exit(1)
  }

  initializeApp({ credential: cert(serviceAccount) })
  const db = getFirestore()

  // 1. Generate company ID
  const companyId = generateCompanyId(COMPANY_NAME)
  const slug = generateSlug(COMPANY_NAME)
  console.log(`📋 Company ID: ${companyId}`)
  console.log(`📋 Slug: ${slug}\n`)

  // 2. Read all existing users
  const usersSnapshot = await db.collection('users').get()
  const userIds = usersSnapshot.docs.map(d => d.id)
  console.log(`👤 Found ${userIds.length} users: ${userIds.join(', ')}`)

  if (userIds.length !== 2) {
    console.warn(`⚠️  Expected exactly 2 users, found ${userIds.length}. Proceeding anyway.`)
  }

  // 3. Read all existing data
  const projectsSnapshot = await db.collection('projects').get()
  const buildingsSnapshot = await db.collection('buildings').get()
  const inspectionsSnapshot = await db.collection('inspections').get()

  console.log(`\n📊 Existing data:`)
  console.log(`   Projects:    ${projectsSnapshot.size}`)
  console.log(`   Buildings:   ${buildingsSnapshot.size}`)
  console.log(`   Inspections: ${inspectionsSnapshot.size}\n`)

  if (DRY_RUN) {
    console.log('🟡 DRY RUN — would create:')
    console.log(`   /companies/${companyId}`)
    console.log(`   ${userIds.length} member records`)
    console.log(`   ${projectsSnapshot.size} project copies`)
    console.log(`   ${buildingsSnapshot.size} building copies`)
    console.log(`   ${inspectionsSnapshot.size} inspection copies`)
    console.log('\nRun without --dry-run to execute.')
    return
  }

  // 4. Create company document
  console.log('🏢 Creating company document...')
  const firstOwnerId = userIds[0] || 'unknown'
  await db.doc(`companies/${companyId}`).set({
    name: COMPANY_NAME,
    slug,
    createdAt: FieldValue.serverTimestamp(),
    ownerId: firstOwnerId,
  })
  console.log(`   ✅ /companies/${companyId}`)

  // 5. Create member records for all users (both as owner)
  console.log('\n👥 Creating member records...')
  for (const uid of userIds) {
    await db.doc(`companies/${companyId}/members/${uid}`).set({
      userId: uid,
      role: 'owner',
      active: true,
      joinedAt: FieldValue.serverTimestamp(),
    })
    console.log(`   ✅ /companies/${companyId}/members/${uid} (role: owner)`)

    // Update user doc with companyId
    await db.doc(`users/${uid}`).update({ companyId })
    console.log(`   ✅ /users/${uid} → companyId: ${companyId}`)
  }

  // 6. Copy projects
  console.log('\n📁 Copying projects...')
  let projectsCopied = 0
  for (const docSnap of projectsSnapshot.docs) {
    const data = docSnap.data()
    await db.doc(`companies/${companyId}/projects/${docSnap.id}`).set({
      ...data,
      createdBy: firstOwnerId,
    })
    projectsCopied++
    console.log(`   ✅ ${docSnap.id} — "${data.name}"`)
  }

  // 7. Copy buildings
  console.log('\n🏗️  Copying buildings...')
  let buildingsCopied = 0
  for (const docSnap of buildingsSnapshot.docs) {
    const data = docSnap.data()
    await db.doc(`companies/${companyId}/buildings/${docSnap.id}`).set({
      ...data,
      createdBy: data.userId || firstOwnerId,
    })
    buildingsCopied++
    console.log(`   ✅ ${docSnap.id}`)
  }

  // 8. Copy inspections
  console.log('\n📋 Copying inspections...')
  let inspectionsCopied = 0
  for (const docSnap of inspectionsSnapshot.docs) {
    const data = docSnap.data()
    await db.doc(`companies/${companyId}/inspections/${docSnap.id}`).set({
      ...data,
      companyId,
      createdBy: firstOwnerId,
      assignedTo: '',
    })
    inspectionsCopied++
    if (inspectionsCopied % 50 === 0) {
      console.log(`   📋 ${inspectionsCopied}/${inspectionsSnapshot.size} copied...`)
    }
  }
  console.log(`   ✅ ${inspectionsCopied} inspections copied`)

  // 9. Validation
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  VALIDATION')
  console.log('═══════════════════════════════════════════════════════')

  const newProjectsCount = (await db.collection(`companies/${companyId}/projects`).get()).size
  const newBuildingsCount = (await db.collection(`companies/${companyId}/buildings`).get()).size
  const newInspectionsCount = (await db.collection(`companies/${companyId}/inspections`).get()).size

  const check = (label: string, expected: number, actual: number) => {
    const ok = expected === actual
    console.log(`  ${ok ? '✅' : '❌'} ${label}: ${actual}/${expected}`)
    return ok
  }

  let allOk = true
  allOk = check('Projects', projectsSnapshot.size, newProjectsCount) && allOk
  allOk = check('Buildings', buildingsSnapshot.size, newBuildingsCount) && allOk
  allOk = check('Inspections', inspectionsSnapshot.size, newInspectionsCount) && allOk

  console.log()
  if (allOk) {
    console.log('🎉 Migration completed successfully!')
    console.log(`\n📋 Company ID to use: ${companyId}`)
    console.log('\n⚠️  Old flat collections (/projects, /buildings, /inspections) still exist.')
    console.log('   Verify the app works with new structure, then delete old data manually.')
  } else {
    console.error('❌ VALIDATION FAILED — counts do not match!')
    console.error('   Check Firestore Console for partial data.')
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
