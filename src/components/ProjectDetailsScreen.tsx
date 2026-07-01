import React, { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Home, Trash2, CheckCircle, DoorOpen, Cloud, HardDrive, Search, X } from 'lucide-react'
import { useAuth, useCollection } from '../hooks'
import { MainLayout } from './layout/MainLayout'
import { Button, ActionMenu } from './atoms'
import { getFullAddress } from '../utils'
import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'
import { deleteBuildingFromFirestore } from '../services'
import type { Building, Inspection } from '../types'
import { logger } from '../utils/logger'

const buildingMapper = (doc: QueryDocumentSnapshot): Building => {
  const data = doc.data()
  return {
    id: doc.id,
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
  }
}

export const ProjectDetailsScreen: React.FC = () => {
  const navigate = useNavigate()
  const { id: projectId } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [showNewModal, setShowNewModal] = useState(false)
  const [newStreet, setNewStreet] = useState('')
  const [newZipCode, setNewZipCode] = useState('')
  const [newCity, setNewCity] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Query for buildings in this project
  const buildingsQuery = useMemo(
    () =>
      projectId
        ? query(
          collection(db, 'buildings'),
          where('projectId', '==', projectId),
          orderBy('createdAt', 'desc')
        )
        : null,
    [projectId]
  )

  // Query for all inspections in this project (for per-building stats)
  const projectInspectionsQuery = useMemo(
    () =>
      projectId
        ? query(
          collection(db, 'inspections'),
          where('projectId', '==', projectId),
          orderBy('createdAt', 'desc')
        )
        : null,
    [projectId]
  )

  // Query for all projects (to find current project name)
  const projectsQuery = useMemo(
    () => query(collection(db, 'projects'), orderBy('createdAt', 'desc')),
    []
  )

  const { data: buildings, isLoading: isLoadingBuildings, fromCache: buildingsFromCache } =
    useCollection<Building>(buildingsQuery, buildingMapper, `buildings-${projectId || 'none'}`, 'Buildings')
  const { data: projectInspections } =
    useCollection<Inspection>(projectInspectionsQuery, inspectionMapper, `inspections-${projectId || 'none'}`, 'ProjectInspections')
  const { data: projects, isLoading: isLoadingProjects } =
    useCollection(projectsQuery, (doc) => ({ id: doc.id, name: doc.data().name }), 'all-projects', 'Projects')

  // Oblicz statystyki inspekcji per budynek
  const buildingStats = useMemo(() => {
    const stats: Record<string, { completed: number; inaccessible: number }> = {}
    for (const inspection of projectInspections) {
      const bId = inspection.buildingId
      if (!stats[bId]) {
        stats[bId] = { completed: 0, inaccessible: 0 }
      }
      if (inspection.status === 'INACCESSIBLE') {
        stats[bId].inaccessible++
      } else {
        stats[bId].completed++
      }
    }
    return stats
  }, [projectInspections])

  // Filtruj budynki po adresie
  const filteredBuildings = useMemo(() => {
    if (!searchQuery.trim()) return buildings
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u0142/g, 'l')
    const q = normalize(searchQuery)
    return buildings.filter((b) => normalize(getFullAddress(b)).includes(q))
  }, [buildings, searchQuery])

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

    // Save directly to Firestore — onSnapshot will update the list
    addDoc(collection(db, 'buildings'), {
      projectId,
      street: newStreet.trim(),
      zipCode: newZipCode.trim(),
      city: newCity.trim(),
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
      .then((docRef) => {
        logger.log(`✅ Building created with ID: ${docRef.id}`)
      })
      .catch((error) => {
        logger.error('❌ Error adding building:', error)
      })

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
      deleteBuildingFromFirestore(id)
        .catch((error: unknown) => {
          console.error('❌ Error deleting building:', error)
        })
    }
  }

  // Znajdź nazwę projektu
  const currentProject = projects.find((p) => p.id === projectId)
  const projectName = currentProject?.name || (isLoadingProjects ? 'Ładowanie…' : 'Nieznany projekt')

  // Jeśli brak projectId, przekieruj do głównego ekranu
  if (!projectId) {
    navigate('/')
    return null
  }

  return (
    <MainLayout title={projectName} showBackBtn={true}>
      {/* Content */}
      <div className="p-4 min-h-full">
        {isLoadingBuildings && buildings.length === 0 ? (
          <div className="text-center text-slate-400 py-8">Ładowanie...</div>
        ) : !isLoadingBuildings && buildings.length === 0 ? (
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
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-400">
                Budynki ({searchQuery.trim() ? `${filteredBuildings.length} / ${buildings.length}` : buildings.length})
              </span>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${buildingsFromCache
                    ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
                    : 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                  }`}
              >
                {buildingsFromCache ? <HardDrive size={12} className="animate-pulse" /> : <Cloud size={12} />}
                {buildingsFromCache ? 'Dane lokalne' : 'Aktualne'}
              </div>
            </div>

            {/* Search bar */}
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj po adresie…"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); searchInputRef.current?.focus() }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label="Wyczyść wyszukiwanie"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {filteredBuildings.length === 0 && searchQuery.trim() ? (
              <div className="text-center py-8 text-slate-400">
                <Search size={40} className="mx-auto mb-3 text-slate-600" />
                <p>Brak wyników dla „{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBuildings.map((building) => (
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
                      <ActionMenu
                        ariaLabel="Opcje budynku"
                        items={[
                          {
                            label: 'Usuń',
                            icon: <Trash2 size={16} className="text-red-400" />,
                            onClick: () => handleDeleteBuilding(building.id, getFullAddress(building)),
                            className: 'text-red-400 hover:bg-red-900/40',
                          },
                        ]}
                      />
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
