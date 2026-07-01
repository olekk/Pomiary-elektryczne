import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Save } from 'lucide-react'
import { NumericKeypad } from './NumericKeypad'
import { MeasurementSettings, NotesSection, KlatkaInspectionForm } from './organisms'
import { MeasurementListItem } from './molecules'
import { Button, Card } from './atoms'
import { MainLayout } from './layout/MainLayout'
import type { ProtectionType, Amperage, Room, SocketType, Inspection, Building, KlatkaData } from '../types'
import { getFullAddress, validateMeasurementValue, generateInspectionId, generateMeasurementId, createMeasurement, renumberMeasurements, ensureDate } from '../utils'
import { useDocument, useAuth, useUserSettings } from '../hooks'
import { doc, type DocumentSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { saveInspectionToFirestore, markInspectionAsSynced } from '../services'
import { logger } from '../utils/logger'

const SESSION_KEY_PREFIX = 'draft-inspection:'

function saveDraftToSession(buildingId: string, inspection: Inspection) {
  try {
    sessionStorage.setItem(
      SESSION_KEY_PREFIX + buildingId,
      JSON.stringify({ ...inspection, date: inspection.date instanceof Date ? inspection.date.toISOString() : inspection.date })
    )
  } catch { /* quota exceeded — ignore */ }
}

function loadDraftFromSession(buildingId: string): Inspection | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_PREFIX + buildingId)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return { ...parsed, date: new Date(parsed.date) }
  } catch { return null }
}

function clearDraftFromSession(buildingId: string) {
  sessionStorage.removeItem(SESSION_KEY_PREFIX + buildingId)
}

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
  const { technicianLicenseNumber, reviewerName, reviewerLicenseNumber, reviewerSignature } = useUserSettings(user?.uid)
  const locationState = location.state as { inspection: Inspection } | null

  // Priority: location.state (fresh from BuildingDetailsScreen) > sessionStorage (returning from Summary)
  const [currentInspection, setCurrentInspection] = useState<Inspection | null>(() => {
    if (locationState?.inspection) return locationState.inspection
    if (buildingId) return loadDraftFromSession(buildingId)
    return null
  })

  // Persist every change to sessionStorage so it survives navigation
  const updateInspection = useCallback((updater: (prev: Inspection | null) => Inspection | null) => {
    setCurrentInspection(prev => {
      const next = updater(prev)
      if (next && buildingId) saveDraftToSession(buildingId, next)
      return next
    })
  }, [buildingId])
  const [inputValue, setInputValue] = useState('0')
  const [nextRoom, setNextRoom] = useState<Room>(() =>
    locationState?.inspection?.unitType === 'lokal' ? 'Inne' : 'Łazienka'
  )
  const [nextProtectionType, setNextProtectionType] = useState<ProtectionType>('WNP')
  const [nextAmperage, setNextAmperage] = useState<Amperage>(16)
  const [nextSocketType, setNextSocketType] = useState<SocketType>(() =>
    locationState?.inspection?.unitType === 'lokal' ? 'Gniazdo 230V' : 'Gniazdo IP44'
  )

  const handleRoomChange = useCallback((room: Room) => {
    setNextRoom(room)
    if (room === 'Łazienka') setNextSocketType('Gniazdo IP44')
    else if (room === 'Kuchnia') setNextSocketType('Gniazdo 230V')
  }, [])
  const [notes, setNotes] = useState(currentInspection?.notes || '')

  const isKlatka = currentInspection?.unitType === 'klatka'
  const [klatkaData, setKlatkaData] = useState<KlatkaData>(
    currentInspection?.klatkaData || { przylacze: 'napowietrzne', pwpStatus: 'jest' }
  )

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value)
    updateInspection(prev => prev ? { ...prev, notes: value } : null)
  }, [updateInspection])

  // Update license number and reviewer data when loaded
  useEffect(() => {
    if (technicianLicenseNumber && currentInspection && !currentInspection.technicianLicenseNumber) {
      updateInspection(prev => prev ? { ...prev, technicianLicenseNumber } : null)
    }
  }, [technicianLicenseNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentInspection) {
      const updates: Partial<Inspection> = {}
      if (reviewerName && !currentInspection.reviewerName) updates.reviewerName = reviewerName
      if (reviewerLicenseNumber && !currentInspection.reviewerLicenseNumber) updates.reviewerLicenseNumber = reviewerLicenseNumber
      if (reviewerSignature && !currentInspection.reviewerSignature) updates.reviewerSignature = reviewerSignature
      if (Object.keys(updates).length > 0) {
        updateInspection(prev => prev ? { ...prev, ...updates } : null)
      }
    }
  }, [reviewerName, reviewerLicenseNumber, reviewerSignature]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const m = createMeasurement(generateMeasurementId(), currentInspection.measurements.length + 1, nextRoom, nextProtectionType, nextAmperage, parseFloat(inputValue), undefined, nextSocketType)
    updateInspection(() => ({ ...currentInspection, measurements: [...currentInspection.measurements, m] }))
    setInputValue('0')
  }

  const handleNoGrounding = (type: import('../types').NoGroundingType) => {
    if (!currentInspection) return
    const m = createMeasurement(generateMeasurementId(), currentInspection.measurements.length + 1, nextRoom, nextProtectionType, nextAmperage, null, type, nextSocketType)
    updateInspection(() => ({ ...currentInspection, measurements: [...currentInspection.measurements, m] }))
    setInputValue('0')
  }

  const handleRemoveMeasurement = (id: string) => {
    if (!currentInspection) return
    const renumbered = renumberMeasurements(currentInspection.measurements.filter(m => m.id !== id))
    updateInspection(() => ({ ...currentInspection, measurements: renumbered }))
  }

  const handleSave = () => {
    if (!currentInspection) return
    if (!isKlatka && currentInspection.measurements.length === 0) { alert('Dodaj przynajmniej jeden pomiar!'); return }
    if (!buildingId) { alert('Błąd: Brak ID budynku'); return }
    const savedId = currentInspection.id || generateInspectionId()
    const inspectionToSave: Inspection = {
      ...currentInspection,
      id: savedId,
      notes,
      date: ensureDate(currentInspection.date),
      synced: false,
      ...(isKlatka ? { klatkaData } : {}),
    }

    // Fire-and-forget: write to Firestore cache (works offline), sync when online
    saveInspectionToFirestore(inspectionToSave, savedId)
      .then(() => markInspectionAsSynced(savedId))
      .then(() => logger.log(`✅ Inspection ${savedId} synced`))
      .catch((err) => logger.error(`❌ Sync failed for ${savedId}:`, err))

    // Navigate immediately — don't wait for server ACK
    navigate(`/building/${buildingId}/summary/${savedId}`, { state: { inspection: inspectionToSave, buildingId } })
  }

  if (!currentInspection) return <div className="p-4">Ładowanie...</div>
  const buildingName = currentBuilding
    ? getFullAddress(currentBuilding)
    : isLoadingBuilding
      ? 'Ładowanie…'
      : 'Nieznany budynek'

  return (
    <MainLayout title="Nowy Pomiar" showBackBtn={true} backUrl={buildingId ? `/building/${buildingId}` : '/'} onBackClick={() => { if (buildingId) clearDraftFromSession(buildingId) }}>
      <div className="flex flex-col min-h-full">
        <div className="bg-slate-900 border-b border-slate-800 p-4">
          <div className="text-sm text-slate-400 mb-1">Budynek: <span className="text-slate-200 font-medium">{buildingName}</span></div>
          <h2 className="text-lg font-semibold text-slate-100">{currentInspection.address} / {currentInspection.unitType === 'lokal' ? 'Lokal ' : ''}{currentInspection.apartmentNumber}</h2>
          {!isKlatka && <p className="text-sm text-slate-400 mt-1">Pomiary: {currentInspection.measurements.length}</p>}
        </div>
        {isKlatka ? (
          <div className="flex-1 overflow-y-auto p-4">
            <KlatkaInspectionForm value={klatkaData} onChange={setKlatkaData} />
          </div>
        ) : (
          <>
            <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3">
              <NotesSection notes={notes} onNotesChange={handleNotesChange} />
              <MeasurementSettings room={nextRoom} protectionType={nextProtectionType} amperage={nextAmperage} socketType={nextSocketType} onRoomChange={handleRoomChange} onProtectionTypeChange={setNextProtectionType} onAmperageChange={setNextAmperage} onSocketTypeChange={setNextSocketType} />
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
          </>
        )}
        <Card className="m-4 shadow-lg" padding={false}>
          <Button variant="primary" size="lg" fullWidth onClick={handleSave} icon={<Save size={24} />}>Zapisz</Button>
        </Card>
      </div>
    </MainLayout>
  )
}
