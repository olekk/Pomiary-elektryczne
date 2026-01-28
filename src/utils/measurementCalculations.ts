import type { ProtectionType, Amperage, Measurement } from '../types';
import { ZS_DOP_TABLE } from '../types';

/**
 * Calculate the allowable Zs value based on protection type and amperage
 */
export const calculateZsDop = (
  protectionType: ProtectionType,
  amperage: Amperage
): number => {
  return ZS_DOP_TABLE[protectionType][amperage];
};

/**
 * Determine the result of a measurement (TAK/NIE/B.UZ)
 */
export const determineMeasurementResult = (
  zsValue: number | null,
  zsDop: number,
  noGrounding: boolean
): 'TAK' | 'NIE' | 'B.UZ' => {
  if (noGrounding) {
    return 'B.UZ';
  }
  
  if (zsValue !== null && zsValue <= zsDop) {
    return 'TAK';
  }
  
  return 'NIE';
};

/**
 * Create a new measurement object
 */
export const createMeasurement = (
  id: string,
  pointNumber: number,
  protectionType: ProtectionType,
  amperage: Amperage,
  kFactor: number,
  zsValue: number | null,
  noGrounding: boolean = false
): Measurement => {
  const zsDop = calculateZsDop(protectionType, amperage);
  const result = determineMeasurementResult(zsValue, zsDop, noGrounding);

  return {
    id,
    pointNumber,
    protectionType,
    amperage,
    kFactor,
    zsValue,
    zsDop,
    result,
    noGrounding,
  };
};

/**
 * Renumber measurements after deletion
 */
export const renumberMeasurements = (measurements: Measurement[]): Measurement[] => {
  return measurements.map((m, idx) => ({
    ...m,
    pointNumber: idx + 1,
  }));
};

/**
 * Count measurements by result type
 */
export const countMeasurementsByResult = (measurements: Measurement[]) => {
  return {
    passed: measurements.filter((m) => m.result === 'TAK').length,
    failed: measurements.filter((m) => m.result === 'NIE').length,
    noGrounding: measurements.filter((m) => m.result === 'B.UZ').length,
  };
};
