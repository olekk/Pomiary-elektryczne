import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Save } from 'lucide-react'
import { NumericKeypad } from './NumericKeypad'
import { MeasurementSettings } from './organisms'
import { MeasurementListItem } from './molecules'
import { Button, Card } from './atoms'
import { MainLayout } from './layout/MainLayout'
import type { ProtectionType, Amperage, Room, Inspection, Building } from '../types'
import { getFullAddress, validateMeasurementValue, generateInspectionId, generateMeasurementId, createMeasurement, renumberMeasurements, ensureDate } from '../utils'
import { useDocument, useAuth, useUserSettings } from '../hooks'
import { doc, type DocumentSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { saveInspectionToFirestore, markInspectionAsSynced } from '../services'
import { logger } from '../utils/logger'

const buildingMapper = (snap: DocumentSnapshot): Building | null => {
  if (!snap.exists()) return null
  const d = snap.data()!
  return { id: snap.id, projectId: d.projectId, name: d.name, street: d.street || d.name || '', zipCode: d.zipCode || '', city: d.city || '', createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(), updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date(), userId: d.userId || '' }
}

export const MeasurementScreen: React.FC = () => {
  const navigate = useNavigate()
  const { buildingId } = useParams<{ buildingId: string }>()
  const location = useLocation()
  const { user } = useAuth()
  const { technicianLicenseNumber } = useUserSettings(user?.uid)
  const locationState = location.state as { inspection: Inspection } | null

  const [currentInspection, setCurrentInspection] = useState<Inspection | null>(locationState?.inspection || null)
  const [inputValue, setInputValue] = useState('0')
  const [nextRoom, setNextRoom] = useState<Room>('Kuchnia')
  const [nextProtectionType, setNextProtectionType] = useState<ProtectionType>('WNP')
  const [nextAmperage, setNextAmperage] = useState<Amperage>(16)

  // Update license number when loaded
  useEffect(() => {
    if (technicianLicenseNumber && currentInspection && !currentInspection.technicianLicenseNumber) {
      setCurrentInspection(prev => prev ? { ...prev, technicianLicenseNumber } : null)
    }
  }, [technicianLicenseNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentInspection) {
      navigate(buildingId ? `/building/${buildingId}` : '/')
    }
  }, [currentInspection, navigate, buildingId])

  const buildingDocRef = useMemo(() => buildingId ? doc(db, 'buildings', buildingId) : null, [buildingId])
  const { data: currentBuilding, isLoading: isLoadingBuilding } = useDocument<Building>(buildingDocRef, buildingMapper, 'Building')

  const handleEnterMeasurement = () => {
    const validation = validateMeasurementValue(inputValue)
    if (!validation.isValid) { alert(validation.error); return }
    if (!currentInspection) return
    const m = createMeasurement(generateMeasurementId(), currentInspection.measurements.length + 1, nextRoom, nextProtectionType, nextAmperage, parseFloat(inputValue))
    setCurrentInspection({ ...currentInspection, measurements: [...currentInspection.measurements, m] })
    setInputValue('0')
  }

  const handleNoGrounding = (type: import('../types').NoGroundingType) => {
    if (!currentInspection) return
    const m = createMeasurement(generateMeasurementId(), currentInspection.measurements.length + 1, nextRoom, nextProtectionType, nextAmperage, null, type)
    setCurrentInspection({ ...currentInspection, measurements: [...currentInspection.measurements, m] })
    setInputValue('0')
  }

  const handleRemoveMeasurement = (id: string) => {
    if (!currentInspection) return
    const renumbered = renumberMeasurements(currentInspection.measurements.filter(m => m.id !== id))
    setCurrentInspection({ ...currentInspection, measurements: renumbered })
  }

  const handleSave = () => {
    if (!currentInspection || currentInspection.measurements.length === 0) { alert('Dodaj przynajmniej jeden pomiar!'); return }
    if (!buildingId) { alert('Błąd: Brak ID budynku'); return }
    const savedId = currentInspection.id || generateInspectionId()
    const inspectionToSave: Inspection = { ...currentInspection, id: savedId, date: ensureDate(currentInspection.date), synced: false }
    saveInspectionToFirestore(inspectionToSave, savedId)
      .then(async () => { await markInspectionAsSynced(savedId); logger.log(`✅ Inspection ${savedId} synced`) })
      .catch(err => logger.error(`❌ Sync failed for ${savedId}:`, err))
    navigate(`/building/${buildingId}/summary/${savedId}`, { state: { inspection: inspectionToSave, buildingId } })
  }

  if (!currentInspection) return <div className="p-4">Ładowanie...</div>
  const buildingName = currentBuilding
    ? getFullAddress(currentBuilding)
    : isLoadingBuilding
      ? 'Ładowanie…'
      : 'Nieznany budynek'

  return (
    <MainLayout title="Nowy Pomiar" showBackBtn={true} backUrl={buildingId ? `/building/${buildingId}` : '/'}>
      <div className="flex flex-col min-h-full">
        <div className="bg-slate-900 border-b border-slate-800 p-4">
          <div className="text-sm text-slate-400 mb-1">Budynek: <span className="text-slate-200 font-medium">{buildingName}</span></div>
          <h2 className="text-lg font-semibold text-slate-100">{currentInspection.address} / {currentInspection.apartmentNumber}</h2>
          <p className="text-sm text-slate-400 mt-1">Pomiary: {currentInspection.measurements.length}</p>
        </div>
        <div className="p-4 bg-slate-900 border-b border-slate-800">
          <MeasurementSettings room={nextRoom} protectionType={nextProtectionType} amperage={nextAmperage} onRoomChange={setNextRoom} onProtectionTypeChange={setNextProtectionType} onAmperageChange={setNextAmperage} />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {currentInspection.measurements.length === 0 ? (
            <div className="text-center text-slate-400 mt-8"><p>Brak pomiarów. Wprowadź pierwszy pomiar poniżej.</p></div>
          ) : (
            <div className="space-y-2">
              {currentInspection.measurements.map(m => <MeasurementListItem key={m.id} measurement={m} onDelete={handleRemoveMeasurement} />)}
            </div>
          )}
        </div>
        <div className="p-4">
          <NumericKeypad value={inputValue} onValueChange={setInputValue} onEnter={handleEnterMeasurement} onNoGrounding={handleNoGrounding} />
        </div>
        <Card className="m-4 shadow-lg" padding={false}>
          <Button variant="primary" size="lg" fullWidth onClick={handleSave} icon={<Save size={24} />}>Zapisz</Button>
        </Card>
      </div>
    </MainLayout>
  )
}
