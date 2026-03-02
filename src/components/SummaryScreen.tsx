import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { Home, FileDown, CheckCircle, Plus, Save, Pencil } from 'lucide-react'
import { SignaturePanel } from './organisms'
import { CompactMeasurementListItem } from './molecules'
import { Button, Card } from './atoms'
import { countMeasurementsByResult, ensureDate } from '../utils'
import type { Inspection } from '../types'
import { logger } from '../utils/logger'
import { useDocument } from '../hooks'
import { doc, type DocumentSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { saveInspectionToFirestore, markInspectionAsSynced } from '../services'
import { generateInspectionId } from '../utils'

const inspectionMapper = (snap: DocumentSnapshot): Inspection | null => {
  if (!snap.exists()) return null
  const d = snap.data()!
  return {
    id: snap.id,
    projectId: d.projectId,
    buildingId: d.buildingId,
    address: d.address,
    apartmentNumber: d.apartmentNumber,
    ownerName: d.ownerName || '',
    date: d.date?.toDate ? d.date.toDate() : new Date(),
    technicianName: d.technicianName || d.technician || '',
    technicianLicenseNumber: d.technicianLicenseNumber || '',
    technicianSignature: d.technicianSignature || '',
    measurements: d.measurements || [],
    notes: d.notes || '',
    ownerSignature: d.ownerSignature || d.signature || '',
    protocolNumber: d.protocolNumber,
    synced: d.synced ?? true,
    status: d.status || 'COMPLETED',
  }
}

export const SummaryScreen: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { buildingId, inspectionId } = useParams<{ buildingId: string; inspectionId: string }>()

  const locationState = location.state as
    | { inspection: Inspection; buildingId: string }
    | null

  // buildingId comes from URL first, then from location state, then from inspection data
  const resolvedBuildingId = buildingId || locationState?.buildingId

  // Live Firestore subscription for reload case
  const inspectionDocRef = useMemo(
    () => inspectionId ? doc(db, 'inspections', inspectionId) : null,
    [inspectionId]
  )
  const { data: firestoreInspection } = useDocument<Inspection>(
    inspectionDocRef, inspectionMapper, 'Inspection'
  )

  // Use location.state first (freshly passed from MeasurementScreen),
  // fall back to Firestore data (reload case)
  const [localInspection, setLocalInspection] = useState<Inspection | null>(
    locationState?.inspection || null
  )

  // When Firestore data arrives (reload case), use it
  useEffect(() => {
    if (firestoreInspection && !localInspection) {
      setLocalInspection(firestoreInspection)
    }
  }, [firestoreInspection, localInspection])

  const inspection = localInspection || firestoreInspection
  const effectiveBuildingId = resolvedBuildingId || inspection?.buildingId

  const [notes, setNotes] = useState(inspection?.notes || '')
  const [isSignatureVisible, setSignatureVisible] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    setNotes(inspection?.notes || '')
  }, [inspection?.id, inspection?.notes])

  useEffect(() => {
    setSignatureVisible(false)
  }, [inspection?.id])

  const handleNotesChange = (value: string) => {
    setNotes(value)
    if (localInspection) {
      setLocalInspection({ ...localInspection, notes: value })
    }
  }

  const saveInspection = (sig?: string) => {
    if (!inspection) return null
    const savedId = inspection.id || generateInspectionId()
    const toSave: Inspection = {
      ...inspection,
      id: savedId,
      notes,
      ownerSignature: sig !== undefined ? sig : (inspection.ownerSignature || ''),
      date: ensureDate(inspection.date),
      synced: false,
    }

    // Fire-and-forget: write to Firestore cache (works offline), sync when online
    saveInspectionToFirestore(toSave, savedId)
      .then(() => markInspectionAsSynced(savedId))
      .then(() => logger.log(`✅ Inspection ${savedId} synced`))
      .catch((err) => logger.error(`❌ Sync failed:`, err))

    return toSave
  }

  const handleSaveSignature = (ownerSignature: string) => {
    if (!inspection) return
    // Optimistic local update
    setLocalInspection({ ...inspection, notes, ownerSignature })
    // Save to Firestore (fire-and-forget)
    saveInspection(ownerSignature)
    setSignatureVisible(false)
  }

  const handleReturnToBuilding = () => {
    navigate(effectiveBuildingId ? `/building/${effectiveBuildingId}` : '/')
  }

  const handleSaveOnly = () => {
    if (!inspection) return
    saveInspection(inspection.ownerSignature || '')
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleAddNext = () => {
    if (!effectiveBuildingId || !inspection) {
      alert('Błąd: Brak ID budynku lub danych pomiaru')
      return
    }
    navigate(`/building/${effectiveBuildingId}`, {
      state: { lastApartmentNumber: inspection.apartmentNumber },
    })
  }

  const handleBackToMeasurement = () => {
    if (!effectiveBuildingId || !inspection) return
    navigate(`/building/${effectiveBuildingId}/measurement`, {
      state: { inspection: { ...inspection, notes } },
    })
  }

  if (!inspection) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Brak danych do wyświetlenia</p>
          <Button variant="primary" onClick={() => navigate('/')} icon={<Home size={20} />}>
            Powrót do listy
          </Button>
        </div>
      </div>
    )
  }

  const handleGeneratePDF = async () => {
    if (!inspection) return
    try {
      const [{ pdf }, { PdfGenerator }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./PdfGenerator'),
      ])
      const blob = await pdf(<PdfGenerator inspection={inspection} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const safeProtocolNumber = inspection.protocolNumber.replace(/\//g, '-')
      link.download = `${safeProtocolNumber}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating PDF:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('font') || errorMessage.includes('Font')) {
        alert('Błąd ładowania fontów PDF. Upewnij się, że aplikacja była uruchomiona przynajmniej raz online, aby pobrać czcionki.')
      } else if (errorMessage.includes('Failed to fetch')) {
        alert('Błąd generowania PDF offline. Spróbuj ponownie z połączeniem internetowym.')
      } else {
        alert(`Błąd podczas generowania PDF: ${errorMessage}`)
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

  const { passed, failed } = countMeasurementsByResult(inspection.measurements)
  const hasStoredSignature = Boolean(inspection.ownerSignature && inspection.ownerSignature.trim().length > 0)

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-green-900 border-b border-green-800 text-slate-100 p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <CheckCircle size={32} />
          <div>
            <h1 className="text-xl font-bold">Pomiar Zakończony</h1>
            <p className="text-sm text-green-300">
              {inspection.address} / {inspection.apartmentNumber}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Card className="mb-4">
          <h2 className="font-bold text-lg text-slate-100 mb-3">Podsumowanie</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{passed}</div>
              <div className="text-xs text-slate-400">Pozytywne</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">{failed}</div>
              <div className="text-xs text-slate-400">Negatywne</div>
            </div>
          </div>
        </Card>

        <Card className="mb-4">
          <h3 className="font-bold text-slate-100 mb-3">Wszystkie punkty pomiarowe</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {inspection.measurements.map((m) => (
              <CompactMeasurementListItem key={m.id} measurement={m} />
            ))}
          </div>
        </Card>

        <Card className="mb-4">
          <label htmlFor="inspection-notes" className="block text-sm font-medium text-slate-100 mb-2">
            Uwagi do protokołu
          </label>
          <textarea
            id="inspection-notes"
            value={notes}
            onChange={(event) => handleNotesChange(event.target.value)}
            placeholder="Wpisz dodatkowe uwagi..."
            rows={6}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Card>

        {!isSignatureVisible && (
          <Card className="mb-4">
            <h3 className="font-bold text-slate-100 mb-3">Podpis</h3>
            {hasStoredSignature ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-700 bg-slate-950 p-2">
                  <img src={inspection.ownerSignature} alt="Podgląd podpisu właściciela" className="w-full h-32 object-contain rounded bg-white" />
                </div>
                <Button variant="secondary" fullWidth onClick={() => setSignatureVisible(true)}>
                  Zmień / Edytuj podpis
                </Button>
              </div>
            ) : (
              <Button variant="primary" fullWidth onClick={() => setSignatureVisible(true)}>
                Złóż podpis
              </Button>
            )}
          </Card>
        )}

        {isSignatureVisible && (
          <div className="space-y-3 mb-4">
            <SignaturePanel onSave={handleSaveSignature} initialSignature={inspection.ownerSignature} />
            <Button variant="secondary" fullWidth onClick={() => setSignatureVisible(false)}>
              Anuluj i zwiń panel
            </Button>
          </div>
        )}

        <div className="space-y-3 mt-4">
          <Button variant="danger" size="lg" fullWidth onClick={handleGeneratePDF} icon={<FileDown size={24} />}>
            Generuj PDF
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={handleSaveOnly} icon={<Save size={24} />}>
            {isSaved ? '✓ Zapisano!' : 'Zapisz'}
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={handleBackToMeasurement} icon={<Pencil size={24} />}>
            Edytuj pomiary
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={handleAddNext} icon={<Plus size={24} />}>
            Dodaj Kolejny Protokół
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={handleReturnToBuilding} icon={<Home size={24} />}>
            Powrót do Listy Pomiarów
          </Button>
        </div>
      </div>
    </div>
  )
}
