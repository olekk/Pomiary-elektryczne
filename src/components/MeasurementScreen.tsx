import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  useNavigate,
  useParams,
  useLocation,
  useNavigationType,
} from 'react-router-dom'
import { Save } from 'lucide-react'
import { NumericKeypad } from './NumericKeypad'
import {
  MeasurementSettings,
  NotesSection,
  KlatkaInspectionForm,
} from './organisms'
import { MeasurementListItem } from './molecules'
import { Button, Card, Input, Select } from './atoms'
import { MainLayout } from './layout/MainLayout'
import type {
  ProtectionType,
  Amperage,
  Room,
  SocketType,
  Inspection,
  Building,
  KlatkaData,
  UnitType,
} from '../types'
import {
  getFullAddress,
  validateMeasurementValue,
  generateInspectionId,
  generateMeasurementId,
  createMeasurement,
  renumberMeasurements,
  generateProtocolNumber,
  inspectionFromDoc,
  buildingFromSnapshot,
} from '../utils'
import { useCollection, useDocument, useAuth, useUserSettings } from '../hooks'
import { collection, doc, query, where, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { saveInspectionToFirestore, markInspectionAsSynced } from '../services'
import { logger } from '../utils/logger'

const SESSION_KEY_PREFIX = 'draft-inspection:'

function saveDraftToSession(buildingId: string, inspection: Inspection) {
  try {
    sessionStorage.setItem(
      SESSION_KEY_PREFIX + buildingId,
      JSON.stringify({
        ...inspection,
        date:
          inspection.date instanceof Date
            ? inspection.date.toISOString()
            : inspection.date,
      })
    )
  } catch {
    /* quota exceeded — ignore */
  }
}

function loadDraftFromSession(buildingId: string): Inspection | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_PREFIX + buildingId)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return { ...parsed, date: new Date(parsed.date) }
  } catch {
    return null
  }
}

function clearDraftFromSession(buildingId: string) {
  sessionStorage.removeItem(SESSION_KEY_PREFIX + buildingId)
}

export const MeasurementScreen: React.FC = () => {
  const navigate = useNavigate()
  const { buildingId } = useParams<{ buildingId: string }>()
  const location = useLocation()
  const navigationType = useNavigationType()
  const { user } = useAuth()
  const {
    technicianLicenseNumber,
    reviewerName,
    reviewerLicenseNumber,
    reviewerSignature,
  } = useUserSettings(user?.uid)
  const locationState = location.state as { inspection: Inspection } | null

  // POP = browser Back/Forward → prefer sessionStorage draft (up-to-date)
  // PUSH/REPLACE = programmatic navigation → prefer location.state (fresh data)
  const [currentInspection, setCurrentInspection] = useState<Inspection | null>(
    () => {
      if (navigationType === 'POP' && buildingId) {
        const draft = loadDraftFromSession(buildingId)
        if (draft) return draft
      }
      if (locationState?.inspection) return locationState.inspection
      if (buildingId) return loadDraftFromSession(buildingId)
      return null
    }
  )

  // Persist every change to sessionStorage so it survives navigation
  const updateInspection = useCallback(
    (updater: (prev: Inspection | null) => Inspection | null) => {
      setCurrentInspection((prev) => {
        const next = updater(prev)
        if (next && buildingId) saveDraftToSession(buildingId, next)
        return next
      })
    },
    [buildingId]
  )
  const [inputValue, setInputValue] = useState('0')
  const [nextRoom, setNextRoom] = useState<Room>(() =>
    locationState?.inspection?.unitType === 'lokal' ? 'Inne' : 'Łazienka'
  )
  const [nextProtectionType, setNextProtectionType] =
    useState<ProtectionType>('WNP')
  const [nextAmperage, setNextAmperage] = useState<Amperage>(16)
  const [nextSocketType, setNextSocketType] = useState<SocketType>(() =>
    locationState?.inspection?.unitType === 'lokal'
      ? 'Gniazdo 230V'
      : 'Gniazdo IP44'
  )

  const handleRoomChange = useCallback((room: Room) => {
    setNextRoom(room)
    if (room === 'Łazienka') setNextSocketType('Gniazdo IP44')
    else if (room === 'Kuchnia') setNextSocketType('Gniazdo 230V')
  }, [])
  const [notes, setNotes] = useState(currentInspection?.notes || '')

  const isKlatka = currentInspection?.unitType === 'klatka'
  const [klatkaData, setKlatkaData] = useState<KlatkaData>(
    currentInspection?.klatkaData || {
      przylacze: 'napowietrzne',
      pwpStatus: 'jest',
    }
  )

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value)
      updateInspection((prev) => (prev ? { ...prev, notes: value } : null))
    },
    [updateInspection]
  )

  // Update license number and reviewer data when loaded.
  // Snapshots async-loaded settings into the draft (and sessionStorage) exactly
  // once — a sync-from-external-source pattern the set-state-in-effect rule
  // can't distinguish from a render loop.
  useEffect(() => {
    if (
      technicianLicenseNumber &&
      currentInspection &&
      !currentInspection.technicianLicenseNumber
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      updateInspection((prev) =>
        prev ? { ...prev, technicianLicenseNumber } : null
      )
    }
  }, [technicianLicenseNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentInspection) {
      const updates: Partial<Inspection> = {}
      if (reviewerName && !currentInspection.reviewerName)
        updates.reviewerName = reviewerName
      if (reviewerLicenseNumber && !currentInspection.reviewerLicenseNumber)
        updates.reviewerLicenseNumber = reviewerLicenseNumber
      if (reviewerSignature && !currentInspection.reviewerSignature)
        updates.reviewerSignature = reviewerSignature
      if (Object.keys(updates).length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        updateInspection((prev) => (prev ? { ...prev, ...updates } : null))
      }
    }
  }, [reviewerName, reviewerLicenseNumber, reviewerSignature]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentInspection) {
      navigate(buildingId ? `/building/${buildingId}` : '/')
    }
  }, [currentInspection, navigate, buildingId])

  const buildingDocRef = useMemo(
    () => (buildingId ? doc(db, 'buildings', buildingId) : null),
    [buildingId]
  )
  const { data: currentBuilding, isLoading: isLoadingBuilding } =
    useDocument<Building>(buildingDocRef, buildingFromSnapshot, 'Building')

  // Subscribe to sibling inspections for duplicate detection + automatic klatka numbering
  const inspectionsQuery = useMemo(
    () =>
      buildingId
        ? query(
            collection(db, 'inspections'),
            where('buildingId', '==', buildingId),
            orderBy('createdAt', 'desc')
          )
        : null,
    [buildingId]
  )
  const { data: existingInspections } = useCollection<Inspection>(
    inspectionsQuery,
    inspectionFromDoc,
    `inspections-${buildingId || 'none'}`,
    'Inspections'
  )

  // Resume mode = editing a unit that already exists (came in with an id, e.g. an inaccessible one)
  const [isResumeMode] = useState(() => !!currentInspection?.id)

  const setField = useCallback(
    (patch: Partial<Inspection>) => {
      updateInspection((prev) => (prev ? { ...prev, ...patch } : null))
    },
    [updateInspection]
  )

  const currentId = currentInspection?.id

  // Automatic klatka number (klatka, klatka 2, …) — excludes the unit being edited
  const autoKlatkaNumber = useMemo(() => {
    const existingKlatki = existingInspections.filter(
      (i) => i.unitType === 'klatka' && i.id !== currentId
    )
    return existingKlatki.length === 0
      ? 'klatka'
      : `klatka ${existingKlatki.length + 1}`
  }, [existingInspections, currentId])

  // Effective number — auto for klatka, typed for the rest
  const effectiveApartmentNumber = isKlatka
    ? autoKlatkaNumber
    : currentInspection?.apartmentNumber || ''

  const isDuplicateApartment = useMemo(() => {
    const trimmed = effectiveApartmentNumber.trim().toLowerCase()
    if (!trimmed) return false
    return existingInspections.some((insp) => {
      if (currentId && insp.id === currentId) return false
      return insp.apartmentNumber.trim().toLowerCase() === trimmed
    })
  }, [effectiveApartmentNumber, existingInspections, currentId])

  const buildingStreet =
    currentBuilding?.street || currentInspection?.address || ''
  const numberLabel =
    currentInspection?.unitType === 'lokal'
      ? 'Numer lokalu'
      : 'Numer mieszkania'

  const handleEnterMeasurement = () => {
    const validation = validateMeasurementValue(inputValue)
    if (!validation.isValid) {
      alert(validation.error)
      return
    }
    if (!currentInspection) return
    const m = createMeasurement(
      generateMeasurementId(),
      currentInspection.measurements.length + 1,
      nextRoom,
      nextProtectionType,
      nextAmperage,
      parseFloat(inputValue),
      undefined,
      nextSocketType
    )
    updateInspection(() => ({
      ...currentInspection,
      measurements: [...currentInspection.measurements, m],
    }))
    setInputValue('0')
  }

  const handleNoGrounding = (type: import('../types').NoGroundingType) => {
    if (!currentInspection) return
    const m = createMeasurement(
      generateMeasurementId(),
      currentInspection.measurements.length + 1,
      nextRoom,
      nextProtectionType,
      nextAmperage,
      null,
      type,
      nextSocketType
    )
    updateInspection(() => ({
      ...currentInspection,
      measurements: [...currentInspection.measurements, m],
    }))
    setInputValue('0')
  }

  const handleRemoveMeasurement = (id: string) => {
    if (!currentInspection) return
    const renumbered = renumberMeasurements(
      currentInspection.measurements.filter((m) => m.id !== id)
    )
    updateInspection(() => ({ ...currentInspection, measurements: renumbered }))
  }

  // Shared validation for the identity fields edited at the top of the screen
  const validateFields = (requireOwner: boolean): boolean => {
    if (!currentInspection) return false
    if (!currentInspection.address.trim()) {
      alert('Wypełnij adres!')
      return false
    }
    if (!isKlatka && !currentInspection.apartmentNumber.trim()) {
      alert(
        currentInspection.unitType === 'lokal'
          ? 'Wypełnij numer lokalu!'
          : 'Wypełnij numer mieszkania!'
      )
      return false
    }
    if (
      requireOwner &&
      !isKlatka &&
      !(currentInspection.ownerName || '').trim()
    ) {
      alert('Wypełnij wszystkie pola!')
      return false
    }
    if (isDuplicateApartment) return false
    return true
  }

  const handleSave = () => {
    if (!currentInspection) return
    if (!validateFields(true)) return
    if (!isKlatka && currentInspection.measurements.length === 0) {
      alert('Dodaj przynajmniej jeden pomiar!')
      return
    }
    if (!buildingId) {
      alert('Błąd: Brak ID budynku')
      return
    }
    const savedId = currentInspection.id || generateInspectionId()
    const date = new Date()
    const apartmentNumber = effectiveApartmentNumber.trim()
    const inspectionToSave: Inspection = {
      ...currentInspection,
      id: savedId,
      apartmentNumber,
      protocolNumber: generateProtocolNumber(
        date,
        apartmentNumber,
        buildingStreet
      ),
      notes,
      date,
      status: 'COMPLETED',
      synced: false,
      ...(isKlatka ? { klatkaData } : {}),
    }

    // Fire-and-forget: write to Firestore cache (works offline), sync when online
    saveInspectionToFirestore(inspectionToSave, savedId)
      .then(() => markInspectionAsSynced(savedId))
      .then(() => logger.log(`✅ Inspection ${savedId} synced`))
      .catch((err) => logger.error(`❌ Sync failed for ${savedId}:`, err))

    // Keep draft in sync (includes the generated id) so browser-Back restores the latest state
    saveDraftToSession(buildingId, inspectionToSave)

    // Navigate immediately — don't wait for server ACK
    navigate(`/building/${buildingId}/summary/${savedId}`, {
      state: { inspection: inspectionToSave, buildingId },
    })
  }

  const handleInaccessible = () => {
    if (!currentInspection || !buildingId) return
    if (!validateFields(false)) return
    const savedId = currentInspection.id || generateInspectionId()
    const date = new Date()
    const apartmentNumber = effectiveApartmentNumber.trim()
    const inspectionToSave: Inspection = {
      ...currentInspection,
      id: savedId,
      apartmentNumber,
      protocolNumber: generateProtocolNumber(
        date,
        apartmentNumber,
        buildingStreet
      ),
      notes,
      date,
      measurements: [],
      status: 'INACCESSIBLE',
      synced: false,
      ...(isKlatka ? { klatkaData } : {}),
    }

    // Fire-and-forget: write to Firestore cache (works offline), sync when online
    saveInspectionToFirestore(inspectionToSave, savedId)
      .then(() => markInspectionAsSynced(savedId))
      .then(() => logger.log(`✅ Inaccessible inspection ${savedId} synced`))
      .catch((err) => logger.error(`❌ Sync failed for ${savedId}:`, err))

    clearDraftFromSession(buildingId)
    navigate(`/building/${buildingId}`)
  }

  const handleCancel = () => {
    if (buildingId) clearDraftFromSession(buildingId)
    navigate(buildingId ? `/building/${buildingId}` : '/')
  }

  if (!currentInspection) return <div className="p-4">Ładowanie...</div>
  const buildingName = currentBuilding
    ? getFullAddress(currentBuilding)
    : isLoadingBuilding
      ? 'Ładowanie…'
      : 'Nieznany budynek'

  return (
    <MainLayout
      title="Nowy Pomiar"
      showBackBtn={true}
      backUrl={buildingId ? `/building/${buildingId}` : '/'}
      onBackClick={() => {
        if (buildingId) clearDraftFromSession(buildingId)
      }}
    >
      <div className="flex flex-col min-h-full">
        <div className="bg-slate-900 border-b border-slate-800 p-4 space-y-3">
          <div className="text-sm text-slate-400">
            Budynek:{' '}
            <span className="text-slate-200 font-medium">{buildingName}</span>
          </div>

          <Input
            label="Adres"
            type="text"
            value={currentInspection.address}
            onChange={(e) => setField({ address: e.target.value })}
            placeholder="np. ul. Kwiatowa 15"
          />

          <div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Typ lokalu"
                value={currentInspection.unitType}
                onChange={(e) =>
                  setField({ unitType: e.target.value as UnitType })
                }
                options={[
                  { value: 'mieszkanie', label: 'Mieszkanie' },
                  { value: 'lokal', label: 'Lokal użytkowy' },
                  { value: 'klatka', label: 'Klatka' },
                ]}
              />
              {!isKlatka && (
                <Input
                  label={numberLabel}
                  type="text"
                  value={currentInspection.apartmentNumber}
                  onChange={(e) =>
                    setField({ apartmentNumber: e.target.value })
                  }
                  placeholder="np. 42"
                />
              )}
            </div>
            {isDuplicateApartment && (
              <p className="text-red-400 text-sm mt-1">
                {isKlatka
                  ? 'Klatka o tym ID już istnieje.'
                  : currentInspection.unitType === 'lokal'
                    ? 'Lokal o tym numerze już istnieje.'
                    : 'Mieszkanie o tym numerze już istnieje.'}
              </p>
            )}
          </div>

          {!isKlatka && (
            <Input
              label="Imię i nazwisko Właściciela/Najemcy"
              type="text"
              value={currentInspection.ownerName || ''}
              onChange={(e) => setField({ ownerName: e.target.value })}
              placeholder="np. Jan Kowalski"
            />
          )}

          {!isKlatka && (
            <p className="text-sm text-slate-400">
              Pomiary: {currentInspection.measurements.length}
            </p>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleCancel}>
              Anuluj
            </Button>
            {!isResumeMode && (
              <Button
                variant="warning"
                fullWidth
                onClick={handleInaccessible}
                disabled={isDuplicateApartment}
              >
                Niedostępne
              </Button>
            )}
          </div>
        </div>
        {isKlatka ? (
          <div className="flex-1 overflow-y-auto p-4">
            <KlatkaInspectionForm value={klatkaData} onChange={setKlatkaData} />
          </div>
        ) : (
          <>
            <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3">
              <NotesSection notes={notes} onNotesChange={handleNotesChange} />
              <MeasurementSettings
                room={nextRoom}
                protectionType={nextProtectionType}
                amperage={nextAmperage}
                socketType={nextSocketType}
                onRoomChange={handleRoomChange}
                onProtectionTypeChange={setNextProtectionType}
                onAmperageChange={setNextAmperage}
                onSocketTypeChange={setNextSocketType}
              />
            </div>
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
                      onDelete={handleRemoveMeasurement}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="p-4">
              <NumericKeypad
                value={inputValue}
                onValueChange={setInputValue}
                onEnter={handleEnterMeasurement}
                onNoGrounding={handleNoGrounding}
              />
            </div>
          </>
        )}
        <Card className="m-4 shadow-lg" padding={false}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSave}
            disabled={isDuplicateApartment}
            icon={<Save size={24} />}
          >
            Zapisz
          </Button>
        </Card>
      </div>
    </MainLayout>
  )
}
