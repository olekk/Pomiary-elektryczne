import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Home, Loader, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { MainLayout } from './layout/MainLayout'
import { Button } from './atoms'

export const ProjectDetailsScreen: React.FC = () => {
  const navigate = useNavigate()
  const { id: projectId } = useParams<{ id: string }>()
  const {
    user,
    buildings,
    isLoadingBuildings,
    subscribeToBuildings,
    unsubscribeFromBuildings,
    addBuilding,
    deleteBuilding,
    projects,
  } = useAppStore()

  const [showNewModal, setShowNewModal] = useState(false)
  const [newBuildingName, setNewBuildingName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Subscribe to buildings for this project (Offline-First)
  useEffect(() => {
    if (projectId) {
      subscribeToBuildings(projectId)
    }
    return () => {
      unsubscribeFromBuildings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const handleCreateBuilding = async () => {
    if (!newBuildingName.trim()) {
      alert('Wprowadź nazwę budynku')
      return
    }

    if (!projectId) {
      alert('Błąd: Brak ID projektu')
      return
    }

    if (!user?.uid) {
      alert('Błąd: Brak ID użytkownika')
      return
    }

    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await addBuilding(projectId, newBuildingName.trim(), user.uid)
      setNewBuildingName('')
      setShowNewModal(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBuilding = async (id: string, name: string) => {
    if (
      confirm(
        `Czy na pewno chcesz usunąć budynek "${name}"? Ta akcja jest nieodwracalna.`
      )
    ) {
      try {
        await deleteBuilding(id)
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        alert('Błąd podczas usuwania: ' + errorMessage)
      }
    }
  }

  // Znajdź nazwę projektu
  const currentProject = projects.find((p) => p.id === projectId)
  const projectName = currentProject?.name || 'Nieznany projekt'

  // Jeśli brak projectId, przekieruj do głównego ekranu
  if (!projectId) {
    navigate('/')
    return null
  }

  return (
    <MainLayout title={projectName} showBackBtn={true}>
      {/* Content */}
      <div className="p-4 min-h-full">
        {isLoadingBuildings ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-blue-600" size={32} />
          </div>
        ) : buildings.length === 0 ? (
          <div className="text-center py-12">
            <Home size={64} className="mx-auto text-slate-600 mb-4" />
            <h2 className="text-xl font-semibold text-slate-200 mb-2">
              Brak budynków
            </h2>
            <p className="text-slate-400 mb-6">
              Utwórz pierwszy budynek, aby rozpocząć
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buildings.map((building) => (
              <div
                key={building.id}
                className="bg-slate-800 rounded-lg p-6 hover:bg-slate-700 transition-colors border border-slate-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-900 rounded-lg">
                      <Home size={24} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-100">
                        {building.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(building.createdAt).toLocaleDateString(
                          'pl-PL'
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteBuilding(building.id, building.name)
                    }}
                    className="p-2 hover:bg-red-900 rounded-lg transition-colors"
                    title="Usuń budynek"
                  >
                    <Trash2 size={18} className="text-red-400" />
                  </button>
                </div>

                <Button
                  onClick={() => navigate(`/building/${building.id}`)}
                  className="w-full"
                >
                  Otwórz budynek
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowNewModal(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-5 rounded-full shadow-2xl flex items-center justify-center transition-colors"
        style={{ width: '64px', height: '64px' }}
      >
        <Plus size={32} />
      </button>

      {/* Modal - Nowy Budynek */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-slate-100 mb-4">
              Nowy Budynek
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Adres budynku (np. ul. Wandy 1)
              </label>
              <input
                type="text"
                value={newBuildingName}
                onChange={(e) => setNewBuildingName(e.target.value)}
                placeholder="np. ul. Kwiatowa 15"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateBuilding()
                  }
                }}
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowNewModal(false)
                  setNewBuildingName('')
                }}
                className="flex-1 bg-slate-700 text-slate-200 hover:bg-slate-600"
                disabled={isSubmitting}
              >
                Anuluj
              </Button>
              <Button 
                onClick={handleCreateBuilding} 
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Tworzenie...' : 'Utwórz'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
