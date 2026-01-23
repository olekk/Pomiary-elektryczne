import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInspectionStore } from "../store/useInspectionStore";
import { Home, FileDown, CheckCircle } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { PdfGenerator } from "./PdfGenerator";
import { pdf } from "@react-pdf/renderer";

export const SummaryScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentInspection, setSignature } = useInspectionStore();
  const signatureRef = useRef<SignatureCanvas>(null);
  const [hasSignature, setHasSignature] = useState(false);

  if (!currentInspection) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Brak danych do wyświetlenia</p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Powrót do listy
          </button>
        </div>
      </div>
    );
  }

  const handleClearSignature = () => {
    signatureRef.current?.clear();
    setHasSignature(false);
  };

  const handleSaveSignature = () => {
    if (signatureRef.current) {
      const dataURL = signatureRef.current.toDataURL();
      setSignature(dataURL);
      setHasSignature(true);
      alert("Podpis zapisany!");
    }
  };

  const handleGeneratePDF = async () => {
    try {
      const blob = await pdf(
        <PdfGenerator inspection={currentInspection} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Pomiar_${currentInspection.apartmentNumber}_${new Date().toISOString().split("T")[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Błąd podczas generowania PDF");
    }
  };

  const passedCount = currentInspection.measurements.filter(
    (m) => m.result === "TAK",
  ).length;
  const failedCount = currentInspection.measurements.filter(
    (m) => m.result === "NIE",
  ).length;
  const noGroundingCount = currentInspection.measurements.filter(
    (m) => m.result === "B.UZ",
  ).length;

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
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="font-bold text-lg mb-3">Podsumowanie</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {passedCount}
              </div>
              <div className="text-xs text-gray-600">Pozytywne</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {failedCount}
              </div>
              <div className="text-xs text-gray-600">Negatywne</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {noGroundingCount}
              </div>
              <div className="text-xs text-gray-600">B.UZ</div>
            </div>
          </div>
        </div>

        {/* Measurements List */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-bold mb-3">Wszystkie punkty pomiarowe</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {currentInspection.measurements.map((m) => (
              <div
                key={m.id}
                className={`p-2 rounded border-l-4 ${
                  m.result === "TAK"
                    ? "border-green-500 bg-green-50"
                    : m.result === "B.UZ"
                      ? "border-orange-500 bg-orange-50"
                      : "border-red-500 bg-red-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">#{m.pointNumber}</span>
                  <span className="text-sm text-gray-600">
                    {m.protectionType} {m.amperage}A
                  </span>
                  <span
                    className={`font-bold ${
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
                {!m.noGrounding && (
                  <div className="text-xs text-gray-600 mt-1">
                    Zs: {m.zsValue?.toFixed(2)} Ω (dop: {m.zsDop.toFixed(2)} Ω)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Signature */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-bold mb-3">Podpis</h3>
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                className: "w-full h-48 bg-white",
              }}
              onEnd={() => setHasSignature(true)}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleClearSignature}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 p-2 rounded font-semibold"
            >
              Wyczyść
            </button>
            <button
              onClick={handleSaveSignature}
              disabled={!hasSignature}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-semibold disabled:opacity-50"
            >
              Zapisz podpis
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleGeneratePDF}
            className="w-full bg-red-600 hover:bg-red-700 text-white p-4 rounded-lg font-bold flex items-center justify-center gap-2"
          >
            <FileDown size={24} />
            Generuj PDF
          </button>

          <button
            onClick={() => navigate("/")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg font-bold flex items-center justify-center gap-2"
          >
            <Home size={24} />
            Powrót do Listy
          </button>
        </div>
      </div>
    </div>
  );
};
