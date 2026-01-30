import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, Loader, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { MainLayout } from './layout/MainLayout'
import { Button } from './atoms'

export const ProjectsScreen: React.FC = () => {
  const navigate = useNavigate()
  const { projects, loadProjects, createNewProject, deleteProject } =
    useAppStore()

  const [isLoading, setIsLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  // Load projects on mount
  useEffect(() => {
    loadProjects().finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRefresh = async () => {
    setIsLoading(true)
    await loadProjects()
    setIsLoading(false)
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      alert('Wprowadź nazwę projektu')
      return
    }

    await createNewProject(newProjectName.trim())
    setNewProjectName('')
    setShowNewModal(false)
  }

  const handleDeleteProject = async (id: string, name: string) => {
    if (
      confirm(
        `Czy na pewno chcesz usunąć projekt "${name}"? Ta akcja jest nieodwracalna.`
      )
    ) {
      try {
        await deleteProject(id)
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        alert('Błąd podczas usuwania: ' + errorMessage)
      }
    }
  }

  return (
    <MainLayout title="Moje Projekty" onRefresh={handleRefresh}>
      {/* Content */}
      <div className="p-4 min-h-full">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-blue-600" size={32} />
          </div>
        ) : projects.length === 0 ? (
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteProject(project.id, project.name)
                    }}
                    className="p-2 hover:bg-red-900 rounded-lg transition-colors"
                    title="Usuń projekt"
                  >
                    <Trash2 size={18} className="text-red-400" />
                  </button>
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
              <Button onClick={handleCreateProject} className="flex-1">
                Utwórz
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
