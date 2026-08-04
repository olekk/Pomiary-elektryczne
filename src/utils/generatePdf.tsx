import type { Inspection } from '../types'
import { logger } from './logger'
import { showToast } from './toast'

/**
 * Generates a PDF for the given inspection, triggers a download,
 * and recovers Firestore afterwards (iOS Safari workaround).
 */
export async function generateInspectionPdf(inspection: Inspection): Promise<void> {
  const toast = showToast('Generowanie PDF…', { type: 'info', duration: 0 })

  try {
    const [{ pdf }, { PdfGenerator }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('../components/PdfGenerator'),
    ])
    const blob = await pdf(<PdfGenerator inspection={inspection} />).toBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const safeProtocolNumber = inspection.protocolNumber.replace(/\//g, '-')
    link.download = `${safeProtocolNumber}.pdf`
    link.click()
    URL.revokeObjectURL(url)

    toast.update('PDF wygenerowany pomyślnie!', 'success')
  } catch (error) {
    logger.error('Error generating PDF:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('font') || errorMessage.includes('Font')) {
      toast.update('Błąd ładowania fontów PDF. Upewnij się, że aplikacja była uruchomiona przynajmniej raz online.', 'error', 5000)
    } else if (errorMessage.includes('Failed to fetch')) {
      toast.update('Błąd generowania PDF offline. Spróbuj ponownie z połączeniem internetowym.', 'error', 5000)
    } else {
      toast.update(`Błąd podczas generowania PDF: ${errorMessage}`, 'error', 5000)
    }
  } finally {
    // PDF generation saturates iOS Safari's connection pool, killing
    // Firestore's WebChannel. Recover by terminating and re-initializing.
    try {
      const { recoverFirestore } = await import('../firebase')
      await recoverFirestore()
    } catch (err) {
      logger.warn('⚠️ recoverFirestore after PDF failed:', err)
    }
  }
}
