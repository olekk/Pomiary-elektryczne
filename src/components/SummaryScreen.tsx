import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, FileDown, CheckCircle } from 'lucide-react'
import { useInspectionStore } from '../store/useInspectionStore'
import { SignaturePanel } from './organisms'
import { CompactMeasurementListItem } from './molecules'
import { Button, Card } from './atoms'
import { PdfGenerator } from './PdfGenerator'
import { pdf } from '@react-pdf/renderer'
import { countMeasurementsByResult } from '../utils'

export const SummaryScreen: React.FC = () => {
  const navigate = useNavigate()
  const { currentInspection, setSignature, saveToFirestore } =
    useInspectionStore()

  const projectId = currentInspection?.projectId

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

  const handleReturnToProject = () => {
    if (projectId) {
      navigate(`/project/${projectId}`)
    } else {
      navigate('/')
    }
  }

  if (!currentInspection) {
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
    try {
      const blob = await pdf(
        <PdfGenerator inspection={currentInspection} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Pomiar_${currentInspection.apartmentNumber}_${new Date().toISOString().split('T')[0]}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Błąd podczas generowania PDF')
    }
  }

  const { passed, failed, noGrounding } = countMeasurementsByResult(
    currentInspection.measurements
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
              {currentInspection.address} / {currentInspection.apartmentNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-4">
        <Card className="mb-4">
          <h2 className="font-bold text-lg text-slate-100 mb-3">Podsumowanie</h2>
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
          <h3 className="font-bold text-slate-100 mb-3">Wszystkie punkty pomiarowe</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {currentInspection.measurements.map((m) => (
              <CompactMeasurementListItem key={m.id} measurement={m} />
            ))}
          </div>
        </Card>

        {/* Signature */}
        <SignaturePanel onSave={handleSaveSignature} />

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
            onClick={handleReturnToProject}
            icon={<Home size={24} />}
          >
            Powrót do Projektu
          </Button>
        </div>
      </div>
    </div>
  )
}
