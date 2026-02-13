import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { NumericKeypad } from './NumericKeypad'
import { useAppStore } from '../store/useAppStore'
import { MeasurementSettings } from './organisms'
import { MeasurementListItem } from './molecules'
import { Button, Card } from './atoms'
import { MainLayout } from './layout/MainLayout'
import type { ProtectionType, Amperage, Room } from '../types'
import { getFullAddress } from '../utils/addressHelper'
import { validateMeasurementValue } from '../utils'

export const MeasurementScreen: React.FC = () => {
  const navigate = useNavigate()
  const { id: buildingId } = useParams<{ id: string }>()

  const {
    currentInspection,
    addMeasurement,
    removeMeasurement,
    saveToFirestore,
    buildings,
    fetchBuildingById,
  } = useAppStore()

  const [inputValue, setInputValue] = useState('0')

  // Settings for next measurement
  const [nextRoom, setNextRoom] = useState<Room>('Kuchnia')
  const [nextProtectionType, setNextProtectionType] =
    useState<ProtectionType>('WNP')
  const [nextAmperage, setNextAmperage] = useState<Amperage>(16)

  useEffect(() => {
    if (!currentInspection) {
      // Jeśli brak currentInspection, wróć do listy budynków
      if (buildingId) {
        navigate(`/building/${buildingId}`)
      } else {
        navigate('/')
      }
    }
  }, [currentInspection, navigate, buildingId])

  // Fetch building data if not in store (e.g. on page reload)
  useEffect(() => {
    if (buildingId && !buildings.find((b) => b.id === buildingId)) {
      fetchBuildingById(buildingId)
    }
  }, [buildingId, buildings, fetchBuildingById])

  const handleEnterMeasurement = () => {
    const validation = validateMeasurementValue(inputValue)

    if (!validation.isValid) {
      alert(validation.error)
      return
    }

    const zsValue = parseFloat(inputValue)

    // Add measurement
    addMeasurement(nextRoom, nextProtectionType, nextAmperage, zsValue)

    // Reset input
    setInputValue('0')
  }

  const handleNoGrounding = (type: import('../types').NoGroundingType) => {
    // Add B.UZ measurement with specific type
    addMeasurement(nextRoom, nextProtectionType, nextAmperage, null, type)

    // Reset input
    setInputValue('0')
  }

  const handleSave = () => {
    // KROK 1: Validate data
    if (!currentInspection || currentInspection.measurements.length === 0) {
      alert('Dodaj przynajmniej jeden pomiar!')
      return
    }

    if (!buildingId) {
      alert('Błąd: Brak ID budynku')
      return
    }

    // KROK 2 & 3: Optimistic Update + Background Sync
    // saveToFirestore już aktualizuje Zustand natychmiast i synchronizuje w tle
    saveToFirestore()
      .catch((error: unknown) => {
        console.error('❌ Błąd zapisu:', error)
        // Dane już są zaktualizowane w Zustand, sync nastąpi później
      })

    // Read ID from store's latest state (synchronously updated by saveToFirestore)
    const savedInspectionId = useAppStore.getState().currentInspection?.id || ''
    navigate(`/summary/${savedInspectionId}`)
  }

  if (!currentInspection) {
    return <div className="p-4">Ładowanie...</div>
  }

  // Znajdź nazwę budynku
  const currentBuilding = buildings.find((b) => b.id === buildingId)
  const buildingName = currentBuilding ? getFullAddress(currentBuilding) : 'Nieznany budynek'

  return (
    <MainLayout
      title="Nowy Pomiar"
      showBackBtn={true}
      backUrl={buildingId ? `/building/${buildingId}` : '/'}
    >
      <div className="flex flex-col min-h-full">
        {/* Building Info Header */}
        <div className="bg-slate-900 border-b border-slate-800 p-4">
          <div className="text-sm text-slate-400 mb-1">
            Budynek: <span className="text-slate-200 font-medium">{buildingName}</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-100">
            {currentInspection.address} / {currentInspection.apartmentNumber}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Pomiary: {currentInspection.measurements.length}
          </p>
        </div>

        {/* Settings Panel */}
        <div className="p-4 bg-slate-900 border-b border-slate-800">
          <MeasurementSettings
            room={nextRoom}
            protectionType={nextProtectionType}
            amperage={nextAmperage}
            onRoomChange={setNextRoom}
            onProtectionTypeChange={setNextProtectionType}
            onAmperageChange={setNextAmperage}
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
            icon={<Save size={24} />}
          >
            Zapisz
          </Button>
        </Card>
      </div>
    </MainLayout>
  )
}
