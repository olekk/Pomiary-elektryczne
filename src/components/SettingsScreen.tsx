import React, { useEffect, useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { MainLayout } from './layout/MainLayout'
import { Button, Card, Input } from './atoms'
import { Eraser, Save } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export const SettingsScreen: React.FC = () => {
  const user = useAppStore((state) => state.user)
  const technicianNameFromStore = useAppStore((state) => state.technicianName)
  const technicianSignatureFromStore = useAppStore(
    (state) => state.technicianSignature
  )
  const loadUserSettings = useAppStore((state) => state.loadUserSettings)
  const saveUserSettings = useAppStore((state) => state.saveUserSettings)

  const signatureRef = useRef<SignatureCanvas>(null)
  const [technicianName, setTechnicianName] = useState(technicianNameFromStore)
  const [hasSignature, setHasSignature] = useState(
    Boolean(technicianSignatureFromStore)
  )
  const [loadedSignature, setLoadedSignature] = useState(
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
    setLoadedSignature(technicianSignatureFromStore)
    setHasSignature(Boolean(technicianSignatureFromStore))
  }, [technicianSignatureFromStore])

  useEffect(() => {
    if (!loadedSignature || !signatureRef.current) return

    try {
      signatureRef.current.fromDataURL(loadedSignature)
    } catch (error) {
      console.error('Error loading signature to canvas:', error)
    }
  }, [loadedSignature])

  const handleClearSignature = () => {
    signatureRef.current?.clear()
    setHasSignature(false)
    setLoadedSignature('')
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

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      alert('Dodaj podpis technika')
      return
    }

    const signatureBase64 = signatureRef.current.toDataURL('image/png')

    setIsSaving(true)
    try {
      await saveUserSettings(user.uid, {
        displayName: technicianName.trim(),
        signatureBase64,
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

            <div>
              <label className="block text-sm font-medium text-slate-100 mb-2">
                Podpis Technika
              </label>
              <div className="border-2 border-slate-700 rounded-lg overflow-hidden shadow-lg">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: 'w-full h-48 bg-white cursor-crosshair',
                  }}
                  onEnd={() => setHasSignature(true)}
                />
              </div>
              <div className="mt-2">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleClearSignature}
                  icon={<Eraser size={18} />}
                >
                  Wyczyść
                </Button>
              </div>
              {!hasSignature && (
                <p className="text-xs text-slate-400 mt-2">
                  Podpis jest wymagany do generowania PDF
                </p>
              )}
            </div>
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
