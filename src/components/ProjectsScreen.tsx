import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, LogOut, Loader, Trash2 } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { useInspectionStore } from '../store/useInspectionStore'
import { auth } from '../firebase'
import { Button } from './atoms'
import { Card } from './atoms'

export const ProjectsScreen: React.FC = () => {
  const navigate = useNavigate()
  const { projects, loadProjects, createNewProject, deleteProject } =
    useInspectionStore()

  const [isLoading, setIsLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  // Load projects on mount
  useEffect(() => {
    loadProjects().finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    if (confirm('Czy na pewno chcesz się wylogować?')) {
      try {
        await signOut(auth)
      } catch (error) {
        console.error('Błąd wylogowania:', error)
        alert('Błąd podczas wylogowania')
      }
    }
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
    if (confirm(`Czy na pewno chcesz usunąć projekt "${name}"? Ta akcja jest nieodwracalna.`)) {
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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projekty</h1>
            <p className="text-sm text-gray-500 mt-1">
              Wybierz projekt lub utwórz nowy
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Wyloguj"
          >
            <LogOut size={24} className="text-gray-700" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-blue-600" size={32} />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Brak projektów
            </h2>
            <p className="text-gray-500 mb-6">
              Utwórz pierwszy projekt, aby rozpocząć
            </p>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus size={20} />
              Nowy Projekt
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FolderOpen size={24} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {project.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(project.createdAt).toLocaleDateString('pl-PL')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteProject(project.id, project.name)
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Usuń projekt"
                    >
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                  </div>

                  <Button
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="w-full"
                  >
                    Otwórz projekt
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {projects.length > 0 && (
        <button
          onClick={() => setShowNewModal(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-5 rounded-full shadow-2xl flex items-center justify-center transition-colors"
          style={{ width: '64px', height: '64px' }}
        >
          <Plus size={32} />
        </button>
      )}

      {/* Modal - Nowy Projekt */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Nowy Projekt
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nazwa projektu
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="np. Spółdzielnia Knurów"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
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
    </div>
  )
}
