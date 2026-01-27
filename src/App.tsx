import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { MeasurementScreen } from './components/MeasurementScreen';
import { SummaryScreen } from './components/SummaryScreen';
import { useInspectionStore } from './store/useInspectionStore';

function App() {
  const { setOnlineStatus } = useInspectionStore();

  // ===== MONITORING ONLINE/OFFLINE STATUS =====
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network: ONLINE');
      setOnlineStatus(true);
    };

    const handleOffline = () => {
      console.log('📴 Network: OFFLINE');
      setOnlineStatus(false);
    };

    // Ustawienie początkowego stanu
    setOnlineStatus(navigator.onLine);

    // Nasłuchiwanie na zmiany
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/measurement" element={<MeasurementScreen />} />
        <Route path="/measurement/:id" element={<MeasurementScreen />} />
        <Route path="/summary" element={<SummaryScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
