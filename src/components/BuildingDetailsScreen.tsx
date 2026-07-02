import React, { useEffect, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useCollection, useDocument, useUserSettings, useAuth } from '../hooks'
import { MainLayout } from './layout/MainLayout'
import {
  DashboardStats,
  InspectionsList,
} from './organisms'
import { incrementApartmentNumber, getFullAddress } from '../utils'
import { generateProtocolNumber } from '../utils'
import type { Inspection, Building } from '../types'
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
import { deleteInspectionFromFirestore } from '../services'

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
    reviewerName: data.reviewerName || '',
    reviewerLicenseNumber: data.reviewerLicenseNumber || '',
    reviewerSignature: data.reviewerSignature || '',
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
  const { technicianName, technicianSignature, reviewerName, reviewerLicenseNumber, reviewerSignature } = useUserSettings(user?.uid)

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

  const { data: inspections, isLoading: isLoadingInspections, fromCache: inspectionsFromCache } =
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

  // Domyślny adres nowego pomiaru = pełny adres budynku
  const defaultAddress = buildingName

  // Flow "następny pomiar" — SummaryScreen przekazuje numer ostatniego mieszkania
  const locationState = location.state as {
    lastApartmentNumber?: string
  } | null

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

  // Build an ephemeral inspection (not saved yet) and open MeasurementScreen, where the
  // identity fields (adres / typ lokalu / numer / właściciel) are now edited inline.
  const startNewInspection = (prefillApartment = '') => {
    if (!buildingId || !currentBuilding || !validateTechnician()) return

    const date = new Date()
    const buildingStreet = currentBuilding.street || defaultAddress

    const newInspection: Inspection = {
      projectId: currentBuilding.projectId,
      buildingId,
      address: defaultAddress,
      apartmentNumber: prefillApartment,
      ownerName: '',
      technicianName,
      technicianLicenseNumber: '', // will be loaded from useUserSettings in MeasurementScreen
      technicianSignature,
      reviewerName,
      reviewerLicenseNumber,
      reviewerSignature,
      date,
      protocolNumber: generateProtocolNumber(date, prefillApartment, buildingStreet),
      notes: '',
      measurements: [],
      synced: false,
      status: 'COMPLETED',
      unitType: 'mieszkanie',
    }

    navigate(`/building/${buildingId}/measurement`, {
      state: { inspection: newInspection },
    })
  }

  // Flow "następny pomiar": SummaryScreen wraca tu z numerem ostatniego mieszkania —
  // od razu otwieramy MeasurementScreen z podbitym numerem (bez modala).
  useEffect(() => {
    if (locationState?.lastApartmentNumber && currentBuilding) {
      const nextApartment = incrementApartmentNumber(locationState.lastApartmentNumber)
      window.history.replaceState({}, document.title)
      startNewInspection(nextApartment)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationState?.lastApartmentNumber, currentBuilding])

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
      // Resume an inaccessible unit — its fields are now edited inline on MeasurementScreen
      navigate(`/building/${buildingId}/measurement`, {
        state: { inspection },
      })
    } else {
      navigate(`/building/${buildingId}/summary/${inspection.id}`, {
        state: {
          inspection,
          buildingId,
        },
      })
    }
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
          fromCache={inspectionsFromCache}
          onDelete={handleDelete}
          onClick={handleInspectionClick}
        />
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => startNewInspection()}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-5 rounded-full shadow-2xl flex items-center justify-center transition-colors"
        style={{ width: '64px', height: '64px' }}
      >
        <Plus size={32} />
      </button>
    </MainLayout>
  )
}
