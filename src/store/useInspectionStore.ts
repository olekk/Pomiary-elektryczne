import { create } from "zustand";
import type {
  Inspection,
  Measurement,
  ProtectionType,
  Amperage,
} from "../types";
import { ZS_DOP_TABLE, DEFAULT_K_FACTORS } from "../types";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

interface InspectionState {
  currentInspection: Inspection | null;
  inspections: Inspection[];

  // Actions
  createNewInspection: (
    address: string,
    apartmentNumber: string,
    technician: string,
  ) => void;
  addMeasurement: (zsValue: number | null, noGrounding?: boolean) => void;
  updateMeasurement: (id: string, updates: Partial<Measurement>) => void;
  removeMeasurement: (id: string) => void;
  saveToFirestore: () => Promise<void>;
  loadInspections: () => Promise<void>;
  setCurrentInspection: (inspection: Inspection | null) => void;
  setSignature: (signature: string) => void;
  deleteInspection: (id: string) => Promise<void>;

  // Smart defaults - ostatnie ustawienia
  lastProtectionType: ProtectionType;
  lastAmperage: Amperage;
  lastKFactor: number;

  setLastDefaults: (
    protectionType: ProtectionType,
    amperage: Amperage,
    kFactor: number,
  ) => void;
}

export const useInspectionStore = create<InspectionState>((set, get) => ({
  currentInspection: null,
  inspections: [],
  lastProtectionType: "WNP",
  lastAmperage: 16,
  lastKFactor: DEFAULT_K_FACTORS.WNP,

  createNewInspection: (address, apartmentNumber, technician) => {
    set({
      currentInspection: {
        address,
        apartmentNumber,
        technician,
        date: new Date(),
        measurements: [],
        synced: false,
      },
    });
  },

  addMeasurement: (zsValue, noGrounding = false) => {
    const state = get();
    const { currentInspection, lastProtectionType, lastAmperage, lastKFactor } =
      state;

    if (!currentInspection) return;

    const pointNumber = currentInspection.measurements.length + 1;
    const zsDop = ZS_DOP_TABLE[lastProtectionType][lastAmperage];

    let result: "TAK" | "NIE" | "B.UZ" = "NIE";

    if (noGrounding) {
      result = "B.UZ";
    } else if (zsValue !== null && zsValue <= zsDop) {
      result = "TAK";
    }

    const newMeasurement: Measurement = {
      id: `m-${Date.now()}-${Math.random()}`,
      pointNumber,
      protectionType: lastProtectionType,
      amperage: lastAmperage,
      kFactor: lastKFactor,
      zsValue,
      zsDop,
      result,
      noGrounding,
    };

    set({
      currentInspection: {
        ...currentInspection,
        measurements: [...currentInspection.measurements, newMeasurement],
      },
    });
  },

  updateMeasurement: (id, updates) => {
    const state = get();
    const { currentInspection } = state;

    if (!currentInspection) return;

    const updatedMeasurements = currentInspection.measurements.map((m) => {
      if (m.id === id) {
        const updated = { ...m, ...updates };

        // Przelicz zsDop jeśli zmieniono typ lub amperaż
        if (updates.protectionType || updates.amperage) {
          updated.zsDop =
            ZS_DOP_TABLE[updated.protectionType][updated.amperage];
        }

        // Przelicz wynik
        if (updated.noGrounding) {
          updated.result = "B.UZ";
        } else if (
          updated.zsValue !== null &&
          updated.zsValue <= updated.zsDop
        ) {
          updated.result = "TAK";
        } else {
          updated.result = "NIE";
        }

        return updated;
      }
      return m;
    });

    set({
      currentInspection: {
        ...currentInspection,
        measurements: updatedMeasurements,
      },
    });
  },

  removeMeasurement: (id) => {
    const state = get();
    const { currentInspection } = state;

    if (!currentInspection) return;

    const filtered = currentInspection.measurements.filter((m) => m.id !== id);

    // Przenumeruj punkty
    const renumbered = filtered.map((m, idx) => ({
      ...m,
      pointNumber: idx + 1,
    }));

    set({
      currentInspection: {
        ...currentInspection,
        measurements: renumbered,
      },
    });
  },

  saveToFirestore: async () => {
    const { currentInspection, inspections } = get();

    if (!currentInspection) {
      throw new Error("Brak danych do zapisania");
    }

    try {
      const dateToSave =
        currentInspection.date instanceof Date
          ? currentInspection.date
          : new Date(currentInspection.date);

      const dataToSave = {
        address: currentInspection.address || "",
        apartmentNumber: currentInspection.apartmentNumber || "",
        date: Timestamp.fromDate(dateToSave),
        technician: currentInspection.technician || "",
        measurements: currentInspection.measurements || [],
        signature: currentInspection.signature || "",
        synced: true,
        createdAt: Timestamp.now(),
      };

      let savedId = currentInspection.id;

      if (currentInspection.id) {
        // --- UPDATE ISTNIEJĄCEGO ---
        const docRef = doc(db, "inspections", currentInspection.id);
        await updateDoc(docRef, dataToSave);

        // Optimistic Update: Aktualizujemy listę lokalnie bez pobierania z sieci
        const updatedList = inspections.map((insp) =>
          insp.id === currentInspection.id
            ? { ...insp, ...currentInspection, date: dateToSave, synced: true }
            : insp,
        );
        set({ inspections: updatedList });
      } else {
        // --- TWORZENIE NOWEGO ---
        const docRef = await addDoc(collection(db, "inspections"), dataToSave);
        savedId = docRef.id;

        // Optimistic Update: Dodajemy nowy element do listy lokalnie
        const newInspectionListItem: Inspection = {
          id: savedId,
          address: currentInspection.address,
          apartmentNumber: currentInspection.apartmentNumber,
          technician: currentInspection.technician,
          date: dateToSave,
          measurements: currentInspection.measurements,
          signature: currentInspection.signature,
          synced: true,
        };

        // Dodajemy na początek listy (najnowsze)
        set({
          inspections: [newInspectionListItem, ...inspections],
          currentInspection: {
            ...currentInspection,
            id: savedId,
            synced: true,
          },
        });
      }

      // WAŻNE: Usunęliśmy await loadInspections()!
      // Dzięki temu UI nie czeka na sieć w trybie offline.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error saving to Firestore:", error);
      if (error?.code === "permission-denied") {
        throw new Error("Brak uprawnień do zapisu.");
      } else if (error?.code === "unavailable") {
        // W trybie offline to nie powinno się zdarzyć przy addDoc,
        // ale jeśli się zdarzy, to i tak chcemy pozwolić użytkownikowi działać dalej
        console.warn("Network unavailable, proceeding optimistically");
      } else {
        throw new Error(`Błąd zapisu: ${error?.message || "Nieznany błąd"}`);
      }
    }
  },

  loadInspections: async () => {
    try {
      const q = query(collection(db, "inspections"), orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);

      const inspections: Inspection[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        inspections.push({
          id: doc.id,
          address: data.address,
          apartmentNumber: data.apartmentNumber,
          date: data.date?.toDate ? data.date.toDate() : new Date(),
          technician: data.technician,
          measurements: data.measurements || [],
          signature: data.signature,
          synced: data.synced ?? true,
        });
      });

      set({ inspections });
    } catch (error) {
      console.error("Error loading inspections:", error);
      // Nie rzucamy błędu, żeby nie blokować UI jeśli load nie zadziała offline
    }
  },

  setCurrentInspection: (inspection) => {
    set({ currentInspection: inspection });
  },

  setSignature: (signature) => {
    const { currentInspection } = get();
    if (currentInspection) {
      set({
        currentInspection: {
          ...currentInspection,
          signature,
        },
      });
    }
  },

  deleteInspection: async (id) => {
    try {
      await deleteDoc(doc(db, "inspections", id));

      // Optimistic Update: Usuwamy z listy lokalnie
      const { inspections } = get();
      set({
        inspections: inspections.filter((i) => i.id !== id),
      });

      // WAŻNE: Usunęliśmy await loadInspections()!
    } catch (error) {
      console.error("Error deleting inspection:", error);
      throw error;
    }
  },

  setLastDefaults: (protectionType, amperage, kFactor) => {
    set({
      lastProtectionType: protectionType,
      lastAmperage: amperage,
      lastKFactor: kFactor,
    });
  },
}));
