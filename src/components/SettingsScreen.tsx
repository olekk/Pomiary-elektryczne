import React, { useEffect, useState } from 'react'
import { MainLayout } from './layout/MainLayout'
import { Button, Card, Input } from './atoms'
import { SignaturePanel } from './organisms'
import { Save } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export const SettingsScreen: React.FC = () => {
  const user = useAppStore((state) => state.user)
  const technicianNameFromStore = useAppStore((state) => state.technicianName)
  const technicianLicenseNumberFromStore = useAppStore(
    (state) => state.technicianLicenseNumber
  )
  const technicianSignatureFromStore = useAppStore(
    (state) => state.technicianSignature
  )
  const loadUserSettings = useAppStore((state) => state.loadUserSettings)
  const saveUserSettings = useAppStore((state) => state.saveUserSettings)

  const [technicianName, setTechnicianName] = useState(technicianNameFromStore)
  const [technicianLicenseNumber, setTechnicianLicenseNumber] = useState(
    technicianLicenseNumberFromStore
  )
  const [currentSignature, setCurrentSignature] = useState(
    technicianSignatureFromStore
  )
  const [isSaving, setIsSaving] = useState(false)

  // Każde wejście do ustawień odświeża dane użytkownika z chmury
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return

      try {
        await loadUserSettings(user.uid)
      } catch (error) {
        console.error('Error loading settings:', error)
        alert('Nie udało się pobrać ustawień z chmury')
      }
    }

    loadSettings()
  }, [user, loadUserSettings])

  useEffect(() => {
    setTechnicianName(technicianNameFromStore)
  }, [technicianNameFromStore])

  useEffect(() => {
    setTechnicianLicenseNumber(technicianLicenseNumberFromStore)
  }, [technicianLicenseNumberFromStore])

  useEffect(() => {
    setCurrentSignature(technicianSignatureFromStore)
  }, [technicianSignatureFromStore])

  const handleSaveSignature = (signature: string) => {
    setCurrentSignature(signature)
  }

  const handleSave = async () => {
    if (!user) {
      alert('Brak zalogowanego użytkownika')
      return
    }

    if (!technicianName.trim()) {
      alert('Wprowadź imię i nazwisko technika')
      return
    }

    if (!currentSignature) {
      alert('Dodaj podpis technika')
      return
    }

    setIsSaving(true)
    try {
      await saveUserSettings(user.uid, {
        displayName: technicianName.trim(),
        licenseNumber: technicianLicenseNumber.trim(),
        signatureBase64: currentSignature,
      })
      alert('Ustawienia zapisane!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Błąd podczas zapisywania ustawień')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <MainLayout title="Ustawienia" showBackBtn={true}>
      <div className="p-4">
        <Card>
          <h2 className="text-lg font-bold text-slate-100 mb-4">
            Profil Technika
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Te dane będą automatycznie wypełniane przy tworzeniu nowych
            pomiarów.
          </p>

          <div className="space-y-4">
            <Input
              label="Imię i Nazwisko Technika"
              type="text"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              placeholder="np. Jan Kowalski"
            />
            <Input
              label="Nr uprawnień technika"
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

          <div className="mt-6">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSave}
              disabled={isSaving}
              icon={<Save size={20} />}
            >
              {isSaving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  )
}
