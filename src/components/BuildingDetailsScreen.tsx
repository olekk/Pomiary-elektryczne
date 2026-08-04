import React, { useEffect, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useCollection, useDocument, useUserSettings, useAuth } from '../hooks'
import { Fab } from './atoms'
import { MainLayout } from './layout/MainLayout'
import {
  DashboardStats,
  InspectionsList,
} from './organisms'
import { incrementApartmentNumber, getFullAddress } from '../utils'
import { generateProtocolNumber, inspectionFromDoc, buildingFromSnapshot } from '../utils'
import type { Inspection, Building } from '../types'
import {
  collection,
  query,
  where,
  orderBy,
  doc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { deleteInspectionFromFirestore } from '../services'
import { logger } from '../utils/logger'

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
    useCollection<Inspection>(inspectionsQuery, inspectionFromDoc, `inspections-${buildingId || 'none'}`, 'Inspections')

  // Subscribe to building document
  const buildingDocRef = useMemo(
    () => (buildingId ? doc(db, 'buildings', buildingId) : null),
    [buildingId]
  )

  const { data: currentBuilding, isLoading: isLoadingBuilding } = useDocument<Building>(
    buildingDocRef,
    buildingFromSnapshot,
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
          logger.error('❌ Error deleting inspection:', error)
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

      <Fab onClick={() => startNewInspection()} ariaLabel="Nowy pomiar" />
    </MainLayout>
  )
}
