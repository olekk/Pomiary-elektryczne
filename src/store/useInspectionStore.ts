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
  setDoc,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// ===== HELPER: Client-side ID Generation =====
const generateInspectionId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `insp_${timestamp}_${random}`;
};

interface InspectionState {
  currentInspection: Inspection | null;
  inspections: Inspection[];
  isOnline: boolean;
  pendingSyncCount: number;

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
  retryPendingSync: () => Promise<void>;
  setOnlineStatus: (status: boolean) => void;

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
  isOnline: navigator.onLine,
  pendingSyncCount: 0,
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

    const dateToSave =
      currentInspection.date instanceof Date
        ? currentInspection.date
        : new Date(currentInspection.date);

    // ===== STRATEGIA #1: Client-Side ID Generation =====
    // Generujemy ID lokalnie, dzięki czemu setDoc nie blokuje w offline
    const savedId = currentInspection.id || generateInspectionId();

    const dataToSave = {
      address: currentInspection.address || "",
      apartmentNumber: currentInspection.apartmentNumber || "",
      date: Timestamp.fromDate(dateToSave),
      technician: currentInspection.technician || "",
      measurements: currentInspection.measurements || [],
      signature: currentInspection.signature || "",
      synced: false, // Będzie true dopiero po rzeczywistej synchronizacji
      createdAt: Timestamp.now(),
    };

    // ===== OPTIMISTIC UPDATE: Aktualizuj UI NATYCHMIAST =====
    const optimisticInspection: Inspection = {
      id: savedId,
      address: currentInspection.address,
      apartmentNumber: currentInspection.apartmentNumber,
      technician: currentInspection.technician,
      date: dateToSave,
      measurements: currentInspection.measurements,
      signature: currentInspection.signature,
      synced: false, // Oznaczamy jako niesynchronizowane
    };

    if (currentInspection.id) {
      // UPDATE: Aktualizujemy istniejący element
      const updatedList = inspections.map((insp) =>
        insp.id === currentInspection.id ? optimisticInspection : insp,
      );
      set({ inspections: updatedList, currentInspection: optimisticInspection });
    } else {
      // CREATE: Dodajemy nowy element na początek listy
      set({
        inspections: [optimisticInspection, ...inspections],
        currentInspection: optimisticInspection,
      });
    }

    // Aktualizujemy liczbę pending operations
    const newPendingCount = get().inspections.filter((i) => !i.synced).length;
    set({ pendingSyncCount: newPendingCount });

    // ===== FIRE-AND-FORGET: Zapis do Firebase w tle (bez blokowania UI) =====
    const docRef = doc(db, "inspections", savedId);
    
    setDoc(docRef, dataToSave, { merge: true })
      .then(() => {
        // Sukces: Oznacz jako zsynchronizowane
        console.log(`✅ Inspection ${savedId} synced successfully`);
        const currentState = get();
        const syncedList = currentState.inspections.map((insp) =>
          insp.id === savedId ? { ...insp, synced: true } : insp,
        );
        set({ 
          inspections: syncedList,
          pendingSyncCount: syncedList.filter((i) => !i.synced).length,
        });
        
        // Aktualizuj currentInspection jeśli to ten sam
        if (currentState.currentInspection?.id === savedId) {
          set({
            currentInspection: {
              ...currentState.currentInspection,
              synced: true,
            },
          });
        }
      })
      .catch((error) => {
        console.error(`❌ Sync failed for inspection ${savedId}:`, error);
        // W trybie offline to jest oczekiwane - dane są w kolejce Firebase
        if (error?.code === "unavailable") {
          console.log("📴 Offline mode: Data queued for sync when online");
        }
      });

    // Funkcja zwraca się natychmiast, nie czekając na Firebase
  },

  loadInspections: async () => {
    try {
      const q = query(collection(db, "inspections"), orderBy("date", "desc"));
      
      // Timeout dla offline: jeśli getDocs nie odpowie w 3s, uznajemy że jesteśmy offline
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000)
      );

      const querySnapshot = await Promise.race([
        getDocs(q),
        timeoutPromise,
      ]);

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

      set({ 
        inspections,
        pendingSyncCount: inspections.filter((i) => !i.synced).length,
      });
    } catch (error) {
      console.error("Error loading inspections:", error);
      // Nie rzucamy błędu, żeby nie blokować UI jeśli load nie zadziała offline
      // W trybie offline zachowujemy obecną listę
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

  retryPendingSync: async () => {
    const { inspections } = get();
    const pendingInspections = inspections.filter((i) => !i.synced);

    console.log(`🔄 Retrying sync for ${pendingInspections.length} pending inspections...`);

    // Próbujemy zsynchronizować każdą niesynchronizowaną inspekcję
    for (const inspection of pendingInspections) {
      if (!inspection.id) continue;

      const dateToSave =
        inspection.date instanceof Date
          ? inspection.date
          : new Date(inspection.date);

      const dataToSave = {
        address: inspection.address || "",
        apartmentNumber: inspection.apartmentNumber || "",
        date: Timestamp.fromDate(dateToSave),
        technician: inspection.technician || "",
        measurements: inspection.measurements || [],
        signature: inspection.signature || "",
        synced: false,
        createdAt: Timestamp.now(),
      };

      const docRef = doc(db, "inspections", inspection.id);

      setDoc(docRef, dataToSave, { merge: true })
        .then(() => {
          console.log(`✅ Retry successful for inspection ${inspection.id}`);
          const currentState = get();
          const syncedList = currentState.inspections.map((insp) =>
            insp.id === inspection.id ? { ...insp, synced: true } : insp,
          );
          set({ 
            inspections: syncedList,
            pendingSyncCount: syncedList.filter((i) => !i.synced).length,
          });
        })
        .catch((error) => {
          console.error(`❌ Retry failed for inspection ${inspection.id}:`, error);
        });
    }
  },

  setOnlineStatus: (status) => {
    set({ isOnline: status });
    
    // Auto-retry gdy wracamy online
    if (status) {
      console.log("🌐 Connection restored! Auto-retrying pending syncs...");
      const { retryPendingSync } = get();
      retryPendingSync();
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
