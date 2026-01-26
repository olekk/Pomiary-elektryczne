import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NumericKeypad } from "./NumericKeypad";
import { useInspectionStore } from "../store/useInspectionStore";
import type { ProtectionType, Amperage } from "../types";
import { Save, Trash2 } from "lucide-react";

export const MeasurementScreen: React.FC = () => {
  const navigate = useNavigate();

  const {
    currentInspection,
    addMeasurement,
    removeMeasurement,
    lastProtectionType,
    lastAmperage,
    lastKFactor,
    setLastDefaults,
    saveToFirestore,
  } = useInspectionStore();

  const [inputValue, setInputValue] = useState("0");
  const [isSaving, setIsSaving] = useState(false);

  // Settings for next measurement (Smart Defaults)
  const [nextProtectionType, setNextProtectionType] =
    useState<ProtectionType>(lastProtectionType);
  const [nextAmperage, setNextAmperage] = useState<Amperage>(lastAmperage);
  const [nextKFactor, setNextKFactor] = useState<number>(lastKFactor);

  useEffect(() => {
    if (!currentInspection) {
      // If no inspection, redirect or create one
      navigate("/");
    }
  }, [currentInspection, navigate]);

  const handleEnterMeasurement = () => {
    const zsValue = parseFloat(inputValue);

    if (isNaN(zsValue) || zsValue <= 0) {
      alert("Wprowadź poprawną wartość pomiaru!");
      return;
    }

    // Update store defaults
    setLastDefaults(nextProtectionType, nextAmperage, nextKFactor);

    // Add measurement
    addMeasurement(zsValue);

    // Reset input
    setInputValue("0");
  };

  const handleNoGrounding = () => {
    // Update store defaults
    setLastDefaults(nextProtectionType, nextAmperage, nextKFactor);

    // Add B.UZ measurement
    addMeasurement(null, true);

    // Reset input
    setInputValue("0");
  };

  const handleSave = async () => {
    if (!currentInspection || currentInspection.measurements.length === 0) {
      alert("Dodaj przynajmniej jeden pomiar!");
      return;
    }

    setIsSaving(true);

    try {
      console.log("Rozpoczynam zapis...", currentInspection);
      await saveToFirestore();
      console.log("Zapis zakończony sukcesem");
      alert("Zapisano pomiar!");
      navigate("/summary");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Błąd zapisu w komponencie:", error);
      alert(error?.message || "Błąd podczas zapisywania. Spróbuj ponownie.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentInspection) {
    return <div className="p-4">Ładowanie...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <h1 className="text-xl font-bold">
          {currentInspection.address} / {currentInspection.apartmentNumber}
        </h1>
        <p className="text-sm opacity-90">
          Pomiary: {currentInspection.measurements.length}
        </p>
      </div>

      {/* Settings Panel */}
      <div className="bg-white p-4 shadow-md">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">
          Ustawienia następnego punktu
        </h2>

        <div className="grid grid-cols-3 gap-2">
          {/* Protection Type */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Zabezpieczenie
            </label>
            <select
              value={nextProtectionType}
              onChange={(e) =>
                setNextProtectionType(e.target.value as ProtectionType)
              }
              className="w-full p-2 border border-gray-300 rounded text-sm font-semibold bg-white"
            >
              <option value="WNP">WNP</option>
              <option value="BI">BI</option>
            </select>
          </div>

          {/* K Factor */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Współczynnik k
            </label>
            <select
              value={nextKFactor}
              onChange={(e) => setNextKFactor(parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded text-sm font-semibold bg-white"
            >
              <option value={5}>5</option>
              <option value={5.4}>5.4</option>
            </select>
          </div>

          {/* Amperage */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Amperaż</label>
            <select
              value={nextAmperage}
              onChange={(e) =>
                setNextAmperage(Number(e.target.value) as Amperage)
              }
              className="w-full p-2 border border-gray-300 rounded text-sm font-semibold bg-white"
            >
              <option value={16}>16A</option>
              <option value={20}>20A</option>
              <option value={25}>25A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Measurements List */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentInspection.measurements.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>Brak pomiarów. Wprowadź pierwszy pomiar poniżej.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentInspection.measurements.map((m) => (
              <div
                key={m.id}
                className={`bg-white p-3 rounded-lg shadow flex items-center justify-between border-l-4 ${
                  m.result === "TAK"
                    ? "border-green-500"
                    : m.result === "B.UZ"
                      ? "border-orange-500"
                      : "border-red-500"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">#{m.pointNumber}</span>
                    <span className="text-sm text-gray-600">
                      {m.protectionType} {m.amperage}A
                    </span>
                    <span
                      className={`ml-auto font-bold text-lg ${
                        m.result === "TAK"
                          ? "text-green-600"
                          : m.result === "B.UZ"
                            ? "text-orange-600"
                            : "text-red-600"
                      }`}
                    >
                      {m.result}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    {m.noGrounding ? (
                      <span>Brak uziemienia</span>
                    ) : (
                      <>
                        Zs:{" "}
                        <span className="font-semibold">
                          {m.zsValue?.toFixed(2)} Ω
                        </span>{" "}
                        (dop: {m.zsDop.toFixed(2)} Ω)
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeMeasurement(m.id)}
                  className="ml-2 p-2 text-red-500 hover:bg-red-50 active:bg-red-100 rounded cursor-pointer transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keypad */}
      <div className="p-4">
        <NumericKeypad
          value={inputValue}
          onValueChange={setInputValue}
          onEnter={handleEnterMeasurement}
          onNoGrounding={handleNoGrounding}
        />
      </div>

      {/* Save Button */}
      <div className="p-4 bg-white shadow-lg">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full p-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
            isSaving
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
          } text-white`}
        >
          <Save size={24} />
          {isSaving ? "Zapisywanie..." : "Zapisz i Przejdź Dalej"}
        </button>
      </div>
    </div>
  );
};
