import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useInspectionStore } from '../store/useInspectionStore'
import { MainLayout } from './layout/MainLayout'
import {
  DashboardStats,
  InspectionsList,
  CreateInspectionModal,
} from './organisms'

export const ProjectDetailsScreen: React.FC = () => {
  const navigate = useNavigate()
  const { id: projectId } = useParams<{ id: string }>()
  const {
    inspections,
    loadInspections,
    createNewInspection,
    deleteInspection,
    pendingSyncCount,
    projects,
  } = useInspectionStore()

  const [isLoading, setIsLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)

  // Load inspections for this project
  useEffect(() => {
    if (projectId) {
      setIsLoading(true)
      loadInspections(projectId).finally(() => setIsLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const handleCreateNew = (
    address: string,
    apartmentNumber: string,
    technician: string
  ) => {
    if (!projectId) {
      alert('Błąd: Brak ID projektu')
      return
    }
    createNewInspection(projectId, address, apartmentNumber, technician)
    setShowNewModal(false)
    navigate('/measurement')
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

  const handleRefresh = async () => {
    if (!projectId) return
    setIsLoading(true)
    await loadInspections(projectId)
    setIsLoading(false)
  }

  const syncedCount = inspections.filter((i) => i.synced).length

  // Znajdź nazwę projektu
  const currentProject = projects.find((p) => p.id === projectId)
  const projectName = currentProject?.name || 'Nieznany projekt'

  // Jeśli brak projectId, przekieruj do głównego ekranu
  if (!projectId) {
    navigate('/')
    return null
  }

  return (
    <MainLayout title={projectName} showBackBtn={true} onRefresh={handleRefresh}>
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
          isLoading={isLoading}
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
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreate={handleCreateNew}
      />
    </MainLayout>
  )
}
