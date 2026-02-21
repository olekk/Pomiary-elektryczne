import type {
  ProtectionType,
  Amperage,
  Measurement,
  NoGroundingType,
  Room,
  SocketType,
} from '../types'
import { ZS_DOP_TABLE } from '../types'

/**
 * Calculate the allowable Zs value based on protection type and amperage
 */
export const calculateZsDop = (
  protectionType: ProtectionType,
  amperage: Amperage
): number => {
  return ZS_DOP_TABLE[protectionType][amperage]
}

/**
 * Determine the result of a measurement (TAK/NIE)
 */
export const determineMeasurementResult = (
  zsValue: number | null,
  zsDop: number,
  noGrounding?: NoGroundingType
): 'TAK' | 'NIE' => {
  if (noGrounding) {
    return 'NIE'
  }

  if (zsValue !== null && zsValue <= zsDop) {
    return 'TAK'
  }

  return 'NIE'
}

/**
 * Create a new measurement object
 */
export const createMeasurement = (
  id: string,
  pointNumber: number,
  room: Room,
  protectionType: ProtectionType,
  amperage: Amperage,
  zsValue: number | null,
  noGrounding?: NoGroundingType,
  socketType: SocketType = 'Gniazdo 230V'
): Measurement => {
  const zsDop = calculateZsDop(protectionType, amperage)
  const result = determineMeasurementResult(zsValue, zsDop, noGrounding)

  const noGroundingField =
    noGrounding === undefined ? {} : { noGrounding }

  return {
    id,
    pointNumber,
    room,
    protectionType,
    amperage,
    zsValue,
    zsDop,
    result,
    socketType,
    ...noGroundingField,
  }
}

/**
 * Renumber measurements after deletion
 */
export const renumberMeasurements = (
  measurements: Measurement[]
): Measurement[] => {
  return measurements.map((m, idx) => ({
    ...m,
    pointNumber: idx + 1,
  }))
}

/**
 * Count measurements by result type
 */
export const countMeasurementsByResult = (measurements: Measurement[]) => {
  return {
    passed: measurements.filter((m) => m.result === 'TAK').length,
    failed: measurements.filter((m) => m.result === 'NIE').length,
  }
}
