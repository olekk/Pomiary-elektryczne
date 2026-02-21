import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProjectsScreen } from './components/ProjectsScreen'
import { ProjectDetailsScreen } from './components/ProjectDetailsScreen'
import { BuildingDetailsScreen } from './components/BuildingDetailsScreen'
import { MeasurementScreen } from './components/MeasurementScreen'
import { SummaryScreen } from './components/SummaryScreen'
import { SettingsScreen } from './components/SettingsScreen'
import { LoginScreen } from './components/LoginScreen'
import { AuthProvider, useAuth } from './hooks'
import { DebugConsole } from './components/DebugConsole'

function AppRoutes() {
  const { user, isAuthChecking } = useAuth()

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

  // Show the main app if user is authenticated.
  // Also show it when user is null but we have a cached UID — the real
  // User object will arrive from onAuthStateChanged momentarily.
  // This prevents flashing LoginScreen on offline cold starts.
  const hasCachedUid = (() => { try { return !!localStorage.getItem('cachedAuthUid') } catch { return false } })()

  if (!user && !hasCachedUid) {
    return <LoginScreen />
  }

  // Jeśli użytkownik JEST zalogowany -> Aplikacja
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectsScreen />} />
        <Route path="/project/:id" element={<ProjectDetailsScreen />} />
        <Route path="/building/:id" element={<BuildingDetailsScreen />} />
        <Route path="/building/:buildingId/measurement" element={<MeasurementScreen />} />
        <Route path="/building/:buildingId/summary/:inspectionId" element={<SummaryScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <DebugConsole />
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
