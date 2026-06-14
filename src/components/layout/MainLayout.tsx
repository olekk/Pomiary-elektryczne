import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, LogOut, Settings } from 'lucide-react'
import { useAuth, useOnlineStatus, usePendingSync } from '../../hooks'
// import { StatusBadge } from '../molecules'
import { logger } from '../../utils/logger'

interface MainLayoutProps {
  children: React.ReactNode
  title: string
  showBackBtn?: boolean
  backUrl?: string // Custom URL for back button (defaults to '/')
  onBackClick?: () => void // Optional callback invoked when back button is clicked
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title,
  showBackBtn = false,
  backUrl = '/',
  onBackClick,
}) => {
  const { signOutUser } = useAuth()
  const isOnline = useOnlineStatus()
  const { pendingSyncCount, retryPendingSync } = usePendingSync()

  // Auto-sync: trigger once on app/screen open when online
  useEffect(() => {
    if (isOnline && pendingSyncCount > 0) {
      retryPendingSync()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on mount

  const handleLogout = async () => {
    if (confirm('Czy na pewno chcesz się wylogować?')) {
      try {
        logger.log('🧹 Signing out...')
        await signOutUser()
        logger.log('✅ Logout complete')
      } catch (error) {
        logger.error('Błąd wylogowania:', error)
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
                  to={backUrl}
                  onClick={onBackClick}
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
            {/* <StatusBadge
              isOnline={isOnline}
              pendingCount={pendingSyncCount}
              onRetrySync={retryPendingSync}
            /> */}

            {/* Settings Button */}
            <Link
              to="/settings"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Ustawienia"
            >
              <Settings size={20} className="text-slate-100" />
            </Link>

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
