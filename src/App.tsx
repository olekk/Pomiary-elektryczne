import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { ProjectsScreen } from './components/ProjectsScreen'
import { ProjectDetailsScreen } from './components/ProjectDetailsScreen'
import { BuildingDetailsScreen } from './components/BuildingDetailsScreen'
import { MeasurementScreen } from './components/MeasurementScreen'
import { SummaryScreen } from './components/SummaryScreen'
import { SettingsScreen } from './components/SettingsScreen'
import { LoginScreen } from './components/LoginScreen'
import { useAppStore } from './store/useAppStore'
import { logger } from './utils/logger'

function App() {
  // Atomowe selektory Zustand dla optymalizacji re-renderów
  const setOnlineStatus = useAppStore((state) => state.setOnlineStatus)
  const retryPendingSync = useAppStore((state) => state.retryPendingSync)
  const setUser = useAppStore((state) => state.setUser)
  const loadUserSettings = useAppStore((state) => state.loadUserSettings)
  const resetUserSettings = useAppStore((state) => state.resetUserSettings)
  const user = useAppStore((state) => state.user)
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  // ===== UI NETWORK STATUS MONITORING + AUTO-SYNC =====
  // ✅ Update UI badge status (isOnline in store)
  // ✅ Trigger auto-sync when connection restored
  // ❌ NO manual enableNetwork - trust Firebase SDK
  useEffect(() => {
    const handleOnline = () => {
      logger.log('🌐 UI detected: Online')
      setOnlineStatus(true)
      retryPendingSync()
    }

    const handleOffline = () => {
      logger.log('📴 UI detected: Offline')
      setOnlineStatus(false)
    }

    // Set initial state
    setOnlineStatus(navigator.onLine)

    // Listen for network changes
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnlineStatus, retryPendingSync])

  // ===== MONITORING AUTH STATE =====
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        logger.log('✅ User authenticated:', firebaseUser.email)
        setUser(firebaseUser)
        try {
          await loadUserSettings(firebaseUser.uid)
        } catch (error) {
          console.error('Error loading user settings:', error)
        }
      } else {
        logger.log('❌ User logged out')
        setUser(null)
        resetUserSettings()
      }
      setIsAuthChecking(false)
    })

    return () => unsubscribe()
  }, [setUser, loadUserSettings, resetUserSettings])

  // Loading state podczas sprawdzania sesji
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Ładowanie...</p>
        </div>
      </div>
    )
  }

  // Jeśli użytkownik NIE jest zalogowany -> LoginScreen
  if (!user) {
    return <LoginScreen />
  }

  // Jeśli użytkownik JEST zalogowany -> Aplikacja
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectsScreen />} />
        <Route path="/project/:id" element={<ProjectDetailsScreen />} />
        <Route path="/building/:id" element={<BuildingDetailsScreen />} />
        {/* /measurement/:id - id = buildingId (nowy pomiar dla budynku) */}
        <Route path="/measurement/:id" element={<MeasurementScreen />} />
        <Route path="/summary" element={<SummaryScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
