import {
  collection,
  setDoc,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Inspection } from "../types";

/**
 * Save an inspection to Firestore
 */
export const saveInspectionToFirestore = async (
  inspection: Inspection,
  inspectionId: string,
): Promise<void> => {
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

  const docRef = doc(db, "inspections", inspectionId);
  await setDoc(docRef, dataToSave, { merge: true });
};

/**
 * Load all inspections from Firestore
 * Supports offline cache - will return cached data if network is unavailable
 */
export const loadInspectionsFromFirestore = async (): Promise<Inspection[]> => {
  const q = query(collection(db, "inspections"), orderBy("createdAt", "desc"));

  try {
    // Firebase automatically uses cache when offline (thanks to persistentLocalCache)
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

    console.log(`📥 Loaded ${inspections.length} inspections from Firestore`);
    return inspections;
  } catch (error) {
    console.error("Error loading inspections:", error);
    // Return empty array instead of throwing - allows app to work offline
    return [];
  }
};

/**
 * Delete an inspection from Firestore
 */
export const deleteInspectionFromFirestore = async (
  id: string,
): Promise<void> => {
  await deleteDoc(doc(db, "inspections", id));
};

/**
 * Mark inspection as synced in Firestore
 */
export const markInspectionAsSynced = async (id: string): Promise<void> => {
  const docRef = doc(db, "inspections", id);
  await updateDoc(docRef, { synced: true });
};

/**
 * Retry syncing a pending inspection
 */
export const retrySyncInspection = async (
  inspection: Inspection,
): Promise<boolean> => {
  if (!inspection.id) return false;

  try {
    await saveInspectionToFirestore(inspection, inspection.id);
    await markInspectionAsSynced(inspection.id);
    console.log(`✅ Retry successful for inspection ${inspection.id}`);
    return true;
  } catch (error) {
    console.error(`❌ Retry failed for inspection ${inspection.id}:`, error);
    return false;
  }
};
