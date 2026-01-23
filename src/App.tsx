import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { MeasurementScreen } from './components/MeasurementScreen';
import { SummaryScreen } from './components/SummaryScreen';

function App() {
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
