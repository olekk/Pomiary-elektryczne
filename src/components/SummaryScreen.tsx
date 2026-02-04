import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, FileDown, CheckCircle, Plus } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { SignaturePanel } from './organisms'
import { CompactMeasurementListItem } from './molecules'
import { Button, Card } from './atoms'
import { countMeasurementsByResult } from '../utils'
import type { Inspection } from '../types'

export const SummaryScreen: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentInspection, setSignature, saveToFirestore } = useAppStore()

  // Priorytet: dane z nawigacji (kliknięcie w listę) > dane ze store'a (nowy pomiar)
  const locationState = location.state as
    | { inspection: Inspection; buildingId: string }
    | null
  const inspection = locationState?.inspection || currentInspection
  const buildingId = locationState?.buildingId || inspection?.buildingId

  const handleSaveSignature = async (signature: string) => {
    try {
      // Update store first
      setSignature(signature)
      // Save to Firestore with signature override
      await saveToFirestore(signature)
    } catch (error) {
      console.error('Error saving signature:', error)
      alert('Błąd podczas zapisywania podpisu')
    }
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

    // Nawiguj do ekranu nowego pomiaru z przekazaniem ostatniego numeru mieszkania
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
      // Lazy load PDF libraries only when needed
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
      alert('Błąd podczas generowania PDF')
    }
  }

  const { passed, failed, noGrounding } = countMeasurementsByResult(
    inspection.measurements
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

        {/* Signature */}
        <SignaturePanel
          onSave={handleSaveSignature}
          initialSignature={inspection.signature}
        />

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
