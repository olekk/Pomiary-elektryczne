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
    technicianName,
    technicianSignature,
  } = useAppStore()

  const [showNewModal, setShowNewModal] = useState(false)
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null)

  // Znajdź nazwę budynku i projectId
  const currentBuilding = buildings.find((b) => b.id === buildingId)
  const buildingName = currentBuilding?.name || 'Nieznany budynek'
  const projectId = currentBuilding?.projectId

  // Pobierz domyślne wartości
  const defaultAddress = buildingName

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
    ownerName: string
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
      ownerName
    )
    setShowNewModal(false)
    navigate(`/measurement/${buildingId}`)
  }

  const handleMarkInaccessible = async (
    address: string,
    apartmentNumber: string,
    ownerName: string
  ) => {
    if (!buildingId || !validateTechnician()) return

    const building = buildings.find((b) => b.id === buildingId)
    if (!building) {
      alert('Błąd: Nie znaleziono budynku')
      return
    }

    await saveInaccessibleInspection(
      building.projectId,
      buildingId,
      address,
      apartmentNumber,
      ownerName
    )
    setShowNewModal(false)
  }

  const handleResumeInspection = (
    inspection: Inspection,
    address: string,
    apartmentNumber: string,
    ownerName: string
  ) => {
    if (!buildingId) return

    resumeInaccessibleInspection(inspection, address, apartmentNumber, ownerName)
    setEditingInspection(null)
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

  const handleInspectionClick = (inspection: Inspection) => {
    if (inspection.status === 'INACCESSIBLE') {
      // Otwórz modal z wypełnionymi danymi do wznowienia
      setEditingInspection(inspection)
      setShowNewModal(true)
    } else {
      navigate('/summary', {
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
        defaultApartmentNumber={defaultApartmentNumber}
        editingInspection={editingInspection}
        existingInspections={inspections}
      />
    </MainLayout>
  )
}
