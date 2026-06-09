import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { renderPdfBuffer } from './pdfGenerator'
import type { Inspection } from './types'

// Initialize Firebase Admin SDK
initializeApp()

const db = getFirestore()
const storage = getStorage()

/**
 * HTTPS Callable Function: generatePdf
 *
 * Generates a PDF for the given inspection and caches it in Firebase Storage.
 * If a cached PDF already exists, returns the download URL immediately.
 *
 * Request data: { inspectionId: string }
 * Response data: { downloadUrl: string }
 */
export const generatePdf = onCall(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    // 1. Verify authentication
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Musisz być zalogowany, aby wygenerować PDF.'
      )
    }

    const { inspectionId } = request.data as { inspectionId?: string }

    if (!inspectionId || typeof inspectionId !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        'Brak inspectionId w żądaniu.'
      )
    }

    const bucket = storage.bucket()
    const filePath = `pdfs/${inspectionId}.pdf`
    const file = bucket.file(filePath)

    // 2. Check for cached PDF
    const [exists] = await file.exists()
    if (exists) {
      console.log(`📄 Cached PDF found for ${inspectionId}`)
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      })
      return { downloadUrl: url }
    }

    // 3. Read inspection from Firestore
    console.log(`📝 Generating PDF for inspection ${inspectionId}`)
    const docSnap = await db.collection('inspections').doc(inspectionId).get()

    if (!docSnap.exists) {
      throw new HttpsError(
        'not-found',
        `Nie znaleziono pomiaru o ID: ${inspectionId}`
      )
    }

    const data = docSnap.data()!
    const inspection: Inspection = {
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
      measurements: data.measurements || [],
      notes: data.notes || '',
      ownerSignature: data.ownerSignature || data.signature || '',
      protocolNumber: data.protocolNumber,
      synced: data.synced ?? true,
      status: data.status || 'COMPLETED',
      unitType: data.unitType || 'mieszkanie',
      klatkaData: data.klatkaData || undefined,
    }

    // 4. Render PDF
    const pdfBuffer = await renderPdfBuffer(inspection)

    // 5. Upload to Firebase Storage
    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          inspectionId,
          protocolNumber: inspection.protocolNumber,
          generatedAt: new Date().toISOString(),
        },
      },
    })

    console.log(`✅ PDF uploaded to ${filePath} (${pdfBuffer.length} bytes)`)

    // 6. Generate signed download URL
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    })

    return { downloadUrl: url }
  }
)

/**
 * Firestore Trigger: onInspectionUpdate
 *
 * When an inspection document is updated, delete the cached PDF
 * so the next generation request produces a fresh one.
 */
export const onInspectionUpdate = onDocumentUpdated(
  {
    document: 'inspections/{inspectionId}',
    region: 'europe-west1',
  },
  async (event) => {
    const inspectionId = event.params.inspectionId

    const bucket = storage.bucket()
    const filePath = `pdfs/${inspectionId}.pdf`
    const file = bucket.file(filePath)

    const [exists] = await file.exists()
    if (exists) {
      await file.delete()
      console.log(`🗑️ Cached PDF deleted for inspection ${inspectionId}`)
    }
  }
)
