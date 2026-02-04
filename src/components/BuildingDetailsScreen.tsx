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
import { incrementApartmentNumber } from '../utils'

const TECHNICIAN_NAME_KEY = 'technician_name'

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
    deleteInspection,
    pendingSyncCount,
    buildings,
  } = useAppStore()

  const [showNewModal, setShowNewModal] = useState(false)

  // Znajdź nazwę budynku i projectId
  const currentBuilding = buildings.find((b) => b.id === buildingId)
  const buildingName = currentBuilding?.name || 'Nieznany budynek'
  const projectId = currentBuilding?.projectId

  // Pobierz domyślne wartości
  const defaultAddress = buildingName
  const defaultTechnician = localStorage.getItem(TECHNICIAN_NAME_KEY) || ''
  
  // Sprawdź, czy przychodzi z location.state (flow "następny pomiar")
  const locationState = location.state as { lastApartmentNumber?: string } | null
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

  // Automatycznie otwórz modal jeśli przychodzi z flow "następny pomiar"
  useEffect(() => {
    if (locationState?.lastApartmentNumber) {
      setShowNewModal(true)
      // Wyczyść state po użyciu (opcjonalnie)
      window.history.replaceState({}, document.title)
    }
  }, [locationState?.lastApartmentNumber])

  const handleCreateNew = (
    address: string,
    apartmentNumber: string,
    technician: string
  ) => {
    if (!buildingId) {
      alert('Błąd: Brak ID budynku')
      return
    }
    const currentBuilding = buildings.find((b) => b.id === buildingId)
    if (!currentBuilding) {
      alert('Błąd: Nie znaleziono budynku')
      return
    }
    createNewInspection(currentBuilding.projectId, buildingId, address, apartmentNumber, technician)
    setShowNewModal(false)
    navigate(`/measurement/${buildingId}`)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć ten pomiar?')) {
      try {
        await deleteInspection(id)
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        alert('Błąd podczas usuwania: ' + errorMessage)
      }
    }
  }

  const syncedCount = inspections.filter((i) => i.synced).length

  // Jeśli brak buildingId, przekieruj do głównego ekranu
  if (!buildingId) {
    navigate('/')
    return null
  }

  return (
    <MainLayout 
      title={buildingName} 
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
        />
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowNewModal(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-5 rounded-full shadow-2xl flex items-center justify-center transition-colors"
        style={{ width: '64px', height: '64px' }}
      >
        <Plus size={32} />
      </button>

      <CreateInspectionModal
        key={`${defaultAddress}-${defaultApartmentNumber}-${defaultTechnician}`}
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreate={handleCreateNew}
        defaultAddress={defaultAddress}
        defaultApartmentNumber={defaultApartmentNumber}
        defaultTechnician={defaultTechnician}
      />
    </MainLayout>
  )
}
