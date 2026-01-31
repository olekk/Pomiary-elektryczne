import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, LogOut } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { useAppStore } from '../../store/useAppStore'
import { StatusBadge } from '../molecules'

interface MainLayoutProps {
  children: React.ReactNode
  title: string
  showBackBtn?: boolean
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title,
  showBackBtn = false,
}) => {
  // Atomowe selektory Zustand dla optymalizacji re-renderów
  const isOnline = useAppStore((state) => state.isOnline)
  const pendingSyncCount = useAppStore((state) => state.pendingSyncCount)
  const retryPendingSync = useAppStore((state) => state.retryPendingSync)
  const unsubscribeFromProjects = useAppStore(
    (state) => state.unsubscribeFromProjects
  )
  const unsubscribeFromInspections = useAppStore(
    (state) => state.unsubscribeFromInspections
  )

  const handleLogout = async () => {
    if (confirm('Czy na pewno chcesz się wylogować?')) {
      try {
        // Cleanup: Unsubscribe from all realtime listeners before logout
        console.log('🧹 Cleaning up subscriptions before logout...')
        unsubscribeFromProjects()
        unsubscribeFromInspections()

        await signOut(auth)
      } catch (error) {
        console.error('Błąd wylogowania:', error)
        alert('Błąd podczas wylogowania')
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header - Sticky Top */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 shadow-lg">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Left Side */}
          <div className="flex items-center gap-3">
            {showBackBtn ? (
              <>
                <Link
                  to="/"
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ArrowLeft size={24} className="text-slate-100" />
                </Link>
                <div>
                  <h1 className="text-lg font-semibold text-slate-100">
                    {title}
                  </h1>
                </div>
              </>
            ) : (
              <div>
                <h1 className="text-xl font-bold text-slate-100">{title}</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pomiary Elektryczne
                </p>
              </div>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Status Badge */}
            <StatusBadge
              isOnline={isOnline}
              pendingCount={pendingSyncCount}
              onRetrySync={retryPendingSync}
            />

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Wyloguj"
            >
              <LogOut size={20} className="text-slate-100" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 px-4 py-3">
        <div className="text-center text-xs text-slate-500">
          <p>Pomiary Elektryczne v1.0.0</p>
          <p className="mt-1">Build: {__BUILD_DATE__}</p>
        </div>
      </footer>
    </div>
  )
}
