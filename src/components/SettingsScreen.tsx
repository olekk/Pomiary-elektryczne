import React, { useEffect, useState } from 'react'
import { MainLayout } from './layout/MainLayout'
import { Button, Card, Input } from './atoms'
import { SignaturePanel } from './organisms'
import { Save, Building2 } from 'lucide-react'
import { useAuth, useUserSettings, useCompany } from '../hooks'
import { updateCompanyName } from '../services'
import { logger } from '../utils/logger'

export const SettingsScreen: React.FC = () => {
  const { user } = useAuth()
  const { companyId, companyName, role } = useCompany()
  const {
    technicianName: nameFromHook,
    technicianLicenseNumber: licenseFromHook,
    technicianSignature: sigFromHook,
    save: saveSettings,
  } = useUserSettings(user?.uid)

  const [technicianName, setTechnicianName] = useState(nameFromHook)
  const [technicianLicenseNumber, setTechnicianLicenseNumber] = useState(licenseFromHook)
  const [currentSignature, setCurrentSignature] = useState(sigFromHook)

  // Company settings (owner only)
  const isOwnerOrAdmin = role === 'owner' || role === 'admin'
  const [editableCompanyName, setEditableCompanyName] = useState(companyName)

  // Sync local state when data loads from Firestore/localStorage
  useEffect(() => { setTechnicianName(nameFromHook) }, [nameFromHook])
  useEffect(() => { setTechnicianLicenseNumber(licenseFromHook) }, [licenseFromHook])
  useEffect(() => { setCurrentSignature(sigFromHook) }, [sigFromHook])
  useEffect(() => { setEditableCompanyName(companyName) }, [companyName])

  const handleSaveSignature = (signature: string) => {
    setCurrentSignature(signature)
  }

  const handleSave = () => {
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

    saveSettings({
      displayName: technicianName.trim(),
      licenseNumber: technicianLicenseNumber.trim(),
      signatureBase64: currentSignature,
    })
      .catch((error) => {
        console.error('❌ Error saving settings:', error)
      })

    alert('Ustawienia zapisane!')
  }

  const handleSaveCompanyName = async () => {
    if (!companyId || !editableCompanyName.trim()) {
      alert('Wprowadź nazwę firmy')
      return
    }

    try {
      await updateCompanyName(companyId, editableCompanyName.trim())
      logger.log(`✅ Company name updated to: ${editableCompanyName.trim()}`)
      alert('Nazwa firmy zaktualizowana!')
    } catch (error) {
      console.error('❌ Error updating company name:', error)
      alert('Błąd podczas zapisywania nazwy firmy')
    }
  }

  return (
    <MainLayout title="Ustawienia" showBackBtn={true}>
      <div className="p-4 space-y-4">
        {/* Company Settings — owner/admin only */}
        {isOwnerOrAdmin && companyId && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={20} className="text-blue-400" />
              <h2 className="text-lg font-bold text-slate-100">
                Ustawienia Firmy
              </h2>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Zmiana nazwy firmy nie zmieni identyfikatora firmy (ID: {companyId}).
            </p>

            <div className="space-y-4">
              <Input
                label="Nazwa firmy"
                type="text"
                value={editableCompanyName}
                onChange={(e) => setEditableCompanyName(e.target.value)}
                placeholder="np. HC INSTAL"
              />
            </div>

            <div className="mt-4">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleSaveCompanyName}
                icon={<Save size={20} />}
              >
                Zapisz nazwę firmy
              </Button>
            </div>
          </Card>
        )}

        {/* Technician Profile */}
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
              icon={<Save size={20} />}
            >
              Zapisz ustawienia
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  )
}
