import React, { useState, useEffect } from 'react'
import { MainLayout } from './layout/MainLayout'
import { Button, Card, Input } from './atoms'
import { Save } from 'lucide-react'

const TECHNICIAN_NAME_KEY = 'technician_name'

export const SettingsScreen: React.FC = () => {
  const [technicianName, setTechnicianName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Załaduj zapisaną wartość przy montowaniu komponentu
  useEffect(() => {
    const saved = localStorage.getItem(TECHNICIAN_NAME_KEY)
    if (saved) {
      setTechnicianName(saved)
    }
  }, [])

  const handleSave = () => {
    if (!technicianName.trim()) {
      alert('Wprowadź imię i nazwisko technika')
      return
    }

    setIsSaving(true)
    try {
      localStorage.setItem(TECHNICIAN_NAME_KEY, technicianName.trim())
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
