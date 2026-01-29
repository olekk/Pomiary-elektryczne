import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, ArrowLeft } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { useInspectionStore } from '../store/useInspectionStore'
import {
  DashboardHeader,
  DashboardStats,
  InspectionsList,
  CreateInspectionModal,
} from './organisms'
import { auth } from '../firebase'

export const ProjectDetailsScreen: React.FC = () => {
  const navigate = useNavigate()
  const { id: projectId } = useParams<{ id: string }>()
  const {
    inspections,
    loadInspections,
    createNewInspection,
    deleteInspection,
    isOnline,
    pendingSyncCount,
    retryPendingSync,
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

  const handleLogout = async () => {
    if (confirm('Czy na pewno chcesz się wylogować?')) {
      try {
        await signOut(auth)
        // onAuthStateChanged w App.tsx automatycznie przekieruje do LoginScreen
      } catch (error) {
        console.error('Błąd wylogowania:', error)
        alert('Błąd podczas wylogowania')
      }
    }
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
    <div className="min-h-screen bg-gray-100">
      {/* Header z przyciskiem powrotu */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900">{projectName}</h1>
          <p className="text-sm text-gray-500">
            ID: {projectId.substring(0, 20)}...
          </p>
        </div>
      </div>

      <DashboardHeader
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onRetrySync={retryPendingSync}
        onLogout={handleLogout}
      />

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
    </div>
  )
}
