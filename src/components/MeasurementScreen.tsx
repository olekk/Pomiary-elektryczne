import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save } from 'lucide-react'
import { NumericKeypad } from './NumericKeypad'
import { useAppStore } from '../store/useAppStore'
import { MeasurementSettings } from './organisms'
import { MeasurementListItem } from './molecules'
import { Button, Card } from './atoms'
import type { ProtectionType, Amperage } from '../types'
import { validateMeasurementValue } from '../utils'

export const MeasurementScreen: React.FC = () => {
  const navigate = useNavigate()

  const {
    currentInspection,
    addMeasurement,
    removeMeasurement,
    lastProtectionType,
    lastAmperage,
    lastKFactor,
    setLastDefaults,
    saveToFirestore,
  } = useAppStore()

  const [inputValue, setInputValue] = useState('0')
  const [isSaving, setIsSaving] = useState(false)

  // Settings for next measurement (Smart Defaults)
  const [nextProtectionType, setNextProtectionType] =
    useState<ProtectionType>(lastProtectionType)
  const [nextAmperage, setNextAmperage] = useState<Amperage>(lastAmperage)
  const [nextKFactor, setNextKFactor] = useState<number>(lastKFactor)

  useEffect(() => {
    if (!currentInspection) {
      navigate('/')
    }
  }, [currentInspection, navigate])

  const handleEnterMeasurement = () => {
    const validation = validateMeasurementValue(inputValue)

    if (!validation.isValid) {
      alert(validation.error)
      return
    }

    const zsValue = parseFloat(inputValue)

    // Update store defaults
    setLastDefaults(nextProtectionType, nextAmperage, nextKFactor)

    // Add measurement
    addMeasurement(zsValue)

    // Reset input
    setInputValue('0')
  }

  const handleNoGrounding = () => {
    // Update store defaults
    setLastDefaults(nextProtectionType, nextAmperage, nextKFactor)

    // Add B.UZ measurement
    addMeasurement(null, true)

    // Reset input
    setInputValue('0')
  }

  const handleSave = async () => {
    if (!currentInspection || currentInspection.measurements.length === 0) {
      alert('Dodaj przynajmniej jeden pomiar!')
      return
    }

    setIsSaving(true)

    try {
      await saveToFirestore()
      navigate('/summary')
    } catch (error: unknown) {
      console.error('Błąd zapisu:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      alert(errorMessage || 'Błąd podczas zapisywania. Spróbuj ponownie.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!currentInspection) {
    return <div className="p-4">Ładowanie...</div>
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 text-slate-100 p-4 shadow-lg">
        <h1 className="text-xl font-bold">
          {currentInspection.address} / {currentInspection.apartmentNumber}
        </h1>
        <p className="text-sm text-slate-400">
          Pomiary: {currentInspection.measurements.length}
        </p>
      </div>

      {/* Settings Panel */}
      <div className="p-4 bg-slate-900 border-b border-slate-800">
        <MeasurementSettings
          protectionType={nextProtectionType}
          amperage={nextAmperage}
          kFactor={nextKFactor}
          onProtectionTypeChange={setNextProtectionType}
          onAmperageChange={setNextAmperage}
          onKFactorChange={setNextKFactor}
        />
      </div>

      {/* Measurements List */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentInspection.measurements.length === 0 ? (
          <div className="text-center text-slate-400 mt-8">
            <p>Brak pomiarów. Wprowadź pierwszy pomiar poniżej.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentInspection.measurements.map((m) => (
              <MeasurementListItem
                key={m.id}
                measurement={m}
                onDelete={removeMeasurement}
              />
            ))}
          </div>
        )}
      </div>

      {/* Keypad */}
      <div className="p-4">
        <NumericKeypad
          value={inputValue}
          onValueChange={setInputValue}
          onEnter={handleEnterMeasurement}
          onNoGrounding={handleNoGrounding}
        />
      </div>

      {/* Save Button */}
      <Card className="m-4 shadow-lg" padding={false}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSave}
          disabled={isSaving}
          icon={<Save size={24} />}
        >
          {isSaving ? 'Zapisywanie...' : 'Zapisz i Przejdź Dalej'}
        </Button>
      </Card>
    </div>
  )
}
