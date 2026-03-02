import { describe, it, expect } from 'vitest'
import {
  calculateZsDop,
  determineMeasurementResult,
  createMeasurement,
  renumberMeasurements,
  countMeasurementsByResult,
} from '../measurementCalculations'
import type { Measurement, ProtectionType, Amperage } from '../../types'

// ─── calculateZsDop ────────────────────────────────────────────────────────────

describe('calculateZsDop', () => {
  const ALL_COMBINATIONS: [ProtectionType, Amperage, number][] = [
    ['WNP', 10, 4.6],
    ['WNP', 16, 2.88],
    ['WNP', 20, 2.3],
    ['WNP', 25, 1.71],
    ['BI', 10, 4.26],
    ['BI', 16, 2.66],
    ['BI', 20, 2.13],
    ['BI', 25, 1.7],
  ]

  it.each(ALL_COMBINATIONS)(
    'returns %f for protectionType=%s, amperage=%d',
    (protectionType, amperage, expected) => {
      expect(calculateZsDop(protectionType, amperage)).toBe(expected)
    }
  )
})

// ─── determineMeasurementResult ────────────────────────────────────────────────

describe('determineMeasurementResult', () => {
  // INV-1: zsValue <= zsDop => TAK
  it('returns TAK when zsValue < zsDop', () => {
    expect(determineMeasurementResult(1.5, 2.88)).toBe('TAK')
  })

  it('returns TAK when zsValue === zsDop (boundary)', () => {
    expect(determineMeasurementResult(2.88, 2.88)).toBe('TAK')
  })

  // INV-1: zsValue > zsDop => NIE
  it('returns NIE when zsValue > zsDop', () => {
    expect(determineMeasurementResult(3.0, 2.88)).toBe('NIE')
  })

  it('returns NIE when zsValue > zsDop by 0.01', () => {
    expect(determineMeasurementResult(2.89, 2.88)).toBe('NIE')
  })

  // INV-1: null zsValue => NIE
  it('returns NIE when zsValue is null', () => {
    expect(determineMeasurementResult(null, 2.88)).toBe('NIE')
  })

  // INV-1: noGrounding always overrides to NIE
  it('returns NIE when noGrounding is NO_PIN, even if zsValue <= zsDop', () => {
    expect(determineMeasurementResult(1.0, 2.88, 'NO_PIN')).toBe('NIE')
  })

  it('returns NIE when noGrounding is NO_CONN', () => {
    expect(determineMeasurementResult(1.0, 2.88, 'NO_CONN')).toBe('NIE')
  })

  it('returns NIE when noGrounding is HIGH_Z', () => {
    expect(determineMeasurementResult(1.0, 2.88, 'HIGH_Z')).toBe('NIE')
  })

  // null noGrounding should NOT override
  it('returns TAK when noGrounding is null and zsValue <= zsDop', () => {
    expect(determineMeasurementResult(1.0, 2.88, null)).toBe('TAK')
  })

  it('returns TAK when noGrounding is undefined and zsValue <= zsDop', () => {
    expect(determineMeasurementResult(1.0, 2.88, undefined)).toBe('TAK')
  })
})

// ─── createMeasurement ─────────────────────────────────────────────────────────

describe('createMeasurement', () => {
  it('assembles a complete measurement object with correct result', () => {
    const m = createMeasurement('m-1', 1, 'Kuchnia', 'WNP', 16, 2.0)

    expect(m).toEqual({
      id: 'm-1',
      pointNumber: 1,
      room: 'Kuchnia',
      protectionType: 'WNP',
      amperage: 16,
      zsValue: 2.0,
      zsDop: 2.88,
      result: 'TAK',
      socketType: 'Gniazdo 230V',
    })
  })

  it('defaults socketType to "Gniazdo 230V"', () => {
    const m = createMeasurement('m-1', 1, 'Kuchnia', 'WNP', 16, 2.0)
    expect(m.socketType).toBe('Gniazdo 230V')
  })

  it('accepts explicit socketType "Gniazdo IP44"', () => {
    const m = createMeasurement(
      'm-1', 1, 'Łazienka', 'WNP', 16, 2.0, undefined, 'Gniazdo IP44'
    )
    expect(m.socketType).toBe('Gniazdo IP44')
  })

  it('creates failing measurement when zsValue > zsDop', () => {
    const m = createMeasurement('m-1', 1, 'Kuchnia', 'BI', 16, 3.0)
    expect(m.result).toBe('NIE')
    expect(m.zsDop).toBe(2.66)
  })

  it('creates failing measurement when noGrounding is set', () => {
    const m = createMeasurement('m-1', 1, 'Kuchnia', 'WNP', 16, 1.0, 'NO_PIN')
    expect(m.result).toBe('NIE')
    expect(m.noGrounding).toBe('NO_PIN')
  })

  it('omits noGrounding field when undefined', () => {
    const m = createMeasurement('m-1', 1, 'Kuchnia', 'WNP', 16, 2.0, undefined)
    expect(m).not.toHaveProperty('noGrounding')
  })

  it('includes noGrounding field when null', () => {
    const m = createMeasurement('m-1', 1, 'Kuchnia', 'WNP', 16, 2.0, null)
    expect(m).toHaveProperty('noGrounding', null)
  })

  it('creates measurement with null zsValue (NIE result)', () => {
    const m = createMeasurement('m-1', 1, 'Kuchnia', 'WNP', 16, null)
    expect(m.zsValue).toBeNull()
    expect(m.result).toBe('NIE')
  })
})

// ─── renumberMeasurements ──────────────────────────────────────────────────────

describe('renumberMeasurements', () => {
  const makeMeasurement = (id: string, pointNumber: number): Measurement => ({
    id,
    pointNumber,
    room: 'Kuchnia',
    protectionType: 'WNP',
    amperage: 16,
    zsValue: 2.0,
    zsDop: 2.88,
    result: 'TAK',
    socketType: 'Gniazdo 230V',
  })

  it('renumbers sequentially from 1', () => {
    const input = [
      makeMeasurement('a', 5),
      makeMeasurement('b', 10),
      makeMeasurement('c', 15),
    ]
    const result = renumberMeasurements(input)

    expect(result.map((m) => m.pointNumber)).toEqual([1, 2, 3])
  })

  it('returns empty array for empty input', () => {
    expect(renumberMeasurements([])).toEqual([])
  })

  it('preserves all other fields', () => {
    const input = [makeMeasurement('x', 99)]
    const [result] = renumberMeasurements(input)

    expect(result.id).toBe('x')
    expect(result.room).toBe('Kuchnia')
    expect(result.pointNumber).toBe(1)
  })
})

// ─── countMeasurementsByResult ─────────────────────────────────────────────────

describe('countMeasurementsByResult', () => {
  const makeMeasurement = (result: 'TAK' | 'NIE'): Measurement => ({
    id: 'm',
    pointNumber: 1,
    room: 'Kuchnia',
    protectionType: 'WNP',
    amperage: 16,
    zsValue: 2.0,
    zsDop: 2.88,
    result,
    socketType: 'Gniazdo 230V',
  })

  it('counts passed and failed correctly', () => {
    const measurements = [
      makeMeasurement('TAK'),
      makeMeasurement('TAK'),
      makeMeasurement('NIE'),
    ]
    expect(countMeasurementsByResult(measurements)).toEqual({
      passed: 2,
      failed: 1,
    })
  })

  it('returns zeros for empty array', () => {
    expect(countMeasurementsByResult([])).toEqual({ passed: 0, failed: 0 })
  })

  it('counts all TAK', () => {
    const measurements = [makeMeasurement('TAK'), makeMeasurement('TAK')]
    expect(countMeasurementsByResult(measurements)).toEqual({
      passed: 2,
      failed: 0,
    })
  })

  it('counts all NIE', () => {
    const measurements = [makeMeasurement('NIE'), makeMeasurement('NIE')]
    expect(countMeasurementsByResult(measurements)).toEqual({
      passed: 0,
      failed: 2,
    })
  })
})
