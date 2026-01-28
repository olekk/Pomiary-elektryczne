import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, FileDown, CheckCircle } from 'lucide-react';
import { useInspectionStore } from '../store/useInspectionStore';
import { SignaturePanel } from './organisms';
import { CompactMeasurementListItem } from './molecules';
import { Button, Card } from './atoms';
import { PdfGenerator } from './PdfGenerator';
import { pdf } from '@react-pdf/renderer';
import { countMeasurementsByResult } from '../utils';

export const SummaryScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentInspection, setSignature } = useInspectionStore();

  if (!currentInspection) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Brak danych do wyświetlenia</p>
          <Button variant="primary" onClick={() => navigate('/')} icon={<Home size={20} />}>
            Powrót do listy
          </Button>
        </div>
      </div>
    );
  }

  const handleGeneratePDF = async () => {
    try {
      const blob = await pdf(<PdfGenerator inspection={currentInspection} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Pomiar_${currentInspection.apartmentNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Błąd podczas generowania PDF');
    }
  };

  const { passed, failed, noGrounding } = countMeasurementsByResult(
    currentInspection.measurements
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <CheckCircle size={32} />
          <div>
            <h1 className="text-xl font-bold">Pomiar Zakończony</h1>
            <p className="text-sm opacity-90">
              {currentInspection.address} / {currentInspection.apartmentNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-4">
        <Card className="mb-4">
          <h2 className="font-bold text-lg mb-3">Podsumowanie</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{passed}</div>
              <div className="text-xs text-gray-600">Pozytywne</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{failed}</div>
              <div className="text-xs text-gray-600">Negatywne</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{noGrounding}</div>
              <div className="text-xs text-gray-600">B.UZ</div>
            </div>
          </div>
        </Card>

        {/* Measurements List */}
        <Card className="mb-4">
          <h3 className="font-bold mb-3">Wszystkie punkty pomiarowe</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {currentInspection.measurements.map((m) => (
              <CompactMeasurementListItem key={m.id} measurement={m} />
            ))}
          </div>
        </Card>

        {/* Signature */}
        <SignaturePanel onSave={setSignature} />

        {/* Actions */}
        <div className="space-y-3 mt-4">
          <Button
            variant="danger"
            size="lg"
            fullWidth
            onClick={handleGeneratePDF}
            icon={<FileDown size={24} />}
          >
            Generuj PDF
          </Button>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => navigate('/')}
            icon={<Home size={24} />}
          >
            Powrót do Listy
          </Button>
        </div>
      </div>
    </div>
  );
};
