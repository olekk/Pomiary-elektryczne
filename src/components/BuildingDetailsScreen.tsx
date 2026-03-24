import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useCollection, useDocument, useUserSettings, useAuth } from '../hooks'
import { MainLayout } from './layout/MainLayout'
import {
  DashboardStats,
  InspectionsList,
  CreateInspectionModal,
} from './organisms'
import { incrementApartmentNumber, getFullAddress } from '../utils'
import {
  generateInspectionId,
  generateProtocolNumber,
} from '../utils'
import type { Inspection, Building, UnitType } from '../types'
import {
  collection,
  query,
  where,
  orderBy,
  doc,
  type QueryDocumentSnapshot,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'
import {
  saveInspectionToFirestore,
  markInspectionAsSynced,
  deleteInspectionFromFirestore,
} from '../services'
import { logger } from '../utils/logger'

const inspectionMapper = (doc: QueryDocumentSnapshot): Inspection => {
  const data = doc.data()
  return {
    id: doc.id,
    projectId: data.projectId,
    buildingId: data.buildingId,
    address: data.address,
    apartmentNumber: data.apartmentNumber,
    ownerName: data.ownerName || '',
    date: data.date?.toDate ? data.date.toDate() : new Date(),
    technicianName: data.technicianName || data.technician || '',
    technicianLicenseNumber: data.technicianLicenseNumber || '',
    technicianSignature: data.technicianSignature || '',
    measurements: data.measurements || [],
    notes: data.notes || '',
    ownerSignature: data.ownerSignature || data.signature || '',
    protocolNumber: data.protocolNumber,
    synced: data.synced ?? true,
    status: data.status || 'COMPLETED',
    unitType: data.unitType || 'mieszkanie',
    klatkaData: data.klatkaData || undefined,
  }
}

const buildingMapper = (snap: DocumentSnapshot): Building | null => {
  if (!snap.exists()) return null
  const data = snap.data()!
  return {
    id: snap.id,
    projectId: data.projectId,
    name: data.name,
    street: data.street || data.name || '',
    zipCode: data.zipCode || '',
    city: data.city || '',
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
    userId: data.userId || '',
  }
}

export const BuildingDetailsScreen: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: buildingId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { technicianName, technicianSignature } = useUserSettings(user?.uid)

  const [showNewModal, setShowNewModal] = useState(false)
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null)

  // Subscribe to inspections for this building
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

  const { data: inspections, isLoading: isLoadingInspections } =
    useCollection<Inspection>(inspectionsQuery, inspectionMapper, `inspections-${buildingId || 'none'}`, 'Inspections')

  // Subscribe to building document
  const buildingDocRef = useMemo(
    () => (buildingId ? doc(db, 'buildings', buildingId) : null),
    [buildingId]
  )

  const { data: currentBuilding, isLoading: isLoadingBuilding } = useDocument<Building>(
    buildingDocRef,
    buildingMapper,
    'Building'
  )

  const buildingName = currentBuilding
    ? getFullAddress(currentBuilding)
    : isLoadingBuilding
      ? 'Ładowanie…'
      : 'Nieznany budynek'
  const projectId = currentBuilding?.projectId

  // Pobierz domyślne wartości
  const defaultAddress = buildingName
  const defaultStreet = currentBuilding?.street || ''

  // Sprawdź, czy przychodzi z location.state (flow "następny pomiar")
  const locationState = location.state as {
    lastApartmentNumber?: string
  } | null
  const lastApartmentNumber = locationState?.lastApartmentNumber || ''
  const defaultApartmentNumber = lastApartmentNumber
    ? incrementApartmentNumber(lastApartmentNumber)
    : ''

  // Automatycznie otwórz modal jeśli przychodzi z flow "następny pomiar"
  useEffect(() => {
    if (locationState?.lastApartmentNumber) {
      setShowNewModal(true)
      window.history.replaceState({}, document.title)
    }
  }, [locationState?.lastApartmentNumber])

  const validateTechnician = (): boolean => {
    if (!technicianName.trim()) {
      alert('Uzupełnij imię i nazwisko technika w Ustawieniach')
      return false
    }
    if (!technicianSignature) {
      alert('Dodaj podpis technika w Ustawieniach')
      return false
    }
    return true
  }

  const handleCreateNew = (
    address: string,
    apartmentNumber: string,
    ownerName: string,
    street?: string,
    unitType?: UnitType
  ) => {
    if (!buildingId || !currentBuilding || !validateTechnician()) return

    const { technicianName: tName, technicianSignature: tSig } = { technicianName, technicianSignature }

    const date = new Date()
    const buildingStreet = street || address
    const protocolNumber = generateProtocolNumber(date, apartmentNumber, buildingStreet)

    // Build inspection object locally (ephemeral, not saved yet)
    const newInspection: Inspection = {
      projectId: currentBuilding.projectId,
      buildingId,
      address,
      apartmentNumber,
      ownerName,
      technicianName: tName,
      technicianLicenseNumber: '', // will be loaded from useUserSettings in MeasurementScreen
      technicianSignature: tSig,
      date,
      protocolNumber,
      notes: '',
      measurements: [],
      synced: false,
      status: 'COMPLETED',
      unitType: unitType || 'mieszkanie',
    }

    setShowNewModal(false)
    navigate(`/building/${buildingId}/measurement`, {
      state: { inspection: newInspection },
    })
  }

  const handleMarkInaccessible = (
    address: string,
    apartmentNumber: string,
    ownerName: string,
    street?: string,
    unitType?: UnitType
  ) => {
    if (!buildingId || !currentBuilding || !validateTechnician()) return

    const date = new Date()
    const buildingStreet = street || address
    const protocolNumber = generateProtocolNumber(date, apartmentNumber, buildingStreet)
    const savedId = generateInspectionId()

    const inaccessibleInspection: Inspection = {
      id: savedId,
      projectId: currentBuilding.projectId,
      buildingId,
      address,
      apartmentNumber,
      ownerName,
      technicianName,
      technicianLicenseNumber: '',
      technicianSignature,
      date,
      protocolNumber,
      notes: '',
      measurements: [],
      synced: false,
      status: 'INACCESSIBLE',
      unitType: unitType || 'mieszkanie',
    }

    // Save directly to Firestore — onSnapshot will update the list
    saveInspectionToFirestore(inaccessibleInspection, savedId)
      .then(async () => {
        await markInspectionAsSynced(savedId)
        logger.log(`✅ Inaccessible inspection ${savedId} synced`)
      })
      .catch((error) => {
        logger.error(`❌ Sync failed for inaccessible inspection ${savedId}:`, error)
      })

    setShowNewModal(false)
  }

  const handleResumeInspection = (
    inspection: Inspection,
    address: string,
    apartmentNumber: string,
    ownerName: string,
    street?: string,
    unitType?: UnitType
  ) => {
    if (!buildingId) return

    const shouldRegenerateProtocol = street && inspection.protocolNumber
    let protocolNumber = inspection.protocolNumber

    if (shouldRegenerateProtocol) {
      const buildingStreet = street || address
      protocolNumber = generateProtocolNumber(
        inspection.date,
        apartmentNumber,
        buildingStreet
      )
    }

    const resumedInspection: Inspection = {
      ...inspection,
      address,
      protocolNumber,
      apartmentNumber,
      ownerName,
      status: 'COMPLETED',
      unitType: unitType || inspection.unitType || 'mieszkanie',
    }

    setEditingInspection(null)
    setShowNewModal(false)
    navigate(`/building/${buildingId}/measurement`, {
      state: { inspection: resumedInspection },
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć ten pomiar?')) {
      deleteInspectionFromFirestore(id)
        .catch((error: unknown) => {
          console.error('❌ Error deleting inspection:', error)
        })
    }
  }

  const handleInspectionClick = (inspection: Inspection) => {
    if (inspection.status === 'INACCESSIBLE') {
      setEditingInspection(inspection)
      setShowNewModal(true)
    } else {
      navigate(`/building/${buildingId}/summary/${inspection.id}`, {
        state: {
          inspection,
          buildingId,
        },
      })
    }
  }

  const handleCloseModal = () => {
    setShowNewModal(false)
    setEditingInspection(null)
  }

  const syncedCount = inspections.filter((i) => i.synced).length
  const pendingSyncCount = inspections.filter((i) => !i.synced).length

  if (!buildingId) {
    navigate('/')
    return null
  }

  return (
    <MainLayout
      title={'Budynek: ' + buildingName}
      showBackBtn={true}
      backUrl={projectId ? `/project/${projectId}` : '/'}
    >
      <div className="p-4">
        <DashboardStats
          totalCount={inspections.length}
          syncedCount={syncedCount}
          pendingCount={pendingSyncCount}
        />
      </div>

      <div className="p-4">
        <InspectionsList
          inspections={inspections}
          isLoading={isLoadingInspections}
          onDelete={handleDelete}
          onClick={handleInspectionClick}
        />
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => {
          setEditingInspection(null)
          setShowNewModal(true)
        }}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-5 rounded-full shadow-2xl flex items-center justify-center transition-colors"
        style={{ width: '64px', height: '64px' }}
      >
        <Plus size={32} />
      </button>

      <CreateInspectionModal
        key={editingInspection?.id || `${defaultAddress}-${defaultApartmentNumber}`}
        isOpen={showNewModal}
        onClose={handleCloseModal}
        onCreate={handleCreateNew}
        onMarkInaccessible={handleMarkInaccessible}
        onResumeInspection={handleResumeInspection}
        defaultAddress={defaultAddress}
        defaultStreet={defaultStreet}
        defaultApartmentNumber={defaultApartmentNumber}
        editingInspection={editingInspection}
        existingInspections={inspections}
      />
    </MainLayout>
  )
}
