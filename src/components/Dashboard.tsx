import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInspectionStore } from "../store/useInspectionStore";
import {
  Plus,
  FileText,
  Trash2,
  CheckCircle,
  Clock,
  RefreshCw,
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    inspections,
    loadInspections,
    createNewInspection,
    deleteInspection,
  } = useInspectionStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

  const [address, setAddress] = useState("");
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [technician, setTechnician] = useState("");

  useEffect(() => {
    loadInspections().finally(() => setIsLoading(false));
  }, [loadInspections]);

  const handleCreateNew = () => {
    if (!address.trim() || !apartmentNumber.trim() || !technician.trim()) {
      alert("Wypełnij wszystkie pola!");
      return;
    }

    createNewInspection(address, apartmentNumber, technician);
    setShowNewModal(false);
    setAddress("");
    setApartmentNumber("");
    setTechnician("");
    navigate("/measurement");
  };

  const handleDelete = async (id: string) => {
    if (confirm("Czy na pewno chcesz usunąć ten pomiar?")) {
      try {
        await deleteInspection(id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        alert("Błąd podczas usuwania" + error.message);
      }
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await loadInspections();
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pomiary Elektryczne</h1>
            <p className="text-sm opacity-90">Field Service App</p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-blue-700 active:bg-blue-800 rounded-full transition-colors"
            disabled={isLoading}
          >
            <RefreshCw size={24} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <FileText size={20} />
              <span className="text-sm">Wszystkie</span>
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {inspections.length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle size={20} />
              <span className="text-sm">Zsynchronizowane</span>
            </div>
            <div className="text-3xl font-bold text-green-600">
              {inspections.filter((i) => i.synced).length}
            </div>
          </div>
        </div>
      </div>

      {/* Inspections List */}
      <div className="p-4">
        {isLoading ? (
          <div className="text-center text-gray-500 py-8">Ładowanie...</div>
        ) : inspections.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <FileText size={48} className="mx-auto mb-2 opacity-50" />
            <p>Brak pomiarów. Utwórz nowy pomiar poniżej.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inspections.map((inspection) => (
              <div
                key={inspection.id}
                className="bg-white rounded-lg shadow p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-800">
                      {inspection.address}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Mieszkanie: {inspection.apartmentNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      Technik: {inspection.technician}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-500">
                        {new Date(inspection.date).toLocaleDateString("pl-PL")}
                      </span>
                      <span className="text-xs text-gray-500">
                        Punkty: {inspection.measurements.length}
                      </span>
                      {inspection.synced ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle size={14} />
                          Synced
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-orange-600">
                          <Clock size={14} />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(inspection.id!)}
                    className="ml-2 p-2 text-red-500 hover:bg-red-50 active:bg-red-100 rounded cursor-pointer transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowNewModal(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-5 rounded-full shadow-2xl flex items-center justify-center transition-colors"
        style={{ width: "64px", height: "64px" }}
      >
        <Plus size={32} />
      </button>

      {/* New Inspection Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Nowy Pomiar</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Adres
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="np. ul. Kwiatowa 15"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Numer mieszkania
                </label>
                <input
                  type="text"
                  value={apartmentNumber}
                  onChange={(e) => setApartmentNumber(e.target.value)}
                  placeholder="np. 42"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Technik
                </label>
                <input
                  type="text"
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value)}
                  placeholder="Imię i nazwisko"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setAddress("");
                  setApartmentNumber("");
                  setTechnician("");
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 active:bg-gray-500 text-gray-800 p-3 rounded-lg font-semibold transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleCreateNew}
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-3 rounded-lg font-semibold transition-colors"
              >
                Rozpocznij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
