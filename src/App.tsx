import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { enableNetwork, getFirestore } from 'firebase/firestore'
import { auth } from './firebase'
import { ProjectsScreen } from './components/ProjectsScreen'
import { ProjectDetailsScreen } from './components/ProjectDetailsScreen'
import { MeasurementScreen } from './components/MeasurementScreen'
import { SummaryScreen } from './components/SummaryScreen'
import { LoginScreen } from './components/LoginScreen'
import { useAppStore } from './store/useAppStore'

function App() {
  // Atomowe selektory Zustand dla optymalizacji re-renderów
  const setOnlineStatus = useAppStore((state) => state.setOnlineStatus)
  const retryPendingSync = useAppStore((state) => state.retryPendingSync)
  const setUser = useAppStore((state) => state.setUser)
  const user = useAppStore((state) => state.user)
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  // ===== MONITORING ONLINE/OFFLINE STATUS + AUTO-SYNC =====
  useEffect(() => {
    const db = getFirestore()

    const handleOnline = async () => {
      console.log('🌐 Network: ONLINE')
      setOnlineStatus(true)

      // 🔥 FIRESTORE: Wymuszenie połączenia z siecią (unikanie "Cache Only")
      try {
        await enableNetwork(db)
        console.log('🌐 Network enabled manually')
      } catch (e) {
        console.log('Network enable skipped:', e)
      }

      // 🔄 AUTO-SYNC: Retry pending syncs when connection restored
      console.log('🔄 Auto-retrying pending syncs...')
      retryPendingSync()
    }

    const handleOffline = () => {
      console.log('📴 Network: OFFLINE')
      setOnlineStatus(false)
    }

    // Ustawienie początkowego stanu
    setOnlineStatus(navigator.onLine)

    // Nasłuchiwanie na zmiany
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 🚀 Wywołaj handleOnline przy starcie, jeśli jesteśmy online
    if (navigator.onLine) {
      handleOnline()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnlineStatus, retryPendingSync])

  // ===== MONITORING AUTH STATE =====
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log('✅ User authenticated:', firebaseUser.email)
        setUser(firebaseUser)
      } else {
        console.log('❌ User logged out')
        setUser(null)
      }
      setIsAuthChecking(false)
    })

    return () => unsubscribe()
  }, [setUser])

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
        <Route path="/measurement" element={<MeasurementScreen />} />
        <Route path="/measurement/:id" element={<MeasurementScreen />} />
        <Route path="/summary" element={<SummaryScreen />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
