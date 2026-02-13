import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { MainLayout } from './layout/MainLayout'
import {
  DashboardStats,
  InspectionsList,
  CreateInspectionModal,
} from './organisms'
import { incrementApartmentNumber, getFullAddress } from '../utils'
import type { Inspection } from '../types'

export const BuildingDetailsScreen: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: buildingId } = useParams<{ id: string }>()
  const {
    inspections,
    isLoadingInspections,
    subscribeToInspections,
    unsubscribeFromInspections,
    createNewInspection,
    saveInaccessibleInspection,
    resumeInaccessibleInspection,
    deleteInspection,
    pendingSyncCount,
    buildings,
    fetchBuildingById,
    technicianName,
    technicianSignature,
  } = useAppStore()

  const [showNewModal, setShowNewModal] = useState(false)
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null)

  // Znajdź nazwę budynku i projectId
  const currentBuilding = buildings.find((b) => b.id === buildingId)
  const buildingName = currentBuilding ? getFullAddress(currentBuilding) : 'Nieznany budynek'
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

  // Subscribe to inspections for this building (Offline-First)
  useEffect(() => {
    if (buildingId) {
      subscribeToInspections(buildingId)
    }
    return () => {
      unsubscribeFromInspections()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId])

  // Fetch building data if not in store (e.g. on page reload)
  useEffect(() => {
    if (buildingId && !currentBuilding) {
      fetchBuildingById(buildingId)
    }
  }, [buildingId, currentBuilding, fetchBuildingById])

  // Automatycznie otwórz modal jeśli przychodzi z flow "następny pomiar"
  useEffect(() => {
    if (locationState?.lastApartmentNumber) {
      setShowNewModal(true)
      // Wyczyść state po użyciu (opcjonalnie)
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
    street?: string
  ) => {
    if (!buildingId || !validateTechnician()) return

    const building = buildings.find((b) => b.id === buildingId)
    if (!building) {
      alert('Błąd: Nie znaleziono budynku')
      return
    }

    createNewInspection(
      building.projectId,
      buildingId,
      address,
      apartmentNumber,
      ownerName,
      street
    )
    setShowNewModal(false)
    navigate(`/measurement/${buildingId}`)
  }

  const handleMarkInaccessible = (
    address: string,
    apartmentNumber: string,
    ownerName: string,
    street?: string
  ) => {
    if (!buildingId || !validateTechnician()) return

    const building = buildings.find((b) => b.id === buildingId)
    if (!building) {
      alert('Błąd: Nie znaleziono budynku')
      return
    }

    // saveInaccessibleInspection już aktualizuje store natychmiast i synchronizuje w tle
    saveInaccessibleInspection(
      building.projectId,
      buildingId,
      address,
      apartmentNumber,
      ownerName,
      street
    )
      .catch((error) => {
        console.error('❌ Error saving inaccessible inspection:', error)
        // Store już zaktualizowany, sync nastąpi później
      })
    
    // Modal zamyka się NATYCHMIAST
    setShowNewModal(false)
  }

  const handleResumeInspection = (
    inspection: Inspection,
    address: string,
    apartmentNumber: string,
    ownerName: string,
    street?: string
  ) => {
    if (!buildingId) return

    resumeInaccessibleInspection(inspection, address, apartmentNumber, ownerName, street)
    setEditingInspection(null)
    setShowNewModal(false)
    navigate(`/measurement/${buildingId}`)
  }

  const handleDelete = (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć ten pomiar?')) {
      // deleteInspection już usuwa z listy natychmiast i synchronizuje w tle
      deleteInspection(id)
        .catch((error: unknown) => {
          console.error('❌ Error deleting inspection:', error)
          // Element już usunięty z UI, sync nastąpi w tle
        })
    }
  }

  const handleInspectionClick = (inspection: Inspection) => {
    if (inspection.status === 'INACCESSIBLE') {
      // Otwórz modal z wypełnionymi danymi do wznowienia
      setEditingInspection(inspection)
      setShowNewModal(true)
    } else {
      navigate(`/summary/${inspection.id}`, {
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

  // Jeśli brak buildingId, przekieruj do głównego ekranu
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
