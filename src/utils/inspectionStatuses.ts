import type { Inspection, InspectionStatus } from '../types'

export type InspectionStatusMap = Record<string, InspectionStatus>

export interface InspectionStats {
  completed: number
  inaccessible: number
}

/**
 * Buduje mapę inspectionId → status z listy inspekcji (pomija te bez ID)
 */
export const buildInspectionStatusMap = (
  inspections: Pick<Inspection, 'id' | 'status'>[]
): InspectionStatusMap => {
  const map: InspectionStatusMap = {}
  for (const inspection of inspections) {
    if (!inspection.id) continue
    map[inspection.id] = inspection.status || 'COMPLETED'
  }
  return map
}

/**
 * Liczy wykonane i niedostępne lokale na podstawie mapy statusów
 */
export const countInspectionStatuses = (
  map: InspectionStatusMap | undefined
): InspectionStats => {
  const stats: InspectionStats = { completed: 0, inaccessible: 0 }
  if (!map) return stats
  for (const status of Object.values(map)) {
    if (status === 'INACCESSIBLE') {
      stats.inaccessible++
    } else {
      stats.completed++
    }
  }
  return stats
}

/**
 * Porównuje dwie mapy statusów (kolejność kluczy nie ma znaczenia)
 */
export const areInspectionStatusMapsEqual = (
  a: InspectionStatusMap | undefined,
  b: InspectionStatusMap | undefined
): boolean => {
  const aKeys = Object.keys(a || {})
  const bKeys = Object.keys(b || {})
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => a?.[key] === b?.[key])
}
