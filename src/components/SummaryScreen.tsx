import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { Home, FileDown, CheckCircle, Plus } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { SignaturePanel } from './organisms'
import { CompactMeasurementListItem } from './molecules'
import { Button, Card } from './atoms'
import { countMeasurementsByResult } from '../utils'
import type { Inspection } from '../types'
import { logger } from '../utils/logger'

export const SummaryScreen: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    currentInspection,
    setCurrentInspection,
    setOwnerSignature,
    updateInspectionNotes,
    saveToFirestore,
    fetchInspectionById,
    fetchBuildingById,
  } = useAppStore()

  // Read inspectionId from URL params (reload-safe)
  const { inspectionId } = useParams<{ inspectionId: string }>()

  // Priorytet: dane z nawigacji (kliknięcie w listę) > dane ze store'a (nowy pomiar)
  const locationState = location.state as
    | { inspection: Inspection; buildingId: string }
    | null

  // Gdy currentInspection jest zsynchronizowany z locationState (te same ID),
  // używamy currentInspection bo to "żywy" obiekt ze store'a, który reaguje
  // na zmiany (np. aktualizacja podpisu). locationState to zamrożony snapshot.
  const inspection =
    locationState?.inspection &&
    currentInspection?.id === locationState.inspection.id
      ? currentInspection
      : locationState?.inspection || currentInspection
  const buildingId = locationState?.buildingId || inspection?.buildingId
  const [notes, setNotes] = useState(inspection?.notes || '')
  const [isSignatureVisible, setSignatureVisible] = useState(false)

  // Fetch inspection from Firestore if not in store (e.g. on page reload)
  useEffect(() => {
    if (inspectionId && !inspection) {
      fetchInspectionById(inspectionId)
    }
  }, [inspectionId, inspection, fetchInspectionById])

  // Fetch building data for navigation (e.g. on page reload)
  useEffect(() => {
    if (buildingId) {
      fetchBuildingById(buildingId)
    }
  }, [buildingId, fetchBuildingById])

  useEffect(() => {
    if (locationState?.inspection) {
      const selectedInspection = locationState.inspection
      if (currentInspection?.id !== selectedInspection.id) {
        setCurrentInspection(selectedInspection)
      }
    }
  }, [locationState, currentInspection?.id, setCurrentInspection])

  useEffect(() => {
    setNotes(inspection?.notes || '')
  }, [inspection?.id, inspection?.notes])

  useEffect(() => {
    setSignatureVisible(false)
  }, [inspection?.id])

  const handleNotesChange = (value: string) => {
    setNotes(value)
    updateInspectionNotes(value)
  }

  const handleSaveSignature = (ownerSignature: string) => {
    // KROK 1: Prepare data
    updateInspectionNotes(notes)
    
    // KROK 2: Optimistic Update - zaktualizuj Zustand natychmiast
    setOwnerSignature(ownerSignature)
    
    // KROK 3: Background sync - Firebase w tle (NIE blokuje UI!)
    saveToFirestore(ownerSignature)
      .catch((error) => {
        logger.error('❌ Error saving signature:', error)
        // UI już pokazuje nowy podpis, synchronizacja nastąpi później
      })
    
    // Modal zamyka się NATYCHMIAST (nie czeka na Firebase)
    setSignatureVisible(false)
  }

  const handleReturnToBuilding = () => {
    if (buildingId) {
      navigate(`/building/${buildingId}`)
    } else {
      navigate('/')
    }
  }

  const handleSaveAndAddNext = () => {
    if (!buildingId || !inspection) {
      alert('Błąd: Brak ID budynku lub danych pomiaru')
      return
    }

    // KROK 1: Prepare data
    updateInspectionNotes(notes)
    
    // KROK 2: Optimistic Update - Zustand już zaktualizowany w updateInspectionNotes
    
    // KROK 3: Background sync - Firebase w tle (NIE blokuje nawigacji!)
    saveToFirestore(inspection?.ownerSignature ?? '')
      .catch((error) => {
        logger.error('❌ Error saving inspection:', error)
        // Użytkownik już przeszedł dalej, dane synchronizują się w tle
      })

    // Nawigacja NATYCHMIAST (nie czeka na Firebase)
    navigate(`/building/${buildingId}`, {
      state: {
        lastApartmentNumber: inspection.apartmentNumber,
      },
    })
  }

  if (!inspection) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Brak danych do wyświetlenia</p>
          <Button
            variant="primary"
            onClick={() => navigate('/')}
            icon={<Home size={20} />}
          >
            Powrót do listy
          </Button>
        </div>
      </div>
    )
  }

  const handleGeneratePDF = async () => {
    if (!inspection) return

    try {
      // Lazy load PDF libraries only when needed (offline-safe dzięki Vite chunks)
      const [{ pdf }, { PdfGenerator }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./PdfGenerator'),
      ])

      const blob = await pdf(
        <PdfGenerator inspection={inspection} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Użyj numeru protokołu w nazwie pliku
      // Zamień slashe na myślniki dla kompatybilności z systemami plików
      const safeProtocolNumber = inspection.protocolNumber.replace(/\//g, '-')
      link.download = `Protokol_${safeProtocolNumber}.pdf`

      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating PDF:', error)
      
      // Szczegółowy komunikat błędu
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('font') || errorMessage.includes('Font')) {
        alert('Błąd ładowania fontów PDF. Upewnij się, że aplikacja była uruchomiona przynajmniej raz online, aby pobrać czcionki.')
      } else if (errorMessage.includes('Failed to fetch')) {
        alert('Błąd generowania PDF offline. Spróbuj ponownie z połączeniem internetowym.')
      } else {
        alert(`Błąd podczas generowania PDF: ${errorMessage}`)
      }
    }
  }

  const { passed, failed, noGrounding } = countMeasurementsByResult(
    inspection.measurements
  )
  const hasStoredSignature = Boolean(
    inspection.ownerSignature && inspection.ownerSignature.trim().length > 0
  )

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
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

      {/* Summary Stats */}
      <div className="p-4">
        <Card className="mb-4">
          <h2 className="font-bold text-lg text-slate-100 mb-3">
            Podsumowanie
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{passed}</div>
              <div className="text-xs text-slate-400">Pozytywne</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">{failed}</div>
              <div className="text-xs text-slate-400">Negatywne</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">
                {noGrounding}
              </div>
              <div className="text-xs text-slate-400">B.UZ</div>
            </div>
          </div>
        </Card>

        {/* Measurements List */}
        <Card className="mb-4">
          <h3 className="font-bold text-slate-100 mb-3">
            Wszystkie punkty pomiarowe
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {inspection.measurements.map((m) => (
              <CompactMeasurementListItem key={m.id} measurement={m} />
            ))}
          </div>
        </Card>

        <Card className="mb-4">
          <label
            htmlFor="inspection-notes"
            className="block text-sm font-medium text-slate-100 mb-2"
          >
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

        {/* Signature */}
        {!isSignatureVisible && (
          <Card className="mb-4">
            <h3 className="font-bold text-slate-100 mb-3">Podpis</h3>

            {hasStoredSignature ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-700 bg-slate-950 p-2">
                  <img
                    src={inspection.ownerSignature}
                    alt="Podgląd podpisu właściciela"
                    className="w-full h-32 object-contain rounded bg-white"
                  />
                </div>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setSignatureVisible(true)}
                >
                  Zmień / Edytuj podpis
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                fullWidth
                onClick={() => setSignatureVisible(true)}
              >
                Złóż podpis
              </Button>
            )}
          </Card>
        )}

        {isSignatureVisible && (
          <div className="space-y-3 mb-4">
            <SignaturePanel
              onSave={handleSaveSignature}
              initialSignature={inspection.ownerSignature}
            />
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setSignatureVisible(false)}
            >
              Anuluj i zwiń panel
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 mt-4">
          <Button
            variant="danger"
            size="lg"
            fullWidth
            onClick={handleGeneratePDF}
            icon={<FileDown size={24} />}
          >
            Generuj PDF
          </Button>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSaveAndAddNext}
            icon={<Plus size={24} />}
          >
            Zapisz i Dodaj Kolejny
          </Button>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleReturnToBuilding}
            icon={<Home size={24} />}
          >
            Powrót do Listy Pomiarów
          </Button>
        </div>
      </div>
    </div>
  )
}
