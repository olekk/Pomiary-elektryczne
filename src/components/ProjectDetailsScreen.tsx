import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Home, Loader, Trash2, CheckCircle, DoorOpen } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { MainLayout } from './layout/MainLayout'
import { Button } from './atoms'
import { getFullAddress } from '../utils'

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
    projectInspections,
    subscribeToProjectInspections,
    unsubscribeFromProjectInspections,
  } = useAppStore()

  const [showNewModal, setShowNewModal] = useState(false)
  const [newStreet, setNewStreet] = useState('')
  const [newZipCode, setNewZipCode] = useState('')
  const [newCity, setNewCity] = useState('')

  // Subscribe to buildings for this project (Offline-First)
  useEffect(() => {
    if (projectId) {
      subscribeToBuildings(projectId)
      subscribeToProjectInspections(projectId)
    }
    return () => {
      unsubscribeFromBuildings()
      unsubscribeFromProjectInspections()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Oblicz statystyki inspekcji per budynek (reaktywne - odświeża się automatycznie)
  const buildingStats = useMemo(() => {
    const stats: Record<string, { completed: number; inaccessible: number }> =
      {}
    for (const inspection of projectInspections) {
      const bId = inspection.buildingId
      if (!stats[bId]) {
        stats[bId] = { completed: 0, inaccessible: 0 }
      }
      if (inspection.status === 'INACCESSIBLE') {
        stats[bId].inaccessible++
      } else {
        // COMPLETED lub brak statusu (stare pomiary) = wykonano
        stats[bId].completed++
      }
    }
    return stats
  }, [projectInspections])

  const handleCreateBuilding = async () => {
    if (!newStreet.trim() || !newZipCode.trim() || !newCity.trim()) {
      alert('Wypełnij wszystkie pola adresu')
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

    // KROK 2 & 3: Optimistic Update + Background Sync
    // addBuilding już dodaje do listy natychmiast i synchronizuje w tle
    addBuilding(
      projectId,
      newStreet.trim(),
      newZipCode.trim(),
      newCity.trim(),
      user.uid
    )
      .catch((error) => {
        console.error('❌ Error adding building:', error)
        // Store już zaktualizowany, sync nastąpi później
      })
    
    // Modal zamyka się NATYCHMIAST
    setNewStreet('')
    setNewZipCode('')
    setNewCity('')
    setShowNewModal(false)
  }

  const handleDeleteBuilding = (id: string, address: string) => {
    if (
      confirm(
        `Czy na pewno chcesz usunąć budynek "${address}"? Ta akcja jest nieodwracalna.`
      )
    ) {
      // deleteBuilding już usuwa z listy natychmiast i synchronizuje w tle
      deleteBuilding(id)
        .catch((error: unknown) => {
          console.error('❌ Error deleting building:', error)
          // Element już usunięty z UI, sync nastąpi w tle
        })
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
                        {getFullAddress(building)}
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
                      handleDeleteBuilding(building.id, getFullAddress(building))
                    }}
                    className="p-2 hover:bg-red-900 rounded-lg transition-colors"
                    title="Usuń budynek"
                  >
                    <Trash2 size={18} className="text-red-400" />
                  </button>
                </div>

                {/* Statystyki inspekcji */}
                {(buildingStats[building.id]?.completed > 0 ||
                  buildingStats[building.id]?.inaccessible > 0) && (
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle size={16} />
                      <span>
                        Wykonano: {buildingStats[building.id].completed}
                      </span>
                    </div>
                    {buildingStats[building.id].inaccessible > 0 && (
                      <div className="flex items-center gap-1.5 text-orange-400">
                        <DoorOpen size={16} />
                        <span>
                          Niedostępne: {buildingStats[building.id].inaccessible}
                        </span>
                      </div>
                    )}
                  </div>
                )}

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
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Ulica i numer
                </label>
                <input
                  type="text"
                  value={newStreet}
                  onChange={(e) => setNewStreet(e.target.value)}
                  placeholder="np. ul. Kwiatowa 15"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Kod pocztowy
                </label>
                <input
                  type="text"
                  value={newZipCode}
                  onChange={(e) => setNewZipCode(e.target.value)}
                  placeholder="np. 40-000"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Miejscowość
                </label>
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="np. Katowice"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateBuilding()
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowNewModal(false)
                  setNewStreet('')
                  setNewZipCode('')
                  setNewCity('')
                }}
                className="flex-1 bg-slate-700 text-slate-200 hover:bg-slate-600"
              >
                Anuluj
              </Button>
              <Button
                onClick={handleCreateBuilding}
                className="flex-1"
              >
                Utwórz
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
