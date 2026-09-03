import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, Trash2 } from 'lucide-react'
import { useCollection } from '../hooks'
import { MainLayout } from './layout/MainLayout'
import { Button, ActionMenu } from './atoms'
import { collection, query, orderBy, type QueryDocumentSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { saveProjectToFirestore, deleteProjectFromFirestore } from '../services'
import type { Project } from '../types'
import { logger } from '../utils/logger'

const projectMapper = (doc: QueryDocumentSnapshot): Project => {
  const data = doc.data()
  return {
    id: doc.id,
    name: data.name,
    status: data.status || 'active',
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
  }
}

export const ProjectsScreen: React.FC = () => {
  const navigate = useNavigate()

  const projectsQuery = useMemo(
    () => query(collection(db, 'projects'), orderBy('createdAt', 'desc')),
    []
  )

  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(
    projectsQuery,
    projectMapper,
    'all-projects',
    'Projects'
  )

  const [showNewModal, setShowNewModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      alert('Wprowadź nazwę projektu')
      return
    }

    const projectId = `proj_${Date.now()}`
    const newProject: Project = {
      id: projectId,
      name: newProjectName.trim(),
      createdAt: new Date(),
      status: 'active',
    }

    // Fire-and-forget: Save to Firestore
    saveProjectToFirestore(newProject)
      .then(() => {
        logger.log(`✅ Project ${projectId} saved successfully`)
      })
      .catch((error) => {
        console.error(`❌ Failed to save project ${projectId}:`, error)
      })

    setNewProjectName('')
    setShowNewModal(false)
  }

  const handleDeleteProject = (id: string, name: string) => {
    if (
      confirm(
        `Czy na pewno chcesz usunąć projekt "${name}"? Ta akcja jest nieodwracalna.`
      )
    ) {
      deleteProjectFromFirestore(id)
        .catch((error: unknown) => {
          console.error('❌ Error deleting project:', error)
        })
    }
  }

  return (
    <MainLayout title="Moje Projekty">
      {/* Content */}
      <div className="p-4 min-h-full">
        {isLoadingProjects && projects.length === 0 ? (
          <div className="text-center text-slate-400 py-8">Ładowanie...</div>
        ) : !isLoadingProjects && projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen size={64} className="mx-auto text-slate-600 mb-4" />
            <h2 className="text-xl font-semibold text-slate-200 mb-2">
              Brak projektów
            </h2>
            <p className="text-slate-400 mb-6">
              Utwórz pierwszy projekt, aby rozpocząć
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-slate-800 rounded-lg p-6 hover:bg-slate-700 transition-colors border border-slate-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-900 rounded-lg">
                      <FolderOpen size={24} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-100">
                        {project.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(project.createdAt).toLocaleDateString(
                          'pl-PL'
                        )}
                      </p>
                    </div>
                  </div>
                  <ActionMenu
                    ariaLabel="Opcje projektu"
                    items={[
                      {
                        label: 'Usuń',
                        icon: <Trash2 size={16} className="text-red-400" />,
                        onClick: () => handleDeleteProject(project.id, project.name),
                        className: 'text-red-400 hover:bg-red-900/40',
                      },
                    ]}
                  />
                </div>

                <Button
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="w-full"
                >
                  Otwórz projekt
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

      {/* Modal - Nowy Projekt */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-slate-100 mb-4">
              Nowy Projekt
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nazwa projektu
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="np. Spółdzielnia Knurów"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateProject()
                  }
                }}
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowNewModal(false)
                  setNewProjectName('')
                }}
                className="flex-1 bg-slate-700 text-slate-200 hover:bg-slate-600"
              >
                Anuluj
              </Button>
              <Button 
                onClick={handleCreateProject} 
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
