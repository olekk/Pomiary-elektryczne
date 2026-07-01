import React, { useEffect, useState } from 'react'
import { MainLayout } from './layout/MainLayout'
import { Button, Card, Input } from './atoms'
import { SignaturePanel } from './organisms'
import { Save } from 'lucide-react'
import { useAuth, useUserSettings } from '../hooks'

export const SettingsScreen: React.FC = () => {
  const { user } = useAuth()
  const {
    technicianName: nameFromHook,
    technicianLicenseNumber: licenseFromHook,
    technicianSignature: sigFromHook,
    reviewerName: reviewerNameFromHook,
    reviewerLicenseNumber: reviewerLicenseFromHook,
    reviewerSignature: reviewerSigFromHook,
    save: saveSettings,
  } = useUserSettings(user?.uid)

  const [technicianName, setTechnicianName] = useState(nameFromHook)
  const [technicianLicenseNumber, setTechnicianLicenseNumber] = useState(licenseFromHook)
  const [currentSignature, setCurrentSignature] = useState(sigFromHook)

  const [reviewerName, setReviewerName] = useState(reviewerNameFromHook)
  const [reviewerLicenseNumber, setReviewerLicenseNumber] = useState(reviewerLicenseFromHook)
  const [reviewerSignature, setReviewerSignature] = useState(reviewerSigFromHook)

  // Sync local state when data loads from Firestore/localStorage
  useEffect(() => { setTechnicianName(nameFromHook) }, [nameFromHook])
  useEffect(() => { setTechnicianLicenseNumber(licenseFromHook) }, [licenseFromHook])
  useEffect(() => { setCurrentSignature(sigFromHook) }, [sigFromHook])
  useEffect(() => { setReviewerName(reviewerNameFromHook) }, [reviewerNameFromHook])
  useEffect(() => { setReviewerLicenseNumber(reviewerLicenseFromHook) }, [reviewerLicenseFromHook])
  useEffect(() => { setReviewerSignature(reviewerSigFromHook) }, [reviewerSigFromHook])

  const handleSaveSignature = (signature: string) => {
    setCurrentSignature(signature)
  }

  const handleSaveReviewerSignature = (signature: string) => {
    setReviewerSignature(signature)
  }

  const handleSave = () => {
    if (!user) {
      alert('Brak zalogowanego użytkownika')
      return
    }

    if (!technicianName.trim()) {
      alert('Wprowadź imię i nazwisko wykonującego pomiary')
      return
    }

    if (!currentSignature) {
      alert('Dodaj podpis wykonującego pomiary')
      return
    }

    saveSettings({
      displayName: technicianName.trim(),
      licenseNumber: technicianLicenseNumber.trim(),
      signatureBase64: currentSignature,
      reviewerName: reviewerName.trim(),
      reviewerLicenseNumber: reviewerLicenseNumber.trim(),
      reviewerSignatureBase64: reviewerSignature,
    })
      .catch((error) => {
        console.error('❌ Error saving settings:', error)
      })

    alert('Ustawienia zapisane!')
  }

  return (
    <MainLayout title="Ustawienia" showBackBtn={true}>
      <div className="p-4 space-y-4">
        {/* Sekcja: Wykonujący pomiary */}
        <Card>
          <h2 className="text-lg font-bold text-slate-100 mb-4">
            Dane wykonującego pomiary
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Te dane będą automatycznie wypełniane przy tworzeniu nowych
            pomiarów.
          </p>

          <div className="space-y-4">
            <Input
              label="Imię i Nazwisko"
              type="text"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              placeholder="np. Jan Kowalski"
            />
            <Input
              label="Nr uprawnień"
              type="text"
              value={technicianLicenseNumber}
              onChange={(e) => setTechnicianLicenseNumber(e.target.value)}
              placeholder="np. E-123/2026"
            />
          </div>

          <div className="mt-4">
            <SignaturePanel
              onSave={handleSaveSignature}
              initialSignature={currentSignature}
            />
            {!currentSignature && (
              <p className="text-xs text-slate-400 mt-2">
                Podpis jest wymagany do generowania PDF
              </p>
            )}
          </div>
        </Card>

        {/* Sekcja: Sprawdzający */}
        <Card>
          <h2 className="text-lg font-bold text-slate-100 mb-4">
            Dane sprawdzającego
          </h2>

          <div className="space-y-4">
            <Input
              label="Imię i Nazwisko"
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="np. Anna Nowak"
            />
            <Input
              label="Nr uprawnień"
              type="text"
              value={reviewerLicenseNumber}
              onChange={(e) => setReviewerLicenseNumber(e.target.value)}
              placeholder="np. E-456/2026"
            />
          </div>

          <div className="mt-4">
            <SignaturePanel
              onSave={handleSaveReviewerSignature}
              initialSignature={reviewerSignature}
            />
          </div>
        </Card>

        {/* Przycisk zapisu */}
        <div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSave}
            icon={<Save size={20} />}
          >
            Zapisz ustawienia
          </Button>
        </div>
      </div>
    </MainLayout>
  )
}
