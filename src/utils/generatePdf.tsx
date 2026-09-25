import type { Inspection } from '../types'
import { logger } from './logger'
import { showToast, type ToastHandle } from './toast'
import { canGeneratePdf } from './izolacja'

const INCOMPLETE_MESSAGE =
  'Uzupełnij sekcję „Rezystancja izolacji” przed wygenerowaniem PDF.'

/** Shown while a job waits for an earlier one to finish. */
const QUEUED_MESSAGE = 'Czekam na zakończenie poprzedniego pobierania…'

/**
 * All PDF work is serialized through one promise chain. Two concurrent runs
 * would interleave their downloads (Safari silently drops downloads fired too
 * close together) and let one run's `recoverFirestore()` land in the middle of
 * the other. A second click therefore queues instead of racing.
 */
let pdfQueueTail: Promise<void> = Promise.resolve()

/** Jobs enqueued but not yet finished — >0 means a new click will have to wait. */
let pendingPdfJobs = 0

function enqueuePdfJob(job: () => Promise<void>): Promise<void> {
  pendingPdfJobs++
  const run = pdfQueueTail.then(job, job).finally(() => {
    pendingPdfJobs--
  })
  // Keep the chain alive even if a job rejects unexpectedly.
  pdfQueueTail = run.catch(() => {})
  return run
}

/** Delay between consecutive downloads in a batch (ms) — browsers drop downloads fired too fast. */
const BATCH_DOWNLOAD_DELAY_MS = 600

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function loadPdfModules() {
  const [{ pdf }, { PdfGenerator }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../components/PdfGenerator'),
  ])
  return { pdf, PdfGenerator }
}

type PdfModules = Awaited<ReturnType<typeof loadPdfModules>>

/** Renders one inspection to a blob and triggers a browser download. */
async function renderAndDownload(
  { pdf, PdfGenerator }: PdfModules,
  inspection: Inspection
): Promise<void> {
  const blob = await pdf(<PdfGenerator inspection={inspection} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const safeProtocolNumber = inspection.protocolNumber.replace(/\//g, '-')
  link.download = `${safeProtocolNumber}.pdf`
  link.click()
  // Revoke late — Safari cancels a download whose object URL disappears too soon.
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function describePdfError(error: unknown): {
  message: string
  duration: number
} {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  if (errorMessage.includes('font') || errorMessage.includes('Font')) {
    return {
      message:
        'Błąd ładowania fontów PDF. Upewnij się, że aplikacja była uruchomiona przynajmniej raz online.',
      duration: 5000,
    }
  }
  if (errorMessage.includes('Failed to fetch')) {
    return {
      message:
        'Błąd generowania PDF offline. Spróbuj ponownie z połączeniem internetowym.',
      duration: 5000,
    }
  }
  return {
    message: `Błąd podczas generowania PDF: ${errorMessage}`,
    duration: 5000,
  }
}

/**
 * PDF generation saturates iOS Safari's connection pool, killing Firestore's
 * WebChannel. Recover by terminating and re-initializing.
 */
async function recoverFirestoreAfterPdf(): Promise<void> {
  try {
    const { recoverFirestore } = await import('../firebase')
    await recoverFirestore()
  } catch (err) {
    logger.warn('⚠️ recoverFirestore after PDF failed:', err)
  }
}

/**
 * Generates a PDF for the given inspection, triggers a download,
 * and recovers Firestore afterwards (iOS Safari workaround).
 */
export async function generateInspectionPdf(
  inspection: Inspection
): Promise<void> {
  if (!canGeneratePdf(inspection)) {
    showToast(INCOMPLETE_MESSAGE, { type: 'error', duration: 5000 })
    return
  }
  const toast = showToast(
    pendingPdfJobs > 0 ? QUEUED_MESSAGE : 'Generowanie PDF…',
    { type: 'info', duration: 0 }
  )

  return enqueuePdfJob(async () => {
    toast.update('Generowanie PDF…', 'info', 0)

    try {
      const modules = await loadPdfModules()
      await renderAndDownload(modules, inspection)

      toast.update('PDF wygenerowany pomyślnie!', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      const { message, duration } = describePdfError(error)
      toast.update(message, 'error', duration)
    } finally {
      await recoverFirestoreAfterPdf()
    }
  })
}

/**
 * Generates and downloads PDFs for several inspections, one after another.
 * Failures on individual protocols don't abort the batch — they're reported
 * in the final toast. Firestore is recovered once, after the whole batch.
 */
export async function generateInspectionPdfsBatch(
  inspections: Inspection[]
): Promise<void> {
  if (inspections.length === 0) return

  const total = inspections.length
  const toast = showToast(
    pendingPdfJobs > 0 ? QUEUED_MESSAGE : `Generowanie PDF 1/${total}…`,
    { type: 'info', duration: 0 }
  )

  return enqueuePdfJob(() => runPdfBatch(inspections, toast))
}

async function runPdfBatch(
  inspections: Inspection[],
  toast: ToastHandle
): Promise<void> {
  const total = inspections.length
  const failed: string[] = []

  try {
    const modules = await loadPdfModules()

    for (let i = 0; i < total; i++) {
      const inspection = inspections[i]
      if (!canGeneratePdf(inspection)) {
        logger.warn(`⚠️ ${inspection.protocolNumber}: ${INCOMPLETE_MESSAGE}`)
        failed.push(inspection.protocolNumber)
        continue
      }
      toast.update(
        `Generowanie PDF ${i + 1}/${total} — ${inspection.protocolNumber}`,
        'info',
        0
      )

      try {
        await renderAndDownload(modules, inspection)
      } catch (error) {
        logger.error(
          `❌ Error generating PDF for ${inspection.protocolNumber}:`,
          error
        )
        failed.push(inspection.protocolNumber)
      }

      if (i < total - 1) {
        await sleep(BATCH_DOWNLOAD_DELAY_MS)
      }
    }

    if (failed.length === 0) {
      toast.update(`Pobrano ${total} protokołów PDF`, 'success', 4000)
    } else if (failed.length === total) {
      toast.update('Nie udało się wygenerować żadnego PDF', 'error', 6000)
    } else {
      toast.update(
        `Pobrano ${total - failed.length}/${total} PDF. Nie udało się: ${failed.join(', ')}`,
        'error',
        6000
      )
    }
  } catch (error) {
    console.error('Error generating PDFs:', error)
    const { message, duration } = describePdfError(error)
    toast.update(message, 'error', duration)
  } finally {
    await recoverFirestoreAfterPdf()
  }
}
